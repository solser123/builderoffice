/* =======================================
   BuilderOffice - Firestore DB 레이어
   store.js의 localStorage를 Firestore로 대체
   회사(companyId) 단위로 데이터 격리
   ======================================= */

var DB = {
    _companyId: null,
    _userId: null,

    // 현재 회사ID 설정 (로그인 시 호출)
    setContext: function (companyId, userId) {
        this._companyId = companyId;
        this._userId = userId;
    },

    // 컬렉션 경로 반환
    _col: function (name) {
        if (!this._companyId) throw new Error('회사ID가 설정되지 않았습니다.');
        return 'companies/' + this._companyId + '/' + name;
    },

    // ID 생성
    _id: function () {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    },

    // ===== 범용 CRUD =====

    getAll: async function (collectionName) {
        try {
            var colRef = FB.collection(this._col(collectionName));
            var snap = await FB.getDocs(colRef);
            var result = [];
            snap.forEach(function (d) {
                var data = d.data();
                data.id = data.id || d.id;
                result.push(data);
            });
            // createdAt 기준 내림차순 정렬
            result.sort(function (a, b) {
                var ta = a.createdAt || '';
                var tb = b.createdAt || '';
                return tb > ta ? 1 : -1;
            });
            return result;
        } catch (e) {
            console.warn('[DB] getAll 실패, localStorage fallback:', collectionName, e);
            return Store._get('builderoffice_' + collectionName) || [];
        }
    },

    add: async function (collectionName, data) {
        try {
            data.id = data.id || this._id();
            data.createdAt = data.createdAt || new Date().toISOString();
            data.updatedAt = new Date().toISOString();
            data.createdBy = this._userId || 'unknown';
            var colRef = FB.collection(this._col(collectionName));
            await FB.addDoc(colRef, data);
            // localStorage도 동기화 (오프라인 대비)
            this._syncToLocal(collectionName, data, 'add');
            return data;
        } catch (e) {
            console.warn('[DB] add 실패, localStorage fallback:', collectionName, e);
            return Store._addToLocal(collectionName, data);
        }
    },

    update: async function (collectionName, id, updates) {
        try {
            updates.updatedAt = new Date().toISOString();
            var colRef = FB.collection(this._col(collectionName));
            var snap = await FB.getDocs(FB.query(colRef, FB.where('id', '==', id)));
            if (!snap.empty) {
                var docRef = snap.docs[0].ref;
                await FB.updateDoc(docRef, updates);
            }
            this._syncToLocal(collectionName, { id: id, ...updates }, 'update');
            return true;
        } catch (e) {
            console.warn('[DB] update 실패, localStorage fallback:', collectionName, e);
            return Store._updateLocal(collectionName, id, updates);
        }
    },

    delete: async function (collectionName, id) {
        try {
            var colRef = FB.collection(this._col(collectionName));
            var snap = await FB.getDocs(FB.query(colRef, FB.where('id', '==', id)));
            if (!snap.empty) {
                await FB.deleteDoc(snap.docs[0].ref);
            }
            this._syncToLocal(collectionName, { id: id }, 'delete');
            return true;
        } catch (e) {
            console.warn('[DB] delete 실패, localStorage fallback:', collectionName, e);
            return Store._deleteLocal(collectionName, id);
        }
    },

    // Firestore → localStorage 동기화 (오프라인 캐시)
    _syncToLocal: function (collectionName, data, op) {
        try {
            var key = 'builderoffice_' + collectionName;
            var arr = Store._get(key) || [];
            if (op === 'add') {
                arr.unshift(data);
            } else if (op === 'update') {
                var idx = arr.findIndex(function (x) { return x.id === data.id; });
                if (idx !== -1) Object.assign(arr[idx], data);
            } else if (op === 'delete') {
                arr = arr.filter(function (x) { return x.id !== data.id; });
            }
            Store._set(key, arr);
        } catch (e) { /* 무시 */ }
    },

    // ===== 회사 관리 =====

    createCompany: async function (companyName, userId, userEmail, userName) {
        var companyId = this._id();
        var companyData = {
            id: companyId,
            name: companyName,
            createdAt: new Date().toISOString(),
            ownerId: userId
        };
        // 회사 문서 생성
        await FB.setDoc(FB.doc(FB.collection('companies'), companyId), companyData);
        // 멤버 추가 (owner)
        await FB.setDoc(
            FB.doc(FB.collection('companies/' + companyId + '/members'), userId),
            {
                uid: userId,
                email: userEmail,
                name: userName,
                role: 'owner',
                roleLabel: '대표',
                joinedAt: new Date().toISOString()
            }
        );
        return companyId;
    },

    getUserCompany: async function (userId) {
        try {
            // 사용자 프로필에서 companyId 조회
            var userDoc = await FB.getDoc(FB.doc(FB.collection('users'), userId));
            if (userDoc.exists()) {
                return userDoc.data().companyId || null;
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    saveUserProfile: async function (userId, profile) {
        await FB.setDoc(FB.doc(FB.collection('users'), userId), profile, { merge: true });
    },

    /* ===== 초대 코드 =====================================
       대표(owner)/시스템 관리자(admin)가 코드를 발급하고,
       그 코드로 가입한 사람은 코드에 지정된 역할로 회사에 합류한다.
       코드 자체가 비밀이므로 추측하기 어려운 문자로 만든다.
       ==================================================== */

    // 헷갈리는 글자(0/O, 1/I/L) 제외
    _CODE_ALPHABET: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789',

    _makeCode: function (len) {
        var n = len || 8, s = '';
        var buf = new Uint32Array(n);
        (window.crypto || window.msCrypto).getRandomValues(buf);
        for (var i = 0; i < n; i++) {
            s += this._CODE_ALPHABET.charAt(buf[i] % this._CODE_ALPHABET.length);
        }
        // 읽기 쉽게 4자리씩 끊는다: ABCD-2345
        return s.slice(0, 4) + '-' + s.slice(4);
    },

    /**
     * 초대 코드 발급.
     * @param {Object} o {role, roleLabel, memo, maxUses(0=무제한), expiresInDays(0=무기한)}
     */
    createInvite: async function (o) {
        if (!this._companyId) throw new Error('회사 정보가 없습니다.');

        var code, exists = true, tries = 0;
        // 중복 방지 (사실상 희박하지만 확인한다)
        while (exists && tries < 5) {
            code = this._makeCode(8);
            var snap = await FB.getDoc(FB.doc('inviteCodes', code));
            exists = snap.exists();
            tries++;
        }
        if (exists) throw new Error('코드 생성에 실패했습니다. 다시 시도해주세요.');

        var days = Number(o.expiresInDays) || 0;
        var data = {
            code: code,
            companyId: this._companyId,
            companyName: o.companyName || '',
            role: o.role,
            roleLabel: o.roleLabel,
            memo: o.memo || '',
            maxUses: Number(o.maxUses) || 0,
            usedCount: 0,
            active: true,
            createdBy: this._userId,
            createdByName: o.createdByName || '',
            createdAt: new Date().toISOString(),
            expiresAt: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : ''
        };

        await FB.setDoc(FB.doc('inviteCodes', code), data);
        // 회사 하위에도 사본을 둬서 관리 화면에서 목록 조회가 가능하게 한다
        // (최상위 inviteCodes는 보안상 list가 막혀 있다)
        await FB.setDoc(FB.doc(FB.collection(this._col('invites')), code), data);
        return data;
    },

    /**
     * 회사 대표 코드 발급 — 회사를 새로 등록할 때 자동으로 하나 만든다.
     * 기간·횟수 제한이 없어 직원 모두에게 같은 코드를 나눠줄 수 있다.
     * 권한은 가장 낮은 '직원'으로 시작하고, 필요한 사람만 팀 관리에서 올린다.
     */
    createPrimaryCode: async function (companyName, createdByName) {
        var inv = await this.createInvite({
            role: 'worker',
            roleLabel: '직원',
            memo: '회사 대표 코드 (자동 발급)',
            maxUses: 0,
            expiresInDays: 0,
            companyName: companyName,
            createdByName: createdByName
        });
        // 대표 코드임을 표시 (팀 관리 화면에서 따로 보여준다)
        try {
            await FB.updateDoc(FB.doc(FB.collection(this._col('invites')), inv.code), { isPrimary: true });
            inv.isPrimary = true;
        } catch (e) { /* 표시 실패해도 코드 자체는 유효 */ }
        return inv;
    },

    // 현재 회사의 대표 코드 조회 (없으면 null)
    getPrimaryCode: async function () {
        var list = await this.listInvites();
        for (var i = 0; i < list.length; i++) {
            if (list[i].isPrimary && list[i].active) return list[i];
        }
        return null;
    },

    listInvites: async function () {
        try {
            var snap = await FB.getDocs(FB.collection(this._col('invites')));
            var arr = [];
            snap.forEach(function (d) { arr.push(d.data()); });
            arr.sort(function (a, b) { return (b.createdAt || '') > (a.createdAt || '') ? 1 : -1; });

            // 사용 횟수·활성 여부의 원본은 최상위 inviteCodes 문서다.
            // (가입자는 최상위만 갱신할 수 있어 이 사본은 뒤처진다)
            await Promise.all(arr.map(async function (v) {
                try {
                    var t = await FB.getDoc(FB.doc('inviteCodes', v.code));
                    if (t.exists()) {
                        var d = t.data();
                        v.usedCount = d.usedCount || 0;
                        v.active = d.active;
                        v.lastUsedAt = d.lastUsedAt || '';
                    } else {
                        // 최상위가 지워졌으면 더 이상 쓸 수 없는 코드다
                        v.active = false;
                    }
                } catch (e) { /* 조회 실패 시 사본 값 유지 */ }
            }));

            return arr;
        } catch (e) {
            console.warn('[DB] 초대 목록 조회 실패', e);
            return [];
        }
    },

    setInviteActive: async function (code, active) {
        await FB.updateDoc(FB.doc('inviteCodes', code), { active: !!active });
        await FB.updateDoc(FB.doc(FB.collection(this._col('invites')), code), { active: !!active });
    },

    deleteInvite: async function (code) {
        await FB.deleteDoc(FB.doc('inviteCodes', code));
        await FB.deleteDoc(FB.doc(FB.collection(this._col('invites')), code));
    },

    // 가입 화면에서 코드 확인 (로그인 상태여야 조회 가능)
    lookupInvite: async function (code) {
        var norm = this.normalizeCode(code);
        var snap = await FB.getDoc(FB.doc('inviteCodes', norm));
        if (!snap.exists()) return { ok: false, reason: '존재하지 않는 코드입니다.' };

        var inv = snap.data();
        if (!inv.active) return { ok: false, reason: '사용 중지된 코드입니다.' };
        if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
            return { ok: false, reason: '유효기간이 지난 코드입니다.' };
        }
        if (inv.maxUses > 0 && inv.usedCount >= inv.maxUses) {
            return { ok: false, reason: '사용 횟수를 모두 채운 코드입니다.' };
        }
        return { ok: true, invite: inv };
    },

    // 입력 편의: 공백·하이픈 무시, 대문자 통일 후 4-4 형식으로 복원
    normalizeCode: function (raw) {
        var s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return s.length > 4 ? s.slice(0, 4) + '-' + s.slice(4) : s;
    },

    /** 초대 코드로 회사 합류 (계정 생성 후 호출) */
    joinWithInvite: async function (code, user, name) {
        var res = await this.lookupInvite(code);
        if (!res.ok) throw new Error(res.reason);
        var inv = res.invite;

        // 멤버 등록 — 규칙이 inviteCode 필드로 유효성을 재검증한다
        await FB.setDoc(
            FB.doc(FB.collection('companies/' + inv.companyId + '/members'), user.uid),
            {
                uid: user.uid,
                email: user.email,
                name: name,
                role: inv.role,
                roleLabel: inv.roleLabel,
                inviteCode: inv.code,
                joinedAt: new Date().toISOString()
            }
        );

        await this.saveUserProfile(user.uid, {
            uid: user.uid,
            name: name,
            email: user.email,
            companyId: inv.companyId,
            role: inv.role,
            roleLabel: inv.roleLabel,
            createdAt: new Date().toISOString()
        });

        // 사용 횟수 기록 (실패해도 가입 자체는 유효하므로 무시)
        try {
            await FB.updateDoc(FB.doc('inviteCodes', inv.code), {
                usedCount: (inv.usedCount || 0) + 1,
                lastUsedAt: new Date().toISOString(),
                lastUsedBy: user.uid
            });
        } catch (e) { /* 무시 */ }

        return inv.companyId;
    },

    /* ===== 멤버 관리 ===== */

    listMembers: async function () {
        try {
            var snap = await FB.getDocs(FB.collection(this._col('members')));
            var arr = [];
            snap.forEach(function (d) { arr.push(d.data()); });
            arr.sort(function (a, b) { return (a.joinedAt || '') > (b.joinedAt || '') ? 1 : -1; });
            return arr;
        } catch (e) {
            console.warn('[DB] 멤버 목록 조회 실패', e);
            return [];
        }
    },

    updateMemberRole: async function (uid, role, roleLabel) {
        await FB.updateDoc(
            FB.doc(FB.collection(this._col('members')), uid),
            { role: role, roleLabel: roleLabel, roleChangedAt: new Date().toISOString() }
        );
    },

    removeMember: async function (uid) {
        await FB.deleteDoc(FB.doc(FB.collection(this._col('members')), uid));
    },

    getMemberRole: async function (companyId, userId) {
        try {
            var memberDoc = await FB.getDoc(
                FB.doc(FB.collection('companies/' + companyId + '/members'), userId)
            );
            return memberDoc.exists() ? memberDoc.data() : null;
        } catch (e) {
            return null;
        }
    },

    // ===== 공수 (Gongsu) 특수 처리 =====

    setGongsu: async function (personId, date, value) {
        var key = personId + '_' + date;
        try {
            var docRef = FB.doc(FB.collection(this._col('gongsu')), key);
            await FB.setDoc(docRef, {
                id: key, personId: personId, date: date, value: value,
                updatedAt: new Date().toISOString()
            });
            localStorage.setItem('builderoffice_gongsu_' + key, String(value));
        } catch (e) {
            localStorage.setItem('builderoffice_gongsu_' + key, String(value));
        }
    },

    getGongsu: async function (personId, date) {
        var key = personId + '_' + date;
        try {
            var docRef = FB.doc(FB.collection(this._col('gongsu')), key);
            var snap = await FB.getDoc(docRef);
            return snap.exists() ? snap.data().value : 0;
        } catch (e) {
            var local = localStorage.getItem('builderoffice_gongsu_' + key);
            return local ? parseFloat(local) : 0;
        }
    },

    setSiteGongsu: async function (personId, siteId, date, value) {
        var key = personId + '__' + siteId + '__' + date;
        try {
            var docRef = FB.doc(FB.collection(this._col('siteGongsu')), key);
            await FB.setDoc(docRef, {
                id: key, personId: personId, siteId: siteId, date: date, value: value,
                updatedAt: new Date().toISOString()
            });
            localStorage.setItem('builderoffice_site_gongsu_' + key, String(value));
        } catch (e) {
            localStorage.setItem('builderoffice_site_gongsu_' + key, String(value));
        }
    },

    getSiteGongsu: async function (personId, siteId, date) {
        var key = personId + '__' + siteId + '__' + date;
        try {
            var docRef = FB.doc(FB.collection(this._col('siteGongsu')), key);
            var snap = await FB.getDoc(docRef);
            return snap.exists() ? snap.data().value : 0;
        } catch (e) {
            var local = localStorage.getItem('builderoffice_site_gongsu_' + key);
            return local ? parseFloat(local) : 0;
        }
    },

    // ===== KOSHA 기록 =====

    addKoshaRecord: async function (record) {
        return this.add('koshaRecords', record);
    },

    getKoshaRecords: async function (categoryCode) {
        try {
            var all = await this.getAll('koshaRecords');
            if (categoryCode) {
                return all.filter(function (r) { return r.categoryCode === categoryCode; });
            }
            return all;
        } catch (e) {
            return Store._get('builderoffice_koshaRecords') || [];
        }
    },

    getKoshaStats: async function () {
        try {
            var records = await this.getAll('koshaRecords');
            var stats = {};
            records.forEach(function (r) {
                if (!stats[r.categoryCode]) {
                    stats[r.categoryCode] = { total: 0, passed: 0, latest: null };
                }
                stats[r.categoryCode].total++;
                if (r.passed) stats[r.categoryCode].passed++;
                if (!stats[r.categoryCode].latest || r.date > stats[r.categoryCode].latest) {
                    stats[r.categoryCode].latest = r.date;
                }
            });
            return stats;
        } catch (e) {
            return {};
        }
    },

    // ===== 파일 업로드 =====

    // Storage 버킷이 없으면 SDK가 오류 없이 무한 대기한다.
    // 그대로 두면 업로드 화면이 영원히 멈추므로 제한 시간을 둔다.
    UPLOAD_TIMEOUT_MS: 60000,

    uploadFile: async function (file, path) {
        if (typeof FB === 'undefined' || !FB.storageRef) {
            throw new Error('파일 저장소가 연결되지 않았습니다.');
        }
        var self = this;
        var storageRef = FB.storageRef('companies/' + this._companyId + '/' + path);

        function withTimeout(promise, label) {
            return Promise.race([
                promise,
                new Promise(function (_, reject) {
                    setTimeout(function () {
                        reject(new Error('파일 저장소에 연결할 수 없습니다. (' + label + ' 응답 없음)\n' +
                            'Firebase 콘솔에서 Storage가 활성화되어 있는지 확인해주세요.'));
                    }, self.UPLOAD_TIMEOUT_MS);
                })
            ]);
        }

        try {
            var snapshot = await withTimeout(FB.uploadBytes(storageRef, file), '업로드');
            return await withTimeout(FB.getDownloadURL(snapshot.ref), '주소 조회');
        } catch (e) {
            console.error('[DB] 파일 업로드 실패:', e);
            throw e;
        }
    },

    // Storage 사용 가능 여부 확인 (UI에서 업로드 버튼 노출 판단용)
    isStorageReady: async function () {
        try {
            var bucket = window.FirebaseApp && FirebaseApp.options && FirebaseApp.options.storageBucket;
            if (!bucket) return false;
            var r = await fetch('https://firebasestorage.googleapis.com/v0/b/' + bucket + '/o?maxResults=1',
                { cache: 'no-store' });
            // 404 = 버킷 없음, 401/403 = 버킷은 있고 권한 규칙이 막는 중(정상)
            return r.status !== 404;
        } catch (e) {
            return false;
        }
    }
};

// Firebase가 로드되지 않은 경우 localStorage 전용으로 동작하는 fallback
// store.js에 로컬 전용 헬퍼 추가
Store._addToLocal = function (collectionName, data) {
    var key = 'builderoffice_' + collectionName;
    var arr = Store._get(key) || [];
    data.id = data.id || Store._generateId();
    data.createdAt = data.createdAt || new Date().toISOString();
    arr.unshift(data);
    Store._set(key, arr);
    return data;
};

Store._updateLocal = function (collectionName, id, updates) {
    var key = 'builderoffice_' + collectionName;
    var arr = Store._get(key) || [];
    var idx = arr.findIndex(function (x) { return x.id === id; });
    if (idx !== -1) { Object.assign(arr[idx], updates); Store._set(key, arr); return true; }
    return false;
};

Store._deleteLocal = function (collectionName, id) {
    var key = 'builderoffice_' + collectionName;
    var arr = (Store._get(key) || []).filter(function (x) { return x.id !== id; });
    Store._set(key, arr);
    return true;
};
