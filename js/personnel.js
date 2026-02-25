/* =======================================
   BuilderOffice - Personnel Management Module
   인원 관리 (공수표 + 노무비 대장)
   ======================================= */

var Personnel = {
    activeTab: 'list',
    dateFilter: '',
    gongsuYear: new Date().getFullYear(),
    gongsuMonth: new Date().getMonth() + 1,

    render: function () {
        var stats = Store.getPersonnelStats();
        var now = new Date();
        var mg = Store.getMonthlyGongsu(this.gongsuYear, this.gongsuMonth);
        var totalGongsu = 0;
        for (var k in mg) { if (mg.hasOwnProperty(k)) totalGongsu += mg[k].total; }

        return '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon green">👷</div><div class="stat-info"><div class="stat-label">등록 인원</div><div class="stat-value">' + stats.totalRegistered + '명</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><div class="stat-label">금월 총 공수</div><div class="stat-value">' + totalGongsu.toFixed(1) + '공</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple">⏱️</div><div class="stat-info"><div class="stat-label">금일 출역</div><div class="stat-value">' + stats.todayCount + '명</div></div></div>' +
            '</div>' +

            '<div class="card">' +
            '<div class="tab-nav">' +
            '<button class="tab-btn ' + (this.activeTab === 'list' ? 'active' : '') + '" onclick="Personnel.switchTab(\'list\')">👷 직원 목록</button>' +
            '<button class="tab-btn ' + (this.activeTab === 'gongsu' ? 'active' : '') + '" onclick="Personnel.switchTab(\'gongsu\')">📋 공수표</button>' +
            '<button class="tab-btn ' + (this.activeTab === 'payroll' ? 'active' : '') + '" onclick="Personnel.switchTab(\'payroll\')">💰 노무비 대장</button>' +
            '</div>' +

            '<div class="tab-content ' + (this.activeTab === 'list' ? 'active' : '') + '">' + this._renderPersonnelList() + '</div>' +
            '<div class="tab-content ' + (this.activeTab === 'gongsu' ? 'active' : '') + '">' + this._renderGongsuTable() + '</div>' +
            '<div class="tab-content ' + (this.activeTab === 'payroll' ? 'active' : '') + '">' + this._renderPayrollTable() + '</div>' +
            '</div>';
    },

    // ==========================================
    //  TAB 1: 직원 목록
    // ==========================================
    _renderPersonnelList: function () {
        var personnel = Store.getPersonnel();
        var rows = '';
        if (personnel.length > 0) {
            for (var i = 0; i < personnel.length; i++) {
                var p = personnel[i];
                var regBadge = p.regType === 'full' ? '<span class="badge badge-green">정식</span>' : '<span class="badge badge-orange">약식</span>';
                rows += '<tr>' +
                    '<td style="color:var(--text-primary);font-weight:500;">' + p.name + '</td>' +
                    '<td><span class="badge badge-blue">' + p.jobType + '</span></td>' +
                    '<td>' + (p.phone || '-') + '</td>' +
                    '<td>' + (p.residentId ? p.residentId.substring(0, 8) + '******' : '-') + '</td>' +
                    '<td>' + (p.bank || '-') + '</td>' +
                    '<td>' + regBadge + '</td>' +
                    '<td class="amount">' + Store.formatCurrency(p.dailyWage || 0) + '</td>' +
                    '<td><span class="badge ' + (p.status === '활성' ? 'badge-green' : 'badge-red') + '">' + (p.status || '활성') + '</span></td>' +
                    '<td><div class="action-btns">' +
                    '<button class="action-btn edit" onclick="Personnel.showViewPersonModal(\'' + p.id + '\')" title="상세">👁️</button>' +
                    '<button class="action-btn edit" onclick="Personnel.showEditPersonModal(\'' + p.id + '\')" title="수정">✏️</button>' +
                    '<button class="action-btn delete" onclick="Personnel.confirmDeletePerson(\'' + p.id + '\')" title="삭제">🗑️</button>' +
                    '</div></td></tr>';
            }
        } else {
            rows = '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">👷</div><p>등록된 인원이 없습니다</p>' +
                '<button class="btn btn-primary" onclick="Personnel.showAddPersonModal()">직원 등록하기</button></div></td></tr>';
        }

        return '<div class="toolbar">' +
            '<div class="toolbar-left"><span style="color:var(--text-muted);font-size:13px;">총 ' + personnel.length + '명 등록</span></div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-secondary" onclick="Personnel.showQRRegisterPage()">📱 QR 등록</button>' +
            '<button class="btn btn-primary" onclick="Personnel.showAddPersonModal()">➕ 직원 등록</button>' +
            '</div></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>이름</th><th>직종</th><th>연락처</th><th>주민번호</th><th>은행</th><th>등록</th><th>일당</th><th>상태</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    },

    // ==========================================
    //  TAB 2: 공수표 (월간 캘린더 그리드)
    // ==========================================
    _renderGongsuTable: function () {
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var daysInMonth = Store.getDaysInMonth(y, m);
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var monthData = Store.getMonthlyGongsu(y, m);

        // Month navigator + Excel download
        var nav = '<div class="gongsu-nav">' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.changeMonth(-1)">◀</button>' +
            '<span class="gongsu-month-label">' + y + '년 ' + m + '월 공수표</span>' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.changeMonth(1)">▶</button>' +
            '<button class="btn btn-primary btn-sm" onclick="Personnel.exportGongsuExcel()" style="margin-left:16px;">📥 엑셀 다운로드</button>' +
            '</div>';

        // Header row: No, 성명, 1~31, 기타, 합계
        var hdr = '<tr class="gongsu-hdr"><th class="gs-no">No.</th><th class="gs-name">성 명</th>';
        for (var d = 1; d <= daysInMonth; d++) {
            var dow = Store.getDayOfWeek(y, m, d);
            var dowNames = ['일', '월', '화', '수', '목', '금', '토'];
            var dayClass = dow === 0 ? 'gs-sun' : dow === 6 ? 'gs-sat' : '';
            hdr += '<th class="gs-day ' + dayClass + '"><div class="gs-day-num">' + String(d).padStart(2, '0') + '</div><div class="gs-dow">' + dowNames[dow] + '</div></th>';
        }
        hdr += '<th class="gs-total">기타</th><th class="gs-total">계</th></tr>';

        // Data rows
        var rows = '';
        var grandTotal = 0;
        var dayTotals = {};
        for (var dd = 1; dd <= daysInMonth; dd++) dayTotals[dd] = 0;

        for (var pi = 0; pi < personnel.length; pi++) {
            var p = personnel[pi];
            var pd = monthData[p.id] || { total: 0 };
            var rowTotal = pd.total || 0;
            grandTotal += rowTotal;

            rows += '<tr><td class="gs-no">' + (pi + 1) + '</td>';
            rows += '<td class="gs-name">' + p.name + '</td>';

            for (var day = 1; day <= daysInMonth; day++) {
                var val = pd[day] || 0;
                var dow2 = Store.getDayOfWeek(y, m, day);
                var cellClass = dow2 === 0 ? 'gs-sun' : dow2 === 6 ? 'gs-sat' : '';
                var displayVal = val > 0 ? val.toFixed(1) : '';
                var dateStr = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');

                dayTotals[day] += val;

                rows += '<td class="gs-cell ' + cellClass + (val > 0 ? ' gs-filled' : '') + '" ' +
                    'onclick="Personnel.editGongsuCell(\'' + p.id + '\',\'' + dateStr + '\', this, ' + pi + ', ' + day + ')" ' +
                    'data-pid="' + p.id + '" data-date="' + dateStr + '" data-row="' + pi + '" data-day="' + day + '">' +
                    displayVal + '</td>';
            }
            rows += '<td class="gs-total-cell"></td>';
            rows += '<td class="gs-total-cell">' + (rowTotal > 0 ? rowTotal.toFixed(1) : '') + '</td>';
            rows += '</tr>';
        }

        // Footer totals row
        var footer = '<tr class="gongsu-footer"><td class="gs-no"></td><td class="gs-name"><strong>계</strong></td>';
        for (var fd = 1; fd <= daysInMonth; fd++) {
            var dow3 = Store.getDayOfWeek(y, m, fd);
            var fClass = dow3 === 0 ? 'gs-sun' : dow3 === 6 ? 'gs-sat' : '';
            footer += '<td class="gs-cell ' + fClass + '">' + (dayTotals[fd] > 0 ? dayTotals[fd].toFixed(1) : '-') + '</td>';
        }
        footer += '<td class="gs-total-cell"></td><td class="gs-total-cell"><strong>' + grandTotal.toFixed(1) + '</strong></td></tr>';

        return nav +
            '<div class="gongsu-table-wrap"><table class="gongsu-table">' +
            '<thead>' + hdr + '</thead>' +
            '<tbody>' + rows + footer + '</tbody>' +
            '</table></div>';
    },

    changeMonth: function (delta) {
        this.gongsuMonth += delta;
        if (this.gongsuMonth < 1) { this.gongsuMonth = 12; this.gongsuYear--; }
        if (this.gongsuMonth > 12) { this.gongsuMonth = 1; this.gongsuYear++; }
        App.refreshPage();
    },

    editGongsuCell: function (personId, dateStr, cell, rowIdx, dayIdx) {
        var currentVal = Store.getGongsu(personId, dateStr);
        var input = document.createElement('input');
        input.type = 'number';
        input.className = 'gs-input';
        input.value = currentVal || '';
        input.min = '0';
        input.max = '5';
        input.step = '0.5';
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();

        var movingNext = false;

        input.addEventListener('blur', function () {
            if (movingNext) return; // Enter/Tab이 처리 중이면 blur 무시
            var v = parseFloat(input.value) || 0;
            if (v < 0) v = 0;
            if (v > 5) v = 5;
            Store.setGongsu(personId, dateStr, v);
            App.refreshPage();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                movingNext = true;
                var v = parseFloat(input.value) || 0;
                if (v < 0) v = 0;
                if (v > 5) v = 5;
                Store.setGongsu(personId, dateStr, v);
                Personnel._moveToNextCell(rowIdx, dayIdx);
            }
            if (e.key === 'Escape') { App.refreshPage(); }
        });
    },

    _moveToNextCell: function (rowIdx, dayIdx) {
        // Save current, then refresh and open the next cell
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var daysInMonth = Store.getDaysInMonth(y, m);
        var nextDay = dayIdx + 1;
        var nextRow = rowIdx;

        if (nextDay > daysInMonth) {
            nextDay = 1;
            nextRow = rowIdx + 1;
        }
        if (nextRow >= personnel.length) {
            // End of table, just refresh
            App.refreshPage();
            return;
        }

        var nextPerson = personnel[nextRow];
        var nextDateStr = y + '-' + String(m).padStart(2, '0') + '-' + String(nextDay).padStart(2, '0');

        App.refreshPage();
        // After refresh, find and click the next cell
        setTimeout(function () {
            var nextCell = document.querySelector('[data-pid="' + nextPerson.id + '"][data-day="' + nextDay + '"]');
            if (nextCell) {
                Personnel.editGongsuCell(nextPerson.id, nextDateStr, nextCell, nextRow, nextDay);
            }
        }, 50);
    },

    // === Excel Export ===
    exportGongsuExcel: function () {
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var daysInMonth = Store.getDaysInMonth(y, m);
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var monthData = Store.getMonthlyGongsu(y, m);
        var dowNames = ['일', '월', '화', '수', '목', '금', '토'];

        // BOM for UTF-8
        var csv = '\uFEFF';
        csv += '◇ 공수표,,,,';
        for (var x = 5; x <= daysInMonth + 2; x++) csv += ',';
        csv += y + '년 ' + m + '월\n';

        // Header row 1: No, 성명, days..., 기타, 합계
        csv += 'No.,성 명';
        for (var d = 1; d <= daysInMonth; d++) {
            csv += ',' + String(d).padStart(2, '0');
        }
        csv += ',기타,계\n';

        // Header row 2: dow
        csv += ',';
        for (var d2 = 1; d2 <= daysInMonth; d2++) {
            var dow = Store.getDayOfWeek(y, m, d2);
            csv += ',' + dowNames[dow];
        }
        csv += ',,\n';

        // Data rows
        for (var pi = 0; pi < personnel.length; pi++) {
            var p = personnel[pi];
            var pd = monthData[p.id] || { total: 0 };
            csv += (pi + 1) + ',' + p.name;
            for (var day = 1; day <= daysInMonth; day++) {
                var v = pd[day] || 0;
                csv += ',' + (v > 0 ? v.toFixed(1) : '');
            }
            csv += ',' + ',' + (pd.total > 0 ? pd.total.toFixed(1) : '0') + '\n';
        }

        // Totals
        csv += ',계';
        var grandTotal = 0;
        for (var fd = 1; fd <= daysInMonth; fd++) {
            var dayTotal = 0;
            for (var qi = 0; qi < personnel.length; qi++) {
                var qpd = monthData[personnel[qi].id] || {};
                dayTotal += qpd[fd] || 0;
            }
            csv += ',' + (dayTotal > 0 ? dayTotal.toFixed(1) : '-');
            grandTotal += dayTotal;
        }
        csv += ',,' + grandTotal.toFixed(1) + '\n';

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '공수표_' + y + '년' + m + '월.csv';
        link.click();
        App.showToast('공수표가 다운로드되었습니다.', 'success');
    },

    // ==========================================
    //  TAB 3: 노무비 대장
    // ==========================================
    _renderPayrollTable: function () {
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var monthData = Store.getMonthlyGongsu(y, m);
        var daysInMonth = Store.getDaysInMonth(y, m);

        var nav = '<div class="gongsu-nav">' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.changeMonth(-1)">◀</button>' +
            '<span class="gongsu-month-label">' + y + '년 ' + m + '월 노무비 대장</span>' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.changeMonth(1)">▶</button>' +
            '</div>';

        // Header (No day columns - just summary)
        var hdr = '<tr class="payroll-hdr">' +
            '<th class="pr-fixed">No.</th>' +
            '<th class="pr-fixed">직별</th>' +
            '<th class="pr-fixed">성 명</th>' +
            '<th class="pr-fixed">주민등록번호</th>' +
            '<th class="pr-num">단가</th>' +
            '<th class="pr-num">출역합(공수)</th>' +
            '<th class="pr-num">근로일수</th>' +
            '<th class="pr-num">노무비</th>' +
            '<th class="pr-ins-sub">국민연금</th>' +
            '<th class="pr-ins-sub">건강보험</th>' +
            '<th class="pr-ins-sub">장기요양</th>' +
            '<th class="pr-ins-sub">고용보험</th>' +
            '<th class="pr-num">주민세</th>' +
            '<th class="pr-num">공제합계</th>' +
            '<th class="pr-num pr-net">차감지급액</th>' +
            '</tr>';

        // Data rows
        var rows = '';
        var totals = { gongsu: 0, workDays: 0, gross: 0, pension: 0, health: 0, longCare: 0, employment: 0, residentTax: 0, totalDed: 0, net: 0 };

        for (var pi = 0; pi < personnel.length; pi++) {
            var p = personnel[pi];
            var pd = monthData[p.id] || { total: 0 };
            var totalGongsu = pd.total || 0;
            var workDays = 0;

            for (var wd = 1; wd <= daysInMonth; wd++) {
                if (pd[wd] && pd[wd] > 0) workDays++;
            }

            var wage = Number(p.dailyWage) || 0;
            var grossPay = Math.round(wage * totalGongsu);
            var ins = Store.calcInsurance(grossPay);

            totals.gongsu += totalGongsu;
            totals.workDays += workDays;
            totals.gross += grossPay;
            totals.pension += ins.pension;
            totals.health += ins.health;
            totals.longCare += ins.longCare;
            totals.employment += ins.employment;
            totals.residentTax += ins.residentTax;
            totals.totalDed += ins.totalDeduction;
            totals.net += ins.netPay;

            rows += '<tr>';
            rows += '<td class="pr-num">' + (pi + 1) + '</td>';
            rows += '<td class="pr-fixed"><span class="badge badge-blue">' + p.jobType + '</span></td>';
            rows += '<td class="pr-fixed pr-name">' + p.name + '</td>';
            rows += '<td class="pr-fixed pr-rid">' + (p.residentId || '-') + '</td>';
            rows += '<td class="pr-num">' + Store.formatCurrency(wage) + '</td>';
            rows += '<td class="pr-num">' + totalGongsu.toFixed(1) + '</td>';
            rows += '<td class="pr-num">' + workDays + '</td>';
            rows += '<td class="pr-num pr-gross">' + Store.formatCurrency(grossPay) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.pension) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.health) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.longCare) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.employment) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.residentTax) + '</td>';
            rows += '<td class="pr-num pr-total-ded">' + Store.formatCurrency(ins.totalDeduction) + '</td>';
            rows += '<td class="pr-num pr-net">' + Store.formatCurrency(ins.netPay) + '</td>';
            rows += '</tr>';
        }

        // Totals footer
        var tfooter = '<tr class="payroll-footer">';
        tfooter += '<td colspan="4"><strong>합 계</strong></td>';
        tfooter += '<td class="pr-num"></td>';
        tfooter += '<td class="pr-num"><strong>' + totals.gongsu.toFixed(1) + '</strong></td>';
        tfooter += '<td class="pr-num"><strong>' + totals.workDays + '</strong></td>';
        tfooter += '<td class="pr-num pr-gross"><strong>' + Store.formatCurrency(totals.gross) + '</strong></td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.pension) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.health) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.longCare) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.employment) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.residentTax) + '</td>';
        tfooter += '<td class="pr-num pr-total-ded"><strong>' + Store.formatCurrency(totals.totalDed) + '</strong></td>';
        tfooter += '<td class="pr-num pr-net"><strong>' + Store.formatCurrency(totals.net) + '</strong></td>';
        tfooter += '</tr>';

        return nav +
            '<div class="payroll-table-wrap"><table class="payroll-table">' +
            '<thead>' + hdr + '</thead>' +
            '<tbody>' + rows + tfooter + '</tbody>' +
            '</table></div>' +
            '<div class="payroll-info">' +
            '<p>📌 2026년 4대보험 근로자 부담률: 국민연금 4.75% | 건강보험 3.595% | 장기요양 건강보험의 12.95% | 고용보험 0.9%</p>' +
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

    // ==========================================
    //  QR 셀프 등록 페이지
    // ==========================================
    showQRRegisterPage: function () {
        var baseUrl = window.location.origin + window.location.pathname;
        var qrUrl = baseUrl + '?register=1';
        var html = '<div class="modal-header"><h3>📱 QR코드 직원 셀프 등록</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body" style="text-align:center;">' +
            '<p style="margin-bottom:16px;color:var(--text-secondary);">아래 QR코드를 작업자에게 보여주세요.<br>스마트폰으로 스캔하면 개인정보 입력 페이지로 이동합니다.</p>' +
            '<div style="background:white;display:inline-block;padding:20px;border-radius:16px;border:2px solid var(--border-color);">' +
            '<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrUrl) + '" alt="QR Code" style="width:200px;height:200px;">' +
            '</div>' +
            '<p style="margin-top:12px;font-size:0.82rem;color:var(--text-muted);word-break:break-all;">' + qrUrl + '</p>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">닫기</button></div>';
        App.showModal(html);
    },

    // ==========================================
    //  직원 등록 모달 (상세)
    // ==========================================
    showAddPersonModal: function () {
        var jobOptions = '';
        for (var i = 0; i < Store.JOB_TYPES.length; i++) {
            jobOptions += '<option value="' + Store.JOB_TYPES[i] + '">' + Store.JOB_TYPES[i] + '</option>';
        }
        var bankOptions = '<option value="">선택하세요</option>';
        for (var b = 0; b < Store.BANKS.length; b++) {
            bankOptions += '<option value="' + Store.BANKS[b] + '">' + Store.BANKS[b] + '</option>';
        }

        var html = '<div class="modal-header"><h3>👷 직원 등록</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div style="background:rgba(6,182,212,0.08);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--text-secondary);">📝 직원의 기본 정보를 입력해주세요. 주민번호와 계좌정보는 급여 지급에 필요합니다.</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>이름 *</label><input type="text" class="form-control" id="personName" placeholder="홍길동"></div>' +
            '<div class="form-group"><label>직종 *</label><select class="form-control" id="personJobType">' + jobOptions + '</select></div></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>주민등록번호</label><input type="text" class="form-control" id="personResidentId" placeholder="000000-0000000" maxlength="14"></div>' +
            '<div class="form-group"><label>핸드폰번호</label><input type="tel" class="form-control" id="personPhone" placeholder="010-0000-0000"></div></div>' +
            '<div class="form-group"><label>주소</label><input type="text" class="form-control" id="personAddress" placeholder="서울시 강남구 역삼동 123-45"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>은행</label><select class="form-control" id="personBank">' + bankOptions + '</select></div>' +
            '<div class="form-group"><label>계좌번호</label><input type="text" class="form-control" id="personAccount" placeholder="123-456-7890"></div></div>' +
            '<div class="form-group"><label>일당 (원)</label><input type="number" class="form-control" id="personWage" placeholder="200000"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button><button class="btn btn-primary" onclick="Personnel.savePerson()">등록</button></div>';
        App.showModal(html);
    },

    showViewPersonModal: function (id) {
        var person = Store.getPersonnel().find(function (p) { return p.id === id; });
        if (!person) return;
        var row = function (label, val) {
            return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">' + label + '</span><span style="color:var(--text-primary);font-weight:600;">' + val + '</span></div>';
        };
        var html = '<div class="modal-header"><h3>👷 직원 상세 정보</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body"><div style="display:grid;gap:0;">' +
            row('이름', person.name) +
            row('직종', '<span class="badge badge-blue">' + person.jobType + '</span>') +
            row('주민등록번호', person.residentId || '미등록') +
            row('핸드폰번호', person.phone || '미등록') +
            row('주소', person.address || '미등록') +
            row('은행', person.bank || '미등록') +
            row('계좌번호', person.accountNumber || '미등록') +
            row('일당', Store.formatCurrency(person.dailyWage || 0)) +
            row('등록유형', person.regType === 'full' ? '<span class="badge badge-green">정식</span>' : '<span class="badge badge-orange">약식</span>') +
            '</div></div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">닫기</button>' +
            '<button class="btn btn-primary" onclick="App.closeModal();Personnel.showEditPersonModal(\'' + id + '\');">수정</button></div>';
        App.showModal(html);
    },

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
        var html = '<div class="modal-header"><h3>✏️ 직원 정보 수정</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-row"><div class="form-group"><label>이름</label><input type="text" class="form-control" id="personName" value="' + person.name + '"></div>' +
            '<div class="form-group"><label>직종</label><select class="form-control" id="personJobType">' + jobOptions + '</select></div></div>' +
            '<div class="form-row"><div class="form-group"><label>주민등록번호</label><input type="text" class="form-control" id="personResidentId" value="' + (person.residentId || '') + '" maxlength="14"></div>' +
            '<div class="form-group"><label>핸드폰번호</label><input type="tel" class="form-control" id="personPhone" value="' + (person.phone || '') + '"></div></div>' +
            '<div class="form-group"><label>주소</label><input type="text" class="form-control" id="personAddress" value="' + (person.address || '') + '"></div>' +
            '<div class="form-row"><div class="form-group"><label>은행</label><select class="form-control" id="personBank">' + bankOptions + '</select></div>' +
            '<div class="form-group"><label>계좌번호</label><input type="text" class="form-control" id="personAccount" value="' + (person.accountNumber || '') + '"></div></div>' +
            '<div class="form-row"><div class="form-group"><label>일당 (원)</label><input type="number" class="form-control" id="personWage" value="' + (person.dailyWage || '') + '"></div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="personStatus">' +
            '<option value="활성"' + (person.status === '활성' ? ' selected' : '') + '>활성</option>' +
            '<option value="비활성"' + (person.status === '비활성' ? ' selected' : '') + '>비활성</option></select></div></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Personnel.updatePerson(\'' + id + '\')">수정</button></div>';
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
        if (!name) { App.showToast('이름을 입력해주세요.', 'error'); return; }
        Store.addPerson({ name: name, jobType: jobType, residentId: residentId, phone: phone, address: address, bank: bank, accountNumber: accountNumber, dailyWage: Number(dailyWage) || 0, status: '활성', regType: 'full' });
        App.closeModal(); App.refreshPage();
        App.showToast(name + '님이 등록되었습니다.', 'success');
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
        if (!name) { App.showToast('이름을 입력해주세요.', 'error'); return; }
        var regType = (residentId && address && bank && accountNumber) ? 'full' : 'quick';
        Store.updatePerson(id, { name: name, jobType: jobType, residentId: residentId, phone: phone, address: address, bank: bank, accountNumber: accountNumber, dailyWage: Number(dailyWage) || 0, status: status, regType: regType });
        App.closeModal(); App.refreshPage();
        App.showToast('직원 정보가 수정되었습니다.', 'success');
    },

    confirmDeletePerson: function (id) {
        if (confirm('이 직원과 관련 출역 기록을 모두 삭제하시겠습니까?')) {
            Store.deletePerson(id);
            App.refreshPage();
            App.showToast('직원이 삭제되었습니다.', 'info');
        }
    }
};
