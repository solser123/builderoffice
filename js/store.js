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
  },

  // === Generic CRUD ===
  _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading ${key}:`, e);
      return [];
    }
  },

  _set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key}:`, e);
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
    const costs = this.getCosts();
    cost.id = this._generateId();
    cost.createdAt = new Date().toISOString();
    costs.unshift(cost);
    this._set(this.KEYS.COSTS, costs);
    return cost;
  },

  updateCost(id, updates) {
    const costs = this.getCosts();
    const idx = costs.findIndex(c => c.id === id);
    if (idx !== -1) {
      costs[idx] = { ...costs[idx], ...updates };
      this._set(this.KEYS.COSTS, costs);
      return costs[idx];
    }
    return null;
  },

  deleteCost(id) {
    const costs = this.getCosts().filter(c => c.id !== id);
    this._set(this.KEYS.COSTS, costs);
  },

  getCostStats() {
    const costs = this.getCosts();
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    return {
      total: costs.reduce((sum, c) => sum + Number(c.amount), 0),
      todayTotal: costs.filter(c => c.date === today).reduce((sum, c) => sum + Number(c.amount), 0),
      monthTotal: costs.filter(c => c.date && c.date.startsWith(thisMonth)).reduce((sum, c) => sum + Number(c.amount), 0),
      byCategory: this._groupBy(costs, 'category', 'amount'),
      count: costs.length,
    };
  },

  // === Personnel Management ===
  getPersonnel() {
    return this._get(this.KEYS.PERSONNEL);
  },

  addPerson(person) {
    const personnel = this.getPersonnel();
    person.id = this._generateId();
    person.createdAt = new Date().toISOString();
    personnel.unshift(person);
    this._set(this.KEYS.PERSONNEL, personnel);
    return person;
  },

  updatePerson(id, updates) {
    const personnel = this.getPersonnel();
    const idx = personnel.findIndex(p => p.id === id);
    if (idx !== -1) {
      personnel[idx] = { ...personnel[idx], ...updates };
      this._set(this.KEYS.PERSONNEL, personnel);
      return personnel[idx];
    }
    return null;
  },

  deletePerson(id) {
    const personnel = this.getPersonnel().filter(p => p.id !== id);
    this._set(this.KEYS.PERSONNEL, personnel);
    // Also delete related attendance
    const attendance = this.getAttendance().filter(a => a.personId !== id);
    this._set(this.KEYS.ATTENDANCE, attendance);
  },

  // === Attendance ===
  getAttendance() {
    return this._get(this.KEYS.ATTENDANCE);
  },

  addAttendance(record) {
    const attendance = this.getAttendance();
    record.id = this._generateId();
    record.createdAt = new Date().toISOString();
    attendance.unshift(record);
    this._set(this.KEYS.ATTENDANCE, attendance);
    return record;
  },

  updateAttendance(id, updates) {
    const attendance = this.getAttendance();
    const idx = attendance.findIndex(a => a.id === id);
    if (idx !== -1) {
      attendance[idx] = { ...attendance[idx], ...updates };
      this._set(this.KEYS.ATTENDANCE, attendance);
      return attendance[idx];
    }
    return null;
  },

  deleteAttendance(id) {
    const attendance = this.getAttendance().filter(a => a.id !== id);
    this._set(this.KEYS.ATTENDANCE, attendance);
  },

  getPersonnelStats() {
    const personnel = this.getPersonnel();
    const attendance = this.getAttendance();
    const today = new Date().toISOString().split('T')[0];

    const todayAttendance = attendance.filter(a => a.date === today);
    const byJob = {};
    personnel.forEach(p => {
      byJob[p.jobType] = (byJob[p.jobType] || 0) + 1;
    });

    return {
      totalRegistered: personnel.length,
      todayCount: todayAttendance.length,
      todayHours: todayAttendance.reduce((sum, a) => sum + Number(a.hours || 8), 0),
      byJobType: byJob,
    };
  },

  // === Materials Management ===
  getMaterials() {
    return this._get(this.KEYS.MATERIALS);
  },

  addMaterial(material) {
    const materials = this.getMaterials();
    material.id = this._generateId();
    material.createdAt = new Date().toISOString();
    material.stock = Number(material.stock) || 0;
    materials.unshift(material);
    this._set(this.KEYS.MATERIALS, materials);
    return material;
  },

  updateMaterial(id, updates) {
    const materials = this.getMaterials();
    const idx = materials.findIndex(m => m.id === id);
    if (idx !== -1) {
      materials[idx] = { ...materials[idx], ...updates };
      this._set(this.KEYS.MATERIALS, materials);
      return materials[idx];
    }
    return null;
  },

  deleteMaterial(id) {
    const materials = this.getMaterials().filter(m => m.id !== id);
    this._set(this.KEYS.MATERIALS, materials);
    // Also delete related logs
    const logs = this.getMaterialLogs().filter(l => l.materialId !== id);
    this._set(this.KEYS.MATERIAL_LOGS, logs);
  },

  // === Material Logs (입출고) ===
  getMaterialLogs() {
    return this._get(this.KEYS.MATERIAL_LOGS);
  },

  addMaterialLog(log) {
    const logs = this.getMaterialLogs();
    log.id = this._generateId();
    log.createdAt = new Date().toISOString();
    logs.unshift(log);
    this._set(this.KEYS.MATERIAL_LOGS, logs);

    // Update material stock
    const material = this.getMaterials().find(m => m.id === log.materialId);
    if (material) {
      const qty = Number(log.quantity);
      const newStock = log.type === 'in'
        ? Number(material.stock) + qty
        : Number(material.stock) - qty;
      this.updateMaterial(log.materialId, { stock: Math.max(0, newStock) });
    }

    return log;
  },

  getMaterialStats() {
    const materials = this.getMaterials();
    const logs = this.getMaterialLogs();

    const totalValue = materials.reduce((sum, m) => sum + (Number(m.stock) * Number(m.unitPrice || 0)), 0);
    const lowStock = materials.filter(m => Number(m.stock) <= Number(m.minStock || 10));
    const byCategory = {};
    materials.forEach(m => {
      byCategory[m.category] = (byCategory[m.category] || 0) + 1;
    });

    return {
      totalItems: materials.length,
      totalValue,
      lowStockCount: lowStock.length,
      byCategory,
      recentLogs: logs.slice(0, 10),
    };
  },

  // === Helper Functions ===
  _groupBy(arr, key, sumKey) {
    const result = {};
    arr.forEach(item => {
      const group = item[key] || '기타';
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

  // === Categories ===
  COST_CATEGORIES: ['인건비', '자재비', '장비비', '외주비', '운송비', '기타'],
  JOB_TYPES: ['철근공', '형틀공', '콘크리트공', '미장공', '방수공', '도장공', '전기공', '배관공', '용접공', '장비기사', '일반작업자', '관리자'],
  MATERIAL_CATEGORIES: ['철근', '시멘트/콘크리트', '목재', '골재', '전기자재', '배관자재', '방수자재', '도장자재', '철물', '기타'],

  // === Initialize with sample data ===
  initSampleData() {
    if (this.getCosts().length > 0) return; // Already has data

    const today = this.getToday();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    // Sample costs
    [
      { date: today, category: '인건비', name: '일용직 인건비', amount: 4500000, memo: '철근공 5명 x 1일' },
      { date: today, category: '자재비', name: '철근 D16 구매', amount: 8200000, memo: 'SD400 D16 20톤' },
      { date: yesterday, category: '장비비', name: '레미콘 타설', amount: 3600000, memo: '25-21-15 40㎥' },
      { date: yesterday, category: '외주비', name: '전기 배관 공사', amount: 5000000, memo: 'B1층 전기 배관' },
      { date: twoDaysAgo, category: '자재비', name: '합판 구매', amount: 2800000, memo: '12mm 코팅합판 200장' },
      { date: twoDaysAgo, category: '운송비', name: '철근 운반비', amount: 450000, memo: '25톤 카고 1대' },
    ].forEach(c => this.addCost(c));

    // Sample personnel
    const people = [
      { name: '김철수', jobType: '철근공', phone: '010-1234-5678', dailyWage: 220000, status: '활성' },
      { name: '이영희', jobType: '형틀공', phone: '010-2345-6789', dailyWage: 200000, status: '활성' },
      { name: '박민수', jobType: '콘크리트공', phone: '010-3456-7890', dailyWage: 210000, status: '활성' },
      { name: '최동현', jobType: '미장공', phone: '010-4567-8901', dailyWage: 190000, status: '활성' },
      { name: '정수진', jobType: '전기공', phone: '010-5678-9012', dailyWage: 230000, status: '활성' },
      { name: '한우성', jobType: '배관공', phone: '010-6789-0123', dailyWage: 220000, status: '활성' },
      { name: '강지훈', jobType: '용접공', phone: '010-7890-1234', dailyWage: 250000, status: '활성' },
      { name: '윤서연', jobType: '관리자', phone: '010-8901-2345', dailyWage: 180000, status: '활성' },
    ].map(p => this.addPerson(p));

    // Sample attendance
    people.slice(0, 6).forEach(p => {
      this.addAttendance({ personId: p.id, personName: p.name, jobType: p.jobType, date: today, hours: 8, overtime: 0, note: '' });
    });
    people.slice(0, 5).forEach(p => {
      this.addAttendance({ personId: p.id, personName: p.name, jobType: p.jobType, date: yesterday, hours: 8, overtime: 2, note: '' });
    });

    // Sample materials
    const mats = [
      { name: '철근 D16', category: '철근', spec: 'SD400 D16', unit: 'ton', stock: 15, unitPrice: 410000, minStock: 5 },
      { name: '철근 D13', category: '철근', spec: 'SD400 D13', unit: 'ton', stock: 8, unitPrice: 420000, minStock: 5 },
      { name: '레미콘 25-21-15', category: '시멘트/콘크리트', spec: '25-21-15', unit: '㎥', stock: 0, unitPrice: 90000, minStock: 0 },
      { name: '코팅합판 12mm', category: '목재', spec: '1220x2440x12mm', unit: '장', stock: 150, unitPrice: 14000, minStock: 50 },
      { name: '모래', category: '골재', spec: '세척사', unit: '㎥', stock: 30, unitPrice: 25000, minStock: 10 },
      { name: '자갈', category: '골재', spec: '25mm', unit: '㎥', stock: 25, unitPrice: 28000, minStock: 10 },
      { name: 'IV전선 2.5sq', category: '전기자재', spec: '2.5sq 흑색', unit: 'm', stock: 500, unitPrice: 800, minStock: 100 },
      { name: 'PVC파이프 50A', category: '배관자재', spec: 'VG1 50A 4m', unit: '본', stock: 45, unitPrice: 6500, minStock: 20 },
    ].map(m => this.addMaterial(m));

    // Sample material logs
    this.addMaterialLog({ materialId: mats[0].id, materialName: mats[0].name, type: 'in', quantity: 20, date: yesterday, note: '정기 입고' });
    this.addMaterialLog({ materialId: mats[0].id, materialName: mats[0].name, type: 'out', quantity: 5, date: today, note: 'B1 슬라브 사용' });
    this.addMaterialLog({ materialId: mats[3].id, materialName: mats[3].name, type: 'in', quantity: 200, date: twoDaysAgo, note: '구매 입고' });
    this.addMaterialLog({ materialId: mats[3].id, materialName: mats[3].name, type: 'out', quantity: 50, date: today, note: '2층 거푸집' });
  }
};
