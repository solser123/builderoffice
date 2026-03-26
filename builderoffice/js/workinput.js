/* =======================================
   BuilderOffice - Work Input Module
   일일 투입 입력 (현장용 핵심 모듈)
   공수 + 비용 + 작업내용 + 안전 한 화면
   ======================================= */

var WorkInput = {
    activeTab: 'new',

    render: function () {
        var inputs = Store.getWorkInputs();
        var todayInputs = inputs.filter(function (w) { return w.date === Store.getToday(); });

        return '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">📝</div><div class="stat-info"><div class="stat-label">오늘 입력</div><div class="stat-value">' + todayInputs.length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-label">승인완료</div><div class="stat-value">' + inputs.filter(function (w) { return w.status === '승인완료'; }).length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">⏳</div><div class="stat-info"><div class="stat-label">대기중</div><div class="stat-value">' + inputs.filter(function (w) { return w.status === '제출완료'; }).length + '건</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="tab-nav">' +
            '<button class="tab-btn ' + (this.activeTab === 'new' ? 'active' : '') + '" onclick="WorkInput.switchTab(\'new\')">📝 새 입력</button>' +
            '<button class="tab-btn ' + (this.activeTab === 'list' ? 'active' : '') + '" onclick="WorkInput.switchTab(\'list\')">📋 입력 내역</button>' +
            '</div>' +
            '<div class="tab-content ' + (this.activeTab === 'new' ? 'active' : '') + '">' + this._renderNewInput() + '</div>' +
            '<div class="tab-content ' + (this.activeTab === 'list' ? 'active' : '') + '">' + this._renderList() + '</div>' +
            '</div>';
    },

    _renderNewInput: function () {
        var sites = Store.getSites();
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var esc = Store.escapeHtml;

        var siteOpts = '<option value="">현장 선택</option>';
        for (var i = 0; i < sites.length; i++) {
            if (sites[i].status === '진행중') {
                siteOpts += '<option value="' + esc(sites[i].name) + '">' + esc(sites[i].name) + '</option>';
            }
        }

        var workerRows = '';
        for (var j = 0; j < Math.min(personnel.length, 10); j++) {
            var p = personnel[j];
            workerRows += '<tr>' +
                '<td><input type="checkbox" class="wi-check" data-idx="' + j + '" checked></td>' +
                '<td style="font-weight:600;">' + esc(p.name) + '</td>' +
                '<td><span class="badge badge-blue">' + esc(p.jobType) + '</span></td>' +
                '<td><input type="number" class="gs-input wi-hours" data-idx="' + j + '" value="8" min="0" max="16" step="0.5" style="width:50px;"></td>' +
                '<td><input type="number" class="gs-input wi-gongsu" data-idx="' + j + '" value="1" min="0" max="3" step="0.25" style="width:50px;"></td>' +
                '</tr>';
        }

        return '<div class="wi-form">' +
            // 섹션 1: 기본정보
            '<div class="wi-section">' +
            '<div class="wi-section-title">📅 기본 정보</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>작업일자</label><input type="date" class="form-control" id="wiDate" value="' + Store.getToday() + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="wiSite">' + siteOpts + '</select></div>' +
            '</div>' +
            '</div>' +

            // 섹션 2: 투입인원
            '<div class="wi-section">' +
            '<div class="wi-section-title">👷 투입 인원 · 공수</div>' +
            '<div class="table-container"><table><thead><tr><th style="width:30px;">✓</th><th>이름</th><th>직종</th><th>시간</th><th>공수</th></tr></thead>' +
            '<tbody>' + workerRows + '</tbody></table></div>' +
            '</div>' +

            // 섹션 3: 작업내용
            '<div class="wi-section">' +
            '<div class="wi-section-title">📋 작업 내용</div>' +
            '<div class="form-group"><label>주요 작업</label><textarea class="form-control" id="wiContent" rows="3" placeholder="예: B1 슬라브 콘크리트 타설 (25-21-15, 40m3)"></textarea></div>' +
            '<div class="form-group"><label>투입 장비</label><input type="text" class="form-control" id="wiEquipment" placeholder="예: 레미콘 2대, 펌프카 1대"></div>' +
            '</div>' +

            // 섹션 4: 비용
            '<div class="wi-section">' +
            '<div class="wi-section-title">💰 현장 비용</div>' +
            '<div id="wiExpenseRows">' +
            '<div class="wi-expense-row form-row">' +
            '<div class="form-group"><select class="form-control wi-exp-cat"><option>식대</option><option>유류비</option><option>잡자재</option><option>장비비</option><option>운송비</option><option>기타</option></select></div>' +
            '<div class="form-group"><input type="number" class="form-control wi-exp-amt" placeholder="금액"></div>' +
            '<div class="form-group"><input type="text" class="form-control wi-exp-memo" placeholder="메모"></div>' +
            '</div>' +
            '</div>' +
            '<button class="btn btn-secondary btn-sm" onclick="WorkInput.addExpenseRow()" style="margin-top:8px;">➕ 비용 행 추가</button>' +
            '</div>' +

            // 섹션 5: 안전
            '<div class="wi-section">' +
            '<div class="wi-section-title">🦺 안전 사항</div>' +
            '<div class="wi-safety-checks">' +
            '<label class="wi-check-item"><input type="checkbox" id="wiTbm"> TBM/안전교육 실시</label>' +
            '<label class="wi-check-item"><input type="checkbox" id="wiPreCheck"> 작업 전 점검 완료</label>' +
            '<label class="wi-check-item"><input type="checkbox" id="wiPpe"> 보호구 착용 확인</label>' +
            '</div>' +
            '<div class="form-group"><label>안전 특이사항</label><input type="text" class="form-control" id="wiSafetyNote" placeholder="위험요인, 시정조치 등"></div>' +
            '</div>' +

            // 섹션 6: 사진
            '<div class="wi-section">' +
            '<div class="wi-section-title">📷 현장 사진</div>' +
            '<div class="wi-photo-area">' +
            '<div class="wi-photo-placeholder" onclick="App.showToast(\'사진 업로드는 서버 연동 후 활성화됩니다.\', \'info\')">' +
            '<span>📷</span><p>사진 추가 (프로토타입)</p>' +
            '</div>' +
            '</div>' +
            '</div>' +

            // 제출 버튼
            '<div class="wi-submit-area">' +
            '<button class="btn btn-secondary" onclick="WorkInput.saveDraft()">💾 임시저장</button>' +
            '<button class="btn btn-primary" onclick="WorkInput.submitInput()" style="flex:1;">📤 제출하기</button>' +
            '</div>' +
            '</div>';
    },

    _renderList: function () {
        var inputs = Store.getWorkInputs();
        var esc = Store.escapeHtml;
        var rows = '';

        if (inputs.length > 0) {
            for (var i = 0; i < inputs.length; i++) {
                var w = inputs[i];
                var statusBadge = w.status === '승인완료' ? 'badge-green' : w.status === '제출완료' ? 'badge-orange' : 'badge-blue';
                var workerCount = w.workers ? w.workers.length : 0;
                var expTotal = 0;
                if (w.expenses) {
                    for (var e = 0; e < w.expenses.length; e++) { expTotal += Number(w.expenses[e].amount) || 0; }
                }

                rows += '<tr onclick="WorkInput.showDetail(\'' + w.id + '\')" style="cursor:pointer;">' +
                    '<td>' + esc(w.date) + '</td>' +
                    '<td style="font-weight:600;">' + esc(w.siteName || '-') + '</td>' +
                    '<td>' + workerCount + '명</td>' +
                    '<td>' + esc(w.workContent ? w.workContent.substring(0, 30) : '-') + '</td>' +
                    '<td class="amount">' + Store.formatCurrency(expTotal) + '</td>' +
                    '<td><span class="badge ' + statusBadge + '">' + esc(w.status) + '</span></td>' +
                    '</tr>';
            }
        } else {
            rows = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📝</div><p>입력 내역이 없습니다</p></div></td></tr>';
        }

        return '<div class="table-container"><table><thead><tr><th>날짜</th><th>현장</th><th>인원</th><th>작업내용</th><th>비용</th><th>상태</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div>';
    },

    switchTab: function (tab) {
        this.activeTab = tab;
        App.refreshPage();
    },

    addExpenseRow: function () {
        var container = document.getElementById('wiExpenseRows');
        var row = document.createElement('div');
        row.className = 'wi-expense-row form-row';
        row.innerHTML = '<div class="form-group"><select class="form-control wi-exp-cat"><option>식대</option><option>유류비</option><option>잡자재</option><option>장비비</option><option>운송비</option><option>기타</option></select></div>' +
            '<div class="form-group"><input type="number" class="form-control wi-exp-amt" placeholder="금액"></div>' +
            '<div class="form-group"><input type="text" class="form-control wi-exp-memo" placeholder="메모"></div>';
        container.appendChild(row);
    },

    _collectFormData: function () {
        var date = document.getElementById('wiDate').value;
        var siteName = document.getElementById('wiSite').value;
        var workContent = document.getElementById('wiContent').value.trim();
        var equipment = document.getElementById('wiEquipment').value.trim();
        var safetyNote = document.getElementById('wiSafetyNote').value.trim();

        // Collect workers
        var checks = document.querySelectorAll('.wi-check');
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var workers = [];
        for (var i = 0; i < checks.length; i++) {
            if (checks[i].checked && i < personnel.length) {
                var hrs = document.querySelectorAll('.wi-hours')[i];
                var gs = document.querySelectorAll('.wi-gongsu')[i];
                workers.push({
                    name: personnel[i].name,
                    jobType: personnel[i].jobType,
                    hours: Number(hrs ? hrs.value : 8),
                    gongsu: Number(gs ? gs.value : 1)
                });
            }
        }

        // Collect expenses
        var cats = document.querySelectorAll('.wi-exp-cat');
        var amts = document.querySelectorAll('.wi-exp-amt');
        var memos = document.querySelectorAll('.wi-exp-memo');
        var expenses = [];
        for (var j = 0; j < cats.length; j++) {
            if (amts[j] && Number(amts[j].value) > 0) {
                expenses.push({
                    category: cats[j].value,
                    amount: Number(amts[j].value),
                    memo: memos[j] ? memos[j].value.trim() : ''
                });
            }
        }

        // Safety checks
        var tbm = document.getElementById('wiTbm') && document.getElementById('wiTbm').checked;
        var preCheck = document.getElementById('wiPreCheck') && document.getElementById('wiPreCheck').checked;
        var ppe = document.getElementById('wiPpe') && document.getElementById('wiPpe').checked;

        return {
            date: date,
            siteName: siteName,
            workers: workers,
            equipment: equipment,
            workContent: workContent,
            expenses: expenses,
            safetyNote: safetyNote,
            tbm: tbm,
            preCheck: preCheck,
            ppe: ppe
        };
    },

    saveDraft: function () {
        var data = this._collectFormData();
        data.status = '작성';
        Store.addWorkInput(data);
        App.showToast('임시저장되었습니다.', 'info');
        this.activeTab = 'list';
        App.refreshPage();
    },

    submitInput: function () {
        var data = this._collectFormData();

        if (!data.date || !data.siteName) {
            App.showToast('날짜와 현장을 선택해주세요.', 'error');
            return;
        }
        if (data.workers.length === 0) {
            App.showToast('투입 인원을 1명 이상 선택해주세요.', 'error');
            return;
        }

        data.status = '제출완료';
        var saved = Store.addWorkInput(data);

        // 자동으로 승인 요청 생성
        Store.addApproval({
            type: '일일입력',
            title: data.date + ' ' + data.siteName + ' 일일보고',
            requester: (App.currentUser && App.currentUser.name) || '현장소장',
            requestDate: Store.getToday(),
            status: '대기',
            detail: data.workContent || '일일 투입 보고',
            linkedId: saved.id
        });

        App.showToast('일일입력이 제출되었습니다.', 'success');
        this.activeTab = 'list';
        App.refreshPage();
    },

    showDetail: function (id) {
        var w = Store.getWorkInputs().find(function (x) { return x.id === id; });
        if (!w) return;
        var esc = Store.escapeHtml;

        var workerList = '';
        if (w.workers) {
            for (var i = 0; i < w.workers.length; i++) {
                var wr = w.workers[i];
                workerList += '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>' + esc(wr.name) + ' (' + esc(wr.jobType) + ')</span><span>' + wr.hours + 'h / ' + wr.gongsu + '공</span></div>';
            }
        }

        var expList = '';
        if (w.expenses) {
            for (var j = 0; j < w.expenses.length; j++) {
                var ex = w.expenses[j];
                expList += '<div style="display:flex;justify-content:space-between;padding:4px 0;"><span>' + esc(ex.category) + (ex.memo ? ' - ' + esc(ex.memo) : '') + '</span><span>' + Store.formatCurrency(ex.amount) + '</span></div>';
            }
        }

        var html = '<div class="modal-header"><h3>📝 일일입력 상세</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:12px;"><span style="font-weight:700;">' + esc(w.date) + '</span><span class="badge ' + (w.status === '승인완료' ? 'badge-green' : 'badge-orange') + '">' + esc(w.status) + '</span></div>' +
            '<div style="font-weight:600;margin-bottom:4px;">🏗️ ' + esc(w.siteName || '-') + '</div>' +
            '<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px;"><strong>👷 투입 인원</strong>' + (workerList || '<p style="color:var(--text-muted);">없음</p>') + '</div>' +
            '<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px;"><strong>📋 작업내용</strong><p>' + esc(w.workContent || '-') + '</p></div>' +
            '<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px;"><strong>🔧 투입장비</strong><p>' + esc(w.equipment || '-') + '</p></div>' +
            '<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px;"><strong>💰 비용</strong>' + (expList || '<p style="color:var(--text-muted);">없음</p>') + '</div>' +
            '<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px;"><strong>🦺 안전</strong><p>' + esc(w.safetyNote || '-') + '</p></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">닫기</button></div>';
        App.showModal(html);
    }
};
