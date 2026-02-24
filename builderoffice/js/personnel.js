/* =======================================
   BuilderOffice - Personnel Management Module
   인원 관리 페이지
   ======================================= */

var Personnel = {
    activeTab: 'list',
    dateFilter: '',

    render: function () {
        var stats = Store.getPersonnelStats();

        return '<div class="stat-cards">' +
            '<div class="stat-card">' +
            '<div class="stat-icon green">👷</div>' +
            '<div class="stat-info">' +
            '<div class="stat-label">등록 인원</div>' +
            '<div class="stat-value">' + stats.totalRegistered + '명</div>' +
            '</div>' +
            '</div>' +
            '<div class="stat-card">' +
            '<div class="stat-icon blue">📋</div>' +
            '<div class="stat-info">' +
            '<div class="stat-label">금일 출역</div>' +
            '<div class="stat-value">' + stats.todayCount + '명</div>' +
            '</div>' +
            '</div>' +
            '<div class="stat-card">' +
            '<div class="stat-icon purple">⏱️</div>' +
            '<div class="stat-info">' +
            '<div class="stat-label">금일 총 근무시간</div>' +
            '<div class="stat-value">' + stats.todayHours + '시간</div>' +
            '</div>' +
            '</div>' +
            '</div>' +

            '<div class="card">' +
            '<div class="tab-nav">' +
            '<button class="tab-btn ' + (this.activeTab === 'list' ? 'active' : '') + '" onclick="Personnel.switchTab(\'list\')">👷 직원 목록</button>' +
            '<button class="tab-btn ' + (this.activeTab === 'attendance' ? 'active' : '') + '" onclick="Personnel.switchTab(\'attendance\')">📋 출근부</button>' +
            '</div>' +

            '<div class="tab-content ' + (this.activeTab === 'list' ? 'active' : '') + '" id="tabList">' +
            this._renderPersonnelList() +
            '</div>' +
            '<div class="tab-content ' + (this.activeTab === 'attendance' ? 'active' : '') + '" id="tabAttendance">' +
            this._renderAttendance() +
            '</div>' +
            '</div>';
    },

    _renderPersonnelList: function () {
        var personnel = Store.getPersonnel();

        var rows = '';
        if (personnel.length > 0) {
            for (var i = 0; i < personnel.length; i++) {
                var p = personnel[i];
                var regBadge = p.regType === 'full' ? '<span class="badge badge-green">정식</span>' : '<span class="badge badge-orange">약식</span>';
                rows += '<tr>' +
                    '<td style="color: var(--text-primary); font-weight: 500;">' + p.name + '</td>' +
                    '<td><span class="badge badge-blue">' + p.jobType + '</span></td>' +
                    '<td>' + (p.phone || '-') + '</td>' +
                    '<td>' + (p.residentId ? p.residentId.substring(0, 8) + '******' : '-') + '</td>' +
                    '<td>' + (p.bank ? p.bank : '-') + '</td>' +
                    '<td>' + regBadge + '</td>' +
                    '<td class="amount">' + Store.formatCurrency(p.dailyWage || 0) + '</td>' +
                    '<td><span class="badge ' + (p.status === '활성' ? 'badge-green' : 'badge-red') + '">' + (p.status || '활성') + '</span></td>' +
                    '<td>' +
                    '<div class="action-btns">' +
                    '<button class="action-btn edit" onclick="Personnel.showViewPersonModal(\'' + p.id + '\')" title="상세보기">👁️</button>' +
                    '<button class="action-btn edit" onclick="Personnel.showEditPersonModal(\'' + p.id + '\')" title="수정">✏️</button>' +
                    '<button class="action-btn delete" onclick="Personnel.confirmDeletePerson(\'' + p.id + '\')" title="삭제">🗑️</button>' +
                    '</div>' +
                    '</td>' +
                    '</tr>';
            }
        } else {
            rows = '<tr><td colspan="9">' +
                '<div class="empty-state">' +
                '<div class="empty-icon">👷</div>' +
                '<p>등록된 인원이 없습니다</p>' +
                '<button class="btn btn-primary" onclick="Personnel.showAddPersonModal()">직원 등록하기</button>' +
                '</div>' +
                '</td></tr>';
        }

        return '<div class="toolbar">' +
            '<div class="toolbar-left">' +
            '<span style="color: var(--text-muted); font-size: 13px;">총 ' + personnel.length + '명 등록</span>' +
            '</div>' +
            '<button class="btn btn-primary" onclick="Personnel.showAddPersonModal()">' +
            '➕ 직원 등록' +
            '</button>' +
            '</div>' +
            '<div class="table-container">' +
            '<table>' +
            '<thead><tr>' +
            '<th>이름</th><th>직종</th><th>연락처</th><th>주민번호</th><th>은행</th><th>등록</th><th>일당</th><th>상태</th><th>작업</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
            '</table>' +
            '</div>';
    },

    _renderAttendance: function () {
        var attendance = Store.getAttendance();
        if (this.dateFilter) {
            attendance = attendance.filter(function (a) { return a.date === Personnel.dateFilter; });
        }

        var rows = '';
        if (attendance.length > 0) {
            for (var i = 0; i < attendance.length; i++) {
                var a = attendance[i];
                rows += '<tr>' +
                    '<td>' + a.date + '</td>' +
                    '<td style="color: var(--text-primary); font-weight: 500;">' + a.personName + '</td>' +
                    '<td><span class="badge badge-green">' + a.jobType + '</span></td>' +
                    '<td>' + a.hours + '시간</td>' +
                    '<td>' + (a.overtime ? a.overtime + '시간' : '-') + '</td>' +
                    '<td>' + (a.note || '-') + '</td>' +
                    '<td>' +
                    '<div class="action-btns">' +
                    '<button class="action-btn edit" onclick="Personnel.showEditAttendanceModal(\'' + a.id + '\')" title="수정">✏️</button>' +
                    '<button class="action-btn delete" onclick="Personnel.confirmDeleteAttendance(\'' + a.id + '\')" title="삭제">🗑️</button>' +
                    '</div>' +
                    '</td>' +
                    '</tr>';
            }
        } else {
            rows = '<tr><td colspan="7">' +
                '<div class="empty-state">' +
                '<div class="empty-icon">📋</div>' +
                '<p>출역 기록이 없습니다</p>' +
                '<button class="btn btn-primary" onclick="Personnel.showAddAttendanceModal()">출역 등록하기</button>' +
                '</div>' +
                '</td></tr>';
        }

        return '<div class="toolbar">' +
            '<div class="toolbar-left">' +
            '<input type="date" class="filter-input" id="attendanceDateFilter" value="' + (this.dateFilter || Store.getToday()) + '" onchange="Personnel.setDateFilter(this.value)">' +
            '<span style="color: var(--text-muted); font-size: 13px;">' + attendance.length + '건</span>' +
            '</div>' +
            '<div style="display:flex; gap:8px;">' +
            '<button class="btn btn-secondary" onclick="Personnel.showQuickRegisterModal()">⚡ 약식 등록</button>' +
            '<button class="btn btn-primary" onclick="Personnel.showAddAttendanceModal()">➕ 출역 등록</button>' +
            '</div>' +
            '</div>' +
            '<div class="table-container">' +
            '<table>' +
            '<thead><tr>' +
            '<th>날짜</th><th>이름</th><th>직종</th><th>근무시간</th><th>잔업</th><th>비고</th><th>작업</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
            '</table>' +
            '</div>';
    },

    switchTab: function (tab) {
        this.activeTab = tab;
        App.refreshPage();
    },

    setDateFilter: function (val) {
        this.dateFilter = val;
        App.refreshPage();
    },

    // === Full Person Registration Modal (상세 등록) ===
    showAddPersonModal: function () {
        var jobOptions = '';
        for (var i = 0; i < Store.JOB_TYPES.length; i++) {
            jobOptions += '<option value="' + Store.JOB_TYPES[i] + '">' + Store.JOB_TYPES[i] + '</option>';
        }
        var bankOptions = '<option value="">선택하세요</option>';
        for (var b = 0; b < Store.BANKS.length; b++) {
            bankOptions += '<option value="' + Store.BANKS[b] + '">' + Store.BANKS[b] + '</option>';
        }

        var html = '<div class="modal-header">' +
            '<h3>👷 직원 등록</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div style="background: rgba(6,182,212,0.08); border-radius:8px; padding:12px; margin-bottom:16px; font-size:13px; color:var(--text-secondary);">📝 직원의 기본 정보를 입력해주세요. 주민번호와 계좌정보는 급여 지급에 필요합니다.</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>이름 *</label><input type="text" class="form-control" id="personName" placeholder="홍길동"></div>' +
            '<div class="form-group"><label>직종 *</label><select class="form-control" id="personJobType">' + jobOptions + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>주민등록번호</label><input type="text" class="form-control" id="personResidentId" placeholder="000000-0000000" maxlength="14"></div>' +
            '<div class="form-group"><label>핸드폰번호</label><input type="tel" class="form-control" id="personPhone" placeholder="010-0000-0000"></div>' +
            '</div>' +
            '<div class="form-group"><label>주소</label><input type="text" class="form-control" id="personAddress" placeholder="서울시 강남구 역삼동 123-45"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>은행</label><select class="form-control" id="personBank">' + bankOptions + '</select></div>' +
            '<div class="form-group"><label>계좌번호</label><input type="text" class="form-control" id="personAccount" placeholder="123-456-7890"></div>' +
            '</div>' +
            '<div class="form-group"><label>일당 (원)</label><input type="number" class="form-control" id="personWage" placeholder="200000"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Personnel.savePerson()">등록</button>' +
            '</div>';
        App.showModal(html);
    },

    // === Quick Register Modal (약식 등록 - 출근부에서 사용) ===
    showQuickRegisterModal: function () {
        var jobOptions = '';
        for (var i = 0; i < Store.JOB_TYPES.length; i++) {
            jobOptions += '<option value="' + Store.JOB_TYPES[i] + '">' + Store.JOB_TYPES[i] + '</option>';
        }

        var html = '<div class="modal-header">' +
            '<h3>⚡ 약식 직원 등록</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div style="background: rgba(245,158,11,0.1); border-radius:8px; padding:12px; margin-bottom:16px; font-size:13px; color:var(--accent-warning);">⚡ 빠른 등록: 이름과 직종만으로 등록합니다. 상세 정보는 나중에 입력할 수 있습니다.</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>이름 *</label><input type="text" class="form-control" id="quickName" placeholder="홍길동"></div>' +
            '<div class="form-group"><label>직종 *</label><select class="form-control" id="quickJobType">' + jobOptions + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>핸드폰번호</label><input type="tel" class="form-control" id="quickPhone" placeholder="010-0000-0000"></div>' +
            '<div class="form-group"><label>일당 (원)</label><input type="number" class="form-control" id="quickWage" placeholder="200000"></div>' +
            '</div>' +
            '<div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:8px;">' +
            '<label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; color:var(--text-secondary);">' +
            '<input type="checkbox" id="quickAddAttendance" checked style="width:18px; height:18px;"> 등록 후 바로 오늘 출역 추가' +
            '</label>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Personnel.saveQuickPerson()">약식 등록</button>' +
            '</div>';
        App.showModal(html);
    },

    // === View Person Detail Modal ===
    showViewPersonModal: function (id) {
        var person = Store.getPersonnel().find(function (p) { return p.id === id; });
        if (!person) return;

        var html = '<div class="modal-header">' +
            '<h3>👷 직원 상세 정보</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div style="display:grid; gap:12px;">' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">' +
            '<span style="color:var(--text-muted);">이름</span><span style="color:var(--text-primary); font-weight:600;">' + person.name + '</span>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">' +
            '<span style="color:var(--text-muted);">직종</span><span><span class="badge badge-blue">' + person.jobType + '</span></span>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">' +
            '<span style="color:var(--text-muted);">주민등록번호</span><span style="color:var(--text-primary);">' + (person.residentId || '미등록') + '</span>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">' +
            '<span style="color:var(--text-muted);">핸드폰번호</span><span style="color:var(--text-primary);">' + (person.phone || '미등록') + '</span>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">' +
            '<span style="color:var(--text-muted);">주소</span><span style="color:var(--text-primary);">' + (person.address || '미등록') + '</span>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">' +
            '<span style="color:var(--text-muted);">은행</span><span style="color:var(--text-primary);">' + (person.bank || '미등록') + '</span>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">' +
            '<span style="color:var(--text-muted);">계좌번호</span><span style="color:var(--text-primary);">' + (person.accountNumber || '미등록') + '</span>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);">' +
            '<span style="color:var(--text-muted);">일당</span><span style="color:var(--text-primary); font-weight:600;">' + Store.formatCurrency(person.dailyWage || 0) + '</span>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; padding:10px 0;">' +
            '<span style="color:var(--text-muted);">등록 유형</span><span>' + (person.regType === 'full' ? '<span class="badge badge-green">정식 등록</span>' : '<span class="badge badge-orange">약식 등록</span>') + '</span>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">닫기</button>' +
            '<button class="btn btn-primary" onclick="App.closeModal(); Personnel.showEditPersonModal(\'' + id + '\');">수정</button>' +
            '</div>';
        App.showModal(html);
    },

    // === Edit Person Modal ===
    showEditPersonModal: function (id) {
        var person = Store.getPersonnel().find(function (p) { return p.id === id; });
        if (!person) return;

        var jobOptions = '';
        for (var i = 0; i < Store.JOB_TYPES.length; i++) {
            var sel = Store.JOB_TYPES[i] === person.jobType ? ' selected' : '';
            jobOptions += '<option value="' + Store.JOB_TYPES[i] + '"' + sel + '>' + Store.JOB_TYPES[i] + '</option>';
        }
        var bankOptions = '<option value="">선택하세요</option>';
        for (var b = 0; b < Store.BANKS.length; b++) {
            var bsel = Store.BANKS[b] === person.bank ? ' selected' : '';
            bankOptions += '<option value="' + Store.BANKS[b] + '"' + bsel + '>' + Store.BANKS[b] + '</option>';
        }

        var html = '<div class="modal-header">' +
            '<h3>✏️ 직원 정보 수정</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>이름</label><input type="text" class="form-control" id="personName" value="' + person.name + '"></div>' +
            '<div class="form-group"><label>직종</label><select class="form-control" id="personJobType">' + jobOptions + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>주민등록번호</label><input type="text" class="form-control" id="personResidentId" value="' + (person.residentId || '') + '" placeholder="000000-0000000" maxlength="14"></div>' +
            '<div class="form-group"><label>핸드폰번호</label><input type="tel" class="form-control" id="personPhone" value="' + (person.phone || '') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>주소</label><input type="text" class="form-control" id="personAddress" value="' + (person.address || '') + '"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>은행</label><select class="form-control" id="personBank">' + bankOptions + '</select></div>' +
            '<div class="form-group"><label>계좌번호</label><input type="text" class="form-control" id="personAccount" value="' + (person.accountNumber || '') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>일당 (원)</label><input type="number" class="form-control" id="personWage" value="' + (person.dailyWage || '') + '"></div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="personStatus">' +
            '<option value="활성"' + (person.status === '활성' ? ' selected' : '') + '>활성</option>' +
            '<option value="비활성"' + (person.status === '비활성' ? ' selected' : '') + '>비활성</option>' +
            '</select></div>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Personnel.updatePerson(\'' + id + '\')">수정</button>' +
            '</div>';
        App.showModal(html);
    },

    savePerson: function () {
        var name = document.getElementById('personName').value.trim();
        var jobType = document.getElementById('personJobType').value;
        var residentId = document.getElementById('personResidentId').value.trim();
        var phone = document.getElementById('personPhone').value.trim();
        var address = document.getElementById('personAddress').value.trim();
        var bank = document.getElementById('personBank').value;
        var accountNumber = document.getElementById('personAccount').value.trim();
        var dailyWage = document.getElementById('personWage').value;

        if (!name) {
            App.showToast('이름을 입력해주세요.', 'error');
            return;
        }

        Store.addPerson({
            name: name, jobType: jobType, residentId: residentId, phone: phone,
            address: address, bank: bank, accountNumber: accountNumber,
            dailyWage: Number(dailyWage) || 0, status: '활성', regType: 'full'
        });
        App.closeModal();
        App.refreshPage();
        App.showToast(name + '님이 등록되었습니다.', 'success');
    },

    saveQuickPerson: function () {
        var name = document.getElementById('quickName').value.trim();
        var jobType = document.getElementById('quickJobType').value;
        var phone = document.getElementById('quickPhone').value.trim();
        var dailyWage = document.getElementById('quickWage').value;
        var addAttendance = document.getElementById('quickAddAttendance').checked;

        if (!name) {
            App.showToast('이름을 입력해주세요.', 'error');
            return;
        }

        var person = Store.addPerson({
            name: name, jobType: jobType, phone: phone,
            residentId: '', address: '', bank: '', accountNumber: '',
            dailyWage: Number(dailyWage) || 0, status: '활성', regType: 'quick'
        });

        if (addAttendance) {
            Store.addAttendance({
                personId: person.id, personName: person.name,
                jobType: person.jobType, date: Store.getToday(),
                hours: 8, overtime: 0, note: '약식 등록'
            });
        }

        App.closeModal();
        App.refreshPage();
        App.showToast(name + '님이 약식 등록되었습니다.' + (addAttendance ? ' 출역도 추가됨.' : ''), 'success');
    },

    updatePerson: function (id) {
        var name = document.getElementById('personName').value.trim();
        var jobType = document.getElementById('personJobType').value;
        var residentId = document.getElementById('personResidentId').value.trim();
        var phone = document.getElementById('personPhone').value.trim();
        var address = document.getElementById('personAddress').value.trim();
        var bank = document.getElementById('personBank').value;
        var accountNumber = document.getElementById('personAccount').value.trim();
        var dailyWage = document.getElementById('personWage').value;
        var status = document.getElementById('personStatus').value;

        if (!name) {
            App.showToast('이름을 입력해주세요.', 'error');
            return;
        }

        // If all detail fields filled, upgrade to full registration
        var regType = (residentId && address && bank && accountNumber) ? 'full' : 'quick';

        Store.updatePerson(id, {
            name: name, jobType: jobType, residentId: residentId, phone: phone,
            address: address, bank: bank, accountNumber: accountNumber,
            dailyWage: Number(dailyWage) || 0, status: status, regType: regType
        });
        App.closeModal();
        App.refreshPage();
        App.showToast('직원 정보가 수정되었습니다.', 'success');
    },

    confirmDeletePerson: function (id) {
        if (confirm('이 직원과 관련 출역 기록을 모두 삭제하시겠습니까?')) {
            Store.deletePerson(id);
            App.refreshPage();
            App.showToast('직원이 삭제되었습니다.', 'info');
        }
    },

    // === Attendance Modals ===
    showAddAttendanceModal: function () {
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var options = '<option value="">선택하세요</option>';
        for (var i = 0; i < personnel.length; i++) {
            var p = personnel[i];
            options += '<option value="' + p.id + '" data-name="' + p.name + '" data-job="' + p.jobType + '">' + p.name + ' (' + p.jobType + ')</option>';
        }

        var html = '<div class="modal-header">' +
            '<h3>📋 출역 등록</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="attDate" value="' + Store.getToday() + '"></div>' +
            '<div class="form-group"><label>작업자</label><select class="form-control" id="attPerson">' + options + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>근무시간</label><input type="number" class="form-control" id="attHours" value="8" min="1" max="24"></div>' +
            '<div class="form-group"><label>잔업시간</label><input type="number" class="form-control" id="attOvertime" value="0" min="0" max="16"></div>' +
            '</div>' +
            '<div class="form-group"><label>비고</label><input type="text" class="form-control" id="attNote" placeholder="작업 내용"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Personnel.saveAttendance()">등록</button>' +
            '</div>';
        App.showModal(html);
    },

    showEditAttendanceModal: function (id) {
        var record = Store.getAttendance().find(function (a) { return a.id === id; });
        if (!record) return;

        var html = '<div class="modal-header">' +
            '<h3>✏️ 출역 수정</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="attDate" value="' + record.date + '"></div>' +
            '<div class="form-group"><label>작업자</label><input type="text" class="form-control" value="' + record.personName + ' (' + record.jobType + ')" disabled></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>근무시간</label><input type="number" class="form-control" id="attHours" value="' + record.hours + '" min="1" max="24"></div>' +
            '<div class="form-group"><label>잔업시간</label><input type="number" class="form-control" id="attOvertime" value="' + (record.overtime || 0) + '" min="0" max="16"></div>' +
            '</div>' +
            '<div class="form-group"><label>비고</label><input type="text" class="form-control" id="attNote" value="' + (record.note || '') + '"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Personnel.updateAttendance(\'' + id + '\')">수정</button>' +
            '</div>';
        App.showModal(html);
    },

    saveAttendance: function () {
        var date = document.getElementById('attDate').value;
        var personSelect = document.getElementById('attPerson');
        var personId = personSelect.value;
        var selectedOption = personSelect.options[personSelect.selectedIndex];
        var hours = document.getElementById('attHours').value;
        var overtime = document.getElementById('attOvertime').value;
        var note = document.getElementById('attNote').value.trim();

        if (!date || !personId) {
            App.showToast('날짜와 작업자를 선택해주세요.', 'error');
            return;
        }

        var personName = selectedOption.getAttribute('data-name');
        var jobType = selectedOption.getAttribute('data-job');

        Store.addAttendance({
            personId: personId, personName: personName, jobType: jobType, date: date,
            hours: Number(hours), overtime: Number(overtime), note: note
        });
        App.closeModal();
        App.refreshPage();
        App.showToast(personName + '님의 출역이 등록되었습니다.', 'success');
    },

    updateAttendance: function (id) {
        var date = document.getElementById('attDate').value;
        var hours = document.getElementById('attHours').value;
        var overtime = document.getElementById('attOvertime').value;
        var note = document.getElementById('attNote').value.trim();

        Store.updateAttendance(id, {
            date: date, hours: Number(hours), overtime: Number(overtime), note: note
        });
        App.closeModal();
        App.refreshPage();
        App.showToast('출역 기록이 수정되었습니다.', 'success');
    },

    confirmDeleteAttendance: function (id) {
        if (confirm('이 출역 기록을 삭제하시겠습니까?')) {
            Store.deleteAttendance(id);
            App.refreshPage();
            App.showToast('출역 기록이 삭제되었습니다.', 'info');
        }
    }
};
