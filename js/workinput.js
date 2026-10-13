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

        // 현장·직원이 없으면 빈 양식 대신 무엇을 먼저 해야 하는지 알려준다
        if (typeof Onboarding !== 'undefined') {
            var guide = Onboarding.needData({ site: true, people: true });
            if (guide) return guide;
        }

        // 등록된 현장은 있는데 '진행중'인 곳이 없는 경우도 막아준다
        var active = sites.filter(function (s) { return s.status === '진행중'; });
        if (sites.length > 0 && active.length === 0) {
            return '<div class="empty-state" style="padding:40px 24px;">' +
                '<div class="empty-icon">🏗️</div>' +
                '<p><strong>진행중인 현장이 없습니다.</strong></p>' +
                '<p style="font-size:13px;color:var(--text-muted);margin:8px 0 16px;">' +
                '일일 입력은 상태가 <strong>진행중</strong>인 현장에만 작성할 수 있습니다.<br>' +
                '현장 관리에서 상태를 변경해주세요.</p>' +
                '<button class="btn btn-primary" onclick="App.navigate(\'sites\')">🏗️ 현장 관리로 이동</button>' +
                '</div>';
        }

        var siteOpts = '<option value="">현장 선택</option>';
        for (var i = 0; i < sites.length; i++) {
            if (sites[i].status === '진행중') {
                siteOpts += '<option value="' + esc(sites[i].name) + '">' + esc(sites[i].name) + '</option>';
            }
        }

        var workerRows = '';
        for (var j = 0; j < personnel.length; j++) {
            var p = personnel[j];
            workerRows += '<tr>' +
                '<td><input type="checkbox" class="wi-check" data-idx="' + j + '" checked onchange="WorkInput.updateWorkerCount()"></td>' +
                '<td style="font-weight:600;">' + esc(p.name) + '</td>' +
                '<td><span class="badge badge-blue">' + esc(p.jobType) + '</span></td>' +
                '<td><input type="number" class="gs-input wi-hours" data-idx="' + j + '" value="8" min="0" max="16" step="0.5" style="width:50px;"></td>' +
                '<td><input type="number" class="gs-input wi-gongsu" data-idx="' + j + '" value="1" min="0" max="3" step="0.25" style="width:50px;"></td>' +
                '</tr>';
        }

        /* 하루 흐름 그대로 배치한다:
             ① 작업 전(오전) — 출근·TBM
             ② 금일 작업     — 무엇을 했는가
             ③ 마감(퇴근)    — 비용·특이사항·내일 계획
           현장에서 폰으로 채우므로 자주 쓰는 값은 버튼으로 고르게 한다. */

        var weatherBtns = '';
        for (var wi2 = 0; wi2 < this.WEATHER.length; wi2++) {
            var wv = this.WEATHER[wi2];
            weatherBtns += '<button type="button" class="wi-chip" data-weather="' + wv.id + '" ' +
                'onclick="WorkInput.pickWeather(\'' + wv.id + '\')">' + wv.icon + ' ' + wv.label + '</button>';
        }

        return '<div class="wi-form">' +

            /* ───────── ① 작업 전 (오전) ───────── */
            '<div class="wi-section wi-phase">' +
            '<div class="wi-phase-head"><span class="wi-phase-num">1</span>' +
            '<div><div class="wi-phase-title">🌅 작업 전 · 오전</div>' +
            '<div class="wi-phase-desc">출근하면 바로 — 현장·날씨·TBM을 기록합니다</div></div></div>' +

            '<div class="form-row">' +
            '<div class="form-group"><label>작업일자</label><input type="date" class="form-control" id="wiDate" value="' + Store.getToday() + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="wiSite">' + siteOpts + '</select></div>' +
            '</div>' +

            '<div class="form-group"><label>날씨 <span class="wi-hint">(우천 시 작업중지·공기연장 근거가 됩니다)</span></label>' +
            '<div class="wi-chips" id="wiWeatherChips">' + weatherBtns + '</div>' +
            '<input type="hidden" id="wiWeather" value=""></div>' +

            '<div class="wi-tbm-box">' +
            '<label class="wi-check-item wi-check-lead">' +
            '<input type="checkbox" id="wiTbm" onchange="WorkInput.toggleTbm()"> ' +
            '<strong>TBM(작업 전 안전회의) 실시</strong></label>' +
            '<div id="wiTbmDetail" class="wi-tbm-detail" style="display:none;">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>실시 시각</label><input type="time" class="form-control" id="wiTbmTime" value="07:00"></div>' +
            '<div class="form-group"><label>참석 인원</label><input type="number" class="form-control" id="wiTbmCount" min="0" placeholder="자동 계산"></div>' +
            '</div>' +
            '<div class="form-group"><label>오늘의 위험요인</label>' +
            '<input type="text" class="form-control" id="wiTbmRisk" placeholder="예: 고소작업(3층 외벽), 크레인 인양 반경"></div>' +
            '<div class="form-group"><label>안전 지시사항</label>' +
            '<input type="text" class="form-control" id="wiTbmOrder" placeholder="예: 안전대 착용 필수, 인양 하부 출입금지"></div>' +
            '</div></div>' +

            '<div class="wi-safety-checks">' +
            '<label class="wi-check-item"><input type="checkbox" id="wiPreCheck"> 작업 전 점검 완료</label>' +
            '<label class="wi-check-item"><input type="checkbox" id="wiPpe"> 보호구 착용 확인</label>' +
            '</div>' +
            '</div>' +

            /* ───────── ② 투입 인원 ───────── */
            '<div class="wi-section wi-phase">' +
            '<div class="wi-phase-head"><span class="wi-phase-num">2</span>' +
            '<div><div class="wi-phase-title">👷 출역 인원 · 공수</div>' +
            '<div class="wi-phase-desc">오늘 나온 사람만 체크 — 공수는 노무비로 자동 계산됩니다</div></div></div>' +
            '<div class="wi-worker-tools">' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="WorkInput.checkAll(true)">전체 선택</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="WorkInput.checkAll(false)">전체 해제</button>' +
            '<span class="wi-worker-count" id="wiWorkerCount"></span>' +
            '</div>' +
            '<div class="table-container"><table><thead><tr><th style="width:30px;">✓</th><th>이름</th><th>직종</th><th>시간</th><th>공수</th></tr></thead>' +
            '<tbody>' + workerRows + '</tbody></table></div>' +
            '</div>' +

            /* ───────── ③ 금일 작업 ───────── */
            '<div class="wi-section wi-phase">' +
            '<div class="wi-phase-head"><span class="wi-phase-num">3</span>' +
            '<div><div class="wi-phase-title">📋 금일 작업</div>' +
            '<div class="wi-phase-desc">무엇을 했는지 — 기성청구의 근거가 됩니다</div></div></div>' +
            '<div class="form-group"><label>주요 작업 내용</label>' +
            '<textarea class="form-control" id="wiContent" rows="3" placeholder="예: B1 슬라브 콘크리트 타설 (25-21-15, 40m3)"></textarea></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>투입 장비</label><input type="text" class="form-control" id="wiEquipment" placeholder="예: 펌프카 1대, 크레인 1대"></div>' +
            '<div class="form-group"><label>사용 자재</label><input type="text" class="form-control" id="wiMaterial" placeholder="예: 레미콘 40m3, 철근 D16 2톤"></div>' +
            '</div>' +
            '<div class="form-group"><label>금일 공정률 <span class="wi-hint">(선택)</span></label>' +
            '<input type="number" class="form-control" id="wiProgress" min="0" max="100" placeholder="누적 %"></div>' +
            '<div class="form-group"><label>현장 사진</label>' + WorkInput._renderPhotoArea() + '</div>' +
            '</div>' +

            /* ───────── ④ 마감 (퇴근) ───────── */
            '<div class="wi-section wi-phase">' +
            '<div class="wi-phase-head"><span class="wi-phase-num">4</span>' +
            '<div><div class="wi-phase-title">🌆 마감 · 퇴근</div>' +
            '<div class="wi-phase-desc">퇴근 전에 — 비용과 내일 계획을 남깁니다</div></div></div>' +

            '<div class="form-row">' +
            '<div class="form-group"><label>퇴근 시각</label><input type="time" class="form-control" id="wiEndTime" value="17:00"></div>' +
            '<div class="form-group"><label>잔업 시간</label><input type="number" class="form-control" id="wiOvertime" min="0" max="8" step="0.5" value="0"></div>' +
            '</div>' +

            '<div class="form-group"><label>금일 현장 지출</label>' +
            '<div id="wiExpenseRows">' +
            '<div class="wi-expense-row form-row">' +
            '<div class="form-group"><select class="form-control wi-exp-cat"><option>식대</option><option>유류비</option><option>잡자재</option><option>장비비</option><option>운송비</option><option>기타</option></select></div>' +
            '<div class="form-group"><input type="number" class="form-control wi-exp-amt" placeholder="금액"></div>' +
            '<div class="form-group"><input type="text" class="form-control wi-exp-memo" placeholder="메모"></div>' +
            '</div>' +
            '</div>' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="WorkInput.addExpenseRow()" style="margin-top:8px;">➕ 비용 행 추가</button>' +
            '</div>' +

            '<div class="form-group"><label>안전 특이사항 <span class="wi-hint">(사고·아차사고·시정조치가 있었다면)</span></label>' +
            '<input type="text" class="form-control" id="wiSafetyNote" placeholder="없으면 비워두세요"></div>' +

            '<div class="form-group"><label>내일 작업 계획 <span class="wi-hint">(대표 보고에 그대로 올라갑니다)</span></label>' +
            '<input type="text" class="form-control" id="wiTomorrow" placeholder="예: 2F 벽체 거푸집 설치, 레미콘 30m3 예정"></div>' +

            '<div class="form-group"><label>요청 · 필요 조치 <span class="wi-hint">(선택)</span></label>' +
            '<input type="text" class="form-control" id="wiRequest" placeholder="예: 자재 추가 발주 필요, 크레인 1대 추가 요청"></div>' +
            '</div>' +

            // 제출 버튼
            '<div class="wi-submit-area">' +
            '<button class="btn btn-secondary" onclick="WorkInput.saveDraft()">💾 임시저장</button>' +
            '<button class="btn btn-primary" onclick="WorkInput.submitInput()" style="flex:1;">📤 제출하기</button>' +
            '</div>' +
            '</div>';
    },

    WEATHER: [
        { id: '맑음', icon: '☀️', label: '맑음' },
        { id: '흐림', icon: '☁️', label: '흐림' },
        { id: '비', icon: '🌧️', label: '비' },
        { id: '눈', icon: '❄️', label: '눈' },
        { id: '강풍', icon: '💨', label: '강풍' },
        { id: '폭염', icon: '🔥', label: '폭염' }
    ],

    pickWeather: function (id) {
        var el = document.getElementById('wiWeather');
        // 같은 걸 다시 누르면 해제
        var next = (el.value === id) ? '' : id;
        el.value = next;
        var chips = document.querySelectorAll('#wiWeatherChips .wi-chip');
        for (var i = 0; i < chips.length; i++) {
            chips[i].classList.toggle('active', chips[i].dataset.weather === next);
        }
        // 비·눈·강풍·폭염이면 안전 특이사항을 챙기도록 알린다
        if (['비', '눈', '강풍', '폭염'].indexOf(next) !== -1) {
            App.showToast('악천후입니다. 작업중지 여부와 안전조치를 특이사항에 남겨주세요.', 'info');
        }
    },

    toggleTbm: function () {
        var on = document.getElementById('wiTbm').checked;
        document.getElementById('wiTbmDetail').style.display = on ? '' : 'none';
        if (on) {
            // 참석 인원을 체크된 출역 인원 수로 채워준다
            var cnt = document.querySelectorAll('.wi-check:checked').length;
            var el = document.getElementById('wiTbmCount');
            if (el && !el.value) el.value = cnt;
        }
    },

    checkAll: function (on) {
        var checks = document.querySelectorAll('.wi-check');
        for (var i = 0; i < checks.length; i++) checks[i].checked = on;
        this.updateWorkerCount();
    },

    updateWorkerCount: function () {
        var el = document.getElementById('wiWorkerCount');
        if (!el) return;
        var n = document.querySelectorAll('.wi-check:checked').length;
        var total = document.querySelectorAll('.wi-check').length;
        el.textContent = '출역 ' + n + '명 / 등록 ' + total + '명';
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

        // 값이 없는 입력란은 건너뛴다 (모바일 화면에서 일부만 렌더될 수 있다)
        function val(id) {
            var el = document.getElementById(id);
            return el ? String(el.value).trim() : '';
        }
        function chk(id) {
            var el = document.getElementById(id);
            return !!(el && el.checked);
        }

        var tbm = chk('wiTbm');

        return {
            date: date,
            siteName: siteName,
            weather: val('wiWeather'),

            // ① 작업 전 — TBM
            tbm: tbm,
            tbmTime: tbm ? val('wiTbmTime') : '',
            tbmCount: tbm ? (Number(val('wiTbmCount')) || workers.length) : 0,
            tbmRisk: tbm ? val('wiTbmRisk') : '',
            tbmOrder: tbm ? val('wiTbmOrder') : '',
            preCheck: chk('wiPreCheck'),
            ppe: chk('wiPpe'),

            // ② 출역
            workers: workers,

            // ③ 금일 작업
            workContent: workContent,
            equipment: equipment,
            material: val('wiMaterial'),
            progress: Number(val('wiProgress')) || 0,

            // ④ 마감
            endTime: val('wiEndTime'),
            overtime: Number(val('wiOvertime')) || 0,
            expenses: expenses,
            safetyNote: safetyNote,
            tomorrow: val('wiTomorrow'),
            request: val('wiRequest')
        };
    },

    // 사진 위젯 ID — 일일입력 화면 전용
    PHOTO_ID: 'wiPhotos',

    _renderPhotoArea: function () {
        // 클라우드에 연결되지 않으면 올릴 곳이 없다
        if (typeof Sync === 'undefined' || Sync.MODE !== 'cloud') {
            return '<div class="wi-photo-area">' +
                '<div class="wi-photo-placeholder" ' +
                'onclick="App.showToast(\'로그인 후 사진을 첨부할 수 있습니다.\', \'info\')">' +
                '<span>📷</span><p>사진 첨부 (로그인 필요)</p></div></div>';
        }
        return Photos.render({ id: this.PHOTO_ID, folder: 'workinput' }) +
            '<p style="font-size:12px;color:var(--text-muted);margin-top:8px;">' +
            '📌 사진은 자동으로 압축되어 올라갑니다. 작업 전·중·후 사진을 남기면 기성청구 증빙이 됩니다.</p>';
    },

    // 사진 업로드가 끝나지 않았으면 저장을 막는다 (중간에 저장하면 사진이 누락된다)
    _photosReady: function () {
        if (typeof Photos === 'undefined') return true;
        if (Photos.isBusy(this.PHOTO_ID)) {
            App.showToast('사진 업로드가 끝날 때까지 잠시만 기다려주세요.', 'info');
            return false;
        }
        if (Photos.hasFailed(this.PHOTO_ID)) {
            if (!confirm('업로드에 실패한 사진이 있습니다.\n그 사진을 빼고 저장할까요?')) return false;
        }
        return true;
    },

    _attachPhotos: function (data) {
        if (typeof Photos !== 'undefined') {
            data.photos = Photos.getUploaded(this.PHOTO_ID);
        }
        return data;
    },

    saveDraft: function () {
        if (!this._photosReady()) return;
        var data = this._attachPhotos(this._collectFormData());
        data.status = '작성';
        Store.addWorkInput(data);
        if (typeof Photos !== 'undefined') Photos.reset(this.PHOTO_ID);
        App.showToast('임시저장되었습니다.', 'info');
        this.activeTab = 'list';
        App.refreshPage();
    },

    submitInput: function () {
        if (!this._photosReady()) return;
        var data = this._attachPhotos(this._collectFormData());

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

        // 현장 지출 → 비용 관리로 자동 등록 (한 번만 적으면 비용에도 뜬다)
        // 현장에서 쓴 실비이므로 승인·지급완료로 잡고, 출처를 표시한다.
        if (data.expenses && data.expenses.length) {
            var catMap = { '식대': '기타', '유류비': '운송비', '잡자재': '자재비', '장비비': '장비비', '운송비': '운송비', '기타': '기타' };
            for (var ei = 0; ei < data.expenses.length; ei++) {
                var ex = data.expenses[ei];
                if (!ex.amount || ex.amount <= 0) continue;
                Store.addCost({
                    date: data.date,
                    siteName: data.siteName,
                    category: catMap[ex.category] || '기타',
                    name: ex.category + (ex.memo ? ' - ' + ex.memo : ''),
                    amount: Number(ex.amount) || 0,
                    vendor: '',
                    approvalStatus: '승인',
                    paymentStatus: '지급완료',
                    paidDate: data.date,
                    fromWorkInput: true,
                    workInputId: saved.id,
                    memo: '일일입력 자동 등록'
                });
            }
        }

        // 근로자공수자동입력: 현장별 공수 자동 기록
        var allPersonnel = Store.getPersonnel();
        var allSites = Store.getSites();
        var matchedSite = null;
        for (var si = 0; si < allSites.length; si++) {
            if (allSites[si].name === data.siteName) { matchedSite = allSites[si]; break; }
        }
        if (matchedSite) {
            for (var wi = 0; wi < data.workers.length; wi++) {
                var wk = data.workers[wi];
                if (!wk.gongsu || wk.gongsu <= 0) continue;
                for (var pi = 0; pi < allPersonnel.length; pi++) {
                    if (allPersonnel[pi].name === wk.name) {
                        Store.setSiteGongsu(allPersonnel[pi].id, matchedSite.id, data.date, wk.gongsu);
                        break;
                    }
                }
            }
        }

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

        if (typeof Photos !== 'undefined') Photos.reset(this.PHOTO_ID);
        App.showToast('일일입력이 제출되었습니다.'
            + (data.photos && data.photos.length ? ' (사진 ' + data.photos.length + '장 첨부)' : ''), 'success');
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

        // 값이 있는 항목만 보여준다 (빈 줄로 도배되지 않도록)
        function sec(title, body) {
            if (!body) return '';
            return '<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px;">' +
                '<strong>' + title + '</strong>' + body + '</div>';
        }
        function line(v) { return v ? '<p>' + esc(v) + '</p>' : ''; }

        var weatherIcon = '';
        for (var wz = 0; wz < WorkInput.WEATHER.length; wz++) {
            if (WorkInput.WEATHER[wz].id === w.weather) weatherIcon = WorkInput.WEATHER[wz].icon;
        }

        // TBM 상세
        var tbmBody = '';
        if (w.tbm) {
            tbmBody = '<p style="color:var(--accent-success);font-weight:600;">✅ 실시' +
                (w.tbmTime ? ' · ' + esc(w.tbmTime) : '') +
                (w.tbmCount ? ' · 참석 ' + w.tbmCount + '명' : '') + '</p>' +
                (w.tbmRisk ? '<p style="font-size:13px;"><span style="color:var(--text-muted);">위험요인</span> ' + esc(w.tbmRisk) + '</p>' : '') +
                (w.tbmOrder ? '<p style="font-size:13px;"><span style="color:var(--text-muted);">지시사항</span> ' + esc(w.tbmOrder) + '</p>' : '');
        } else {
            tbmBody = '<p style="color:var(--accent-danger);">미실시</p>';
        }

        var checkBody = '<p style="font-size:13px;">' +
            (w.preCheck ? '✅' : '⬜') + ' 작업 전 점검　' +
            (w.ppe ? '✅' : '⬜') + ' 보호구 착용</p>';

        var html = '<div class="modal-header"><h3>📝 작업일보 상세</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:12px;">' +
            '<span style="font-weight:700;">' + esc(w.date) +
            (w.weather ? ' <span style="font-weight:400;color:var(--text-muted);">' + weatherIcon + ' ' + esc(w.weather) + '</span>' : '') +
            '</span>' +
            '<span class="badge ' + (w.status === '승인완료' ? 'badge-green' : 'badge-orange') + '">' + esc(w.status) + '</span></div>' +
            '<div style="font-weight:600;margin-bottom:4px;">🏗️ ' + esc(w.siteName || '-') + '</div>' +

            sec('🌅 TBM (작업 전 안전회의)', tbmBody + checkBody) +
            sec('👷 출역 인원 (' + (w.workers ? w.workers.length : 0) + '명)',
                workerList || '<p style="color:var(--text-muted);">없음</p>') +
            sec('📋 금일 작업', line(w.workContent) +
                (w.equipment ? '<p style="font-size:13px;"><span style="color:var(--text-muted);">장비</span> ' + esc(w.equipment) + '</p>' : '') +
                (w.material ? '<p style="font-size:13px;"><span style="color:var(--text-muted);">자재</span> ' + esc(w.material) + '</p>' : '') +
                (w.progress ? '<p style="font-size:13px;"><span style="color:var(--text-muted);">공정률</span> ' + w.progress + '%</p>' : '')) +
            (w.photos && w.photos.length
                ? sec('📷 현장 사진 (' + w.photos.length + '장)',
                      '<div style="margin-top:8px;">' + Photos.renderGallery(w.photos) + '</div>')
                : '') +
            sec('🌆 마감',
                ((w.endTime || w.overtime)
                    ? '<p style="font-size:13px;">퇴근 ' + esc(w.endTime || '-') +
                      (w.overtime ? ' · 잔업 ' + w.overtime + '시간' : '') + '</p>' : '') +
                (expList ? '<div style="margin-top:6px;">' + expList + '</div>' : '')) +
            sec('🦺 안전 특이사항', w.safetyNote ? line(w.safetyNote) : '<p style="color:var(--text-muted);">이상 없음</p>') +
            sec('📅 내일 계획', line(w.tomorrow)) +
            sec('🙋 요청 사항', line(w.request)) +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">닫기</button></div>';
        App.showModal(html);
    }
};
