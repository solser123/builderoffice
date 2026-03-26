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
    },

    // === Generic CRUD ===
    _get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading ' + key + ':', e);
            return [];
        }
    },

    _set(key, data) {
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

    getCostStats() {
        var costs = this.getCosts();
        var today = new Date().toISOString().split('T')[0];
        var thisMonth = today.substring(0, 7);

        return {
            total: costs.reduce(function (sum, c) { return sum + Number(c.amount); }, 0),
            todayTotal: costs.filter(function (c) { return c.date === today; }).reduce(function (sum, c) { return sum + Number(c.amount); }, 0),
            monthTotal: costs.filter(function (c) { return c.date && c.date.startsWith(thisMonth); }).reduce(function (sum, c) { return sum + Number(c.amount); }, 0),
            byCategory: this._groupBy(costs, 'category', 'amount'),
            count: costs.length,
        };
    },

    // === Personnel Management ===
    getPersonnel() {
        return this._get(this.KEYS.PERSONNEL);
    },

    addPerson(person) {
        var personnel = this.getPersonnel();
        person.id = this._generateId();
        person.createdAt = new Date().toISOString();
        personnel.unshift(person);
        this._set(this.KEYS.PERSONNEL, personnel);
        return person;
    },

    updatePerson(id, updates) {
        var personnel = this.getPersonnel();
        var idx = personnel.findIndex(function (p) { return p.id === id; });
        if (idx !== -1) {
            Object.assign(personnel[idx], updates);
            this._set(this.KEYS.PERSONNEL, personnel);
            return personnel[idx];
        }
        return null;
    },

    deletePerson(id) {
        var personnel = this.getPersonnel().filter(function (p) { return p.id !== id; });
        this._set(this.KEYS.PERSONNEL, personnel);
        // Also delete related attendance
        var attendance = this.getAttendance().filter(function (a) { return a.personId !== id; });
        this._set(this.KEYS.ATTENDANCE, attendance);
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
        try {
            var raw = localStorage.getItem(this.GONGSU_KEY);
            if (!raw) return {};
            var parsed = JSON.parse(raw);
            // _get()은 기본값으로 배열을 반환하므로, 배열이면 빈 객체로 교체
            if (Array.isArray(parsed)) return {};
            return parsed;
        } catch (e) {
            return {};
        }
    },

    _saveGongsuData: function (data) {
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

    // === 2026 Insurance Rates (근로자 부담분) ===
    INSURANCE_RATES: {
        nationalPension: 0.0475,      // 국민연금 4.75%
        healthInsurance: 0.03595,     // 건강보험 3.595%
        longTermCare: 0.1295,         // 장기요양 (건강보험료의 12.95%)
        employmentInsurance: 0.009,   // 고용보험 0.9%
        residentTax: 0.1             // 주민세 (소득세의 10%, 간이)
    },

    calcInsurance: function (grossPay) {
        var r = this.INSURANCE_RATES;
        var pension = Math.round(grossPay * r.nationalPension);
        var health = Math.round(grossPay * r.healthInsurance);
        var longCare = Math.round(health * r.longTermCare);
        var employment = Math.round(grossPay * r.employmentInsurance);

        // 간이세액 (일용직 기준 간소화: 총 보험료의 약 3% 수준으로 근사)
        var incomeTax = Math.round(grossPay * 0.027);
        var residentTax = Math.round(incomeTax * r.residentTax);

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
            netPay: grossPay - totalDeduction
        };
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

    // === Safety Categories ===
    SAFETY_TYPES: ['작업 전 점검', 'TBM/안전교육', '위험성평가', '작업허가서', '보호구 점검', '시정조치'],
    DOCUMENT_TYPES: ['세금계산서', '거래명세서', '영수증', '계약서', '도면', '안전서류', '사진', '공문', '기타'],

    // === Categories ===
    COST_CATEGORIES: ['인건비', '자재비', '장비비', '외주비', '운송비', '기타'],
    JOB_TYPES: ['철근공', '형틀공', '콘크리트공', '미장공', '방수공', '도장공', '전기공', '배관공', '용접공', '장비기사', '일반작업자', '관리자'],
    MATERIAL_CATEGORIES: ['철근', '시멘트/콘크리트', '목재', '골재', '전기자재', '배관자재', '방수자재', '도장자재', '철물', '기타'],
    BANKS: ['국민은행', '신한은행', '우리은행', '하나은행', '농협은행', '기업은행', '카카오뱅크', '토스뱅크', '케이뱅크', '수협은행', '대구은행', '부산은행', '광주은행', '전북은행', '경남은행', '제주은행', '새마을금고', '신협', '우체국'],

    // === Initialize with sample data ===
    initSampleData() {
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
        this.addSite({ name: '강남 오피스�� 신축공사', client: '(주)한국개발', manager: '김소장', address: '서울시 강남구 역삼동 123-45', startDate: '2026-01-15', endDate: '2027-06-30', contractAmount: 15000000000, status: '진행중', progress: 35, workerCount: 24, safetyGrade: 'A', memo: 'B2~15F 오피스텔' });
        this.addSite({ name: '수원 물류센터 증축', client: '수원물류(주)', manager: '이소장', address: '경기도 수원시 권선구 456', startDate: '2026-03-01', endDate: '2026-12-31', contractAmount: 5200000000, status: '진행중', progress: 12, workerCount: 15, safetyGrade: 'B', memo: '물류동 2층 증축' });
        this.addSite({ name: '인천 아파트 리모델링', client: '인천주택조합', manager: '박소장', address: '인천시 남동구 구월동 789', startDate: '2026-05-01', endDate: '2027-02-28', contractAmount: 8700000000, status: '준비중', progress: 0, workerCount: 0, safetyGrade: '-', memo: '설계 검토 중' });

        // Sample safety checks
        this.addSafetyCheck({ date: today, siteName: '강남 오피스텔 신축공사', type: '작업 전 점검', checklist: [{ item: '안전모 착용 확인', checked: true }, { item: '안전대 착용 확인', checked: true }, { item: '작업구역 정리정돈', checked: true }, { item: '추락방지망 설치 확인', checked: false }], inspector: '김소장', status: '완료', note: '추락방지망 B동 3층 미설치 → 오전 중 보완 조치' });
        this.addSafetyCheck({ date: today, siteName: '강남 오피스텔 신축공사', type: 'TBM/안전교육', checklist: [{ item: '금일 작업 내용 공유', checked: true }, { item: '위험요인 교육', checked: true }, { item: '비상연락망 확인', checked: true }], inspector: '정안전', status: '완료', note: '참석 18명' });
        this.addSafetyCheck({ date: yesterday, siteName: '수원 물류센터 증축', type: '위험성평가', checklist: [{ item: '고소작업 위험성 평가', checked: true }, { item: '중장비 작업 반경 확인', checked: true }, { item: '전기작업 안전조치', checked: false }], inspector: '이소장', status: '시정필요', note: '전기 임시배전반 접지 미확인' });

        // Sample work inputs
        this.addWorkInput({ date: today, siteName: '강남 오피스텔 신축공사', workers: [{ name: '��철수', jobType: '철근공', hours: 8, gongsu: 1 }, { name: '이영희', jobType: '형틀공', hours: 8, gongsu: 1 }, { name: '박민수', jobType: '콘크리트공', hours: 10, gongsu: 1.25 }], equipment: '레미콘 2대, 펌프카 1대', workContent: 'B1 슬라브 콘크리트 타설 (40m3)', expenses: [{ category: '식대', amount: 120000, memo: '중식 24명' }, { category: '유류비', amount: 85000, memo: '��프카 경유' }], safetyNote: 'TBM 완료, 작업 전 점검 완료', status: '제출완료' });
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
