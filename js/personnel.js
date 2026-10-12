/* =======================================
   BuilderOffice - Personnel Management Module
   인원 관리 (공수표 + 노무비 대장)
   ======================================= */

var Personnel = {
    activeTab: 'list',
    dateFilter: '',
    gongsuYear: new Date().getFullYear(),
    gongsuMonth: new Date().getMonth() + 1,
    gongsuSiteId: '',

    /* 탭 구성 — 실제 업무 순서대로 배치한다.
       ① 직원 등록  →  ② 현장별로 공수 입력  →  ③ 전 현장 합산 확인  →  ④ 급여 정산

       ※ 예전에는 현장 구분 없는 '공수표' 탭이 따로 있었는데,
         현장별 공수와 입력이 중복되고 어느 쪽이 정본인지 헷갈려서 없앴다.
         모든 집계는 현장별 공수를 합산해서 만든다. */
    TABS: [
        { id: 'list', label: '👷 직원 목록' },
        { id: 'sitegongsu', label: '🏗️ 공수 입력' },
        { id: 'tonghab', label: '📊 통합 공수' },
        { id: 'payroll', label: '💰 노무비 대장' }
    ],

    render: function () {
        var stats = Store.getPersonnelStats();

        // 금월 총 공수 = 전 현장 합산 (현장별 공수가 유일한 입력 경로다)
        var tg = Store.getMonthlyTonghabGongsu(this.gongsuYear, this.gongsuMonth);
        var totalGongsu = 0;
        for (var k in tg) {
            if (tg.hasOwnProperty(k)) totalGongsu += (tg[k].grandTotal || 0);
        }

        var navs = '', panes = '';
        for (var i = 0; i < this.TABS.length; i++) {
            var t = this.TABS[i];
            var on = (this.activeTab === t.id);
            navs += '<button class="tab-btn ' + (on ? 'active' : '') + '" ' +
                'onclick="Personnel.switchTab(\'' + t.id + '\')">' + t.label + '</button>';

            var body = '';
            if (t.id === 'list') body = this._renderPersonnelList();
            else if (t.id === 'sitegongsu') body = this._renderSiteGongsuTable();
            else if (t.id === 'tonghab') body = this._renderTonghabGongsu();
            else if (t.id === 'payroll') body = this._renderPayrollTable();
            panes += '<div class="tab-content ' + (on ? 'active' : '') + '">' + body + '</div>';
        }

        return '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon green">👷</div><div class="stat-info"><div class="stat-label">등록 인원</div><div class="stat-value">' + stats.totalRegistered + '명</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><div class="stat-label">금월 총 공수</div><div class="stat-value">' + totalGongsu.toFixed(1) + '공</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple">⏱️</div><div class="stat-info"><div class="stat-label">금일 출역</div><div class="stat-value">' + stats.todayCount + '명</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="tab-nav">' + navs + '</div>' +
            panes +
            '</div>';
    },

    // 열람 권한이 없는 개인정보 자리에 표시할 표식
    LOCKED: '<span style="color:var(--text-muted);" title="열람 권한이 없습니다">🔒</span>',

    // 민감정보를 볼 수 없는 사용자에게 이유를 알려주는 안내 배너
    _privacyNotice: function () {
        if (Store.canViewPersonnelPrivate()) return '';
        return '<div class="payroll-info" style="margin-bottom:12px;">' +
            '<p>🔒 주민등록번호·계좌번호·일당은 <strong>대표·본사 관리자</strong>와 본인만 열람할 수 있습니다. ' +
            '이 항목들은 별도 저장소에 분리 보관됩니다.</p></div>';
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
                    '<td>' + (p._privateAvailable ? Store.escapeHtml(Store.maskResidentId(p.residentId, p)) : Personnel.LOCKED) + '</td>' +
                    '<td>' + (p._privateAvailable ? (p.bank || '-') : Personnel.LOCKED) + '</td>' +
                    '<td>' + regBadge + '</td>' +
                    '<td class="amount">' + (p._privateAvailable ? Store.formatCurrency(p.dailyWage || 0) : Personnel.LOCKED) + '</td>' +
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

        return Personnel._privacyNotice() +
            '<div class="toolbar">' +
            '<div class="toolbar-left"><span style="color:var(--text-muted);font-size:13px;">총 ' + personnel.length + '명 등록</span></div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-secondary" onclick="Personnel.showQRRegisterPage()">📱 QR 등록</button>' +
            '<button class="btn btn-primary" onclick="Personnel.showAddPersonModal()">➕ 직원 등록</button>' +
            '</div></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>이름</th><th>직종</th><th>연락처</th><th>주민번호</th><th>은행</th><th>등록</th><th>일당</th><th>상태</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    },


    changeMonth: function (delta) {
        this.gongsuMonth += delta;
        if (this.gongsuMonth < 1) { this.gongsuMonth = 12; this.gongsuYear--; }
        if (this.gongsuMonth > 12) { this.gongsuMonth = 1; this.gongsuYear++; }
        App.refreshPage();
    },

    // ==========================================
    //  노무비 대장
    // ==========================================
    // 급여 화면은 일당이 있어야 성립한다. 열람 권한이 없으면 0원만 나열되므로
    // 표를 그리는 대신 이유와 대안을 안내한다.
    _wageAccessBlocked: function (title) {
        return '<div class="empty-state" style="padding:48px 24px;">' +
            '<div class="empty-icon">🔒</div>' +
            '<p><strong>' + title + '</strong>은 대표·본사 관리자만 열람할 수 있습니다.</p>' +
            '<p style="font-size:13px;color:var(--text-muted);margin-top:8px;">' +
            '급여·일당 정보가 포함된 화면입니다. 인원 투입 현황은 ' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.switchTab(\'sitegongsu\')">🏗️ 공수 입력</button>' +
            ' 에서 확인하세요.</p></div>';
    },

    _renderPayrollTable: function () {
        if (!Store.canViewPersonnelPrivate()) return this._wageAccessBlocked('노무비 대장');
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        // 공수 입력은 현장별로만 이뤄지므로, 전 현장 합산 일자별 데이터를 쓴다
        var monthData = Store.getMonthlyTonghabDaily(y, m);
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
            '<th class="pr-num">소득세</th>' +
            '<th class="pr-num">지방소득세</th>' +
            '<th class="pr-num">공제합계</th>' +
            '<th class="pr-num pr-net">차감지급액</th>' +
            '</tr>';

        // Data rows
        var rows = '';
        var totals = { gongsu: 0, workDays: 0, gross: 0, pension: 0, health: 0, longCare: 0, employment: 0, incomeTax: 0, residentTax: 0, totalDed: 0, net: 0 };

        for (var pi = 0; pi < personnel.length; pi++) {
            var p = personnel[pi];
            var pd = monthData[p.id] || { total: 0 };
            var totalGongsu = pd.total || 0;
            var wage = Number(p.dailyWage) || 0;

            // 일용직 소득세는 일 단위로 계산해야 소액부징수가 정확히 반영된다
            var dailyPays = [];
            for (var wd = 1; wd <= daysInMonth; wd++) {
                if (pd[wd] && pd[wd] > 0) dailyPays.push(Math.round(wage * pd[wd]));
            }
            var workDays = dailyPays.length;

            var ins = Store.calcPayroll({ dailyPays: dailyPays, workDays: workDays });
            var grossPay = ins.grossPay;

            totals.gongsu += totalGongsu;
            totals.workDays += workDays;
            totals.gross += grossPay;
            totals.pension += ins.pension;
            totals.health += ins.health;
            totals.longCare += ins.longCare;
            totals.employment += ins.employment;
            totals.incomeTax += ins.incomeTax;
            totals.residentTax += ins.residentTax;
            totals.totalDed += ins.totalDeduction;
            totals.net += ins.netPay;

            rows += '<tr>';
            rows += '<td class="pr-num">' + (pi + 1) + '</td>';
            rows += '<td class="pr-fixed"><span class="badge badge-blue">' + p.jobType + '</span></td>';
            rows += '<td class="pr-fixed pr-name">' + p.name + '</td>';
            rows += '<td class="pr-fixed pr-rid">' + Store.escapeHtml(Store.maskResidentId(p.residentId, p)) + '</td>';
            rows += '<td class="pr-num">' + Store.formatCurrency(wage) + '</td>';
            rows += '<td class="pr-num">' + totalGongsu.toFixed(1) + '</td>';
            rows += '<td class="pr-num">' + workDays + '</td>';
            rows += '<td class="pr-num pr-gross">' + Store.formatCurrency(grossPay) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.pension) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.health) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.longCare) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.employment) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.incomeTax) + '</td>';
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
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.incomeTax) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.residentTax) + '</td>';
        tfooter += '<td class="pr-num pr-total-ded"><strong>' + Store.formatCurrency(totals.totalDed) + '</strong></td>';
        tfooter += '<td class="pr-num pr-net"><strong>' + Store.formatCurrency(totals.net) + '</strong></td>';
        tfooter += '</tr>';

        return nav +
            '<div class="payroll-table-wrap"><table class="payroll-table">' +
            '<thead>' + hdr + '</thead>' +
            '<tbody>' + rows + tfooter + '</tbody>' +
            '</table></div>' +
            Personnel._renderRateNotice();
    },

    // ==========================================
    //  TAB 3: 현장별 공수표 (근로자공수자동입력)
    // ==========================================
    _renderSiteGongsuTable: function () {
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var daysInMonth = Store.getDaysInMonth(y, m);
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var sites = Store.getSites();
        var siteId = this.gongsuSiteId;

        // 현장 선택기
        var siteOpts = '<option value="">현장을 선택하세요</option>';
        for (var si = 0; si < sites.length; si++) {
            var sel = sites[si].id === siteId ? ' selected' : '';
            siteOpts += '<option value="' + sites[si].id + '"' + sel + '>' + Store.escapeHtml(sites[si].name) + '</option>';
        }

        var nav = '<div class="gongsu-nav" style="flex-wrap:wrap;gap:8px;">' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.changeMonth(-1)">◀</button>' +
            '<span class="gongsu-month-label">' + y + '년 ' + m + '월</span>' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.changeMonth(1)">▶</button>' +
            '<select class="form-control" style="width:auto;min-width:160px;" onchange="Personnel.changeSiteFilter(this.value)">' + siteOpts + '</select>' +
            (siteId ? '<button class="btn btn-primary btn-sm" onclick="Personnel.exportSiteGongsuExcel()">📥 엑셀</button>' : '') +
            '</div>';

        if (!siteId) {
            return nav + '<div class="empty-state" style="padding:40px;"><div class="empty-icon">🏗️</div><p>위에서 현장을 선택하면 해당 현장의 공수표가 표시됩니다.</p><p style="font-size:12px;color:var(--text-muted);">일일입력에서 제출하면 공수가 자동으로 기록됩니다.</p></div>';
        }

        var monthData = Store.getMonthlySiteGongsu(y, m, siteId);
        var dowNames = ['일', '월', '화', '수', '목', '금', '토'];

        var hdr = '<tr class="gongsu-hdr"><th class="gs-no">No.</th><th class="gs-name">성 명</th><th class="gs-name" style="min-width:60px;">직종</th>';
        for (var d = 1; d <= daysInMonth; d++) {
            var dow = Store.getDayOfWeek(y, m, d);
            var dayClass = dow === 0 ? 'gs-sun' : dow === 6 ? 'gs-sat' : '';
            hdr += '<th class="gs-day ' + dayClass + '"><div class="gs-day-num">' + String(d).padStart(2, '0') + '</div><div class="gs-dow">' + dowNames[dow] + '</div></th>';
        }
        hdr += '<th class="gs-total">계</th></tr>';

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
            rows += '<td class="gs-name">' + Store.escapeHtml(p.name) + '</td>';
            rows += '<td class="gs-name" style="font-size:11px;">' + Store.escapeHtml(p.jobType) + '</td>';

            for (var day = 1; day <= daysInMonth; day++) {
                var val = pd[day] || 0;
                var dow2 = Store.getDayOfWeek(y, m, day);
                var cellClass = dow2 === 0 ? 'gs-sun' : dow2 === 6 ? 'gs-sat' : '';
                var displayVal = val > 0 ? val.toFixed(1) : '';
                var dateStr = y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                dayTotals[day] += val;

                rows += '<td class="gs-cell ' + cellClass + (val > 0 ? ' gs-filled' : '') + '" ' +
                    'onclick="Personnel.editSiteGongsuCell(\'' + p.id + '\',\'' + siteId + '\',\'' + dateStr + '\', this, ' + pi + ', ' + day + ')" ' +
                    'data-pid="' + p.id + '" data-sid="' + siteId + '" data-date="' + dateStr + '" data-row="' + pi + '" data-day="' + day + '">' +
                    displayVal + '</td>';
            }
            rows += '<td class="gs-total-cell">' + (rowTotal > 0 ? rowTotal.toFixed(1) : '') + '</td>';
            rows += '</tr>';
        }

        var footer = '<tr class="gongsu-footer"><td class="gs-no"></td><td class="gs-name" colspan="2"><strong>계</strong></td>';
        for (var fd = 1; fd <= daysInMonth; fd++) {
            var dow3 = Store.getDayOfWeek(y, m, fd);
            var fClass = dow3 === 0 ? 'gs-sun' : dow3 === 6 ? 'gs-sat' : '';
            footer += '<td class="gs-cell ' + fClass + '">' + (dayTotals[fd] > 0 ? dayTotals[fd].toFixed(1) : '-') + '</td>';
        }
        footer += '<td class="gs-total-cell"><strong>' + grandTotal.toFixed(1) + '</strong></td></tr>';

        return nav +
            '<p style="font-size:12px;color:var(--text-muted);padding:6px 0 2px;">💡 셀을 클릭해 공수 직접입력 | 일일입력 제출 시 자동기록</p>' +
            '<div class="gongsu-table-wrap"><table class="gongsu-table">' +
            '<thead>' + hdr + '</thead>' +
            '<tbody>' + rows + footer + '</tbody>' +
            '</table></div>';
    },

    editSiteGongsuCell: function (personId, siteId, dateStr, cell, rowIdx, dayIdx) {
        var currentVal = Store.getSiteGongsu(personId, siteId, dateStr);
        var input = document.createElement('input');
        input.type = 'number';
        input.className = 'gs-input';
        input.value = currentVal || '';
        input.min = '0'; input.max = '5'; input.step = '0.5';
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus(); input.select();

        var movingNext = false;
        input.addEventListener('blur', function () {
            if (movingNext) return;
            var v = Math.min(5, Math.max(0, parseFloat(input.value) || 0));
            Store.setSiteGongsu(personId, siteId, dateStr, v);
            App.refreshPage();
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                movingNext = true;
                var v = Math.min(5, Math.max(0, parseFloat(input.value) || 0));
                Store.setSiteGongsu(personId, siteId, dateStr, v);
                Personnel._moveSiteNextCell(siteId, rowIdx, dayIdx);
            }
            if (e.key === 'Escape') App.refreshPage();
        });
    },

    _moveSiteNextCell: function (siteId, rowIdx, dayIdx) {
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var daysInMonth = Store.getDaysInMonth(y, m);
        var nextDay = dayIdx + 1;
        var nextRow = rowIdx;
        if (nextDay > daysInMonth) { nextDay = 1; nextRow = rowIdx + 1; }
        if (nextRow >= personnel.length) { App.refreshPage(); return; }
        var nextPerson = personnel[nextRow];
        var nextDateStr = y + '-' + String(m).padStart(2, '0') + '-' + String(nextDay).padStart(2, '0');
        App.refreshPage();
        setTimeout(function () {
            var nextCell = document.querySelector('[data-pid="' + nextPerson.id + '"][data-sid="' + siteId + '"][data-day="' + nextDay + '"]');
            if (nextCell) Personnel.editSiteGongsuCell(nextPerson.id, siteId, nextDateStr, nextCell, nextRow, nextDay);
        }, 50);
    },

    changeSiteFilter: function (siteId) {
        this.gongsuSiteId = siteId;
        App.refreshPage();
    },

    exportSiteGongsuExcel: function () {
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var siteId = this.gongsuSiteId;
        var sites = Store.getSites();
        var site = sites.find(function (s) { return s.id === siteId; });
        var siteName = site ? site.name : '현장';
        var daysInMonth = Store.getDaysInMonth(y, m);
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var monthData = Store.getMonthlySiteGongsu(y, m, siteId);
        var dowNames = ['일', '월', '화', '수', '목', '금', '토'];

        var csv = '﻿';
        csv += '◇ 공수표 [' + siteName + '],,,';
        for (var x = 4; x <= daysInMonth + 3; x++) csv += ',';
        csv += y + '년 ' + m + '월\n';
        csv += 'No.,성 명,직종';
        for (var d = 1; d <= daysInMonth; d++) csv += ',' + String(d).padStart(2, '0');
        csv += ',계\n';
        csv += ',,';
        for (var d2 = 1; d2 <= daysInMonth; d2++) csv += ',' + dowNames[Store.getDayOfWeek(y, m, d2)];
        csv += ',\n';

        var grandTotal = 0;
        for (var pi = 0; pi < personnel.length; pi++) {
            var p = personnel[pi];
            var pd = monthData[p.id] || { total: 0 };
            csv += (pi + 1) + ',' + p.name + ',' + p.jobType;
            for (var day = 1; day <= daysInMonth; day++) {
                var v = pd[day] || 0;
                csv += ',' + (v > 0 ? v.toFixed(1) : '');
            }
            csv += ',' + (pd.total > 0 ? pd.total.toFixed(1) : '0') + '\n';
            grandTotal += pd.total || 0;
        }
        csv += ',계,,';
        for (var fd = 1; fd <= daysInMonth; fd++) {
            var dayTotal = 0;
            for (var qi = 0; qi < personnel.length; qi++) {
                dayTotal += (monthData[personnel[qi].id] || {})[fd] || 0;
            }
            csv += ',' + (dayTotal > 0 ? dayTotal.toFixed(1) : '-');
        }
        csv += ',' + grandTotal.toFixed(1) + '\n';

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = siteName + '_공수표_' + y + '년' + m + '월.csv';
        link.click();
        App.showToast('공수표가 다운로드되었습니다.', 'success');
    },

    // ==========================================
    //  TAB 4: 통합공수 (AppScript 통합공수 시트와 동일)
    // ==========================================
    _renderTonghabGongsu: function () {
        if (!Store.canViewPersonnelPrivate()) return this._wageAccessBlocked('통합공수 정산');
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var sites = Store.getSites();
        var tonghabData = Store.getMonthlyTonghabGongsu(y, m);
        var dailyData = Store.getMonthlyTonghabDaily(y, m);
        var daysInMonth2 = Store.getDaysInMonth(y, m);

        var nav = '<div class="gongsu-nav">' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.changeMonth(-1)">◀</button>' +
            '<span class="gongsu-month-label">' + y + '년 ' + m + '월 통합공수</span>' +
            '<button class="btn btn-secondary btn-sm" onclick="Personnel.changeMonth(1)">▶</button>' +
            '<button class="btn btn-primary btn-sm" onclick="Personnel.exportTonghabExcel()" style="margin-left:16px;">📥 엑셀</button>' +
            '</div>';

        // 실제 데이터가 있는 현장만 컬럼으로 표시
        var activeSiteIds = {};
        for (var pid in tonghabData) {
            if (!tonghabData.hasOwnProperty(pid)) continue;
            for (var sid in tonghabData[pid]) {
                if (sid !== 'grandTotal') activeSiteIds[sid] = true;
            }
        }
        var activeSites = sites.filter(function (s) { return activeSiteIds[s.id]; });

        var hdr = '<tr class="payroll-hdr">' +
            '<th class="pr-fixed" style="min-width:30px;">No.</th>' +
            '<th class="pr-fixed" style="min-width:60px;">직종</th>' +
            '<th class="pr-fixed" style="min-width:70px;">성 명</th>' +
            '<th class="pr-num" style="min-width:70px;">단가</th>';
        for (var si = 0; si < activeSites.length; si++) {
            hdr += '<th class="pr-num" style="min-width:60px;">' + Store.escapeHtml(activeSites[si].name) + '</th>';
        }
        hdr += '<th class="pr-num">총공수</th>' +
            '<th class="pr-num pr-gross">노무비총액</th>' +
            '<th class="pr-ins-sub">고용보험</th>' +
            '<th class="pr-ins-sub">건강보험</th>' +
            '<th class="pr-ins-sub">국민연금</th>' +
            '<th class="pr-ins-sub">장기요양</th>' +
            '<th class="pr-num">소득세</th>' +
            '<th class="pr-num">지방소득세</th>' +
            '<th class="pr-num">공제합계</th>' +
            '<th class="pr-num pr-net">차감지급액</th>' +
            '</tr>';

        var rows = '';
        var totals = { gongsu: 0, gross: 0, goyo: 0, gungang: 0, gukmin: 0, janggi: 0, incomeTax: 0, residentTax: 0, gongje: 0, net: 0 };
        var siteTotals = {};
        for (var si2 = 0; si2 < activeSites.length; si2++) siteTotals[activeSites[si2].id] = 0;

        var rowNum = 0;
        for (var pi = 0; pi < personnel.length; pi++) {
            var p = personnel[pi];
            var pd = tonghabData[p.id] || { grandTotal: 0 };
            var totalGongsu = pd.grandTotal || 0;
            if (totalGongsu === 0) continue;
            rowNum++;

            var wage = Number(p.dailyWage) || 0;

            // 전 현장 합산 일자별 공수로 일급을 만들어 일 단위 소득세를 계산한다
            var dd = dailyData[p.id] || {};
            var dailyPays = [];
            for (var dnum = 1; dnum <= daysInMonth2; dnum++) {
                if (dd[dnum] && dd[dnum] > 0) dailyPays.push(Math.round(wage * dd[dnum]));
            }

            var ins = Store.calcPayroll({ dailyPays: dailyPays, workDays: dailyPays.length });
            var grossPay = ins.grossPay;
            var goyo = ins.employment;
            var gungang = ins.health;
            var gukmin = ins.pension;
            var janggi = ins.longCare;
            var gongje = ins.totalDeduction;
            var net = ins.netPay;

            totals.gongsu += totalGongsu;
            totals.gross += grossPay;
            totals.goyo += goyo;
            totals.gungang += gungang;
            totals.gukmin += gukmin;
            totals.janggi += janggi;
            totals.incomeTax += ins.incomeTax;
            totals.residentTax += ins.residentTax;
            totals.gongje += gongje;
            totals.net += net;

            rows += '<tr>';
            rows += '<td class="pr-num">' + rowNum + '</td>';
            rows += '<td class="pr-fixed"><span class="badge badge-blue" style="font-size:10px;">' + Store.escapeHtml(p.jobType) + '</span></td>';
            rows += '<td class="pr-fixed pr-name">' + Store.escapeHtml(p.name) + '</td>';
            rows += '<td class="pr-num">' + Store.formatCurrency(wage) + '</td>';
            for (var si3 = 0; si3 < activeSites.length; si3++) {
                var sGongsu = pd[activeSites[si3].id] || 0;
                siteTotals[activeSites[si3].id] += sGongsu;
                rows += '<td class="pr-num">' + (sGongsu > 0 ? sGongsu.toFixed(1) : '-') + '</td>';
            }
            rows += '<td class="pr-num" style="font-weight:700;">' + totalGongsu.toFixed(1) + '</td>';
            rows += '<td class="pr-num pr-gross">' + Store.formatCurrency(grossPay) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(goyo) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(gungang) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(gukmin) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(janggi) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.incomeTax) + '</td>';
            rows += '<td class="pr-num pr-ded">' + Store.formatCurrency(ins.residentTax) + '</td>';
            rows += '<td class="pr-num pr-total-ded">' + Store.formatCurrency(gongje) + '</td>';
            rows += '<td class="pr-num pr-net">' + Store.formatCurrency(net) + '</td>';
            rows += '</tr>';
        }

        if (!rows) {
            rows = '<tr><td colspan="' + (10 + activeSites.length) + '"><div class="empty-state"><div class="empty-icon">📊</div>' +
                '<p>이번 달 공수 데이터가 없습니다.</p>' +
                '<p style="font-size:12px;color:var(--text-muted);">일일입력을 제출하거나 현장별 공수 탭에서 직접 입력하세요.</p></div></td></tr>';
        }

        var tfooter = '<tr class="payroll-footer">';
        tfooter += '<td colspan="4"><strong>합 계</strong></td>';
        for (var si4 = 0; si4 < activeSites.length; si4++) {
            tfooter += '<td class="pr-num"><strong>' + (siteTotals[activeSites[si4].id] || 0).toFixed(1) + '</strong></td>';
        }
        tfooter += '<td class="pr-num"><strong>' + totals.gongsu.toFixed(1) + '</strong></td>';
        tfooter += '<td class="pr-num pr-gross"><strong>' + Store.formatCurrency(totals.gross) + '</strong></td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.goyo) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.gungang) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.gukmin) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.janggi) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.incomeTax) + '</td>';
        tfooter += '<td class="pr-num pr-ded">' + Store.formatCurrency(totals.residentTax) + '</td>';
        tfooter += '<td class="pr-num pr-total-ded"><strong>' + Store.formatCurrency(totals.gongje) + '</strong></td>';
        tfooter += '<td class="pr-num pr-net"><strong>' + Store.formatCurrency(totals.net) + '</strong></td>';
        tfooter += '</tr>';

        return nav +
            '<div class="payroll-table-wrap"><table class="payroll-table">' +
            '<thead>' + hdr + '</thead>' +
            '<tbody>' + rows + tfooter + '</tbody>' +
            '</table></div>' +
            Personnel._renderRateNotice();
    },

    /**
     * 요율 안내 문구. 요율은 Store.INSURANCE_RATES 한 곳에서만 관리하므로
     * 화면 문구도 그 값을 그대로 읽어 표시한다 (하드코딩 불일치 방지).
     */
    _renderRateNotice: function () {
        var r = Store.INSURANCE_RATES;
        var t = Store.DAILY_TAX;
        var el = Store.DAILY_INSURANCE_ELIGIBILITY;
        var pct = function (v) { return (v * 100).toFixed(3).replace(/\.?0+$/, '') + '%'; };

        return '<div class="payroll-info">' +
            '<p>📌 <strong>' + r.basisYear + '년 기준</strong> 보험요율(근로자 부담): ' +
            '고용보험 ' + pct(r.employmentInsurance) + ' | 건강보험 ' + pct(r.healthInsurance) +
            ' | 국민연금 ' + pct(r.nationalPension) + ' | 장기요양 건강보험료의 ' + pct(r.longTermCare) + '</p>' +
            '<p>📌 일용근로소득세: (일급 − ' + Store.formatNumber(t.dailyDeduction) + '원) × ' + pct(t.rate) +
            ' × (1 − ' + pct(t.taxCredit) + ') · 1일 산출세액 ' + Store.formatNumber(t.minWithhold) +
            '원 미만은 소액부징수(0원) · 지방소득세는 소득세의 ' + pct(r.localIncomeTax) + '</p>' +
            '<p style="color:var(--text-muted);">📌 일용직 국민연금·건강보험은 월 ' + el.pensionMinDays +
            '일(또는 ' + el.pensionMinHours + '시간) 이상 근로 시에만 공제됩니다. 고용보험은 근로일수와 무관하게 적용됩니다.</p>' +
            '<p style="color:var(--accent-warning);">⚠️ 요율은 매년 변경됩니다. 실제 신고 전 최신 고시 요율을 확인하세요.</p>' +
            '</div>';
    },

    exportTonghabExcel: function () {
        if (!Store.canViewPersonnelPrivate()) {
            App.showToast('노무비가 포함된 자료입니다. 대표·본사 관리자만 내려받을 수 있습니다.', 'error');
            return;
        }
        var y = this.gongsuYear;
        var m = this.gongsuMonth;
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var sites = Store.getSites();
        var tonghabData = Store.getMonthlyTonghabGongsu(y, m);

        var activeSiteIds = {};
        for (var pid in tonghabData) {
            if (!tonghabData.hasOwnProperty(pid)) continue;
            for (var sid in tonghabData[pid]) {
                if (sid !== 'grandTotal') activeSiteIds[sid] = true;
            }
        }
        var activeSites = sites.filter(function (s) { return activeSiteIds[s.id]; });

        var csv = '﻿◇ 통합공수 - ' + y + '년 ' + m + '월\n';
        csv += 'No.,직종,성 명,단가';
        for (var si = 0; si < activeSites.length; si++) csv += ',' + activeSites[si].name;
        csv += ',총공수,노무비총액,고용보험,건강보험,국민연금,장기요양,소득세,지방소득세,공제합계,차감지급액\n';

        var dailyData = Store.getMonthlyTonghabDaily(y, m);
        var daysInMonth = Store.getDaysInMonth(y, m);

        var rowNum = 0;
        var totals = { gongsu: 0, gross: 0, goyo: 0, gungang: 0, gukmin: 0, janggi: 0, incomeTax: 0, residentTax: 0, gongje: 0, net: 0 };
        for (var pi = 0; pi < personnel.length; pi++) {
            var p = personnel[pi];
            var pd = tonghabData[p.id] || { grandTotal: 0 };
            if (!pd.grandTotal) continue;
            rowNum++;
            var wage = Number(p.dailyWage) || 0;

            // 화면 표와 동일하게 일 단위로 계산한다
            var dd = dailyData[p.id] || {};
            var dailyPays = [];
            for (var dnum = 1; dnum <= daysInMonth; dnum++) {
                if (dd[dnum] && dd[dnum] > 0) dailyPays.push(Math.round(wage * dd[dnum]));
            }
            var ins = Store.calcPayroll({ dailyPays: dailyPays, workDays: dailyPays.length });

            var gross = ins.grossPay;
            var goyo = ins.employment;
            var gungang = ins.health;
            var gukmin = ins.pension;
            var janggi = ins.longCare;
            var gongje = ins.totalDeduction;
            var net = ins.netPay;

            totals.gongsu += pd.grandTotal; totals.gross += gross;
            totals.goyo += goyo; totals.gungang += gungang;
            totals.gukmin += gukmin; totals.janggi += janggi;
            totals.incomeTax += ins.incomeTax; totals.residentTax += ins.residentTax;
            totals.gongje += gongje; totals.net += net;

            csv += rowNum + ',' + p.jobType + ',' + p.name + ',' + wage;
            for (var si2 = 0; si2 < activeSites.length; si2++) {
                csv += ',' + ((pd[activeSites[si2].id] || 0).toFixed(1));
            }
            csv += ',' + pd.grandTotal.toFixed(1) + ',' + gross + ',' + goyo + ',' + gungang + ',' + gukmin + ',' + janggi +
                ',' + ins.incomeTax + ',' + ins.residentTax + ',' + gongje + ',' + net + '\n';
        }
        csv += '합계,,,';
        for (var si3 = 0; si3 < activeSites.length; si3++) csv += ',';
        csv += totals.gongsu.toFixed(1) + ',' + totals.gross + ',' + totals.goyo + ',' + totals.gungang + ',' + totals.gukmin + ',' + totals.janggi +
            ',' + totals.incomeTax + ',' + totals.residentTax + ',' + totals.gongje + ',' + totals.net + '\n';

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '통합공수_' + y + '년' + m + '월.csv';
        link.click();
        App.showToast('통합공수가 다운로드되었습니다.', 'success');
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
        var priv = !!person._privateAvailable;
        var row = function (label, val) {
            return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">' + label + '</span><span style="color:var(--text-primary);font-weight:600;">' + val + '</span></div>';
        };
        var html = '<div class="modal-header"><h3>👷 직원 상세 정보</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body"><div style="display:grid;gap:0;">' +
            row('이름', person.name) +
            row('직종', '<span class="badge badge-blue">' + person.jobType + '</span>') +
            row('주민등록번호', priv ? Store.escapeHtml(Store.maskResidentId(person.residentId, person)) : Personnel.LOCKED) +
            row('핸드폰번호', person.phone || '미등록') +
            row('주소', priv ? (person.address || '미등록') : Personnel.LOCKED) +
            row('은행', priv ? (person.bank || '미등록') : Personnel.LOCKED) +
            row('계좌번호', priv ? Store.escapeHtml(Store.maskAccount(person.accountNumber, person)) : Personnel.LOCKED) +
            row('일당', priv ? Store.formatCurrency(person.dailyWage || 0) : Personnel.LOCKED) +
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
        // 민감정보는 열람 권한이 있을 때만 입력란을 만든다.
        // 권한이 없으면 아예 렌더링하지 않으므로, 저장해도 기존 값이 덮어써지지 않는다.
        var priv = !!person._privateAvailable;
        var privFields = priv
            ? ('<div class="form-row"><div class="form-group"><label>주민등록번호</label><input type="text" class="form-control" id="personResidentId" value="' + (person.residentId || '') + '" maxlength="14"></div>' +
               '<div class="form-group"><label>핸드폰번호</label><input type="tel" class="form-control" id="personPhone" value="' + (person.phone || '') + '"></div></div>' +
               '<div class="form-group"><label>주소</label><input type="text" class="form-control" id="personAddress" value="' + (person.address || '') + '"></div>' +
               '<div class="form-row"><div class="form-group"><label>은행</label><select class="form-control" id="personBank">' + bankOptions + '</select></div>' +
               '<div class="form-group"><label>계좌번호</label><input type="text" class="form-control" id="personAccount" value="' + (person.accountNumber || '') + '"></div></div>' +
               '<div class="form-row"><div class="form-group"><label>일당 (원)</label><input type="number" class="form-control" id="personWage" value="' + (person.dailyWage || '') + '"></div>')
            : ('<div class="form-group"><label>핸드폰번호</label><input type="tel" class="form-control" id="personPhone" value="' + (person.phone || '') + '"></div>' +
               '<div class="payroll-info"><p>🔒 주민등록번호·주소·계좌·일당은 대표·본사 관리자만 수정할 수 있습니다. ' +
               '여기서 저장해도 기존 값은 그대로 유지됩니다.</p></div>' +
               '<div class="form-row">');

        var html = '<div class="modal-header"><h3>✏️ 직원 정보 수정</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-row"><div class="form-group"><label>이름</label><input type="text" class="form-control" id="personName" value="' + person.name + '"></div>' +
            '<div class="form-group"><label>직종</label><select class="form-control" id="personJobType">' + jobOptions + '</select></div></div>' +
            privFields +
            '<div class="form-group"><label>상태</label><select class="form-control" id="personStatus">' +
            '<option value="활성"' + (person.status === '활성' ? ' selected' : '') + '>활성</option>' +
            '<option value="비활성"' + (person.status === '비활성' ? ' selected' : '') + '>비활성</option></select></div></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Personnel.updatePerson(\'' + id + '\')">수정</button></div>';
        App.showModal(html);
    },

    // 렌더링되지 않은 입력란은 건너뛴다 (권한이 없으면 민감 입력란 자체가 없다)
    _val: function (elId) {
        var el = document.getElementById(elId);
        return el ? String(el.value).trim() : null;
    },

    // 값이 있는 항목만 담아 Store로 넘긴다.
    // null(=입력란 없음)은 제외되므로 기존 값이 지워지지 않는다.
    _collectPersonFields: function () {
        var f = {};
        var map = {
            name: 'personName', jobType: 'personJobType', phone: 'personPhone',
            residentId: 'personResidentId', address: 'personAddress',
            bank: 'personBank', accountNumber: 'personAccount'
        };
        for (var key in map) {
            if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
            var v = this._val(map[key]);
            if (v !== null) f[key] = v;
        }
        var wage = this._val('personWage');
        if (wage !== null) f.dailyWage = Number(wage) || 0;
        return f;
    },

    savePerson: function () {
        var f = this._collectPersonFields();
        if (!f.name) { App.showToast('이름을 입력해주세요.', 'error'); return; }

        f.status = '활성';
        f.regType = (f.residentId && f.address && f.bank && f.accountNumber) ? 'full' : 'quick';

        Store.addPerson(f);
        App.closeModal(); App.refreshPage();
        App.showToast(f.name + '님이 등록되었습니다.', 'success');
    },

    updatePerson: function (id) {
        var f = this._collectPersonFields();
        if (!f.name) { App.showToast('이름을 입력해주세요.', 'error'); return; }

        var status = this._val('personStatus');
        if (status !== null) f.status = status;

        // regType은 민감정보 전체를 볼 수 있을 때만 다시 판정한다.
        // 권한이 없는 사용자가 저장했다고 '약식'으로 강등되면 안 된다.
        if (Store.canViewPersonnelPrivate()) {
            f.regType = (f.residentId && f.address && f.bank && f.accountNumber) ? 'full' : 'quick';
        }

        Store.updatePerson(id, f);
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
