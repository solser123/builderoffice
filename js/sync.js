/* =======================================
   BuilderOffice - Sync Engine
   메모리 캐시 ↔ localStorage ↔ Firestore 3단 동기화

   설계 목적:
   기존 9개 UI 모듈은 Store를 "동기 함수"로 호출한다 (Store.getCosts() 등).
   Firestore는 async라서 모듈을 전부 async로 바꾸지 않으면 연결이 불가능했다.
   → Store._get/_set을 이 엔진으로 우회시켜, 모듈 코드를 한 줄도 고치지 않고
     실시간 클라우드 동기화를 얻는다.

   읽기: 메모리 캐시에서 즉시 반환 (동기)
   쓰기: 메모리 + localStorage 즉시 반영 → Firestore 문서 단위 diff 전송 (비동기)
   수신: onSnapshot으로 타 사용자 변경분을 캐시에 반영 → 화면 자동 갱신
   오프라인: 쓰기 작업을 큐에 쌓아 localStorage에 보존, 재연결 시 자동 전송
   ======================================= */

var Sync = {
    PREFIX: 'builderoffice_',
    QUEUE_KEY: 'builderoffice_sync_queue',

    // 문서 배열형 컬렉션 (각 원소가 .id를 가짐)
    ARRAY_KEYS: [
        'builderoffice_costs',
        'builderoffice_personnel',
        // 주민등록번호·계좌·일당 등 민감정보. owner/admin과 본인만 읽을 수 있어
        // 그 외 사용자에게는 권한 오류가 나는 것이 정상이다 (_denied 처리됨).
        'builderoffice_personnelPrivate',
        'builderoffice_attendance',
        'builderoffice_materials',
        'builderoffice_material_logs',
        'builderoffice_sites',
        'builderoffice_work_inputs',
        'builderoffice_safety_checks',
        'builderoffice_documents',
        'builderoffice_approvals',
        'builderoffice_koshaRecords',
        // 수주 흐름: 견적 → 계약 → 기성(회차별 청구·입금)
        'builderoffice_estimates',
        'builderoffice_contracts',
        'builderoffice_billings'
    ],

    // 키-값 맵형 컬렉션 ("personId_날짜": 공수값)
    MAP_KEYS: [
        'builderoffice_gongsu',
        'builderoffice_site_gongsu'
    ],

    MODE: 'local',      // 'local' | 'cloud'
    status: 'offline',  // 'offline' | 'syncing' | 'live' | 'error'
    companyId: null,
    userId: null,

    cache: {},

    // 직전 상태의 깊은 복사본.
    // Store의 mutator들은 read()가 돌려준 배열/객체를 "그 자리에서" 변형한 뒤
    // 같은 참조를 write()로 넘긴다. 따라서 캐시만으로는 이전값과 새값이
    // 같은 객체가 되어 변경분을 계산할 수 없다. 이 그림자 사본이 비교 기준이 된다.
    _shadow: {},

    _unsubs: [],
    _queue: [],
    _denied: {},            // 열람 권한이 없어 구독을 건너뛴 컬렉션
    _inflight: [],          // 서버로 전송 중인 연산 (스냅샷이 덮어쓰지 않도록 보호)
    _applying: false,       // 원격 스냅샷 반영 중 (되돌려쓰기 방지)
    _refreshTimer: null,
    _refreshPending: false,
    _flushing: false,
    _retryTimer: null,

    allKeys: function () {
        return this.ARRAY_KEYS.concat(this.MAP_KEYS);
    },

    isMapKey: function (key) {
        return this.MAP_KEYS.indexOf(key) !== -1;
    },

    // storage key → Firestore 컬렉션명
    _colName: function (key) {
        return key.indexOf(this.PREFIX) === 0 ? key.substring(this.PREFIX.length) : key;
    },

    _colPath: function (key) {
        return 'companies/' + this.companyId + '/' + this._colName(key);
    },

    _isPermissionDenied: function (e) {
        if (!e) return false;
        return e.code === 'permission-denied'
            || String(e.message || '').indexOf('Missing or insufficient permissions') !== -1;
    },

    _cloudAvailable: function () {
        return typeof FB !== 'undefined'
            && !!FB.collection
            && !!this.companyId
            && this.companyId !== 'local';
    },

    // ===== 부트스트랩 =====

    /**
     * 로그인 직후 호출. localStorage를 먼저 캐시에 올려 화면이 즉시 뜨게 한 뒤,
     * Firestore 최초 로드 → 실시간 구독 → 밀린 큐 전송 순으로 진행한다.
     */
    CACHE_OWNER_KEY: 'builderoffice_cache_company',

    // 공용 PC·계정 전환 대비: localStorage 캐시가 다른 회사 것이면 비운다.
    // (같은 회사면 유지해 오프라인/빠른 로딩을 살린다)
    _ensureCacheOwner: function (companyId) {
        var owner = null;
        try { owner = localStorage.getItem(this.CACHE_OWNER_KEY); } catch (e) {}
        if (owner && owner !== companyId) {
            var keys = this.allKeys();
            for (var i = 0; i < keys.length; i++) {
                try { localStorage.removeItem(keys[i]); } catch (e) {}
            }
            try { localStorage.removeItem(this.QUEUE_KEY); } catch (e) {}
            this._queue = [];
            console.info('[Sync] 회사 전환 감지 — 이전 회사 로컬 캐시를 비웠습니다.');
        }
        try { localStorage.setItem(this.CACHE_OWNER_KEY, companyId); } catch (e) {}
    },

    bootstrap: async function (companyId, userId) {
        this.teardown();
        this.companyId = companyId;
        this.userId = userId;

        // 다른 회사 데이터가 남아 있으면 먼저 비운다
        this._ensureCacheOwner(companyId);

        // 1) localStorage → 메모리 캐시 (오프라인이어도 여기까지는 항상 성공)
        var keys = this.allKeys();
        for (var i = 0; i < keys.length; i++) {
            this._setCache(keys[i], this._readLocal(keys[i]));
        }
        this._queue = this._loadQueue();

        if (!this._cloudAvailable()) {
            this.MODE = 'local';
            this._setStatus('offline');
            return;
        }

        this.MODE = 'cloud';
        this._setStatus('syncing');

        // 2) Firestore 최초 로드 (전 컬렉션 병렬)
        //    권한이 없는 컬렉션(예: personnelPrivate)이 섞여 있어도
        //    나머지 로드는 끝까지 진행되어야 한다.
        var self = this;
        await Promise.all(keys.map(function (k) {
            return self._pullOnce(k).catch(function (e) {
                if (self._isPermissionDenied(e)) {
                    self._denied[k] = true;
                    console.info('[Sync] 열람 권한 없음 (정상): ' + self._colName(k));
                } else {
                    console.warn('[Sync] 로드 실패 — 로컬 캐시 사용: ' + self._colName(k), e);
                }
            });
        }));

        // 3) 실시간 구독 (권한 없는 컬렉션은 건너뛴다)
        for (var j = 0; j < keys.length; j++) {
            if (!this._denied[keys[j]]) this._subscribe(keys[j]);
        }

        // 4) 오프라인 중 쌓인 쓰기 전송
        await this._flushQueue();
    },

    teardown: function () {
        for (var i = 0; i < this._unsubs.length; i++) {
            try { this._unsubs[i](); } catch (e) { /* 무시 */ }
        }
        this._unsubs = [];
        clearTimeout(this._refreshTimer);
        clearTimeout(this._retryTimer);
        this.cache = {};
        this._shadow = {};
        this._denied = {};
        this._inflight = [];
        this.companyId = null;
        this.userId = null;
        this.MODE = 'local';
        this._setStatus('offline');
    },

    // ===== Store가 호출하는 동기 인터페이스 =====

    _clone: function (v) {
        try { return JSON.parse(JSON.stringify(v)); }
        catch (e) { return Array.isArray(v) ? [] : {}; }
    },

    _setCache: function (key, value) {
        this.cache[key] = value;
        this._shadow[key] = this._clone(value);
    },

    read: function (key) {
        if (Object.prototype.hasOwnProperty.call(this.cache, key)) {
            return this.cache[key];
        }
        var v = this._readLocal(key);
        this._setCache(key, v);
        return v;
    },

    write: function (key, data) {
        var prev = Object.prototype.hasOwnProperty.call(this._shadow, key)
            ? this._shadow[key]
            : this._readLocal(key);

        this.cache[key] = data;
        this._writeLocal(key, data);

        // 원격 스냅샷을 캐시에 반영하는 중이면 Firestore로 되돌려 보내지 않는다
        if (this._applying || this.MODE !== 'cloud') {
            this._shadow[key] = this._clone(data);
            return;
        }

        var ops = this.isMapKey(key)
            ? this._diffMap(key, prev, data)
            : this._diffArray(key, prev, data);

        this._shadow[key] = this._clone(data);

        if (ops.length) this._enqueue(ops);
    },

    // ===== localStorage 원시 입출력 =====

    _readLocal: function (key) {
        var empty = this.isMapKey(key) ? {} : [];
        try {
            var raw = localStorage.getItem(key);
            if (!raw) return empty;
            var parsed = JSON.parse(raw);
            if (this.isMapKey(key)) {
                return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
            }
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('[Sync] 로컬 읽기 실패: ' + key, e);
            return empty;
        }
    },

    _writeLocal: function (key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('[Sync] 로컬 저장 실패: ' + key, e);
            if (typeof App !== 'undefined' && App.showToast) {
                App.showToast('기기 저장공간이 부족합니다. 오래된 데이터를 정리해주세요.', 'error');
            }
        }
    },

    // ===== 변경분 계산 (문서 단위) =====

    _diffArray: function (key, prev, next) {
        var ops = [];
        var prevMap = {}, nextMap = {};
        var i;

        for (i = 0; i < (prev || []).length; i++) {
            var p = prev[i];
            if (p && p.id) prevMap[p.id] = p;
        }
        for (i = 0; i < (next || []).length; i++) {
            var n = next[i];
            if (n && n.id) nextMap[n.id] = n;
        }

        for (var id in nextMap) {
            if (!Object.prototype.hasOwnProperty.call(nextMap, id)) continue;
            if (!prevMap[id] || JSON.stringify(prevMap[id]) !== JSON.stringify(nextMap[id])) {
                ops.push({ key: key, type: 'set', id: id, data: nextMap[id] });
            }
        }
        for (var oldId in prevMap) {
            if (!Object.prototype.hasOwnProperty.call(prevMap, oldId)) continue;
            if (!nextMap[oldId]) ops.push({ key: key, type: 'del', id: oldId });
        }
        return ops;
    },

    _diffMap: function (key, prev, next) {
        var ops = [];
        prev = prev || {};
        next = next || {};

        for (var k in next) {
            if (!Object.prototype.hasOwnProperty.call(next, k)) continue;
            if (prev[k] !== next[k]) {
                ops.push({
                    key: key, type: 'set', id: this._safeDocId(k),
                    data: { id: this._safeDocId(k), mapKey: k, value: next[k], updatedAt: new Date().toISOString() }
                });
            }
        }
        for (var ok in prev) {
            if (!Object.prototype.hasOwnProperty.call(prev, ok)) continue;
            if (!Object.prototype.hasOwnProperty.call(next, ok)) {
                ops.push({ key: key, type: 'del', id: this._safeDocId(ok) });
            }
        }
        return ops;
    },

    // Firestore 문서 ID에 '/'는 쓸 수 없다
    _safeDocId: function (raw) {
        return String(raw).replace(/\//g, '__SL__');
    },

    // ===== Firestore 입출력 =====

    _pullOnce: async function (key) {
        try {
            var snap = await FB.getDocs(FB.collection(this._colPath(key)));
            this._applySnapshot(key, snap, false);
        } catch (e) {
            console.warn('[Sync] 로드 실패: ' + key, e);
            throw e;
        }
    },

    _subscribe: function (key) {
        var self = this;
        try {
            var unsub = FB.onSnapshot(
                FB.collection(this._colPath(key)),
                function (snap) {
                    self._applySnapshot(key, snap, true);
                    if (self.status !== 'live') self._setStatus('live');
                },
                function (err) {
                    // 권한 없음은 정상 상황이다 — 전체 동기화 상태를 내리지 않는다
                    if (self._isPermissionDenied(err)) {
                        self._denied[key] = true;
                        console.info('[Sync] 구독 권한 없음 (정상): ' + self._colName(key));
                        return;
                    }
                    console.warn('[Sync] 구독 오류: ' + key, err);
                    self._setStatus('offline');
                    self._scheduleRetry();
                }
            );
            this._unsubs.push(unsub);
        } catch (e) {
            console.warn('[Sync] 구독 실패: ' + key, e);
        }
    },

    /**
     * 아직 서버에 반영되지 않은(큐에 남아 있거나 전송 중인) 문서 목록.
     * 스냅샷이 이들을 덮어쓰지 않도록 보호하는 데 쓴다.
     */
    _pendingOps: function (key) {
        var map = {};
        var all = this._queue.concat(this._inflight || []);
        for (var i = 0; i < all.length; i++) {
            if (all[i].key === key) map[all[i].id] = all[i].type;
        }
        return map;
    },

    _applySnapshot: function (key, snap, shouldRefresh) {
        var docs = [];
        snap.forEach(function (d) {
            var data = d.data();
            if (data) docs.push(data);
        });

        /* ⚠️ 경합 방지
           방금 저장한 문서가 서버에 도달하기 전에 스냅샷이 오면,
           서버의 옛 상태로 캐시를 덮어써서 입력한 내용이 사라진다.
           (현장에서 적은 게 없어지는 치명적 문제)
           아직 전송되지 않은 문서는 로컬 값을 그대로 살려 둔다. */
        var pending = this._pendingOps(key);
        var hasPending = false;
        for (var pk in pending) { if (pending.hasOwnProperty(pk)) { hasPending = true; break; } }
        var localPrev = hasPending ? (this.cache[key] || this._readLocal(key)) : null;

        var value, i;
        if (this.isMapKey(key)) {
            value = {};
            for (i = 0; i < docs.length; i++) {
                var d = docs[i];
                var mk = d.mapKey || String(d.id || '').replace(/__SL__/g, '/');
                if (mk) value[mk] = d.value;
            }
            if (hasPending && localPrev) {
                for (var lk in localPrev) {
                    if (!localPrev.hasOwnProperty(lk)) continue;
                    var docId = this._safeDocId(lk);
                    if (pending[docId] === 'set') value[lk] = localPrev[lk];   // 전송 대기 → 살림
                }
                for (var dk in pending) {
                    if (pending[dk] === 'del') {
                        var realKey = String(dk).replace(/__SL__/g, '/');
                        delete value[realKey];                                  // 삭제 대기 → 지움
                    }
                }
            }
        } else {
            var byId = {};
            for (i = 0; i < docs.length; i++) {
                if (docs[i] && docs[i].id) byId[docs[i].id] = docs[i];
            }
            if (hasPending && localPrev) {
                for (i = 0; i < localPrev.length; i++) {
                    var lp = localPrev[i];
                    if (lp && lp.id && pending[lp.id] === 'set') byId[lp.id] = lp;
                }
                for (var pid in pending) {
                    if (pending[pid] === 'del') delete byId[pid];
                }
            }

            var merged = [];
            for (var mid in byId) {
                if (byId.hasOwnProperty(mid)) merged.push(byId[mid]);
            }
            // Store는 최신순(unshift) 배열을 전제로 한다
            merged.sort(function (a, b) {
                var ta = a.createdAt || '', tb = b.createdAt || '';
                if (ta === tb) return 0;
                return tb > ta ? 1 : -1;
            });
            value = merged;
        }

        this._applying = true;
        this._setCache(key, value);
        this._writeLocal(key, value);
        this._applying = false;

        if (shouldRefresh) this._scheduleRefresh();
    },

    // ===== 쓰기 큐 (오프라인 내성) =====

    _enqueue: function (ops) {
        for (var i = 0; i < ops.length; i++) this._queue.push(ops[i]);
        this._saveQueue();
        this._flushQueue();
    },

    _loadQueue: function () {
        try {
            var raw = localStorage.getItem(this.QUEUE_KEY);
            var arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    },

    _saveQueue: function () {
        try {
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this._queue));
        } catch (e) { /* 무시 */ }
    },

    // 같은 문서에 대한 중복 연산은 마지막 것만 남긴다
    _coalesce: function (ops) {
        var seen = {};
        for (var i = ops.length - 1; i >= 0; i--) {
            var op = ops[i];
            var sig = op.key + '|' + op.id;
            if (seen[sig]) continue;
            seen[sig] = op;
        }
        var out = [];
        for (var k in seen) {
            if (Object.prototype.hasOwnProperty.call(seen, k)) out.push(seen[k]);
        }
        return out;
    },

    _flushQueue: async function () {
        if (this._flushing || this.MODE !== 'cloud' || !this._queue.length) return;
        this._flushing = true;

        var pending = this._coalesce(this._queue);
        this._queue = [];
        this._saveQueue();

        // 전송 중인 항목도 '아직 서버에 없는 것'이므로 스냅샷 보호 대상이다
        this._inflight = pending.slice();

        var failed = [];
        for (var i = 0; i < pending.length; i++) {
            var op = pending[i];
            try {
                var ref = FB.doc(this._colPath(op.key), op.id);
                if (op.type === 'del') {
                    await FB.deleteDoc(ref);
                } else {
                    var payload = op.data || {};
                    payload.updatedAt = new Date().toISOString();
                    payload.updatedBy = this.userId || 'unknown';
                    await FB.setDoc(ref, payload);
                }
            } catch (e) {
                console.warn('[Sync] 전송 실패, 큐에 보관:', op.key, op.id, e);
                failed.push(op);
            }
            // 전송이 끝난 건은 보호 목록에서 뺀다
            this._inflight = this._inflight.filter(function (x) {
                return !(x.key === op.key && x.id === op.id);
            });
        }

        this._inflight = [];
        this._flushing = false;

        if (failed.length) {
            this._queue = failed.concat(this._queue);
            this._saveQueue();
            this._setStatus('offline');
            this._scheduleRetry();
        } else if (this.status !== 'live') {
            this._setStatus('live');
        }
    },

    _scheduleRetry: function () {
        var self = this;
        clearTimeout(this._retryTimer);
        this._retryTimer = setTimeout(function () { self._flushQueue(); }, 15000);
    },

    pendingCount: function () {
        return this._queue.length;
    },

    // ===== 화면 갱신 =====

    /**
     * 원격 변경 수신 시 현재 페이지를 다시 그린다.
     * 단, 사용자가 입력 중이거나 모달이 열려 있으면 미루고 나중에 반영한다
     * (공수표 입력 중 화면이 날아가는 것을 막기 위함).
     */
    _scheduleRefresh: function () {
        var self = this;
        clearTimeout(this._refreshTimer);
        this._refreshTimer = setTimeout(function () { self._doRefresh(); }, 400);
    },

    _doRefresh: function () {
        if (typeof App === 'undefined' || !App.isLoggedIn) return;

        if (this._isUserBusy()) {
            this._refreshPending = true;
            this._scheduleRefresh();
            return;
        }
        this._refreshPending = false;
        try { App.refreshPage(); } catch (e) { console.warn('[Sync] 화면 갱신 실패', e); }
    },

    _isUserBusy: function () {
        var ae = document.activeElement;
        if (ae) {
            var tag = ae.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ae.isContentEditable) return true;
        }
        var overlay = document.getElementById('modalOverlay');
        if (overlay && overlay.classList.contains('active')) return true;
        return false;
    },

    // ===== 상태 표시 =====

    _setStatus: function (s) {
        this.status = s;
        this._renderStatus();
    },

    _renderStatus: function () {
        var el = document.getElementById('syncStatus');
        if (!el) return;

        var map = {
            live: { icon: '🟢', text: '실시간 동기화', cls: 'sync-live' },
            syncing: { icon: '🔄', text: '동기화 중...', cls: 'sync-syncing' },
            offline: { icon: '⚪', text: this.MODE === 'cloud' ? '오프라인' : '로컬 모드', cls: 'sync-offline' },
            error: { icon: '🔴', text: '동기화 오류', cls: 'sync-error' }
        };
        var s = map[this.status] || map.offline;
        var pending = this.pendingCount();
        var suffix = pending > 0 ? ' (' + pending + '건 대기)' : '';

        el.className = 'sync-status ' + s.cls;
        el.title = s.text + suffix;
        el.innerHTML = '<span class="sync-dot">' + s.icon + '</span>' +
            '<span class="sync-label">' + s.text + suffix + '</span>';
    }
};

// 온라인 복귀 시 밀린 쓰기 자동 전송
window.addEventListener('online', function () {
    if (Sync.MODE === 'cloud') {
        Sync._setStatus('syncing');
        Sync._flushQueue();
    }
});

window.addEventListener('offline', function () {
    if (Sync.MODE === 'cloud') Sync._setStatus('offline');
});
