/* =======================================
   BuilderOffice - Data Store
   LocalStorage 기반 데이터 관리
   ======================================= */

const Store = {
    // === Storage Keys ===
    KEYS: {
        COSTS: 'builderoffice_costs',
        PERSONNEL: 'builderoffice_personnel',
        ATTENDANCE: 'builderoffice_attendance',
        MATERIALS: 'builderoffice_materials',
        MATERIAL_LOGS: 'builderoffice_material_logs',
        SITES: 'builderoffice_sites',
        WORK_INPUTS: 'builderoffice_work_inputs',
        SAFETY_CHECKS: 'builderoffice_safety_checks',
        DOCUMENTS: 'builderoffice_documents',
        APPROVALS: 'builderoffice_approvals',
        ESTIMATES: 'builderoffice_estimates',
        CONTRACTS: 'builderoffice_contracts',
        BILLINGS: 'builderoffice_billings',
    },

    // === Generic CRUD ===
    // 실제 저장소는 Sync 엔진(메모리 캐시 ↔ localStorage ↔ Firestore)이 담당한다.
    // Sync가 로드되지 않은 환경에서는 localStorage 단독으로 동작한다.
    _get(key) {
        if (typeof Sync !== 'undefined') return Sync.read(key);
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading ' + key + ':', e);
            return [];
        }
    },

    _set(key, data) {
        if (typeof Sync !== 'undefined') { Sync.write(key, data); return; }
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving ' + key + ':', e);
        }
    },

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    },

    // === Cost Management ===
    getCosts() {
        return this._get(this.KEYS.COSTS);
    },

    addCost(cost) {
        var costs = this.getCosts();
        cost.id = this._generateId();
        cost.createdAt = new Date().toISOString();
        costs.unshift(cost);
        this._set(this.KEYS.COSTS, costs);
        return cost;
    },

    updateCost(id, updates) {
        var costs = this.getCosts();
        var idx = costs.findIndex(function (c) { return c.id === id; });
        if (idx !== -1) {
            Object.assign(costs[idx], updates);
            this._set(this.KEYS.COSTS, costs);
            return costs[idx];
        }
        return null;
    },

    deleteCost(id) {
        var costs = this.getCosts().filter(function (c) { return c.id !== id; });
        this._set(this.KEYS.COSTS, costs);
    },

    /* ===== 비용의 두 가지 상태 ====================================
       현장에서는 두 상황이 따로 논다:
         · 아직 결재가 안 난 대금        → 승인 상태
         · 결재는 났는데 이번 달 자금이 안 되는 대금 → 지급 상태(홀딩)
       그래서 하나의 상태값으로 합치면 안 되고 축을 둘로 나눈다.
       ============================================================== */
    APPROVAL_STATUS: ['대기', '승인', '반려'],
    PAYMENT_STATUS: ['미지급', '홀딩', '지급완료'],

    // 예전 데이터에는 이 필드들이 없다. 읽을 때 기본값을 채워준다.
    normalizeCost: function (c) {
        if (!c) return c;
        if (!c.approvalStatus) c.approvalStatus = '승인';   // 기존 건은 승인된 것으로 본다
        if (!c.paymentStatus) c.paymentStatus = '미지급';
        return c;
    },

    getCostStats() {
        var costs = this.getCosts();
        var today = new Date().toISOString().split('T')[0];
        var thisMonth = today.substring(0, 7);
        var self = this;

        function sum(arr) {
            return arr.reduce(function (s, c) { return s + Number(c.amount || 0); }, 0);
        }
        var monthCosts = costs.filter(function (c) { return c.date && c.date.indexOf(thisMonth) === 0; });

        // 상태별 집계 (기본값 보정 포함)
        function byApproval(arr, st) {
            return arr.filter(function (c) { return (self.normalizeCost(c).approvalStatus) === st; });
        }
        function byPayment(arr, st) {
            return arr.filter(function (c) { return (self.normalizeCost(c).paymentStatus) === st; });
        }

        return {
            total: sum(costs),
            todayTotal: sum(costs.filter(function (c) { return c.date === today; })),
            monthTotal: sum(monthCosts),
            byCategory: this._groupBy(costs, 'category', 'amount'),
            count: costs.length,

            // 승인 축
            pendingApproval: sum(byApproval(costs, '대기')),
            pendingApprovalCount: byApproval(costs, '대기').length,

            // 지급 축 (승인된 건만 지급 대상이다)
            toPay: sum(byPayment(byApproval(costs, '승인'), '미지급')),
            toPayCount: byPayment(byApproval(costs, '승인'), '미지급').length,
            held: sum(byPayment(costs, '홀딩')),
            heldCount: byPayment(costs, '홀딩').length,
            paid: sum(byPayment(costs, '지급완료')),
            paidCount: byPayment(costs, '지급완료').length,

            monthPaid: sum(byPayment(monthCosts, '지급완료')),
            monthHeld: sum(byPayment(monthCosts, '홀딩'))
        };
    },

    /**
     * 기간별 결산. period: 'month' | 'quarter' | 'year'
     * 현장별·카테고리별·상태별 집계를 한 번에 만든다.
     */
    getCostSettlement: function (period, year, unit) {
        var costs = this.getCosts();
        var self = this;

        function inRange(dateStr) {
            if (!dateStr) return false;
            var y = Number(dateStr.substring(0, 4));
            var m = Number(dateStr.substring(5, 7));
            if (y !== year) return false;
            if (period === 'year') return true;
            if (period === 'month') return m === unit;
            if (period === 'quarter') return Math.ceil(m / 3) === unit;
            return false;
        }

        var rows = costs.filter(function (c) { return inRange(c.date); }).map(function (c) { return self.normalizeCost(c); });

        var bySite = {}, byCat = {}, byMonth = {};
        var total = 0, paid = 0, held = 0, toPay = 0, pending = 0;

        for (var i = 0; i < rows.length; i++) {
            var c = rows[i];
            var amt = Number(c.amount) || 0;
            total += amt;

            var site = c.siteName || '(현장 미지정)';
            bySite[site] = (bySite[site] || 0) + amt;
            byCat[c.category || '기타'] = (byCat[c.category || '기타'] || 0) + amt;

            var mk = Number(c.date.substring(5, 7));
            byMonth[mk] = (byMonth[mk] || 0) + amt;

            if (c.approvalStatus === '대기') pending += amt;
            if (c.paymentStatus === '지급완료') paid += amt;
            else if (c.paymentStatus === '홀딩') held += amt;
            else if (c.approvalStatus === '승인') toPay += amt;
        }

        return {
            rows: rows, total: total, count: rows.length,
            paid: paid, held: held, toPay: toPay, pending: pending,
            bySite: bySite, byCategory: byCat, byMonth: byMonth
        };
    },

    /* === Personnel Management ==================================
       개인정보 분리 보관:
       주민등록번호·은행·계좌번호·주소·일당은 personnel이 아니라
       personnelPrivate 컬렉션에 따로 저장한다.
       Firestore 규칙상 owner/admin과 본인만 읽을 수 있으므로,
       현장소장·일용직이 전 직원 개인정보를 조회할 수 없다.

       호출부는 이 분리를 몰라도 된다 — getPersonnel()이 권한이 있을 때만
       민감 필드를 합쳐서 돌려주고, addPerson/updatePerson이 알아서 나눠 저장한다.
       =========================================================== */
    PERSONNEL_PRIVATE_KEY: 'builderoffice_personnelPrivate',
    PRIVATE_FIELDS: ['residentId', 'bank', 'accountNumber', 'address', 'dailyWage'],

    _getPersonnelRaw() {
        return this._get(this.KEYS.PERSONNEL);
    },

    _getPrivateRaw() {
        return this._get(this.PERSONNEL_PRIVATE_KEY);
    },

    _privateById() {
        var arr = this._getPrivateRaw();
        var map = {};
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] && arr[i].id) map[arr[i].id] = arr[i];
        }
        return map;
    },

    // 입력 객체를 공개(pub) / 민감(priv) 으로 나눈다.
    // '_'로 시작하는 내부 표식(_privateAvailable 등)은 저장하지 않는다.
    _splitPerson(source, id) {
        var pub = {}, priv = { id: id };
        for (var k in source) {
            if (!Object.prototype.hasOwnProperty.call(source, k)) continue;
            if (k.charAt(0) === '_') continue;
            if (this.PRIVATE_FIELDS.indexOf(k) !== -1) priv[k] = source[k];
            else pub[k] = source[k];
        }
        return { pub: pub, priv: priv };
    },

    _savePrivate(id, priv, createdAt) {
        var i, key;
        var hasAny = false;
        for (i = 0; i < this.PRIVATE_FIELDS.length; i++) {
            if (priv[this.PRIVATE_FIELDS[i]] !== undefined) { hasAny = true; break; }
        }
        if (!hasAny) return;

        var arr = this._getPrivateRaw();
        var idx = -1;
        for (i = 0; i < arr.length; i++) if (arr[i].id === id) { idx = i; break; }

        var rec = idx !== -1 ? arr[idx] : { id: id, createdAt: createdAt || new Date().toISOString() };
        for (i = 0; i < this.PRIVATE_FIELDS.length; i++) {
            key = this.PRIVATE_FIELDS[i];
            if (priv[key] !== undefined) rec[key] = priv[key];
        }
        // 본인 열람을 허용하려면 계정 uid를 연결해 둔다 (firestore.rules가 이 값을 본다)
        if (priv.uid) rec.uid = priv.uid;

        if (idx !== -1) arr[idx] = rec; else arr.unshift(rec);
        this._set(this.PERSONNEL_PRIVATE_KEY, arr);
    },

    /**
     * 공개 정보 + (열람 권한이 있을 때만) 민감 정보를 합쳐 돌려준다.
     * 반환값은 복사본이다 — 이 배열을 변형해 _set 하지 말 것.
     * 각 항목의 `_privateAvailable`로 민감정보 열람 가능 여부를 알 수 있다.
     */
    getPersonnel() {
        var pub = this._getPersonnelRaw();
        // 권한이 없으면 Firestore가 personnelPrivate를 아예 내려주지 않으므로
        // 이 맵은 비어 있다. 로컬 모드에서도 같게 동작하도록 아래에서 한 번 더 막는다.
        var privMap = this._privateById();
        var adminView = this.canViewSensitive();
        var me = (typeof App !== 'undefined' && App.currentUser) ? App.currentUser.id : null;
        var out = [];

        for (var i = 0; i < pub.length; i++) {
            var p = pub[i], merged = {}, k;
            for (k in p) {
                if (Object.prototype.hasOwnProperty.call(p, k)) merged[k] = p[k];
            }

            // 관리자이거나, 본인 기록일 때만 민감정보를 합친다
            var isSelf = !!(me && (p.uid === me || p.userId === me));
            var pv = (adminView || isSelf) ? privMap[p.id] : null;

            if (pv) {
                for (var f = 0; f < this.PRIVATE_FIELDS.length; f++) {
                    var key = this.PRIVATE_FIELDS[f];
                    if (pv[key] !== undefined) merged[key] = pv[key];
                }
            }
            merged._privateAvailable = !!pv;
            out.push(merged);
        }
        return out;
    },

    getPerson(id) {
        var all = this.getPersonnel();
        for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
        return null;
    },

    // 로그인 사용자가 인원 명부의 민감정보를 볼 수 있는지 (표/폼 게이팅용)
    canViewPersonnelPrivate() {
        return this.canViewSensitive();
    },

    addPerson(person) {
        var id = this._generateId();
        var createdAt = new Date().toISOString();
        var split = this._splitPerson(person, id);

        split.pub.id = id;
        split.pub.createdAt = createdAt;

        var personnel = this._getPersonnelRaw();
        personnel.unshift(split.pub);
        this._set(this.KEYS.PERSONNEL, personnel);

        this._savePrivate(id, split.priv, createdAt);

        // 호출부는 합쳐진 객체를 기대한다
        var merged = {}, k;
        for (k in split.pub) if (Object.prototype.hasOwnProperty.call(split.pub, k)) merged[k] = split.pub[k];
        for (k in split.priv) if (k !== 'id' && Object.prototype.hasOwnProperty.call(split.priv, k)) merged[k] = split.priv[k];
        return merged;
    },

    updatePerson(id, updates) {
        var personnel = this._getPersonnelRaw();
        var idx = personnel.findIndex(function (p) { return p.id === id; });
        if (idx === -1) return null;

        var split = this._splitPerson(updates, id);

        // 공개 필드에 실제 변경이 있을 때만 personnel을 다시 쓴다
        var hasPub = false;
        for (var k in split.pub) {
            if (k !== 'id' && Object.prototype.hasOwnProperty.call(split.pub, k)) { hasPub = true; break; }
        }
        if (hasPub) {
            Object.assign(personnel[idx], split.pub);
            this._set(this.KEYS.PERSONNEL, personnel);
        }

        // 민감 필드는 전달된 것만 갱신한다.
        // 열람 권한이 없는 사용자가 저장해도 기존 값이 지워지지 않는다.
        this._savePrivate(id, split.priv);

        return this.getPerson(id);
    },

    deletePerson(id) {
        var personnel = this._getPersonnelRaw().filter(function (p) { return p.id !== id; });
        this._set(this.KEYS.PERSONNEL, personnel);

        // 분리 보관된 개인정보도 함께 삭제
        var priv = this._getPrivateRaw().filter(function (r) { return r.id !== id; });
        this._set(this.PERSONNEL_PRIVATE_KEY, priv);

        // Also delete related attendance
        var attendance = this.getAttendance().filter(function (a) { return a.personId !== id; });
        this._set(this.KEYS.ATTENDANCE, attendance);
    },

    /**
     * 기존에 personnel 안에 들어 있던 민감 필드를 personnelPrivate로 옮긴다.
     * 관리자 로그인 시 1회 실행되며, 옮긴 인원 수를 반환한다.
     * (personnelPrivate 쓰기 권한이 owner/admin에게만 있으므로 관리자만 수행)
     */
    migratePersonnelPrivate() {
        if (!this.canViewSensitive()) return 0;

        var personnel = this._getPersonnelRaw();
        var privArr = this._getPrivateRaw();
        var privMap = {};
        var i, j, key;
        for (i = 0; i < privArr.length; i++) if (privArr[i].id) privMap[privArr[i].id] = privArr[i];

        var moved = 0, dirty = false;

        for (i = 0; i < personnel.length; i++) {
            var p = personnel[i];
            var found = false;
            var rec = privMap[p.id] || { id: p.id, createdAt: p.createdAt || new Date().toISOString() };

            for (j = 0; j < this.PRIVATE_FIELDS.length; j++) {
                key = this.PRIVATE_FIELDS[j];
                if (p[key] !== undefined) {
                    if (rec[key] === undefined) rec[key] = p[key];
                    delete p[key];
                    found = true;
                }
            }
            if (found) {
                if (!privMap[p.id]) { privMap[p.id] = rec; privArr.unshift(rec); }
                moved++;
                dirty = true;
            }
        }

        if (dirty) {
            // 배열 두 개를 각각 한 번씩만 저장한다 (인원 수만큼 동기화가 터지지 않도록)
            this._set(this.PERSONNEL_PRIVATE_KEY, privArr);
            this._set(this.KEYS.PERSONNEL, personnel);
        }
        return moved;
    },

    // === Attendance ===
    getAttendance() {
        return this._get(this.KEYS.ATTENDANCE);
    },

    addAttendance(record) {
        var attendance = this.getAttendance();
        record.id = this._generateId();
        record.createdAt = new Date().toISOString();
        attendance.unshift(record);
        this._set(this.KEYS.ATTENDANCE, attendance);
        return record;
    },

    updateAttendance(id, updates) {
        var attendance = this.getAttendance();
        var idx = attendance.findIndex(function (a) { return a.id === id; });
        if (idx !== -1) {
            Object.assign(attendance[idx], updates);
            this._set(this.KEYS.ATTENDANCE, attendance);
            return attendance[idx];
        }
        return null;
    },

    deleteAttendance(id) {
        var attendance = this.getAttendance().filter(function (a) { return a.id !== id; });
        this._set(this.KEYS.ATTENDANCE, attendance);
    },

    getPersonnelStats() {
        var personnel = this.getPersonnel();
        var attendance = this.getAttendance();
        var today = new Date().toISOString().split('T')[0];

        var todayAttendance = attendance.filter(function (a) { return a.date === today; });
        var byJob = {};
        personnel.forEach(function (p) {
            byJob[p.jobType] = (byJob[p.jobType] || 0) + 1;
        });

        return {
            totalRegistered: personnel.length,
            todayCount: todayAttendance.length,
            todayHours: todayAttendance.reduce(function (sum, a) { return sum + Number(a.hours || 8); }, 0),
            byJobType: byJob,
        };
    },

    // === Materials Management ===
    getMaterials() {
        return this._get(this.KEYS.MATERIALS);
    },

    addMaterial(material) {
        var materials = this.getMaterials();
        material.id = this._generateId();
        material.createdAt = new Date().toISOString();
        material.stock = Number(material.stock) || 0;
        materials.unshift(material);
        this._set(this.KEYS.MATERIALS, materials);
        return material;
    },

    updateMaterial(id, updates) {
        var materials = this.getMaterials();
        var idx = materials.findIndex(function (m) { return m.id === id; });
        if (idx !== -1) {
            Object.assign(materials[idx], updates);
            this._set(this.KEYS.MATERIALS, materials);
            return materials[idx];
        }
        return null;
    },

    deleteMaterial(id) {
        var materials = this.getMaterials().filter(function (m) { return m.id !== id; });
        this._set(this.KEYS.MATERIALS, materials);
        var logs = this.getMaterialLogs().filter(function (l) { return l.materialId !== id; });
        this._set(this.KEYS.MATERIAL_LOGS, logs);
    },

    // === Material Logs ===
    getMaterialLogs() {
        return this._get(this.KEYS.MATERIAL_LOGS);
    },

    addMaterialLog(log) {
        var logs = this.getMaterialLogs();
        log.id = this._generateId();
        log.createdAt = new Date().toISOString();
        logs.unshift(log);
        this._set(this.KEYS.MATERIAL_LOGS, logs);

        var self = this;
        var material = this.getMaterials().find(function (m) { return m.id === log.materialId; });
        if (material) {
            var qty = Number(log.quantity);
            var newStock = log.type === 'in'
                ? Number(material.stock) + qty
                : Number(material.stock) - qty;
            this.updateMaterial(log.materialId, { stock: Math.max(0, newStock) });
        }

        return log;
    },

    getMaterialStats() {
        var materials = this.getMaterials();
        var logs = this.getMaterialLogs();

        var totalValue = materials.reduce(function (sum, m) { return sum + (Number(m.stock) * Number(m.unitPrice || 0)); }, 0);
        var lowStock = materials.filter(function (m) { return Number(m.stock) <= Number(m.minStock || 10); });
        var byCategory = {};
        materials.forEach(function (m) {
            byCategory[m.category] = (byCategory[m.category] || 0) + 1;
        });

        return {
            totalItems: materials.length,
            totalValue: totalValue,
            lowStockCount: lowStock.length,
            byCategory: byCategory,
            recentLogs: logs.slice(0, 10),
        };
    },

    // === Helper Functions ===
    _groupBy(arr, key, sumKey) {
        var result = {};
        arr.forEach(function (item) {
            var group = item[key] || '기타';
            result[group] = (result[group] || 0) + Number(item[sumKey] || 0);
        });
        return result;
    },

    /* ===== 개인정보 열람 통제 ===============================
       주민등록번호·계좌번호는 owner/admin과 본인만 볼 수 있다.
       ※ 이것은 화면 표시 통제일 뿐이다. 실제 강제는 firestore.rules가 한다.
       ======================================================= */
    SENSITIVE_ROLES: ['owner', 'admin'],

    canViewSensitive: function (person) {
        var u = (typeof App !== 'undefined' && App.currentUser) ? App.currentUser : null;
        if (!u) return false;
        if (this.SENSITIVE_ROLES.indexOf(u.role) !== -1) return true;
        // 본인 정보는 본인이 볼 수 있다
        return !!(person && (person.uid === u.id || person.userId === u.id));
    },

    // 주민등록번호: 생년월일 + 성별 1자리까지만 노출 (850315-1******)
    maskResidentId: function (rid, person) {
        if (!rid) return '-';
        if (this.canViewSensitive(person)) return rid;
        var digits = String(rid).replace(/[^0-9]/g, '');
        if (digits.length < 7) return '******';
        return digits.substring(0, 6) + '-' + digits.substring(6, 7) + '******';
    },

    // 계좌번호: 뒤 4자리만 노출
    maskAccount: function (acc, person) {
        if (!acc) return '-';
        if (this.canViewSensitive(person)) return acc;
        var s = String(acc);
        return s.length <= 4 ? '****' : '****' + s.slice(-4);
    },

    escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    },

    formatNumber(num) {
        return new Intl.NumberFormat('ko-KR').format(num);
    },

    formatCurrency(num) {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0
        }).format(num);
    },

    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    // === Gongsu (공수) Management ===
    GONGSU_KEY: 'builderoffice_gongsu',

    getGongsuData: function () {
        if (typeof Sync !== 'undefined') return Sync.read(this.GONGSU_KEY);
        try {
            var raw = localStorage.getItem(this.GONGSU_KEY);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            // 공수는 맵 구조이므로, 배열이 들어있으면 빈 객체로 교체
            if (Array.isArray(parsed)) return {};
            return parsed;
        } catch (e) {
            return {};
        }
    },

    _saveGongsuData: function (data) {
        if (typeof Sync !== 'undefined') { Sync.write(this.GONGSU_KEY, data); return; }
        try {
            localStorage.setItem(this.GONGSU_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving gongsu:', e);
        }
    },

    // key format: "personId_YYYY-MM-DD"
    setGongsu: function (personId, dateStr, value) {
        var data = this.getGongsuData();
        var key = personId + '_' + dateStr;
        if (value === 0 || value === '' || value === null) {
            delete data[key];
        } else {
            data[key] = Number(value);
        }
        this._saveGongsuData(data);
    },

    getGongsu: function (personId, dateStr) {
        var data = this.getGongsuData();
        return data[personId + '_' + dateStr] || 0;
    },

    // Returns: { personId: { 1: val, 2: val, ..., total: X }, ... }
    getMonthlyGongsu: function (year, month) {
        var data = this.getGongsuData();
        var prefix = year + '-' + String(month).padStart(2, '0');
        var result = {};
        var personnel = this.getPersonnel();

        for (var i = 0; i < personnel.length; i++) {
            var pid = personnel[i].id;
            result[pid] = { total: 0 };
        }

        for (var k in data) {
            if (!data.hasOwnProperty(k)) continue;
            var parts = k.split('_');
            var pid2 = parts[0];
            var dt = parts.slice(1).join('_');
            if (dt.startsWith(prefix) && result[pid2]) {
                var day = parseInt(dt.split('-')[2], 10);
                result[pid2][day] = data[k];
                result[pid2].total += data[k];
            }
        }

        return result;
    },

    getDaysInMonth: function (year, month) {
        return new Date(year, month, 0).getDate();
    },

    getDayOfWeek: function (year, month, day) {
        return new Date(year, month - 1, day).getDay(); // 0=Sun,6=Sat
    },

    /* ===== 4대보험 요율 (근로자 부담분) =========================
       ⚠️ 요율은 매년 변경됩니다. 연초에 반드시 확인 후 basisYear와 함께 갱신하세요.
          국민연금: 국민연금공단 / 건강·장기요양: 보건복지부 고시 / 고용보험: 고용노동부
       ※ 산재보험은 전액 사업주 부담이므로 근로자 공제 항목에 없습니다.
       =========================================================== */
    INSURANCE_RATES: {
        basisYear: 2025,              // 이 요율의 기준 연도
        nationalPension: 0.045,       // 국민연금 4.5% (노사 합산 9%의 1/2)
        healthInsurance: 0.03545,     // 건강보험 3.545% (노사 합산 7.09%의 1/2)
        longTermCare: 0.1295,         // 장기요양 = 건강보험료 × 12.95%
        employmentInsurance: 0.009,   // 고용보험(실업급여) 0.9%
        localIncomeTax: 0.10          // 지방소득세 = 소득세 × 10%
    },

    // 일용근로소득 원천징수 규칙
    DAILY_TAX: {
        dailyDeduction: 150000,       // 1일 근로소득공제 15만원
        rate: 0.06,                   // 세율 6%
        taxCredit: 0.55,              // 근로소득세액공제 55%
        minWithhold: 1000             // 소액부징수: 1일 산출세액 1,000원 미만이면 징수하지 않음
    },

    // 일용직 4대보험 적용 요건 (월 단위 판단)
    DAILY_INSURANCE_ELIGIBILITY: {
        pensionMinDays: 8,            // 국민연금: 월 8일 이상
        pensionMinHours: 60,          // 또는 월 60시간 이상
        healthMinDays: 8              // 건강보험: 월 8일 이상
    },

    /**
     * 일용근로소득세 (1일분).
     * (일급 − 15만원) × 6% × (1 − 55%). 1,000원 미만은 소액부징수로 0원.
     * 월 총액에 한 번 적용하면 안 된다 — 반드시 일 단위로 계산해야 한다.
     */
    calcDailyIncomeTax: function (dayPay) {
        var t = this.DAILY_TAX;
        var taxable = Math.max(0, (Number(dayPay) || 0) - t.dailyDeduction);

        // (1 - 0.55)는 부동소수점상 0.44999...가 되어 절사 결과가 10원 어긋난다.
        // 소수점 2자리로 정규화한 뒤 절사한다.
        var tax = Math.round(taxable * t.rate * (1 - t.taxCredit) * 100) / 100;

        if (tax < t.minWithhold) return 0;
        return Math.floor(tax / 10) * 10;   // 10원 미만 절사
    },

    /**
     * 월 급여 공제 계산.
     * @param {Object} o
     *   o.dailyPays  일자별 지급액 배열 — 일용직 소득세를 정확히 계산하려면 필수
     *   o.grossPay   총 지급액 (dailyPays가 없을 때 사용)
     *   o.workDays   근로일수
     *   o.workHours  근로시간 (미지정 시 근로일수 × 8시간으로 추정)
     *   o.forcePension / o.forceHealth  적용 요건 판단을 수동으로 덮어쓸 때
     */
    calcPayroll: function (o) {
        o = o || {};
        var r = this.INSURANCE_RATES;
        var el = this.DAILY_INSURANCE_ELIGIBILITY;
        var i;

        var dailyPays = o.dailyPays || [];
        var grossPay;
        if (o.grossPay != null) {
            grossPay = Number(o.grossPay) || 0;
        } else {
            grossPay = 0;
            for (i = 0; i < dailyPays.length; i++) grossPay += Number(dailyPays[i]) || 0;
        }

        var workDays;
        if (o.workDays != null) {
            workDays = Number(o.workDays) || 0;
        } else {
            workDays = 0;
            for (i = 0; i < dailyPays.length; i++) if (Number(dailyPays[i]) > 0) workDays++;
        }
        var workHours = o.workHours != null ? Number(o.workHours) : workDays * 8;

        // --- 소득세: 일 단위 계산 + 소액부징수 ---
        var incomeTax = 0;
        if (dailyPays.length) {
            for (i = 0; i < dailyPays.length; i++) incomeTax += this.calcDailyIncomeTax(dailyPays[i]);
        } else if (workDays > 0) {
            // 일자별 자료가 없으면 균등 분배로 근사한다
            incomeTax = this.calcDailyIncomeTax(grossPay / workDays) * workDays;
        }
        var residentTax = Math.floor((incomeTax * r.localIncomeTax) / 10) * 10;

        // --- 4대보험 적용 요건 ---
        var pensionApplies = (o.forcePension != null)
            ? !!o.forcePension
            : (workDays >= el.pensionMinDays || workHours >= el.pensionMinHours);
        var healthApplies = (o.forceHealth != null)
            ? !!o.forceHealth
            : (workDays >= el.healthMinDays);

        var pension = pensionApplies ? Math.round(grossPay * r.nationalPension) : 0;
        var health = healthApplies ? Math.round(grossPay * r.healthInsurance) : 0;
        var longCare = healthApplies ? Math.round(health * r.longTermCare) : 0;
        // 고용보험은 근로일수와 무관하게 일용직에도 적용된다
        var employment = Math.round(grossPay * r.employmentInsurance);

        var totalDeduction = pension + health + longCare + employment + incomeTax + residentTax;

        return {
            grossPay: grossPay,
            pension: pension,
            health: health,
            longCare: longCare,
            employment: employment,
            incomeTax: incomeTax,
            residentTax: residentTax,
            totalDeduction: totalDeduction,
            netPay: grossPay - totalDeduction,
            workDays: workDays,
            workHours: workHours,
            pensionApplies: pensionApplies,
            healthApplies: healthApplies,
            basisYear: r.basisYear
        };
    },

    // 구버전 호환 래퍼
    calcInsurance: function (grossPay, opts) {
        var o = opts || {};
        o.grossPay = grossPay;
        return this.calcPayroll(o);
    },

    // === 현장별 공수 자동입력 (근로자공수자동입력) ===
    SITE_GONGSU_KEY: 'builderoffice_site_gongsu',

    getSiteGongsuData: function () {
        if (typeof Sync !== 'undefined') return Sync.read(this.SITE_GONGSU_KEY);
        try {
            var raw = localStorage.getItem(this.SITE_GONGSU_KEY);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            return (typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
        } catch (e) { return {}; }
    },

    _saveSiteGongsuData: function (data) {
        if (typeof Sync !== 'undefined') { Sync.write(this.SITE_GONGSU_KEY, data); return; }
        try { localStorage.setItem(this.SITE_GONGSU_KEY, JSON.stringify(data)); }
        catch (e) { console.error('Error saving site gongsu:', e); }
    },

    // key: "personId__siteId__YYYY-MM-DD"
    setSiteGongsu: function (personId, siteId, dateStr, value) {
        var data = this.getSiteGongsuData();
        var key = personId + '__' + siteId + '__' + dateStr;
        if (!value || value === 0) delete data[key];
        else data[key] = Number(value);
        this._saveSiteGongsuData(data);
    },

    getSiteGongsu: function (personId, siteId, dateStr) {
        var data = this.getSiteGongsuData();
        return data[personId + '__' + siteId + '__' + dateStr] || 0;
    },

    // 특정 현장의 월별 공수: { personId: { day: gongsu, total: X }, ... }
    getMonthlySiteGongsu: function (year, month, siteId) {
        var data = this.getSiteGongsuData();
        var prefix = year + '-' + String(month).padStart(2, '0');
        var personnel = this.getPersonnel();
        var result = {};
        for (var i = 0; i < personnel.length; i++) {
            result[personnel[i].id] = { total: 0 };
        }
        for (var k in data) {
            if (!data.hasOwnProperty(k)) continue;
            var parts = k.split('__');
            if (parts.length !== 3) continue;
            var pid = parts[0], sid = parts[1], dt = parts[2];
            if (sid !== siteId || !dt.startsWith(prefix)) continue;
            if (!result[pid]) result[pid] = { total: 0 };
            var day = parseInt(dt.split('-')[2], 10);
            result[pid][day] = (result[pid][day] || 0) + data[k];
            result[pid].total = (result[pid].total || 0) + data[k];
        }
        return result;
    },

    // 통합 일자별 공수 (전 현장 합산): { personId: { 1: 공수, 2: 공수, ..., total: X } }
    // 일용직 소득세는 일 단위로 계산해야 하므로 일자별 분해가 필요하다.
    getMonthlyTonghabDaily: function (year, month) {
        var data = this.getSiteGongsuData();
        var prefix = year + '-' + String(month).padStart(2, '0');
        var result = {};
        for (var k in data) {
            if (!data.hasOwnProperty(k)) continue;
            var parts = k.split('__');
            if (parts.length !== 3) continue;
            var pid = parts[0], dt = parts[2];
            if (dt.indexOf(prefix) !== 0) continue;
            if (!result[pid]) result[pid] = { total: 0 };
            var day = parseInt(dt.split('-')[2], 10);
            result[pid][day] = (result[pid][day] || 0) + data[k];
            result[pid].total += data[k];
        }
        return result;
    },

    // 통합공수 (전 현장 합산): { personId: { siteId: total, grandTotal: X }, ... }
    getMonthlyTonghabGongsu: function (year, month) {
        var data = this.getSiteGongsuData();
        var prefix = year + '-' + String(month).padStart(2, '0');
        var result = {};
        for (var k in data) {
            if (!data.hasOwnProperty(k)) continue;
            var parts = k.split('__');
            if (parts.length !== 3) continue;
            var pid = parts[0], sid = parts[1], dt = parts[2];
            if (!dt.startsWith(prefix)) continue;
            if (!result[pid]) result[pid] = { grandTotal: 0 };
            result[pid][sid] = (result[pid][sid] || 0) + data[k];
            result[pid].grandTotal = (result[pid].grandTotal || 0) + data[k];
        }
        return result;
    },

    // === Site Management ===
    getSites() { return this._get(this.KEYS.SITES); },
    addSite(site) {
        var sites = this.getSites();
        site.id = this._generateId();
        site.createdAt = new Date().toISOString();
        sites.unshift(site);
        this._set(this.KEYS.SITES, sites);
        return site;
    },
    updateSite(id, updates) {
        var sites = this.getSites();
        var idx = sites.findIndex(function (s) { return s.id === id; });
        if (idx !== -1) { Object.assign(sites[idx], updates); this._set(this.KEYS.SITES, sites); return sites[idx]; }
        return null;
    },
    deleteSite(id) {
        var sites = this.getSites().filter(function (s) { return s.id !== id; });
        this._set(this.KEYS.SITES, sites);
    },

    // === Work Input Management ===
    getWorkInputs() { return this._get(this.KEYS.WORK_INPUTS); },
    addWorkInput(input) {
        var inputs = this.getWorkInputs();
        input.id = this._generateId();
        input.createdAt = new Date().toISOString();
        input.status = input.status || '작성';
        inputs.unshift(input);
        this._set(this.KEYS.WORK_INPUTS, inputs);
        return input;
    },
    updateWorkInput(id, updates) {
        var inputs = this.getWorkInputs();
        var idx = inputs.findIndex(function (w) { return w.id === id; });
        if (idx !== -1) { Object.assign(inputs[idx], updates); this._set(this.KEYS.WORK_INPUTS, inputs); return inputs[idx]; }
        return null;
    },
    deleteWorkInput(id) {
        var inputs = this.getWorkInputs().filter(function (w) { return w.id !== id; });
        this._set(this.KEYS.WORK_INPUTS, inputs);
    },

    // === Safety Check Management ===
    getSafetyChecks() { return this._get(this.KEYS.SAFETY_CHECKS); },
    addSafetyCheck(check) {
        var checks = this.getSafetyChecks();
        check.id = this._generateId();
        check.createdAt = new Date().toISOString();
        checks.unshift(check);
        this._set(this.KEYS.SAFETY_CHECKS, checks);
        return check;
    },
    updateSafetyCheck(id, updates) {
        var checks = this.getSafetyChecks();
        var idx = checks.findIndex(function (c) { return c.id === id; });
        if (idx !== -1) { Object.assign(checks[idx], updates); this._set(this.KEYS.SAFETY_CHECKS, checks); return checks[idx]; }
        return null;
    },

    // === Document Management ===
    getDocuments() { return this._get(this.KEYS.DOCUMENTS); },
    addDocument(doc) {
        var docs = this.getDocuments();
        doc.id = this._generateId();
        doc.createdAt = new Date().toISOString();
        docs.unshift(doc);
        this._set(this.KEYS.DOCUMENTS, docs);
        return doc;
    },
    deleteDocument(id) {
        var docs = this.getDocuments().filter(function (d) { return d.id !== id; });
        this._set(this.KEYS.DOCUMENTS, docs);
    },

    // === Approval Management ===
    getApprovals() { return this._get(this.KEYS.APPROVALS); },
    addApproval(approval) {
        var approvals = this.getApprovals();
        approval.id = this._generateId();
        approval.createdAt = new Date().toISOString();
        approval.status = approval.status || '대기';
        approvals.unshift(approval);
        this._set(this.KEYS.APPROVALS, approvals);
        return approval;
    },
    updateApproval(id, updates) {
        var approvals = this.getApprovals();
        var idx = approvals.findIndex(function (a) { return a.id === id; });
        if (idx !== -1) { Object.assign(approvals[idx], updates); this._set(this.KEYS.APPROVALS, approvals); return approvals[idx]; }
        return null;
    },

    /* ===== 수주 흐름: 견적 → 계약 → 기성 ==========================
       회사 실제 업무 순서를 그대로 따른다.
         견적서 제출 → 낙찰되면 계약 → 공사하면서 회차별 기성청구 → 입금
       기성은 '청구'와 '입금'이 따로 논다. 청구했다고 다 들어오지 않는다.
       ============================================================== */

    ESTIMATE_STATUS: ['작성중', '제출', '낙찰', '실주'],
    CONTRACT_STATUS: ['진행중', '완료', '해지'],
    BILLING_STATUS: ['청구예정', '청구완료', '일부입금', '입금완료'],

    // --- 견적 ---
    getEstimates() { return this._get(this.KEYS.ESTIMATES); },
    addEstimate(e) {
        var arr = this.getEstimates();
        e.id = this._generateId();
        e.createdAt = new Date().toISOString();
        e.status = e.status || '작성중';
        arr.unshift(e);
        this._set(this.KEYS.ESTIMATES, arr);
        return e;
    },
    updateEstimate(id, u) {
        var arr = this.getEstimates();
        var i = arr.findIndex(function (x) { return x.id === id; });
        if (i === -1) return null;
        Object.assign(arr[i], u);
        this._set(this.KEYS.ESTIMATES, arr);
        return arr[i];
    },
    deleteEstimate(id) {
        this._set(this.KEYS.ESTIMATES, this.getEstimates().filter(function (x) { return x.id !== id; }));
    },

    // --- 계약 ---
    getContracts() { return this._get(this.KEYS.CONTRACTS); },
    addContract(c) {
        var arr = this.getContracts();
        c.id = this._generateId();
        c.createdAt = new Date().toISOString();
        c.status = c.status || '진행중';
        arr.unshift(c);
        this._set(this.KEYS.CONTRACTS, arr);
        return c;
    },
    updateContract(id, u) {
        var arr = this.getContracts();
        var i = arr.findIndex(function (x) { return x.id === id; });
        if (i === -1) return null;
        Object.assign(arr[i], u);
        this._set(this.KEYS.CONTRACTS, arr);
        return arr[i];
    },
    deleteContract(id) {
        this._set(this.KEYS.CONTRACTS, this.getContracts().filter(function (x) { return x.id !== id; }));
    },

    // --- 기성 (회차별) ---
    getBillings() { return this._get(this.KEYS.BILLINGS); },
    addBilling(b) {
        var arr = this.getBillings();
        b.id = this._generateId();
        b.createdAt = new Date().toISOString();
        b.billAmount = Number(b.billAmount) || 0;
        b.paidAmount = Number(b.paidAmount) || 0;
        b.status = this.billingStatus(b);
        arr.unshift(b);
        this._set(this.KEYS.BILLINGS, arr);
        return b;
    },
    updateBilling(id, u) {
        var arr = this.getBillings();
        var i = arr.findIndex(function (x) { return x.id === id; });
        if (i === -1) return null;
        Object.assign(arr[i], u);
        arr[i].status = this.billingStatus(arr[i]);
        this._set(this.KEYS.BILLINGS, arr);
        return arr[i];
    },
    deleteBilling(id) {
        this._set(this.KEYS.BILLINGS, this.getBillings().filter(function (x) { return x.id !== id; }));
    },

    // 청구액·입금액으로 상태를 자동 판정한다 (사람이 따로 고를 필요 없다)
    billingStatus(b) {
        var bill = Number(b.billAmount) || 0;
        var paid = Number(b.paidAmount) || 0;
        if (!b.billDate) return '청구예정';
        if (paid <= 0) return '청구완료';
        if (paid >= bill) return '입금완료';
        return '일부입금';
    },

    // 특정 계약의 다음 회차 번호
    nextBillingRound(contractId) {
        var rounds = this.getBillings()
            .filter(function (b) { return b.contractId === contractId; })
            .map(function (b) { return Number(b.round) || 0; });
        return rounds.length ? Math.max.apply(null, rounds) + 1 : 1;
    },

    /**
     * 현장별 수지 현황 — 대표가 한눈에 보는 핵심 지표.
     * 계약액 대비 얼마나 청구했고, 얼마가 들어왔고, 얼마를 썼고, 남는지.
     */
    getSiteFinance(siteName) {
        var contracts = this.getContracts().filter(function (c) { return c.siteName === siteName; });
        var billings = this.getBillings().filter(function (b) { return b.siteName === siteName; });
        var costs = this.getCosts().filter(function (c) { return c.siteName === siteName; });
        var estimates = this.getEstimates().filter(function (e) { return e.siteName === siteName; });
        var self = this;

        function sum(arr, f) {
            return arr.reduce(function (s, x) { return s + (Number(f(x)) || 0); }, 0);
        }

        var contractAmount = sum(contracts.filter(function (c) { return c.status !== '해지'; }), function (c) { return c.amount; });
        var billed = sum(billings, function (b) { return b.billAmount; });
        var received = sum(billings, function (b) { return b.paidAmount; });
        var spent = sum(costs, function (c) { return c.amount; });

        // 지출 중 아직 안 나간 돈 (승인대기 + 홀딩 + 미지급)
        var unpaid = sum(costs.filter(function (c) {
            c = self.normalizeCost(c);
            return c.paymentStatus !== '지급완료';
        }), function (c) { return c.amount; });

        return {
            siteName: siteName,
            estimateCount: estimates.length,
            contractAmount: contractAmount,        // 계약 금액
            billed: billed,                        // 기성 청구 누계
            received: received,                    // 실제 입금
            receivable: billed - received,         // 미수금 (청구했는데 안 들어온 돈)
            remainToBill: contractAmount - billed, // 앞으로 청구할 금액
            spent: spent,                          // 총 지출
            unpaidCost: unpaid,                    // 미지급금 (나가야 할 돈)
            profit: received - spent,              // 현재 손익 (입금 − 지출)
            expectedProfit: contractAmount - spent,// 계약 기준 예상 손익
            billRate: contractAmount ? Math.round((billed / contractAmount) * 100) : 0,
            collectRate: billed ? Math.round((received / billed) * 100) : 0
        };
    },

    /** 전 현장 + 본사 합산 (대표 화면용) */
    getAllSiteFinance() {
        var sites = this.getSites();
        var rows = [];
        for (var i = 0; i < sites.length; i++) {
            var f = this.getSiteFinance(sites[i].name);
            f.status = sites[i].status;
            f.client = sites[i].client;
            f.siteId = sites[i].id;
            rows.push(f);
        }

        // 현장이 지정되지 않은 비용 = 본사 비용
        var hqCosts = this.getCosts().filter(function (c) { return !c.siteName; });
        var hqSpent = hqCosts.reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);

        var total = { contractAmount: 0, billed: 0, received: 0, receivable: 0, spent: 0, unpaidCost: 0, profit: 0 };
        for (var j = 0; j < rows.length; j++) {
            total.contractAmount += rows[j].contractAmount;
            total.billed += rows[j].billed;
            total.received += rows[j].received;
            total.receivable += rows[j].receivable;
            total.spent += rows[j].spent;
            total.unpaidCost += rows[j].unpaidCost;
        }
        total.hqSpent = hqSpent;
        total.spentWithHq = total.spent + hqSpent;
        total.profit = total.received - total.spentWithHq;

        return { rows: rows, total: total };
    },

    /**
     * 회사 전체 자금 흐름 — 경영 대시보드의 핵심.
     * "받을 돈(미수 기성) vs 나갈 돈(미지급·홀딩 비용)"으로 자금 포지션을 본다.
     * 이번 달 실제 입/출금과, 앞으로 들어올/나갈 돈을 함께 집계한다.
     *
     * 건설회사 관점: 현장은 돈을 버는 단위, 본사는 돈을 쓰는 단위.
     * 그래서 현장 손익과 본사 비용을 나눠서 합산한다.
     */
    getCashFlow: function (year, month) {
        var now = new Date();
        year = year || now.getFullYear();
        month = month || (now.getMonth() + 1);
        var prefix = year + '-' + String(month).padStart(2, '0');
        var self = this;

        var billings = this.getBillings();
        var costs = this.getCosts().map(function (c) { return self.normalizeCost(c); });

        function sum(arr, f) {
            return arr.reduce(function (s, x) { return s + (Number(f(x)) || 0); }, 0);
        }

        // ── 누적 포지션 ──
        var billed = sum(billings, function (b) { return b.billAmount; });
        var received = sum(billings, function (b) { return b.paidAmount; });
        var receivable = billed - received;                       // 받을 돈(미수 기성)

        var toPay = sum(costs.filter(function (c) {               // 나갈 돈(승인·미지급)
            return c.approvalStatus === '승인' && c.paymentStatus === '미지급';
        }), function (c) { return c.amount; });
        var held = sum(costs.filter(function (c) {                // 홀딩(자금 보류)
            return c.paymentStatus === '홀딩';
        }), function (c) { return c.amount; });
        var pendingApproval = sum(costs.filter(function (c) {     // 승인 대기(아직 미확정)
            return c.approvalStatus === '대기';
        }), function (c) { return c.amount; });
        var payable = toPay + held;                               // 나갈 돈 합계

        // ── 이번 달 실제 현금 이동 ──
        var inThisMonth = sum(billings.filter(function (b) {
            return b.paidDate && b.paidDate.indexOf(prefix) === 0;
        }), function (b) { return b.paidAmount; });
        var outThisMonth = sum(costs.filter(function (c) {
            return c.paymentStatus === '지급완료' && c.paidDate && c.paidDate.indexOf(prefix) === 0;
        }), function (c) { return c.amount; });

        // ── 현장 수지 / 본사 ──
        var fin = this.getAllSiteFinance();

        return {
            period: prefix,
            // 포지션
            receivable: receivable,
            payable: payable,
            toPay: toPay,
            held: held,
            pendingApproval: pendingApproval,
            netPosition: receivable - payable,     // 받을 돈 − 나갈 돈
            // 이번 달 현금
            inThisMonth: inThisMonth,
            outThisMonth: outThisMonth,
            netThisMonth: inThisMonth - outThisMonth,
            // 누적
            contractAmount: fin.total.contractAmount,
            billed: billed,
            received: received,
            totalSpent: fin.total.spentWithHq,
            hqSpent: fin.total.hqSpent,
            siteProfit: fin.total.received - fin.total.spent,   // 현장 손익(본사 제외)
            profit: fin.total.profit,                            // 본사 포함 손익
            siteCount: fin.rows.length
        };
    },

    /* ===== 문서 체계 =============================================
       회사 실제 폴더(공무부/관리부/안전)와 파일명 규칙을 그대로 옮겼다.
       예: "2. 견적서_당진 현대제철 Duct 점검홀 이설_제일플랜트.xlsx"
           → 문서종류 _ 현장·공사명 _ 거래처

       공사 진행 단계로 묶는 이유:
         담당자가 "지금 뭘 만들어야 하는지" 알려면 부서가 아니라
         공사가 어디까지 왔는지가 기준이 되어야 한다.
       ============================================================== */
    DOC_STAGES: [
        {
            id: 'preContract', label: '① 계약 전', icon: '📐', dept: '공무',
            desc: '견적을 내고 수주하기까지',
            docs: [
                { name: '견적서', required: true, note: '공사 범위·금액 산출' },
                { name: '공내역서', required: false, note: '물량내역서(BM)' },
                { name: '단가산정서', required: false, note: '공당단가·일위대가' },
                { name: '현장설명서', required: false, note: '현설 참석 자료' },
                { name: '질의서(RFI)', required: false, note: '도면·시방 불일치 확인' }
            ]
        },
        {
            id: 'contract', label: '② 계약·착공', icon: '📑', dept: '공무',
            desc: '계약하고 공사를 시작할 때',
            docs: [
                { name: '계약서', required: true, note: '도급계약서' },
                { name: '착공계', required: true, note: '착공 신고' },
                { name: '현장대리인 선임계', required: false },
                { name: '보증서', required: false, note: '계약이행·선급금 보증' },
                { name: '산재·고용보험 가입증명', required: false }
            ]
        },
        {
            id: 'inProgress', label: '③ 시공 중', icon: '🔨', dept: '공무·관리',
            desc: '공사하면서 계속 쌓이는 서류',
            docs: [
                { name: '작업일보', required: true, note: '일일 입력에서 자동 생성' },
                { name: '발주서', required: false, note: '자재·외주 발주' },
                { name: '거래명세서', required: false, note: '업체별 거래 내역' },
                { name: '납품서', required: false, note: 'Packing List 포함' },
                { name: '노무비 대장', required: false, note: '인원 관리에서 생성' },
                { name: '공정표', required: false, note: '일정 관리' },
                { name: '작업지시서', required: false }
            ]
        },
        {
            id: 'billing', label: '④ 기성 청구', icon: '💵', dept: '공무',
            desc: '회차별로 돈을 청구할 때',
            docs: [
                { name: '기성내역서', required: true, note: '회차별 기성 산출' },
                { name: '기성 사진첩', required: true, note: '작업 전·중·후 사진대지' },
                { name: '청구서', required: true, note: '세금계산서 발행 근거' },
                { name: '세금계산서', required: false },
                { name: '노무비 청구 대장', required: false, note: '업체별 청구' }
            ]
        },
        {
            id: 'completion', label: '⑤ 준공', icon: '🏁', dept: '공무',
            desc: '공사를 마칠 때',
            docs: [
                { name: '준공계', required: true, note: '준공 신고' },
                { name: '준공 사진첩', required: true },
                { name: '준공내역서', required: false },
                { name: '시운전 보고서', required: false }
            ]
        },
        {
            id: 'settlement', label: '⑥ 정산·보증', icon: '🧾', dept: '공무·관리',
            desc: '정산하고 하자 보증까지',
            docs: [
                { name: '정산서', required: true, note: '최종 정산' },
                { name: '하자보증서', required: false },
                { name: '공문', required: false, note: '발주처 왕래 문서' }
            ]
        },
        {
            id: 'safety', label: '🦺 안전', icon: '🦺', dept: '안전',
            desc: '법정 안전 서류 (공사 전 기간)',
            docs: [
                { name: '위험성평가(JSA)', required: true, note: '작업별 위험성평가' },
                { name: 'TBM 일지', required: false, note: '일일 입력에서 자동 기록' },
                { name: '안전교육 일지', required: false },
                { name: 'MSDS', required: false, note: '유해물질 물질안전보건자료' },
                { name: '작업허가서', required: false, note: '화기·밀폐공간 등' },
                { name: '산재 처리 서류', required: false }
            ]
        }
    ],

    // 모든 문서 종류를 한 줄로 (선택 목록용)
    allDocTypes: function () {
        var out = [];
        for (var i = 0; i < this.DOC_STAGES.length; i++) {
            var st = this.DOC_STAGES[i];
            for (var j = 0; j < st.docs.length; j++) {
                out.push({ stage: st.id, stageLabel: st.label, name: st.docs[j].name, required: st.docs[j].required });
            }
        }
        return out;
    },

    getStage: function (id) {
        for (var i = 0; i < this.DOC_STAGES.length; i++) {
            if (this.DOC_STAGES[i].id === id) return this.DOC_STAGES[i];
        }
        return null;
    },

    /**
     * 현장별 서류 현황 — 단계별로 무엇이 있고 무엇이 빠졌는지.
     * "어떤 문서를 작성해야 하는지"를 담당자가 바로 알 수 있게 한다.
     */
    getSiteDocStatus: function (siteName) {
        var docs = this.getDocuments().filter(function (d) { return d.siteName === siteName; });
        var stages = [];

        for (var i = 0; i < this.DOC_STAGES.length; i++) {
            var st = this.DOC_STAGES[i];
            var items = [];
            var haveReq = 0, totalReq = 0;

            for (var j = 0; j < st.docs.length; j++) {
                var def = st.docs[j];
                var found = docs.filter(function (d) { return d.docType === def.name; });
                if (def.required) {
                    totalReq++;
                    if (found.length) haveReq++;
                }
                items.push({
                    name: def.name, required: !!def.required, note: def.note || '',
                    count: found.length, docs: found
                });
            }
            stages.push({
                id: st.id, label: st.label, icon: st.icon, desc: st.desc, dept: st.dept,
                items: items, haveRequired: haveReq, totalRequired: totalReq,
                complete: totalReq > 0 && haveReq === totalReq
            });
        }
        return stages;
    },

    // === Safety Categories ===
    SAFETY_TYPES: ['작업 전 점검', 'TBM/안전교육', '위험성평가', '작업허가서', '보호구 점검', '시정조치'],
    DOCUMENT_TYPES: ['세금계산서', '거래명세서', '영수증', '계약서', '도면', '안전서류', '사진', '공문', '기타'],

    // === Categories ===
    COST_CATEGORIES: ['인건비', '자재비', '장비비', '외주비', '운송비', '기타'],
    JOB_TYPES: ['철근공', '형틀공', '콘크리트공', '미장공', '방수공', '도장공', '전기공', '배관공', '용접공', '장비기사', '일반작업자', '관리자'],
    MATERIAL_CATEGORIES: ['철근', '시멘트/콘크리트', '목재', '골재', '전기자재', '배관자재', '방수자재', '도장자재', '철물', '기타'],
    BANKS: ['국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '수협은행', '대구은행', '부산은행', '광주은행', '전북은행', '경남은행', '제주은행', '새마을금고', '신협', '우체국'],

    // === Initialize with sample data ===
    // 클라우드(실제 회사) 모드에서는 자동 생성하지 않는다 — 실데이터가 오염된다.
    // 데모가 필요하면 콘솔이나 버튼에서 Store.seedSampleData()를 직접 호출한다.
    initSampleData() {
        if (typeof Sync !== 'undefined' && Sync.MODE === 'cloud') return;
        this.seedSampleData();
    },

    seedSampleData() {
        if (this.getCosts().length > 0) return;

        var today = this.getToday();
        var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        var twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

        // Sample costs
        var sampleCosts = [
            { date: today, category: '인건비', name: '일용직 인건비', amount: 4500000, memo: '철근공 5명 x 1일' },
            { date: today, category: '자재비', name: '철근 D16 구매', amount: 8200000, memo: 'SD400 D16 20톤' },
            { date: yesterday, category: '장비비', name: '레미콘 타설', amount: 3600000, memo: '25-21-15 40m3' },
            { date: yesterday, category: '외주비', name: '전기 배관 공사', amount: 5000000, memo: 'B1층 전기 배관' },
            { date: twoDaysAgo, category: '자재비', name: '합판 구매', amount: 2800000, memo: '12mm 코팅합판 200장' },
            { date: twoDaysAgo, category: '운송비', name: '철근 운반비', amount: 450000, memo: '25톤 카고 1대' },
        ];
        for (var i = 0; i < sampleCosts.length; i++) {
            this.addCost(sampleCosts[i]);
        }

        // Sample personnel with enhanced fields
        var samplePeople = [
            { name: '김철수', jobType: '철근공', phone: '010-1234-5678', residentId: '850315-1******', address: '서울시 강남구 역삼동 123-45', bank: '국민은행', accountNumber: '123-456-7890', dailyWage: 220000, status: '활성', regType: 'full' },
            { name: '이영희', jobType: '형틀공', phone: '010-2345-6789', residentId: '900820-2******', address: '경기도 수원시 팔달구 우만동', bank: '신한은행', accountNumber: '110-234-567890', dailyWage: 200000, status: '활성', regType: 'full' },
            { name: '박민수', jobType: '콘크리트공', phone: '010-3456-7890', residentId: '880105-1******', address: '인천시 남동구 구월동 234', bank: '우리은행', accountNumber: '1002-345-678901', dailyWage: 210000, status: '활성', regType: 'full' },
            { name: '최동현', jobType: '미장공', phone: '010-4567-8901', residentId: '', address: '', bank: '', accountNumber: '', dailyWage: 190000, status: '활성', regType: 'quick' },
            { name: '정수진', jobType: '전기공', phone: '010-5678-9012', residentId: '920630-1******', address: '서울시 송파구 잠실동 56-7', bank: '하나은행', accountNumber: '910-123-456789', dailyWage: 230000, status: '활성', regType: 'full' },
            { name: '한우성', jobType: '배관공', phone: '010-6789-0123', residentId: '', address: '', bank: '', accountNumber: '', dailyWage: 220000, status: '활성', regType: 'quick' },
            { name: '강지훈', jobType: '용접공', phone: '010-7890-1234', residentId: '870912-1******', address: '경기도 성남시 분당구 서현동', bank: '농협은행', accountNumber: '302-1234-5678-91', dailyWage: 250000, status: '활성', regType: 'full' },
            { name: '윤서연', jobType: '관리자', phone: '010-8901-2345', residentId: '950225-2******', address: '서울시 마포구 합정동 123', bank: '카카오뱅크', accountNumber: '3333-12-3456789', dailyWage: 180000, status: '활성', regType: 'full' },
        ];
        var people = [];
        for (var j = 0; j < samplePeople.length; j++) {
            people.push(this.addPerson(samplePeople[j]));
        }

        // Sample attendance
        for (var k = 0; k < Math.min(6, people.length); k++) {
            this.addAttendance({ personId: people[k].id, personName: people[k].name, jobType: people[k].jobType, date: today, hours: 8, overtime: 0, note: '' });
        }
        for (var l = 0; l < Math.min(5, people.length); l++) {
            this.addAttendance({ personId: people[l].id, personName: people[l].name, jobType: people[l].jobType, date: yesterday, hours: 8, overtime: 2, note: '' });
        }

        // Sample materials
        var sampleMats = [
            { name: '철근 D16', category: '철근', spec: 'SD400 D16', unit: 'ton', stock: 15, unitPrice: 410000, minStock: 5 },
            { name: '철근 D13', category: '철근', spec: 'SD400 D13', unit: 'ton', stock: 8, unitPrice: 420000, minStock: 5 },
            { name: '레미콘 25-21-15', category: '시멘트/콘크리트', spec: '25-21-15', unit: 'm3', stock: 0, unitPrice: 90000, minStock: 0 },
            { name: '코팅합판 12mm', category: '목재', spec: '1220x2440x12mm', unit: '장', stock: 150, unitPrice: 14000, minStock: 50 },
            { name: '모래', category: '골재', spec: '세척사', unit: 'm3', stock: 30, unitPrice: 25000, minStock: 10 },
            { name: '자갈', category: '골재', spec: '25mm', unit: 'm3', stock: 25, unitPrice: 28000, minStock: 10 },
            { name: 'IV전선 2.5sq', category: '전기자재', spec: '2.5sq 흑색', unit: 'm', stock: 500, unitPrice: 800, minStock: 100 },
            { name: 'PVC파이프 50A', category: '배관자재', spec: 'VG1 50A 4m', unit: '본', stock: 45, unitPrice: 6500, minStock: 20 },
        ];
        var mats = [];
        for (var m = 0; m < sampleMats.length; m++) {
            mats.push(this.addMaterial(sampleMats[m]));
        }

        // Sample material logs
        this.addMaterialLog({ materialId: mats[0].id, materialName: mats[0].name, type: 'in', quantity: 20, date: yesterday, note: '정기 입고' });
        this.addMaterialLog({ materialId: mats[0].id, materialName: mats[0].name, type: 'out', quantity: 5, date: today, note: 'B1 슬라브 사용' });
        this.addMaterialLog({ materialId: mats[3].id, materialName: mats[3].name, type: 'in', quantity: 200, date: twoDaysAgo, note: '구매 입고' });
        this.addMaterialLog({ materialId: mats[3].id, materialName: mats[3].name, type: 'out', quantity: 50, date: today, note: '2층 거푸집' });

        // Sample sites
        this.addSite({ name: '강남 오피스텔 신축공사', client: '(주)한국개발', manager: '김소장', address: '서울시 강남구 역삼동 123-45', startDate: '2026-01-15', endDate: '2027-06-30', contractAmount: 15000000000, status: '진행중', progress: 35, workerCount: 24, safetyGrade: 'A', memo: 'B2~15F 오피스텔' });
        this.addSite({ name: '수원 물류센터 증축', client: '수원물류(주)', manager: '이소장', address: '경기도 수원시 권선구 456', startDate: '2026-03-01', endDate: '2026-12-31', contractAmount: 5200000000, status: '진행중', progress: 12, workerCount: 15, safetyGrade: 'B', memo: '물류동 2층 증축' });
        this.addSite({ name: '인천 아파트 리모델링', client: '인천주택조합', manager: '박소장', address: '인천시 남동구 구월동 789', startDate: '2026-05-01', endDate: '2027-02-28', contractAmount: 8700000000, status: '준비중', progress: 0, workerCount: 0, safetyGrade: '-', memo: '설계 검토 중' });

        // Sample safety checks
        this.addSafetyCheck({ date: today, siteName: '강남 오피스텔 신축공사', type: '작업 전 점검', checklist: [{ item: '안전모 착용 확인', checked: true }, { item: '안전대 착용 확인', checked: true }, { item: '작업구역 정리정돈', checked: true }, { item: '추락방지망 설치 확인', checked: false }], inspector: '김소장', status: '완료', note: '추락방지망 B동 3층 미설치 → 오전 중 보완 조치' });
        this.addSafetyCheck({ date: today, siteName: '강남 오피스텔 신축공사', type: 'TBM/안전교육', checklist: [{ item: '금일 작업 내용 공유', checked: true }, { item: '위험요인 교육', checked: true }, { item: '비상연락망 확인', checked: true }], inspector: '정안전', status: '완료', note: '참석 18명' });
        this.addSafetyCheck({ date: yesterday, siteName: '수원 물류센터 증축', type: '위험성평가', checklist: [{ item: '고소작업 위험성 평가', checked: true }, { item: '중장비 작업 반경 확인', checked: true }, { item: '전기작업 안전조치', checked: false }], inspector: '이소장', status: '시정필요', note: '전기 임시배전반 접지 미확인' });

        // Sample work inputs
        this.addWorkInput({ date: today, siteName: '강남 오피스텔 신축공사', workers: [{ name: '김철수', jobType: '철근공', hours: 8, gongsu: 1 }, { name: '이영희', jobType: '형틀공', hours: 8, gongsu: 1 }, { name: '박민수', jobType: '콘크리트공', hours: 10, gongsu: 1.25 }], equipment: '레미콘 2대, 펌프카 1대', workContent: 'B1 슬라브 콘크리트 타설 (40m3)', expenses: [{ category: '식대', amount: 120000, memo: '중식 24명' }, { category: '유류비', amount: 85000, memo: '펌프카 경유' }], safetyNote: 'TBM 완료, 작업 전 점검 완료', status: '제출완료' });
        this.addWorkInput({ date: yesterday, siteName: '강남 오피스텔 신축공사', workers: [{ name: '김철수', jobType: '철근공', hours: 9, gongsu: 1.125 }, { name: '강지훈', jobType: '용접공', hours: 8, gongsu: 1 }], equipment: '크레인 1대', workContent: '2F 철근 배근 작업', expenses: [{ category: '식대', amount: 100000, memo: '중식 20명' }], safetyNote: 'TBM 완료', status: '승인완료' });

        // Sample approvals
        this.addApproval({ type: '일일입력', title: today + ' 강남 오피스텔 일일보고', requester: '김소장', requestDate: today, status: '대기', detail: 'B1 슬라브 콘크리트 타설 보고' });
        this.addApproval({ type: '비용', title: '3월 자재비 정산 요청', requester: '김소장', requestDate: yesterday, status: '대기', detail: '철근 D16 20톤 외 3건, 총 ₩15,800,000' });
        this.addApproval({ type: '안전', title: '시정조치 완료 보고 - B동 추락방지망', requester: '정안전', requestDate: today, status: '대기', detail: 'B동 3층 추락방지망 설치 완료' });
        this.addApproval({ type: '일일입력', title: yesterday + ' 강남 오피스텔 일일보고', requester: '김소장', requestDate: yesterday, status: '승인', detail: '2F 철근 배근 작업 보고', approver: '박대표', approvedDate: today });

        // Sample documents
        this.addDocument({ name: '2026년 3월 철근 세금계산서', type: '세금계산서', siteName: '강남 오피스텔 신축공사', uploadDate: today, uploader: '김소장', fileSize: '2.4MB', linkedTo: '자재비 - 철근 D16', note: '(주)한국철강' });
        this.addDocument({ name: '안전교육 수료증 (3월)', type: '안전서류', siteName: '강남 오피스텔 신축공사', uploadDate: yesterday, uploader: '정안전', fileSize: '1.1MB', linkedTo: '안전관리', note: '참석 24명' });
        this.addDocument({ name: 'B1 슬라브 타설 사진', type: '사진', siteName: '강남 오피스텔 신축공사', uploadDate: today, uploader: '김소장', fileSize: '8.5MB', linkedTo: '일일입력 - 콘크리트 타설', note: '타설 전/중/후' });
        this.addDocument({ name: '수원 물류센터 도급계약서', type: '계약서', siteName: '수원 물류센터 증축', uploadDate: '2026-02-28', uploader: '박대표', fileSize: '5.2MB', linkedTo: '현장 - 수원 물류센터', note: '원본 스캔' });
    }
};
