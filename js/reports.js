/* =======================================
   BuilderOffice - 보고서 (Reports)
   ======================================= */

var Reports = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    currentTab: 'cost',

    render: function () {
        var y = this.currentYear, m = this.currentMonth;
        var monthLabel = y + '년 ' + m + '월';
        var monthStr = y + '-' + String(m).padStart(2, '0');

        var html = '<div class="page-section">' +
            '<div class="report-header">' +
            '<div class="report-nav">' +
            '<button class="btn btn-secondary btn-sm" onclick="Reports.prevMonth()">◀ 이전달</button>' +
            '<span class="report-month-label">' + monthLabel + ' 보고서</span>' +
            '<button class="btn btn-secondary btn-sm" onclick="Reports.nextMonth()">다음달 ▶</button>' +
            '</div>' +
            '<div style="display:flex;gap:8px">' +
            '<button class="btn btn-secondary btn-sm" onclick="Reports.printReport()">🖨️ 인쇄</button>' +
            '</div>' +
            '</div>' +
            '<div class="tab-nav">' +
            '<button class="tab-btn' + (this.currentTab === 'cost' ? ' active' : '') + '" onclick="Reports.setTab(\'cost\')">💰 비용 보고서</button>' +
            '<button class="tab-btn' + (this.currentTab === 'payroll' ? ' active' : '') + '" onclick="Reports.setTab(\'payroll\')">👷 인건비 보고서</button>' +
            '<button class="tab-btn' + (this.currentTab === 'material' ? ' active' : '') + '" onclick="Reports.setTab(\'material\')">📦 자재 현황</button>' +
            '<button class="tab-btn' + (this.currentTab === 'site' ? ' active' : '') + '" onclick="Reports.setTab(\'site\')">🏗️ 현장 현황</button>' +
            '</div>';

        if (this.currentTab === 'cost') html += this._renderCostReport(monthStr);
        else if (this.currentTab === 'payroll') html += this._renderPayrollReport(y, m);
        else if (this.currentTab === 'material') html += this._renderMaterialReport();
        else if (this.currentTab === 'site') html += this._renderSiteReport();

        html += '</div>';
        return html;
    },

    setTab: function (tab) {
        this.currentTab = tab;
        App.refreshPage();
    },

    prevMonth: function () {
        this.currentMonth--;
        if (this.currentMonth < 1) { this.currentMonth = 12; this.currentYear--; }
        App.refreshPage();
    },

    nextMonth: function () {
        this.currentMonth++;
        if (this.currentMonth > 12) { this.currentMonth = 1; this.currentYear++; }
        App.refreshPage();
    },

    _renderCostReport: function (monthStr) {
        var costs = Store.getCosts().filter(function (c) { return c.date && c.date.startsWith(monthStr); });
        var total = costs.reduce(function (s, c) { return s + Number(c.amount); }, 0);
        var byCategory = {};
        Store.COST_CATEGORIES.forEach(function (cat) { byCategory[cat] = 0; });
        costs.forEach(function (c) { byCategory[c.category] = (byCategory[c.category] || 0) + Number(c.amount); });

        var colors = ['cyan', 'purple', 'green', 'orange', 'blue', 'red'];
        var bars = Object.entries(byCategory).filter(function (e) { return e[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });

        var chartHtml = bars.length === 0 ? '<div class="empty-msg">이번 달 비용 내역이 없습니다.</div>' :
            '<div class="chart-bar-container">' +
            bars.map(function (entry, i) {
                var cat = entry[0], amt = entry[1];
                var pct = total ? Math.round(amt / total * 100) : 0;
                return '<div class="chart-bar-item">' +
                    '<div class="chart-bar-label">' + cat + '</div>' +
                    '<div class="chart-bar-track"><div class="chart-bar-fill ' + colors[i % colors.length] + '" style="width:' + pct + '%">' + pct + '%</div></div>' +
                    '<div class="chart-bar-value">' + Store.formatCurrency(amt) + '</div>' +
                    '</div>';
            }).join('') +
            '</div>';

        // Summary table
        var tableRows = costs.slice(0, 20).map(function (c) {
            return '<tr><td>' + c.date + '</td><td><span class="badge badge-blue">' + c.category + '</span></td>' +
                '<td>' + c.name + '</td>' +
                '<td class="amount">' + Store.formatCurrency(c.amount) + '</td>' +
                '<td>' + (c.memo || '-') + '</td></tr>';
        }).join('');

        return '<div class="report-section">' +
            '<div class="grid-2">' +
            '<div class="card"><div class="card-header"><div class="card-title">카테고리별 비용 현황</div></div>' +
            chartHtml + '</div>' +
            '<div class="card"><div class="card-header"><div class="card-title">월간 비용 요약</div></div>' +
            '<div style="margin-bottom:16px">' +
            '<div class="report-kpi-row">' +
            '<span class="report-kpi-label">총 지출</span>' +
            '<span class="report-kpi-value" style="color:#4f46e5">' + Store.formatCurrency(total) + '</span>' +
            '</div>' +
            '<div class="report-kpi-row">' +
            '<span class="report-kpi-label">비용 건수</span>' +
            '<span class="report-kpi-value">' + costs.length + '건</span>' +
            '</div>' +
            '</div>' +
            bars.map(function (e) {
                return '<div class="report-kpi-row"><span class="report-kpi-label">' + e[0] + '</span>' +
                    '<span>' + Store.formatCurrency(e[1]) + '</span></div>';
            }).join('') +
            '</div>' +
            '</div>' +
            '<div class="card" style="grid-column:1/-1"><div class="card-header"><div class="card-title">비용 상세 내역' + (costs.length > 20 ? ' (최근 20건)' : '') + '</div></div>' +
            '<div class="table-container"><table><thead><tr><th>날짜</th><th>구분</th><th>내용</th><th>금액</th><th>메모</th></tr></thead>' +
            '<tbody>' + (tableRows || '<tr><td colspan="5" class="empty-cell">내역 없음</td></tr>') + '</tbody>' +
            '<tfoot><tr><td colspan="3" style="text-align:right;font-weight:700;padding:12px 16px">합계</td>' +
            '<td class="amount" style="font-weight:700;padding:12px 16px">' + Store.formatCurrency(total) + '</td><td></td></tr></tfoot>' +
            '</table></div></div>' +
            '</div>';
    },

    _renderPayrollReport: function (year, month) {
        var personnel = Store.getPersonnel().filter(function (p) { return p.status === '활성'; });
        var monthlyGongsu = Store.getMonthlyGongsu(year, month);
        var totalRows = [];
        var totalGrossPay = 0, totalNetPay = 0, totalDeduction = 0;

        personnel.forEach(function (p) {
            var gs = monthlyGongsu[p.id] || { total: 0 };
            if (!gs.total) return;
            var grossPay = Math.round(Number(p.dailyWage) * gs.total);
            var ins = Store.calcInsurance(grossPay);
            totalGrossPay += grossPay;
            totalNetPay += ins.netPay;
            totalDeduction += ins.totalDeduction;
            totalRows.push({ p: p, gongsu: gs.total, ins: ins });
        });

        var tableRows = totalRows.map(function (row) {
            return '<tr>' +
                '<td>' + row.p.jobType + '</td>' +
                '<td class="pr-name">' + row.p.name + '</td>' +
                '<td class="pr-num">' + Store.formatCurrency(row.p.dailyWage) + '</td>' +
                '<td>' + row.gongsu + '</td>' +
                '<td class="pr-gross pr-num">' + Store.formatCurrency(row.ins.grossPay) + '</td>' +
                '<td class="pr-ded pr-num">' + Store.formatCurrency(row.ins.pension) + '</td>' +
                '<td class="pr-ded pr-num">' + Store.formatCurrency(row.ins.health) + '</td>' +
                '<td class="pr-ded pr-num">' + Store.formatCurrency(row.ins.longCare) + '</td>' +
                '<td class="pr-ded pr-num">' + Store.formatCurrency(row.ins.employment) + '</td>' +
                '<td class="pr-ded pr-num">' + Store.formatCurrency(row.ins.incomeTax + row.ins.residentTax) + '</td>' +
                '<td class="pr-total-ded pr-num">' + Store.formatCurrency(row.ins.totalDeduction) + '</td>' +
                '<td class="pr-net pr-num">' + Store.formatCurrency(row.ins.netPay) + '</td>' +
                '</tr>';
        }).join('');

        return '<div class="report-section">' +
            '<div class="stat-cards" style="margin-bottom:20px">' +
            '<div class="stat-card"><div class="stat-icon blue">👥</div><div class="stat-info"><div class="stat-label">지급 인원</div><div class="stat-value">' + totalRows.length + '명</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">💴</div><div class="stat-info"><div class="stat-label">지급 총액(세전)</div><div class="stat-value">' + Store.formatCurrency(totalGrossPay) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon red">📉</div><div class="stat-info"><div class="stat-label">총 공제액</div><div class="stat-value">' + Store.formatCurrency(totalDeduction) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">💵</div><div class="stat-info"><div class="stat-label">실수령 합계</div><div class="stat-value">' + Store.formatCurrency(totalNetPay) + '</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card-header"><div class="card-title">' + year + '년 ' + month + '월 노무비 대장</div></div>' +
            (totalRows.length === 0 ?
                '<div class="empty-state"><div class="empty-icon">👷</div><p>이번 달 공수 데이터가 없습니다.</p></div>' :
                '<div class="payroll-table-wrap"><table class="payroll-table">' +
                '<thead><tr class="payroll-hdr">' +
                '<th>직종</th><th class="pr-name">성명</th><th>일당</th><th>공수</th>' +
                '<th class="pr-gross">지급총액</th>' +
                '<th class="pr-ins-header">국민연금</th><th class="pr-ins-header">건강보험</th>' +
                '<th class="pr-ins-header">장기요양</th><th class="pr-ins-header">고용보험</th>' +
                '<th class="pr-ins-header">소득세+주민세</th><th class="pr-ins-header">공제합계</th>' +
                '<th class="pr-net">실수령액</th>' +
                '</tr></thead>' +
                '<tbody>' + tableRows + '</tbody>' +
                '<tfoot><tr class="payroll-footer">' +
                '<td colspan="4" style="text-align:right;font-weight:700">합계</td>' +
                '<td class="pr-num">' + Store.formatCurrency(totalGrossPay) + '</td>' +
                '<td colspan="5"></td>' +
                '<td class="pr-num">' + Store.formatCurrency(totalDeduction) + '</td>' +
                '<td class="pr-net pr-num">' + Store.formatCurrency(totalNetPay) + '</td>' +
                '</tr></tfoot>' +
                '</table></div>'
            ) +
            '<div class="payroll-info">※ 2026년 적용 요율: 국민연금 4.75%, 건강보험 3.595%, 장기요양 12.95%(건강보험료 기준), 고용보험 0.9%</div>' +
            '</div>' +
            '</div>';
    },

    _renderMaterialReport: function () {
        var materials = Store.getMaterials();
        var stats = Store.getMaterialStats();
        var low = materials.filter(function (m) { return Number(m.stock) <= Number(m.minStock || 10); });
        var normal = materials.filter(function (m) { return Number(m.stock) > Number(m.minStock || 10); });

        var rows = materials.map(function (m) {
            var pct = m.minStock ? Math.min(100, Math.round(Number(m.stock) / (Number(m.minStock) * 3) * 100)) : 50;
            var status = Number(m.stock) === 0 ? 'danger' : Number(m.stock) <= Number(m.minStock || 10) ? 'warning' : 'ok';
            var statusLabel = { danger: '재고없음', warning: '부족', ok: '정상' }[status];
            var statusClass = { danger: 'badge-red', warning: 'badge-orange', ok: 'badge-green' }[status];
            return '<tr>' +
                '<td>' + m.category + '</td>' +
                '<td style="font-weight:600">' + m.name + '</td>' +
                '<td>' + m.spec + '</td>' +
                '<td style="font-weight:700">' + m.stock + ' ' + m.unit + '</td>' +
                '<td>' + (m.minStock || 10) + ' ' + m.unit + '</td>' +
                '<td class="amount">' + Store.formatCurrency(Number(m.stock) * Number(m.unitPrice || 0)) + '</td>' +
                '<td><span class="badge ' + statusClass + '">' + statusLabel + '</span></td>' +
                '</tr>';
        }).join('');

        return '<div class="report-section">' +
            '<div class="stat-cards" style="margin-bottom:20px">' +
            '<div class="stat-card"><div class="stat-icon blue">📦</div><div class="stat-info"><div class="stat-label">총 자재 종류</div><div class="stat-value">' + stats.totalItems + '종</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">💰</div><div class="stat-info"><div class="stat-label">총 재고 금액</div><div class="stat-value">' + Store.formatCurrency(stats.totalValue) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">⚠️</div><div class="stat-info"><div class="stat-label">재고 부족 자재</div><div class="stat-value">' + low.length + '종</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-label">정상 재고 자재</div><div class="stat-value">' + normal.length + '종</div></div></div>' +
            '</div>' +
            '<div class="card"><div class="card-header"><div class="card-title">자재 재고 현황</div></div>' +
            '<div class="table-container"><table>' +
            '<thead><tr><th>카테고리</th><th>자재명</th><th>규격</th><th>현재 재고</th><th>최소 재고</th><th>재고 금액</th><th>상태</th></tr></thead>' +
            '<tbody>' + (rows || '<tr><td colspan="7" class="empty-cell">자재 없음</td></tr>') + '</tbody>' +
            '</table></div></div>' +
            '</div>';
    },

    _renderSiteReport: function () {
        var sites = Store.getSites();
        var stats = Store.getSiteStats();
        var costs = Store.getCosts();
        var allLogs = Store.getDailyLogs();

        var rows = sites.map(function (site) {
            var siteCosts = costs.filter(function (c) { return c.siteId === site.id; });
            var totalCost = siteCosts.reduce(function (s, c) { return s + Number(c.amount); }, 0);
            var siteLogs = allLogs.filter(function (l) { return l.siteId === site.id; });
            var statusClass = { '진행중': 'badge-green', '완료': 'badge-blue', '일시중지': 'badge-orange' }[site.status] || 'badge-blue';
            var daysLeft = '';
            if (site.endDate && site.status === '진행중') {
                var diff = Math.ceil((new Date(site.endDate) - new Date()) / 86400000);
                daysLeft = diff > 0 ? 'D-' + diff : '<span class="badge badge-red">기간초과</span>';
            }
            return '<tr>' +
                '<td style="font-weight:600">' + site.name + (site.code ? '<br><small>' + site.code + '</small>' : '') + '</td>' +
                '<td>' + (site.type || '-') + '</td>' +
                '<td><span class="badge ' + statusClass + '">' + site.status + '</span></td>' +
                '<td>' + (site.startDate || '-') + '</td>' +
                '<td>' + (site.endDate || '-') + '</td>' +
                '<td>' + daysLeft + '</td>' +
                '<td>' + (site.manager || '-') + '</td>' +
                '<td class="amount">' + (site.contractAmount ? Store.formatCurrency(site.contractAmount) : '-') + '</td>' +
                '<td>' + siteLogs.length + '건</td>' +
                '</tr>';
        }).join('');

        return '<div class="report-section">' +
            '<div class="stat-cards" style="margin-bottom:20px">' +
            '<div class="stat-card"><div class="stat-icon blue">🏗️</div><div class="stat-info"><div class="stat-label">전체 현장</div><div class="stat-value">' + stats.total + '개</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">🔨</div><div class="stat-info"><div class="stat-label">진행중</div><div class="stat-value">' + stats.active + '개</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple">✅</div><div class="stat-info"><div class="stat-label">완료</div><div class="stat-value">' + stats.completed + '개</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">⏸️</div><div class="stat-info"><div class="stat-label">일시중지</div><div class="stat-value">' + stats.paused + '개</div></div></div>' +
            '</div>' +
            '<div class="card"><div class="card-header"><div class="card-title">현장별 현황</div></div>' +
            '<div class="table-container"><table>' +
            '<thead><tr><th>현장명</th><th>유형</th><th>상태</th><th>착공일</th><th>준공(예정)</th><th>잔여기간</th><th>현장소장</th><th>계약금액</th><th>일지</th></tr></thead>' +
            '<tbody>' + (rows || '<tr><td colspan="9" class="empty-cell">등록된 현장 없음</td></tr>') + '</tbody>' +
            '</table></div></div>' +
            '</div>';
    },

    printReport: function () {
        window.print();
    }
};
