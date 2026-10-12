/* =======================================
   BuilderOffice - 비용 관리

   현장 실무에서 비용은 두 가지 상태가 따로 움직인다.
     · 승인 축 : 대기 → 승인 / 반려        (결재가 났는가)
     · 지급 축 : 미지급 → 홀딩 / 지급완료   (실제로 돈이 나갔는가)

   "결재는 났는데 이번 달 자금이 안 되는" 건이 홀딩이다.
   두 축을 한 값으로 합치면 이 상황을 표현할 수 없어 따로 둔다.

   탭: 비용 내역 · 이달 결산 · 분기 결산 · 연간 결산
   ======================================= */

var Costs = {
    activeTab: 'list',
    currentFilter: 'all',
    currentDateFilter: '',
    siteFilter: 'all',
    statusFilter: 'all',      // all | pending | topay | held | paid

    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),

    TABS: [
        { id: 'list', label: '📋 비용 내역' },
        { id: 'month', label: '📅 이달 결산' },
        { id: 'quarter', label: '📊 분기 결산' },
        { id: 'year', label: '📆 연간 결산' }
    ],

    // ===== 공통 =====

    render: function () {
        if (MobileUI.isMobile()) return this.renderMobile();

        var stats = Store.getCostStats();
        var navs = '', panes = '';

        for (var i = 0; i < this.TABS.length; i++) {
            var t = this.TABS[i];
            var on = (this.activeTab === t.id);
            navs += '<button class="tab-btn ' + (on ? 'active' : '') + '" ' +
                'onclick="Costs.switchTab(\'' + t.id + '\')">' + t.label + '</button>';

            var body = '';
            if (t.id === 'list') body = this._renderList();
            else if (t.id === 'month') body = this._renderSettlement('month');
            else if (t.id === 'quarter') body = this._renderSettlement('quarter');
            else if (t.id === 'year') body = this._renderSettlement('year');
            panes += '<div class="tab-content ' + (on ? 'active' : '') + '">' + body + '</div>';
        }

        return this._renderStatCards(stats) +
            '<div class="card">' +
            '<div class="tab-nav">' + navs + '</div>' +
            panes +
            '</div>';
    },

    switchTab: function (t) {
        this.activeTab = t;
        App.refreshPage();
    },

    /** 상단 요약 — 승인/지급 두 축이 한눈에 보이게 한다 */
    _renderStatCards: function (s) {
        function card(icon, color, label, value, sub, onclick) {
            return '<div class="stat-card' + (onclick ? ' stat-clickable' : '') + '"' +
                (onclick ? ' onclick="' + onclick + '"' : '') + '>' +
                '<div class="stat-icon ' + color + '">' + icon + '</div>' +
                '<div class="stat-info"><div class="stat-label">' + label + '</div>' +
                '<div class="stat-value">' + value + '</div>' +
                (sub ? '<div class="stat-sub">' + sub + '</div>' : '') +
                '</div></div>';
        }
        return '<div class="stat-cards stat-cards-5">' +
            card('💰', 'blue', '이번 달 지출', Store.formatCurrency(s.monthTotal), s.count + '건 등록') +
            card('⏳', 'orange', '승인 대기', Store.formatCurrency(s.pendingApproval),
                s.pendingApprovalCount + '건', "Costs.filterStatus('pending')") +
            card('📤', 'purple', '지급 예정', Store.formatCurrency(s.toPay),
                s.toPayCount + '건 · 승인 완료', "Costs.filterStatus('topay')") +
            card('⏸️', 'red', '지급 홀딩', Store.formatCurrency(s.held),
                s.heldCount + '건 · 자금 보류', "Costs.filterStatus('held')") +
            card('✅', 'green', '지급 완료', Store.formatCurrency(s.paid),
                s.paidCount + '건', "Costs.filterStatus('paid')") +
            '</div>';
    },

    filterStatus: function (st) {
        this.activeTab = 'list';
        this.statusFilter = (this.statusFilter === st) ? 'all' : st;
        App.refreshPage();
    },

    // ===== 탭 1: 비용 내역 =====

    _renderList: function () {
        var costs = this._getFilteredCosts();
        var esc = Store.escapeHtml;
        var total = costs.reduce(function (s, c) { return s + Number(c.amount || 0); }, 0);

        var catOptions = '';
        for (var i = 0; i < Store.COST_CATEGORIES.length; i++) {
            var sel = this.currentFilter === Store.COST_CATEGORIES[i] ? ' selected' : '';
            catOptions += '<option value="' + esc(Store.COST_CATEGORIES[i]) + '"' + sel + '>' + esc(Store.COST_CATEGORIES[i]) + '</option>';
        }
        var siteOptions = '';
        var sites = Store.getSites();
        for (var s2 = 0; s2 < sites.length; s2++) {
            var ss = this.siteFilter === sites[s2].name ? ' selected' : '';
            siteOptions += '<option value="' + esc(sites[s2].name) + '"' + ss + '>' + esc(sites[s2].name) + '</option>';
        }

        var rows = '';
        for (var j = 0; j < costs.length; j++) {
            var c = Store.normalizeCost(costs[j]);
            rows += '<tr>' +
                '<td>' + esc(c.date) + '</td>' +
                '<td>' + (c.siteName ? esc(c.siteName) : '<span style="color:var(--text-muted);">미지정</span>') + '</td>' +
                '<td><span class="badge badge-blue">' + esc(c.category) + '</span></td>' +
                '<td style="color:var(--text-primary);font-weight:500;">' + esc(c.name) +
                (c.vendor ? '<br><span style="font-size:11px;color:var(--text-muted);">' + esc(c.vendor) + '</span>' : '') + '</td>' +
                '<td class="amount">' + Store.formatCurrency(c.amount) + '</td>' +
                '<td>' + this._approvalBadge(c) + '</td>' +
                '<td>' + this._paymentBadge(c) + '</td>' +
                '<td><div class="action-btns">' +
                '<button class="action-btn edit" onclick="Costs.showStatusModal(\'' + c.id + '\')" title="상태 변경">🔄</button>' +
                '<button class="action-btn edit" onclick="Costs.showEditModal(\'' + c.id + '\')" title="수정">✏️</button>' +
                '<button class="action-btn delete" onclick="Costs.confirmDelete(\'' + c.id + '\')" title="삭제">🗑️</button>' +
                '</div></td></tr>';
        }
        if (!rows) {
            rows = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">💰</div>' +
                '<p>' + (this.statusFilter === 'all' ? '등록된 비용이 없습니다' : '해당 상태의 비용이 없습니다') + '</p>' +
                '<button class="btn btn-primary" onclick="Costs.showAddModal()">첫 비용 추가하기</button></div></td></tr>';
        }

        var chips = '';
        var stFilters = [
            { id: 'all', label: '전체' }, { id: 'pending', label: '⏳ 승인 대기' },
            { id: 'topay', label: '📤 지급 예정' }, { id: 'held', label: '⏸️ 홀딩' },
            { id: 'paid', label: '✅ 지급 완료' }
        ];
        for (var f = 0; f < stFilters.length; f++) {
            chips += '<button class="wi-chip ' + (this.statusFilter === stFilters[f].id ? 'active' : '') + '" ' +
                'onclick="Costs.setStatusFilter(\'' + stFilters[f].id + '\')">' + stFilters[f].label + '</button>';
        }

        return '<div class="wi-chips" style="margin-bottom:14px;">' + chips + '</div>' +
            '<div class="toolbar">' +
            '<div class="toolbar-left" style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<select class="filter-select" onchange="Costs.setSiteFilter(this.value)"><option value="all">전체 현장</option>' + siteOptions + '</select>' +
            '<select class="filter-select" onchange="Costs.setFilter(this.value)"><option value="all">전체 카테고리</option>' + catOptions + '</select>' +
            '<input type="date" class="filter-input" value="' + this.currentDateFilter + '" onchange="Costs.setDateFilter(this.value)">' +
            '</div>' +
            '<button class="btn btn-primary" onclick="Costs.showAddModal()">➕ 비용 추가</button>' +
            '</div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>날짜</th><th>현장</th><th>카테고리</th><th>항목명</th><th>금액</th><th>승인</th><th>지급</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>' +
            (costs.length ? '<div class="summary-row"><span>합계:</span> ' + Store.formatCurrency(total) + ' (' + costs.length + '건)</div>' : '') +
            '</div>';
    },

    _approvalBadge: function (c) {
        var map = { '대기': 'badge-orange', '승인': 'badge-green', '반려': 'badge-red' };
        return '<span class="badge ' + (map[c.approvalStatus] || 'badge-orange') + '">' + c.approvalStatus + '</span>';
    },

    _paymentBadge: function (c) {
        if (c.approvalStatus !== '승인') {
            return '<span style="color:var(--text-muted);font-size:12px;">-</span>';
        }
        var map = { '미지급': 'badge-blue', '홀딩': 'badge-red', '지급완료': 'badge-green' };
        var extra = (c.paymentStatus === '홀딩' && c.holdReason)
            ? '<br><span style="font-size:11px;color:var(--text-muted);">' + Store.escapeHtml(c.holdReason) + '</span>' : '';
        return '<span class="badge ' + (map[c.paymentStatus] || 'badge-blue') + '">' + c.paymentStatus + '</span>' + extra;
    },

    // ===== 탭 2~4: 결산 =====

    _renderSettlement: function (period) {
        var unit = (period === 'month') ? this.month : (period === 'quarter') ? this.quarter : 0;
        var st = Store.getCostSettlement(period, this.year, unit);
        var esc = Store.escapeHtml;

        var label = this.year + '년 ';
        if (period === 'month') label += this.month + '월';
        else if (period === 'quarter') label += this.quarter + '분기';
        else label += '연간';

        var nav = '<div class="gongsu-nav">' +
            '<button class="btn btn-secondary btn-sm" onclick="Costs.movePeriod(\'' + period + '\',-1)">◀</button>' +
            '<span class="gongsu-month-label">' + label + ' 결산</span>' +
            '<button class="btn btn-secondary btn-sm" onclick="Costs.movePeriod(\'' + period + '\',1)">▶</button>' +
            '</div>';

        if (!st.count) {
            return nav + '<div class="empty-state" style="padding:40px;"><div class="empty-icon">📊</div>' +
                '<p>' + label + '에 등록된 비용이 없습니다.</p></div>';
        }

        // 상태 요약
        function box(label2, amount, color, note) {
            return '<div class="settle-box">' +
                '<div class="settle-label">' + label2 + '</div>' +
                '<div class="settle-value" style="color:' + color + ';">' + Store.formatCurrency(amount) + '</div>' +
                (note ? '<div class="settle-note">' + note + '</div>' : '') + '</div>';
        }
        var pctPaid = st.total ? Math.round((st.paid / st.total) * 100) : 0;

        var summary = '<div class="settle-grid">' +
            box('총 지출', st.total, 'var(--text-primary)', st.count + '건') +
            box('지급 완료', st.paid, 'var(--accent-success)', pctPaid + '%') +
            box('지급 예정', st.toPay, 'var(--accent-info)', '승인 완료') +
            box('홀딩', st.held, 'var(--accent-danger)', '자금 보류') +
            box('승인 대기', st.pending, 'var(--accent-warning)', '결재 전') +
            '</div>';

        // 현장별
        var siteRows = '';
        var siteKeys = Object.keys(st.bySite).sort(function (a, b) { return st.bySite[b] - st.bySite[a]; });
        for (var i = 0; i < siteKeys.length; i++) {
            var k = siteKeys[i];
            var pct = st.total ? Math.round((st.bySite[k] / st.total) * 100) : 0;
            siteRows += '<tr><td style="font-weight:500;">' + esc(k) + '</td>' +
                '<td class="amount">' + Store.formatCurrency(st.bySite[k]) + '</td>' +
                '<td style="width:180px;"><div class="settle-bar"><i style="width:' + pct + '%"></i></div></td>' +
                '<td style="text-align:right;font-variant-numeric:tabular-nums;">' + pct + '%</td></tr>';
        }

        // 카테고리별
        var catRows = '';
        var catKeys = Object.keys(st.byCategory).sort(function (a, b) { return st.byCategory[b] - st.byCategory[a]; });
        for (var j = 0; j < catKeys.length; j++) {
            var ck = catKeys[j];
            var cpct = st.total ? Math.round((st.byCategory[ck] / st.total) * 100) : 0;
            catRows += '<tr><td><span class="badge badge-blue">' + esc(ck) + '</span></td>' +
                '<td class="amount">' + Store.formatCurrency(st.byCategory[ck]) + '</td>' +
                '<td style="width:180px;"><div class="settle-bar"><i style="width:' + cpct + '%"></i></div></td>' +
                '<td style="text-align:right;font-variant-numeric:tabular-nums;">' + cpct + '%</td></tr>';
        }

        // 월별 추이 (분기·연간에서만)
        var trend = '';
        if (period !== 'month') {
            var months = Object.keys(st.byMonth).map(Number).sort(function (a, b) { return a - b; });
            var max = 0;
            for (var m1 = 0; m1 < months.length; m1++) max = Math.max(max, st.byMonth[months[m1]]);
            var bars = '';
            for (var m2 = 0; m2 < months.length; m2++) {
                var mv = st.byMonth[months[m2]];
                var h = max ? Math.round((mv / max) * 100) : 0;
                bars += '<div class="trend-col">' +
                    '<div class="trend-bar-wrap"><div class="trend-bar" style="height:' + h + '%" ' +
                    'title="' + Store.formatCurrency(mv) + '"></div></div>' +
                    '<div class="trend-label">' + months[m2] + '월</div>' +
                    '<div class="trend-amt">' + Math.round(mv / 10000).toLocaleString() + '만</div>' +
                    '</div>';
            }
            trend = '<div class="settle-section"><h4>📈 월별 추이</h4>' +
                '<div class="trend-chart">' + bars + '</div></div>';
        }

        return nav + summary +
            '<div class="settle-section"><h4>🏗️ 현장별 지출</h4>' +
            '<div class="table-container"><table><thead><tr><th>현장</th><th>금액</th><th>비중</th><th></th></tr></thead>' +
            '<tbody>' + siteRows + '</tbody></table></div></div>' +
            '<div class="settle-section"><h4>📦 항목별 지출</h4>' +
            '<div class="table-container"><table><thead><tr><th>카테고리</th><th>금액</th><th>비중</th><th></th></tr></thead>' +
            '<tbody>' + catRows + '</tbody></table></div></div>' +
            trend +
            '<div class="payroll-info"><p>📌 <strong>홀딩</strong>은 결재는 났지만 자금 사정으로 이번 기간에 못 나간 금액입니다. ' +
            '다음 기간으로 넘어가므로 자금 계획에 반드시 반영하세요.</p></div>';
    },

    movePeriod: function (period, delta) {
        if (period === 'month') {
            this.month += delta;
            if (this.month < 1) { this.month = 12; this.year--; }
            if (this.month > 12) { this.month = 1; this.year++; }
        } else if (period === 'quarter') {
            this.quarter += delta;
            if (this.quarter < 1) { this.quarter = 4; this.year--; }
            if (this.quarter > 4) { this.quarter = 1; this.year++; }
        } else {
            this.year += delta;
        }
        App.refreshPage();
    },

    // ===== 필터 =====

    _getFilteredCosts: function () {
        var costs = Store.getCosts().map(function (c) { return Store.normalizeCost(c); });
        var self = this;

        if (this.currentFilter !== 'all') {
            costs = costs.filter(function (c) { return c.category === self.currentFilter; });
        }
        if (this.siteFilter !== 'all') {
            costs = costs.filter(function (c) { return (c.siteName || '') === self.siteFilter; });
        }
        if (this.currentDateFilter) {
            costs = costs.filter(function (c) { return c.date === self.currentDateFilter; });
        }
        if (this.statusFilter !== 'all') {
            costs = costs.filter(function (c) {
                if (self.statusFilter === 'pending') return c.approvalStatus === '대기';
                if (self.statusFilter === 'topay') return c.approvalStatus === '승인' && c.paymentStatus === '미지급';
                if (self.statusFilter === 'held') return c.paymentStatus === '홀딩';
                if (self.statusFilter === 'paid') return c.paymentStatus === '지급완료';
                return true;
            });
        }
        return costs;
    },

    setFilter: function (v) { this.currentFilter = v; App.refreshPage(); },
    setSiteFilter: function (v) { this.siteFilter = v; App.refreshPage(); },
    setDateFilter: function (v) { this.currentDateFilter = v; App.refreshPage(); },
    setStatusFilter: function (v) { this.statusFilter = v; App.refreshPage(); },

    // ===== 입력 =====

    _formFields: function (cost) {
        var esc = Store.escapeHtml;
        cost = cost || {};

        var catOptions = '';
        for (var i = 0; i < Store.COST_CATEGORIES.length; i++) {
            var sel = Store.COST_CATEGORIES[i] === cost.category ? ' selected' : '';
            catOptions += '<option value="' + esc(Store.COST_CATEGORIES[i]) + '"' + sel + '>' + esc(Store.COST_CATEGORIES[i]) + '</option>';
        }
        var siteOptions = '<option value="">현장 선택 (본사 비용은 비워두세요)</option>';
        var sites = Store.getSites();
        for (var s = 0; s < sites.length; s++) {
            var ssel = sites[s].name === cost.siteName ? ' selected' : '';
            siteOptions += '<option value="' + esc(sites[s].name) + '"' + ssel + '>' + esc(sites[s].name) + '</option>';
        }

        return '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="costDate" value="' + esc(cost.date || Store.getToday()) + '"></div>' +
            '<div class="form-group"><label>카테고리</label><select class="form-control" id="costCategory">' + catOptions + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="costSite">' + siteOptions + '</select></div>' +
            '<div class="form-group"><label>항목명</label><input type="text" class="form-control" id="costName" value="' + esc(cost.name || '') + '" placeholder="예: 철근 D16 구매"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>금액 (원)</label><input type="number" class="form-control" id="costAmount" value="' + (cost.amount || '') + '" placeholder="0"></div>' +
            '<div class="form-group"><label>거래처</label><input type="text" class="form-control" id="costVendor" value="' + esc(cost.vendor || '') + '" placeholder="예: (주)한국철강"></div>' +
            '</div>' +
            '<div class="form-group"><label>지급 예정일 <span class="wi-hint">(선택)</span></label>' +
            '<input type="date" class="form-control" id="costDueDate" value="' + esc(cost.dueDate || '') + '"></div>' +
            '<div class="form-group"><label>메모</label><input type="text" class="form-control" id="costMemo" value="' + esc(cost.memo || '') + '" placeholder="상세 내용"></div>';
    },

    showAddModal: function () {
        App.showModal(
            '<div class="modal-header"><h3>💰 비용 추가</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' + this._formFields(null) +
            '<div class="payroll-info"><p>📌 새 비용은 <strong>승인 대기</strong> 상태로 등록됩니다. ' +
            '결재 후 지급 상태를 관리하세요.</p></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Costs.saveCost()">저장</button></div>'
        );
    },

    showEditModal: function (id) {
        var cost = Store.getCosts().find(function (c) { return c.id === id; });
        if (!cost) return;
        App.showModal(
            '<div class="modal-header"><h3>✏️ 비용 수정</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' + this._formFields(cost) + '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Costs.updateCost(\'' + id + '\')">수정</button></div>'
        );
    },

    _collect: function () {
        function v(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
        return {
            date: v('costDate'),
            category: v('costCategory'),
            siteName: v('costSite'),
            name: v('costName'),
            amount: Number(v('costAmount')) || 0,
            vendor: v('costVendor'),
            dueDate: v('costDueDate'),
            memo: v('costMemo')
        };
    },

    saveCost: function () {
        var d = this._collect();
        if (!d.date || !d.name || !d.amount) {
            App.showToast('날짜, 항목명, 금액을 입력해주세요.', 'error');
            return;
        }
        d.approvalStatus = '대기';
        d.paymentStatus = '미지급';
        Store.addCost(d);
        App.closeModal();
        App.refreshPage();
        App.showToast('비용이 등록되었습니다. (승인 대기)', 'success');
    },

    updateCost: function (id) {
        var d = this._collect();
        if (!d.date || !d.name || !d.amount) {
            App.showToast('날짜, 항목명, 금액을 입력해주세요.', 'error');
            return;
        }
        Store.updateCost(id, d);
        App.closeModal();
        App.refreshPage();
        App.showToast('비용이 수정되었습니다.', 'success');
    },

    // ===== 상태 변경 (승인 / 지급) =====

    showStatusModal: function (id) {
        var c = Store.getCosts().find(function (x) { return x.id === id; });
        if (!c) return;
        c = Store.normalizeCost(c);
        var esc = Store.escapeHtml;

        function radios(name, opts, cur) {
            var h = '';
            for (var i = 0; i < opts.length; i++) {
                h += '<label class="wi-check-item"><input type="radio" name="' + name + '" value="' + opts[i] + '"' +
                    (opts[i] === cur ? ' checked' : '') + '> ' + opts[i] + '</label>';
            }
            return h;
        }

        App.showModal(
            '<div class="modal-header"><h3>🔄 상태 변경</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="payroll-info" style="margin-bottom:16px;">' +
            '<p><strong>' + esc(c.name) + '</strong> · ' + Store.formatCurrency(c.amount) + '</p>' +
            '<p style="color:var(--text-muted);">' + esc(c.date) + (c.siteName ? ' · ' + esc(c.siteName) : '') + '</p></div>' +

            '<div class="form-group"><label>① 승인 상태 <span class="wi-hint">(결재가 났는가)</span></label>' +
            '<div class="wi-safety-checks">' + radios('appr', Store.APPROVAL_STATUS, c.approvalStatus) + '</div></div>' +

            '<div class="form-group"><label>② 지급 상태 <span class="wi-hint">(실제로 돈이 나갔는가)</span></label>' +
            '<div class="wi-safety-checks">' + radios('pay', Store.PAYMENT_STATUS, c.paymentStatus) + '</div></div>' +

            '<div class="form-group"><label>홀딩 사유 <span class="wi-hint">(지급을 미루는 경우)</span></label>' +
            '<input type="text" class="form-control" id="costHoldReason" value="' + esc(c.holdReason || '') + '" ' +
            'placeholder="예: 자금 부족 — 다음 달 이월"></div>' +

            '<div class="payroll-info"><p>📌 승인이 <strong>대기·반려</strong>면 지급 상태는 적용되지 않습니다.</p></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Costs.saveStatus(\'' + id + '\')">저장</button></div>'
        );
    },

    saveStatus: function (id) {
        function radioVal(name) {
            var el = document.querySelector('input[name="' + name + '"]:checked');
            return el ? el.value : '';
        }
        var appr = radioVal('appr');
        var pay = radioVal('pay');
        var reason = (document.getElementById('costHoldReason') || {}).value || '';

        var upd = {
            approvalStatus: appr,
            paymentStatus: pay,
            holdReason: (pay === '홀딩') ? reason.trim() : ''
        };
        // 지급 완료로 바꾸면 그날 날짜를 기록해 둔다
        if (pay === '지급완료') upd.paidDate = Store.getToday();

        Store.updateCost(id, upd);
        App.closeModal();
        App.refreshPage();

        var msg = '승인: ' + appr + ' · 지급: ' + pay;
        App.showToast(msg, pay === '홀딩' ? 'info' : 'success');
    },

    confirmDelete: function (id) {
        if (confirm('이 비용 항목을 삭제하시겠습니까?')) {
            Store.deleteCost(id);
            App.refreshPage();
            App.showToast('비용이 삭제되었습니다.', 'info');
        }
    },

    // ===== 모바일 =====

    renderMobile: function () {
        var costs = this._getFilteredCosts();
        var stats = Store.getCostStats();
        var esc = Store.escapeHtml;

        var cards = '';
        for (var j = 0; j < costs.length; j++) {
            var c = costs[j];
            cards += '<div class="mob-card" onclick="Costs.showStatusModal(\'' + c.id + '\')">' +
                '<div class="mob-card-row">' +
                '<div><div class="mob-card-title">' + esc(c.name) + '</div>' +
                '<div class="mob-card-meta">' +
                '<span class="mob-card-sub">' + esc(c.date) + '</span>' +
                (c.siteName ? '<span class="mob-card-sub">🏗️ ' + esc(c.siteName) + '</span>' : '') +
                '</div>' +
                '<div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap;">' +
                this._approvalBadge(c) +
                (c.approvalStatus === '승인' ? this._paymentBadge(c) : '') +
                '</div></div>' +
                '<div class="mob-card-value">' + Store.formatCurrency(c.amount) + '</div>' +
                '</div></div>';
        }
        if (!cards) cards = MobileUI.emptyCard('💰', '등록된 비용이 없습니다', '➕ 첫 비용 추가', 'Costs.showAddModal()');

        return MobileUI.pageHeader('💰 비용 관리', '추가', 'Costs.showAddModal()') +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">💰</div><div class="stat-info"><div class="stat-label">이번 달</div><div class="stat-value">' + Store.formatCurrency(stats.monthTotal) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon red">⏸️</div><div class="stat-info"><div class="stat-label">홀딩</div><div class="stat-value">' + Store.formatCurrency(stats.held) + '</div></div></div>' +
            '</div>' +
            '<div class="wi-chips" style="margin-bottom:12px;">' +
            '<button class="wi-chip ' + (this.statusFilter === 'all' ? 'active' : '') + '" onclick="Costs.setStatusFilter(\'all\')">전체</button>' +
            '<button class="wi-chip ' + (this.statusFilter === 'pending' ? 'active' : '') + '" onclick="Costs.setStatusFilter(\'pending\')">⏳ 대기</button>' +
            '<button class="wi-chip ' + (this.statusFilter === 'topay' ? 'active' : '') + '" onclick="Costs.setStatusFilter(\'topay\')">📤 예정</button>' +
            '<button class="wi-chip ' + (this.statusFilter === 'held' ? 'active' : '') + '" onclick="Costs.setStatusFilter(\'held\')">⏸️ 홀딩</button>' +
            '</div>' +
            '<div class="mob-card-list">' + cards + '</div>';
    }
};
