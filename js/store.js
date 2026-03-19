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
        CURRENT_SITE: 'builderoffice_current_site',
        DAILY_LOGS: 'builderoffice_daily_logs',
        APPROVALS: 'builderoffice_approvals',
        SAFETY_CHECKS: 'builderoffice_safety_checks',
        SAFETY_EDUCATION: 'builderoffice_safety_education',
        RISK_ASSESSMENTS: 'builderoffice_risk_assessments',
        QUALITY_CHECKS: 'builderoffice_quality_checks',
        CONTRACTS: 'builderoffice_contracts',
        BILLINGS: 'builderoffice_billings',
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
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
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

    // === Categories ===
    // === Site Management ===
    getCurrentSiteId() {
        return localStorage.getItem(this.KEYS.CURRENT_SITE) || 'all';
    },
    setCurrentSiteId(id) {
        localStorage.setItem(this.KEYS.CURRENT_SITE, id || 'all');
    },
    getSites() {
        return this._get(this.KEYS.SITES);
    },
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
        this._set(this.KEYS.SITES, this.getSites().filter(function (s) { return s.id !== id; }));
    },
    getSiteStats() {
        var sites = this.getSites();
        return {
            total: sites.length,
            active: sites.filter(function (s) { return s.status === '진행중'; }).length,
            completed: sites.filter(function (s) { return s.status === '완료'; }).length,
            paused: sites.filter(function (s) { return s.status === '일시중지'; }).length,
        };
    },

    // === Daily Logs ===
    getDailyLogs() {
        return this._get(this.KEYS.DAILY_LOGS);
    },
    addDailyLog(log) {
        var logs = this.getDailyLogs();
        log.id = this._generateId();
        log.createdAt = new Date().toISOString();
        logs.unshift(log);
        this._set(this.KEYS.DAILY_LOGS, logs);
        return log;
    },
    updateDailyLog(id, updates) {
        var logs = this.getDailyLogs();
        var idx = logs.findIndex(function (l) { return l.id === id; });
        if (idx !== -1) { Object.assign(logs[idx], updates); this._set(this.KEYS.DAILY_LOGS, logs); return logs[idx]; }
        return null;
    },
    deleteDailyLog(id) {
        this._set(this.KEYS.DAILY_LOGS, this.getDailyLogs().filter(function (l) { return l.id !== id; }));
    },

    // === Approvals ===
    getApprovals() {
        return this._get(this.KEYS.APPROVALS);
    },
    addApproval(approval) {
        var approvals = this.getApprovals();
        approval.id = this._generateId();
        approval.createdAt = new Date().toISOString();
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
    deleteApproval(id) {
        this._set(this.KEYS.APPROVALS, this.getApprovals().filter(function (a) { return a.id !== id; }));
    },

    // === New Category Arrays ===
    SITE_TYPES: ['공동주택', '상업시설', '공공기관', '공장/물류', '인프라', '리모델링', '기타'],
    SITE_STATUSES: ['진행중', '완료', '일시중지'],
    WEATHER_TYPES: ['맑음', '구름조금', '흐림', '비', '눈', '강풍'],
    APPROVAL_TYPES: ['비용결재', '자재요청', '인원요청', '공사계획', '기타'],
    APPROVAL_STATUSES: ['대기중', '승인', '반려'],

    // === Safety Checks ===
    getSafetyChecks() { return this._get(this.KEYS.SAFETY_CHECKS); },
    addSafetyCheck(d) { var a = this.getSafetyChecks(); d.id = this._generateId(); d.createdAt = new Date().toISOString(); a.unshift(d); this._set(this.KEYS.SAFETY_CHECKS, a); return d; },
    updateSafetyCheck(id, u) { var a = this.getSafetyChecks(); var i = a.findIndex(function(x){return x.id===id;}); if(i!==-1){Object.assign(a[i],u);this._set(this.KEYS.SAFETY_CHECKS,a);return a[i];}return null; },
    deleteSafetyCheck(id) { this._set(this.KEYS.SAFETY_CHECKS, this.getSafetyChecks().filter(function(x){return x.id!==id;})); },

    // === Safety Education ===
    getSafetyEducation() { return this._get(this.KEYS.SAFETY_EDUCATION); },
    addSafetyEducation(d) { var a = this.getSafetyEducation(); d.id = this._generateId(); d.createdAt = new Date().toISOString(); a.unshift(d); this._set(this.KEYS.SAFETY_EDUCATION, a); return d; },
    updateSafetyEducation(id, u) { var a = this.getSafetyEducation(); var i = a.findIndex(function(x){return x.id===id;}); if(i!==-1){Object.assign(a[i],u);this._set(this.KEYS.SAFETY_EDUCATION,a);return a[i];}return null; },
    deleteSafetyEducation(id) { this._set(this.KEYS.SAFETY_EDUCATION, this.getSafetyEducation().filter(function(x){return x.id!==id;})); },

    // === Risk Assessments ===
    getRiskAssessments() { return this._get(this.KEYS.RISK_ASSESSMENTS); },
    addRiskAssessment(d) { var a = this.getRiskAssessments(); d.id = this._generateId(); d.createdAt = new Date().toISOString(); a.unshift(d); this._set(this.KEYS.RISK_ASSESSMENTS, a); return d; },
    updateRiskAssessment(id, u) { var a = this.getRiskAssessments(); var i = a.findIndex(function(x){return x.id===id;}); if(i!==-1){Object.assign(a[i],u);this._set(this.KEYS.RISK_ASSESSMENTS,a);return a[i];}return null; },
    deleteRiskAssessment(id) { this._set(this.KEYS.RISK_ASSESSMENTS, this.getRiskAssessments().filter(function(x){return x.id!==id;})); },

    // === Quality Checks ===
    getQualityChecks() { return this._get(this.KEYS.QUALITY_CHECKS); },
    addQualityCheck(d) { var a = this.getQualityChecks(); d.id = this._generateId(); d.createdAt = new Date().toISOString(); a.unshift(d); this._set(this.KEYS.QUALITY_CHECKS, a); return d; },
    updateQualityCheck(id, u) { var a = this.getQualityChecks(); var i = a.findIndex(function(x){return x.id===id;}); if(i!==-1){Object.assign(a[i],u);this._set(this.KEYS.QUALITY_CHECKS,a);return a[i];}return null; },
    deleteQualityCheck(id) { this._set(this.KEYS.QUALITY_CHECKS, this.getQualityChecks().filter(function(x){return x.id!==id;})); },

    // === Contracts ===
    getContracts() { return this._get(this.KEYS.CONTRACTS); },
    addContract(d) { var a = this.getContracts(); d.id = this._generateId(); d.createdAt = new Date().toISOString(); a.unshift(d); this._set(this.KEYS.CONTRACTS, a); return d; },
    updateContract(id, u) { var a = this.getContracts(); var i = a.findIndex(function(x){return x.id===id;}); if(i!==-1){Object.assign(a[i],u);this._set(this.KEYS.CONTRACTS,a);return a[i];}return null; },
    deleteContract(id) { this._set(this.KEYS.CONTRACTS, this.getContracts().filter(function(x){return x.id!==id;})); },

    // === Billings (기성) ===
    getBillings() { return this._get(this.KEYS.BILLINGS); },
    addBilling(d) { var a = this.getBillings(); d.id = this._generateId(); d.createdAt = new Date().toISOString(); a.unshift(d); this._set(this.KEYS.BILLINGS, a); return d; },
    updateBilling(id, u) { var a = this.getBillings(); var i = a.findIndex(function(x){return x.id===id;}); if(i!==-1){Object.assign(a[i],u);this._set(this.KEYS.BILLINGS,a);return a[i];}return null; },
    deleteBilling(id) { this._set(this.KEYS.BILLINGS, this.getBillings().filter(function(x){return x.id!==id;})); },

    // === New Category Arrays ===
    SAFETY_CHECK_TYPES: ['TBM', '일일점검', '수시점검', '특별점검'],
    SAFETY_EDU_TYPES: ['신규채용시', '정기교육', '특별교육', '변경시교육'],
    QUALITY_CHECK_TYPES: ['자재검수', '시공검사', '완료검사', '중간검사'],
    QUALITY_RESULTS: ['합격', '불합격', '조건부합격'],
    CONTRACT_TYPES: ['하도급', '자재납품', '장비임대', '용역'],
    CONTRACT_STATUSES: ['계약중', '완료', '해지'],
    BILLING_STATUSES: ['작성중', '청구중', '승인', '지급완료'],
    SAFETY_CHECKLIST: [
        '안전모 착용 상태', '안전화 착용 상태', '안전벨트 착용(고소작업)',
        '작업발판 설치 상태', '개구부 방호조치', '안전난간 설치 상태',
        '가설전기 안전상태', '소화기 비치 상태', '위험표지판 부착',
        '작업장 정리정돈', '장비/공구 점검 상태', '가설구조물 안전상태'
    ],
    TBM_CHECKLIST: [
        '금일 작업내용 및 위험요인 공유', '안전보호구 착용 상태 확인',
        '안전작업 절차 교육', '비상시 대피경로 확인',
        '전일 안전사항 전달', '특이사항 공유'
    ],

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
        if (this.getSites().length === 0) {
            var site1 = this.addSite({ name: '힐스테이트 광교 신축공사', code: 'PRJ-001', type: '공동주택', status: '진행중', address: '경기도 수원시 영통구 광교중앙로', client: '현대건설', contractor: '(주)광교건설', startDate: '2025-06-01', endDate: '2027-03-31', manager: '김현장', managerPhone: '010-1234-5678', contractAmount: 850000000 });
            var site2 = this.addSite({ name: '삼성동 오피스 리모델링', code: 'PRJ-002', type: '상업시설', status: '진행중', address: '서울시 강남구 삼성동 테헤란로', client: '(주)삼성빌딩', contractor: '(주)한국인테리어', startDate: '2025-12-01', endDate: '2026-06-30', manager: '이소장', managerPhone: '010-9876-5432', contractAmount: 320000000 });
            this.addSite({ name: '인천항 물류센터 신축', code: 'PRJ-003', type: '공장/물류', status: '완료', address: '인천시 중구 항동', client: '인천항만공사', contractor: '(주)인천건설', startDate: '2024-01-01', endDate: '2025-08-31', manager: '박소장', managerPhone: '010-5555-1234', contractAmount: 1200000000 });
        }

        // Sample daily logs
        if (this.getDailyLogs().length === 0) {
            var sites = this.getSites();
            if (sites.length > 0) {
                this.addDailyLog({ date: today, siteId: sites[0].id, siteName: sites[0].name, weather: '맑음', temperature: '14', personnelTotal: 12, personnelByType: '철근공 4명, 형틀공 5명, 콘크리트공 3명', workProgress: '3층 슬라브 거푸집 설치 완료. 내일 콘크리트 타설 예정.', safetyCheck: true, safetyNotes: '안전모 착용 및 안전벨트 점검 완료', issues: '없음', tomorrowPlan: '3층 슬라브 콘크리트 타설', writer: '김현장' });
                this.addDailyLog({ date: yesterday, siteId: sites[0].id, siteName: sites[0].name, weather: '구름조금', temperature: '12', personnelTotal: 10, personnelByType: '철근공 4명, 형틀공 4명, 장비기사 2명', workProgress: '3층 슬라브 철근 배근 완료. 레미콘 발주 완료.', safetyCheck: true, safetyNotes: '고소작업 안전벨트 착용 점검', issues: '철근 일부 수량 부족 - 추가 발주 완료', tomorrowPlan: '3층 슬라브 거푸집 설치', writer: '김현장' });
                this.addDailyLog({ date: twoDaysAgo, siteId: sites[1] ? sites[1].id : sites[0].id, siteName: sites[1] ? sites[1].name : sites[0].name, weather: '흐림', temperature: '10', personnelTotal: 8, personnelByType: '미장공 3명, 도장공 3명, 관리자 2명', workProgress: '2층 내부 미장 마감 50% 완료. 바닥 에폭시 도장 착수.', safetyCheck: true, safetyNotes: '도장 작업 환기 철저', issues: '없음', tomorrowPlan: '2층 내부 미장 마감 완료', writer: '이소장' });
            }
        }

        // Sample approvals
        if (this.getApprovals().length === 0) {
            var sampleSites = this.getSites();
            if (sampleSites.length > 0) {
                this.addApproval({ type: '비용결재', title: '3층 레미콘 타설 외주비', amount: 5800000, description: '25-21-15 레미콘 60m3 타설 외주 비용', requestor: '김현장', requestDate: today, siteId: sampleSites[0].id, siteName: sampleSites[0].name, status: '대기중', approvedBy: '', approvalDate: '', rejectReason: '' });
                this.addApproval({ type: '자재요청', title: '철근 D16 20톤 추가 발주', amount: 8200000, description: '4층 슬라브 철근 공사를 위한 SD400 D16 추가 발주', requestor: '김현장', requestDate: yesterday, siteId: sampleSites[0].id, siteName: sampleSites[0].name, status: '승인', approvedBy: '본사 이사', approvalDate: today, rejectReason: '' });
                this.addApproval({ type: '인원요청', title: '도장공 3명 추가 투입 요청', amount: 660000, description: '공기 단축을 위한 도장공 3명 3일간 추가 투입', requestor: '이소장', requestDate: twoDaysAgo, siteId: sampleSites[1] ? sampleSites[1].id : sampleSites[0].id, siteName: sampleSites[1] ? sampleSites[1].name : sampleSites[0].name, status: '반려', approvedBy: '본사 이사', approvalDate: yesterday, rejectReason: '예산 초과. 기존 인원으로 진행 요망.' });
            }
        }

        // Sample safety checks
        if (this.getSafetyChecks().length === 0) {
            var ss = this.getSites();
            if (ss.length > 0) {
                this.addSafetyCheck({ date: today, siteId: ss[0].id, siteName: ss[0].name, type: 'TBM', inspector: '김현장', weather: '맑음', temperature: '14', participants: 12, checkItems: this.TBM_CHECKLIST.map(function(item){ return {item:item,checked:true}; }), issues: '없음', actions: '', result: '적합' });
                this.addSafetyCheck({ date: today, siteId: ss[0].id, siteName: ss[0].name, type: '일일점검', inspector: '안전관리자', weather: '맑음', temperature: '14', participants: 0, checkItems: this.SAFETY_CHECKLIST.map(function(item,i){ return {item:item,checked:i!==4}; }), issues: '3층 개구부 안전덮개 일부 미설치', actions: '즉시 안전덮개 추가 설치 완료', result: '조건부적합' });
                this.addSafetyCheck({ date: yesterday, siteId: ss[0].id, siteName: ss[0].name, type: 'TBM', inspector: '김현장', weather: '구름조금', temperature: '12', participants: 10, checkItems: this.TBM_CHECKLIST.map(function(item){ return {item:item,checked:true}; }), issues: '없음', actions: '', result: '적합' });
            }
        }

        // Sample safety education
        if (this.getSafetyEducation().length === 0) {
            var ss2 = this.getSites();
            if (ss2.length > 0) {
                this.addSafetyEducation({ date: today, siteId: ss2[0].id, siteName: ss2[0].name, type: '정기교육', title: '3월 정기 안전교육', content: '고소작업 안전수칙, 추락재해 예방, 안전대 사용법', instructor: '안전관리자', duration: 2, participants: 12, participantNames: '김철수, 이영희, 박민수, 최동현, 정수진, 한우성, 강지훈 외 5명' });
                this.addSafetyEducation({ date: yesterday, siteId: ss2[0].id, siteName: ss2[0].name, type: '신규채용시', title: '신규 근로자 채용 시 교육', content: '현장 안전수칙, 비상대피로, 보호구 착용법, 위험물 취급', instructor: '김현장', duration: 1, participants: 3, participantNames: '신입1, 신입2, 신입3' });
            }
        }

        // Sample risk assessments
        if (this.getRiskAssessments().length === 0) {
            var ss3 = this.getSites();
            if (ss3.length > 0) {
                this.addRiskAssessment({ date: today, siteId: ss3[0].id, siteName: ss3[0].name, workType: '거푸집 설치 작업', hazard: '고소작업 중 추락', frequency: 4, severity: 5, riskScore: 20, riskLevel: '상', currentMeasures: '안전대 착용, 안전난간 설치', additionalMeasures: '작업발판 추가 설치, 안전네트 설치', responsible: '안전관리자', status: '진행중' });
                this.addRiskAssessment({ date: today, siteId: ss3[0].id, siteName: ss3[0].name, workType: '철근 가공 작업', hazard: '철근 절단 시 비산물에 의한 부상', frequency: 3, severity: 3, riskScore: 9, riskLevel: '중', currentMeasures: '보안경 착용, 방호커버 설치', additionalMeasures: '작업반경 내 출입통제', responsible: '공사팀장', status: '완료' });
                this.addRiskAssessment({ date: yesterday, siteId: ss3[0].id, siteName: ss3[0].name, workType: '콘크리트 타설', hazard: '레미콘 차량 이동 시 협착', frequency: 3, severity: 4, riskScore: 12, riskLevel: '중', currentMeasures: '유도원 배치, 경보장치 사용', additionalMeasures: '차량 통행로 별도 확보', responsible: '공사팀장', status: '진행중' });
            }
        }

        // Sample quality checks
        if (this.getQualityChecks().length === 0) {
            var ss4 = this.getSites();
            if (ss4.length > 0) {
                this.addQualityCheck({ date: today, siteId: ss4[0].id, siteName: ss4[0].name, type: '자재검수', title: '철근 D16 입고 검수', location: '자재 야적장', standard: 'KS D 3504 SD400 / D16', result: '합격', inspector: '품질관리자', findings: '인장강도, 항복강도 시험성적서 확인 완료. Mill Sheet 적합.', actions: '' });
                this.addQualityCheck({ date: yesterday, siteId: ss4[0].id, siteName: ss4[0].name, type: '시공검사', title: '3층 슬라브 철근 배근검사', location: '3층 슬라브', standard: '구조도면 S-301, 배근간격 @200', result: '합격', inspector: '감리단', findings: '배근간격, 피복두께, 정착길이 적합', actions: '' });
                this.addQualityCheck({ date: twoDaysAgo, siteId: ss4[0].id, siteName: ss4[0].name, type: '시공검사', title: '2층 방수공사 검사', location: '2층 화장실', standard: '우레탄 도막방수 1.5mm 이상', result: '조건부합격', inspector: '품질관리자', findings: '일부 구간 도막 두께 1.3mm 미달', actions: '미달 구간 추가 도포 후 재검사' });
            }
        }

        // Sample contracts
        if (this.getContracts().length === 0) {
            var ss5 = this.getSites();
            if (ss5.length > 0) {
                this.addContract({ siteId: ss5[0].id, siteName: ss5[0].name, contractor: '(주)대한철근', contractType: '하도급', workScope: '골조공사 - 철근 가공 및 조립', contractAmount: 180000000, startDate: '2025-06-15', endDate: '2026-08-31', contactPerson: '최사장', contactPhone: '010-1111-2222', status: '계약중' });
                this.addContract({ siteId: ss5[0].id, siteName: ss5[0].name, contractor: '(주)한국형틀', contractType: '하도급', workScope: '골조공사 - 거푸집 제작 및 설치', contractAmount: 150000000, startDate: '2025-06-15', endDate: '2026-08-31', contactPerson: '이대표', contactPhone: '010-3333-4444', status: '계약중' });
                this.addContract({ siteId: ss5[0].id, siteName: ss5[0].name, contractor: '(주)한일전기', contractType: '하도급', workScope: '전기공사 일체', contractAmount: 120000000, startDate: '2025-09-01', endDate: '2027-01-31', contactPerson: '정사장', contactPhone: '010-5555-6666', status: '계약중' });
                this.addContract({ siteId: ss5[0].id, siteName: ss5[0].name, contractor: '동양레미콘', contractType: '자재납품', workScope: '레미콘 25-21-15 납품', contractAmount: 95000000, startDate: '2025-06-01', endDate: '2026-12-31', contactPerson: '박부장', contactPhone: '010-7777-8888', status: '계약중' });
            }
        }

        // Sample billings (기성)
        if (this.getBillings().length === 0) {
            var contracts = this.getContracts();
            var ss6 = this.getSites();
            if (contracts.length > 0 && ss6.length > 0) {
                this.addBilling({ siteId: ss6[0].id, siteName: ss6[0].name, contractId: contracts[0].id, contractorName: contracts[0].contractor, period: '2026-01', plannedAmount: 30000000, executedAmount: 28500000, billingRate: 95, cumulativeAmount: 85000000, status: '지급완료', note: '' });
                this.addBilling({ siteId: ss6[0].id, siteName: ss6[0].name, contractId: contracts[0].id, contractorName: contracts[0].contractor, period: '2026-02', plannedAmount: 35000000, executedAmount: 33000000, billingRate: 94, cumulativeAmount: 118000000, status: '승인', note: '' });
                this.addBilling({ siteId: ss6[0].id, siteName: ss6[0].name, contractId: contracts[0].id, contractorName: contracts[0].contractor, period: '2026-03', plannedAmount: 32000000, executedAmount: 0, billingRate: 0, cumulativeAmount: 118000000, status: '작성중', note: '월말 기성 청구 예정' });
            }
        }
    }
};
