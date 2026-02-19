/* =======================================
   BuilderOffice - Personnel Management Module
   인원 관리 페이지
   ======================================= */

const Personnel = {
    activeTab: 'list',
    dateFilter: '',

    render() {
        const stats = Store.getPersonnelStats();

        return `
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon green">👷</div>
          <div class="stat-info">
            <div class="stat-label">등록 인원</div>
            <div class="stat-value">${stats.totalRegistered}명</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">📋</div>
          <div class="stat-info">
            <div class="stat-label">금일 출역</div>
            <div class="stat-value">${stats.todayCount}명</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">⏱️</div>
          <div class="stat-info">
            <div class="stat-label">금일 총 근무시간</div>
            <div class="stat-value">${stats.todayHours}시간</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="tab-nav">
          <button class="tab-btn ${this.activeTab === 'list' ? 'active' : ''}" onclick="Personnel.switchTab('list')">👷 인원 목록</button>
          <button class="tab-btn ${this.activeTab === 'attendance' ? 'active' : ''}" onclick="Personnel.switchTab('attendance')">📋 출역 기록</button>
        </div>

        <div class="tab-content ${this.activeTab === 'list' ? 'active' : ''}" id="tabList">
          ${this._renderPersonnelList()}
        </div>
        <div class="tab-content ${this.activeTab === 'attendance' ? 'active' : ''}" id="tabAttendance">
          ${this._renderAttendance()}
        </div>
      </div>
    `;
    },

    _renderPersonnelList() {
        const personnel = Store.getPersonnel();

        return `
      <div class="toolbar">
        <div class="toolbar-left">
          <span style="color: var(--text-muted); font-size: 13px;">총 ${personnel.length}명 등록</span>
        </div>
        <button class="btn btn-primary" onclick="Personnel.showAddPersonModal()">
          ➕ 인원 등록
        </button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>직종</th>
              <th>연락처</th>
              <th>일당</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            ${personnel.length > 0 ? personnel.map(p => `
              <tr>
                <td style="color: var(--text-primary); font-weight: 500;">${p.name}</td>
                <td><span class="badge badge-blue">${p.jobType}</span></td>
                <td>${p.phone || '-'}</td>
                <td class="amount">${Store.formatCurrency(p.dailyWage || 0)}</td>
                <td><span class="badge ${p.status === '활성' ? 'badge-green' : 'badge-red'}">${p.status || '활성'}</span></td>
                <td>
                  <div class="action-btns">
                    <button class="action-btn edit" onclick="Personnel.showEditPersonModal('${p.id}')" title="수정">✏️</button>
                    <button class="action-btn delete" onclick="Personnel.confirmDeletePerson('${p.id}')" title="삭제">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="6">
                  <div class="empty-state">
                    <div class="empty-icon">👷</div>
                    <p>등록된 인원이 없습니다</p>
                    <button class="btn btn-primary" onclick="Personnel.showAddPersonModal()">인원 등록하기</button>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
    },

    _renderAttendance() {
        let attendance = Store.getAttendance();
        if (this.dateFilter) {
            attendance = attendance.filter(a => a.date === this.dateFilter);
        }

        return `
      <div class="toolbar">
        <div class="toolbar-left">
          <input type="date" class="filter-input" id="attendanceDateFilter" 
            value="${this.dateFilter || Store.getToday()}" 
            onchange="Personnel.setDateFilter(this.value)">
          <span style="color: var(--text-muted); font-size: 13px;">${attendance.length}건</span>
        </div>
        <button class="btn btn-primary" onclick="Personnel.showAddAttendanceModal()">
          ➕ 출역 등록
        </button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>이름</th>
              <th>직종</th>
              <th>근무시간</th>
              <th>잔업</th>
              <th>비고</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            ${attendance.length > 0 ? attendance.map(a => `
              <tr>
                <td>${a.date}</td>
                <td style="color: var(--text-primary); font-weight: 500;">${a.personName}</td>
                <td><span class="badge badge-green">${a.jobType}</span></td>
                <td>${a.hours}시간</td>
                <td>${a.overtime ? a.overtime + '시간' : '-'}</td>
                <td>${a.note || '-'}</td>
                <td>
                  <div class="action-btns">
                    <button class="action-btn edit" onclick="Personnel.showEditAttendanceModal('${a.id}')" title="수정">✏️</button>
                    <button class="action-btn delete" onclick="Personnel.confirmDeleteAttendance('${a.id}')" title="삭제">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="7">
                  <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>출역 기록이 없습니다</p>
                    <button class="btn btn-primary" onclick="Personnel.showAddAttendanceModal()">출역 등록하기</button>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
    },

    switchTab(tab) {
        this.activeTab = tab;
        App.refreshPage();
    },

    setDateFilter(val) {
        this.dateFilter = val;
        App.refreshPage();
    },

    // === Person CRUD Modals ===
    showAddPersonModal() {
        const html = `
      <div class="modal-header">
        <h3>👷 인원 등록</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>이름</label>
            <input type="text" class="form-control" id="personName" placeholder="홍길동">
          </div>
          <div class="form-group">
            <label>직종</label>
            <select class="form-control" id="personJobType">
              ${Store.JOB_TYPES.map(j => `<option value="${j}">${j}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>연락처</label>
            <input type="tel" class="form-control" id="personPhone" placeholder="010-0000-0000">
          </div>
          <div class="form-group">
            <label>일당 (원)</label>
            <input type="number" class="form-control" id="personWage" placeholder="200000">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="Personnel.savePerson()">등록</button>
      </div>
    `;
        App.showModal(html);
    },

    showEditPersonModal(id) {
        const person = Store.getPersonnel().find(p => p.id === id);
        if (!person) return;

        const html = `
      <div class="modal-header">
        <h3>✏️ 인원 수정</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>이름</label>
            <input type="text" class="form-control" id="personName" value="${person.name}">
          </div>
          <div class="form-group">
            <label>직종</label>
            <select class="form-control" id="personJobType">
              ${Store.JOB_TYPES.map(j => `<option value="${j}" ${j === person.jobType ? 'selected' : ''}>${j}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>연락처</label>
            <input type="tel" class="form-control" id="personPhone" value="${person.phone || ''}">
          </div>
          <div class="form-group">
            <label>일당 (원)</label>
            <input type="number" class="form-control" id="personWage" value="${person.dailyWage || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>상태</label>
          <select class="form-control" id="personStatus">
            <option value="활성" ${person.status === '활성' ? 'selected' : ''}>활성</option>
            <option value="비활성" ${person.status === '비활성' ? 'selected' : ''}>비활성</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="Personnel.updatePerson('${id}')">수정</button>
      </div>
    `;
        App.showModal(html);
    },

    savePerson() {
        const name = document.getElementById('personName').value.trim();
        const jobType = document.getElementById('personJobType').value;
        const phone = document.getElementById('personPhone').value.trim();
        const dailyWage = document.getElementById('personWage').value;

        if (!name) {
            App.showToast('이름을 입력해주세요.', 'error');
            return;
        }

        Store.addPerson({ name, jobType, phone, dailyWage: Number(dailyWage) || 0, status: '활성' });
        App.closeModal();
        App.refreshPage();
        App.showToast(`${name}님이 등록되었습니다.`, 'success');
    },

    updatePerson(id) {
        const name = document.getElementById('personName').value.trim();
        const jobType = document.getElementById('personJobType').value;
        const phone = document.getElementById('personPhone').value.trim();
        const dailyWage = document.getElementById('personWage').value;
        const status = document.getElementById('personStatus').value;

        if (!name) {
            App.showToast('이름을 입력해주세요.', 'error');
            return;
        }

        Store.updatePerson(id, { name, jobType, phone, dailyWage: Number(dailyWage) || 0, status });
        App.closeModal();
        App.refreshPage();
        App.showToast('인원 정보가 수정되었습니다.', 'success');
    },

    confirmDeletePerson(id) {
        if (confirm('이 인원과 관련 출역 기록을 모두 삭제하시겠습니까?')) {
            Store.deletePerson(id);
            App.refreshPage();
            App.showToast('인원이 삭제되었습니다.', 'info');
        }
    },

    // === Attendance Modals ===
    showAddAttendanceModal() {
        const personnel = Store.getPersonnel().filter(p => p.status === '활성');

        const html = `
      <div class="modal-header">
        <h3>📋 출역 등록</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>날짜</label>
            <input type="date" class="form-control" id="attDate" value="${Store.getToday()}">
          </div>
          <div class="form-group">
            <label>작업자</label>
            <select class="form-control" id="attPerson" onchange="Personnel.onPersonSelect()">
              <option value="">선택하세요</option>
              ${personnel.map(p => `<option value="${p.id}" data-name="${p.name}" data-job="${p.jobType}">${p.name} (${p.jobType})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>근무시간</label>
            <input type="number" class="form-control" id="attHours" value="8" min="1" max="24">
          </div>
          <div class="form-group">
            <label>잔업시간</label>
            <input type="number" class="form-control" id="attOvertime" value="0" min="0" max="16">
          </div>
        </div>
        <div class="form-group">
          <label>비고</label>
          <input type="text" class="form-control" id="attNote" placeholder="작업 내용">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="Personnel.saveAttendance()">등록</button>
      </div>
    `;
        App.showModal(html);
    },

    showEditAttendanceModal(id) {
        const record = Store.getAttendance().find(a => a.id === id);
        if (!record) return;

        const html = `
      <div class="modal-header">
        <h3>✏️ 출역 수정</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>날짜</label>
            <input type="date" class="form-control" id="attDate" value="${record.date}">
          </div>
          <div class="form-group">
            <label>작업자</label>
            <input type="text" class="form-control" value="${record.personName} (${record.jobType})" disabled>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>근무시간</label>
            <input type="number" class="form-control" id="attHours" value="${record.hours}" min="1" max="24">
          </div>
          <div class="form-group">
            <label>잔업시간</label>
            <input type="number" class="form-control" id="attOvertime" value="${record.overtime || 0}" min="0" max="16">
          </div>
        </div>
        <div class="form-group">
          <label>비고</label>
          <input type="text" class="form-control" id="attNote" value="${record.note || ''}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="Personnel.updateAttendance('${id}')">수정</button>
      </div>
    `;
        App.showModal(html);
    },

    onPersonSelect() {
        // Helper for future enhancements
    },

    saveAttendance() {
        const date = document.getElementById('attDate').value;
        const personSelect = document.getElementById('attPerson');
        const personId = personSelect.value;
        const selectedOption = personSelect.options[personSelect.selectedIndex];
        const hours = document.getElementById('attHours').value;
        const overtime = document.getElementById('attOvertime').value;
        const note = document.getElementById('attNote').value.trim();

        if (!date || !personId) {
            App.showToast('날짜와 작업자를 선택해주세요.', 'error');
            return;
        }

        const personName = selectedOption.dataset.name;
        const jobType = selectedOption.dataset.job;

        Store.addAttendance({
            personId, personName, jobType, date,
            hours: Number(hours), overtime: Number(overtime), note
        });
        App.closeModal();
        App.refreshPage();
        App.showToast(`${personName}님의 출역이 등록되었습니다.`, 'success');
    },

    updateAttendance(id) {
        const date = document.getElementById('attDate').value;
        const hours = document.getElementById('attHours').value;
        const overtime = document.getElementById('attOvertime').value;
        const note = document.getElementById('attNote').value.trim();

        Store.updateAttendance(id, {
            date, hours: Number(hours), overtime: Number(overtime), note
        });
        App.closeModal();
        App.refreshPage();
        App.showToast('출역 기록이 수정되었습니다.', 'success');
    },

    confirmDeleteAttendance(id) {
        if (confirm('이 출역 기록을 삭제하시겠습니까?')) {
            Store.deleteAttendance(id);
            App.refreshPage();
            App.showToast('출역 기록이 삭제되었습니다.', 'info');
        }
    }
};
