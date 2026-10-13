/* =======================================
   BuilderOffice - 수주 흐름 (견적 · 계약 · 기성)

   회사 실제 업무 순서:
     견적서 제출 → 낙찰되면 계약 → 공사하며 회차별 기성청구 → 입금

   세 화면이 형태가 비슷해 한 파일에 두되, 메뉴는 각각 독립이다.
   (견적만 모아보기 / 기성만 모아보기가 실무에서 자주 필요하다)
   ======================================= */

/* ===== 공통 헬퍼 ===== */
var OrderUtil = {
    // 현장 선택 옵션
    siteOptions: function (selected, includeBlank) {
        var esc = Store.escapeHtml;
        var h = includeBlank ? '<option value="">현장 선택</option>' : '';
        var sites = Store.getSites();
        for (var i = 0; i < sites.length; i++) {
            var s = sites[i].name === selected ? ' selected' : '';
            h += '<option value="' + esc(sites[i].name) + '"' + s + '>' + esc(sites[i].name) + '</option>';
        }
        return h;
    },

    statusOptions: function (list, selected) {
        var h = '';
        for (var i = 0; i < list.length; i++) {
            h += '<option value="' + list[i] + '"' + (list[i] === selected ? ' selected' : '') + '>' + list[i] + '</option>';
        }
        return h;
    },

    badge: function (status) {
        var map = {
            '작성중': 'badge-orange', '제출': 'badge-blue', '낙찰': 'badge-green', '실주': 'badge-red',
            '진행중': 'badge-green', '완료': 'badge-blue', '해지': 'badge-red',
            '청구예정': 'badge-orange', '청구완료': 'badge-blue', '일부입금': 'badge-orange', '입금완료': 'badge-green'
        };
        return '<span class="badge ' + (map[status] || 'badge-blue') + '">' + status + '</span>';
    },

    // 현장이 없으면 먼저 등록하도록 안내
    needSite: function () {
        if (Store.getSites().length > 0) return '';
        return '<div class="empty-state" style="padding:40px 24px;">' +
            '<div class="empty-icon">🏗️</div>' +
            '<p><strong>현장을 먼저 등록해주세요.</strong></p>' +
            '<p style="font-size:13px;color:var(--text-muted);margin:8px 0 16px;">' +
            '견적·계약·기성은 모두 현장에 연결됩니다.</p>' +
            '<button class="btn btn-primary" onclick="App.navigate(\'sites\')">🏗️ 현장 등록하기</button></div>';
    },

    money: function (v) { return Store.formatCurrency(Number(v) || 0); }
};


/* =======================================
   ① 견적 관리
   ======================================= */
var Estimates = {
    filter: 'all',

    render: function () {
        var guide = OrderUtil.needSite();
        if (guide) return this._header(0, 0) + guide;

        var esc = Store.escapeHtml;
        var all = Store.getEstimates();
        var list = (this.filter === 'all') ? all : all.filter(function (e) { return e.status === Estimates.filter; });

        var total = all.filter(function (e) { return e.status === '낙찰'; })
            .reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);

        var rows = '';
        for (var i = 0; i < list.length; i++) {
            var e = list[i];
            rows += '<tr>' +
                '<td>' + esc(e.date || '-') + '</td>' +
                '<td>' + esc(e.siteName || '-') + '</td>' +
                '<td style="color:var(--text-primary);font-weight:500;">' + esc(e.title) + '</td>' +
                '<td>' + esc(e.client || '-') + '</td>' +
                '<td class="amount">' + OrderUtil.money(e.amount) + '</td>' +
                '<td>' + OrderUtil.badge(e.status) + '</td>' +
                '<td><div class="action-btns">' +
                (e.status === '낙찰' ? '<button class="action-btn edit" title="계약 만들기" onclick="Estimates.toContract(\'' + e.id + '\')">📄</button>' : '') +
                '<button class="action-btn edit" onclick="Estimates.showModal(\'' + e.id + '\')" title="수정">✏️</button>' +
                '<button class="action-btn delete" onclick="Estimates.remove(\'' + e.id + '\')" title="삭제">🗑️</button>' +
                '</div></td></tr>';
        }
        if (!rows) {
            rows = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📄</div>' +
                '<p>견적이 없습니다</p><button class="btn btn-primary" onclick="Estimates.showModal()">첫 견적 등록</button>' +
                '</div></td></tr>';
        }

        var chips = '<button class="wi-chip ' + (this.filter === 'all' ? 'active' : '') + '" onclick="Estimates.setFilter(\'all\')">전체</button>';
        for (var s = 0; s < Store.ESTIMATE_STATUS.length; s++) {
            var st = Store.ESTIMATE_STATUS[s];
            chips += '<button class="wi-chip ' + (this.filter === st ? 'active' : '') + '" onclick="Estimates.setFilter(\'' + st + '\')">' + st + '</button>';
        }

        return this._header(all.length, total) +
            '<div class="card">' +
            '<div class="wi-chips" style="margin-bottom:14px;">' + chips + '</div>' +
            '<div class="toolbar"><div class="toolbar-left"><span style="color:var(--text-muted);font-size:13px;">' +
            list.length + '건</span></div>' +
            '<button class="btn btn-primary" onclick="Estimates.showModal()">➕ 견적 등록</button></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>일자</th><th>현장</th><th>공사명</th><th>발주처</th><th>견적금액</th><th>상태</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    },

    _header: function (count, won) {
        var all = Store.getEstimates();
        var submitted = all.filter(function (e) { return e.status === '제출'; }).length;
        var wonCount = all.filter(function (e) { return e.status === '낙찰'; }).length;
        var rate = all.length ? Math.round((wonCount / all.length) * 100) : 0;

        return '<div class="page-header"><h1 class="page-title">📄 견적 관리</h1>' +
            '<p class="page-subtitle">견적 제출부터 낙찰까지 관리합니다</p></div>' +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">📄</div><div class="stat-info">' +
            '<div class="stat-label">전체 견적</div><div class="stat-value">' + count + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">📤</div><div class="stat-info">' +
            '<div class="stat-label">제출 대기</div><div class="stat-value">' + submitted + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">🏆</div><div class="stat-info">' +
            '<div class="stat-label">낙찰 금액</div><div class="stat-value">' + OrderUtil.money(won) + '</div>' +
            '<div class="stat-sub">낙찰률 ' + rate + '%</div></div></div>' +
            '</div>';
    },

    setFilter: function (f) { this.filter = f; App.refreshPage(); },

    showModal: function (id, preset) {
        var e = id ? Store.getEstimates().find(function (x) { return x.id === id; }) : null;
        var esc = Store.escapeHtml;
        e = e || preset || {};

        App.showModal(
            '<div class="modal-header"><h3>' + (id ? '✏️ 견적 수정' : '📄 견적 등록') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>견적일자</label><input type="date" class="form-control" id="esDate" value="' + esc(e.date || Store.getToday()) + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="esSite">' + OrderUtil.siteOptions(e.siteName, true) + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>공사명</label><input type="text" class="form-control" id="esTitle" value="' + esc(e.title || '') + '" placeholder="예: 기계설비공사 중 배관공사"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>발주처</label><input type="text" class="form-control" id="esClient" value="' + esc(e.client || '') + '" placeholder="예: (주)한국개발"></div>' +
            '<div class="form-group"><label>견적금액 (원)</label><input type="number" class="form-control" id="esAmount" value="' + (e.amount || '') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="esStatus">' +
            OrderUtil.statusOptions(Store.ESTIMATE_STATUS, e.status || '작성중') + '</select></div>' +
            '<div class="form-group"><label>메모</label><input type="text" class="form-control" id="esMemo" value="' + esc(e.memo || '') + '" placeholder="특기사항, 제외조건 등"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Estimates.save(' + (id ? "'" + id + "'" : '') + ')">저장</button></div>'
        );
    },

    save: function (id) {
        function v(x) { var el = document.getElementById(x); return el ? el.value.trim() : ''; }
        var d = {
            date: v('esDate'), siteName: v('esSite'), title: v('esTitle'),
            client: v('esClient'), amount: Number(v('esAmount')) || 0,
            status: v('esStatus'), memo: v('esMemo')
        };
        if (!d.title || !d.amount) { App.showToast('공사명과 견적금액을 입력해주세요.', 'error'); return; }

        if (id) Store.updateEstimate(id, d); else Store.addEstimate(d);
        App.closeModal(); App.refreshPage();
        App.showToast(id ? '견적이 수정되었습니다.' : '견적이 등록되었습니다.', 'success');
    },

    // 낙찰된 견적을 계약으로 넘긴다
    toContract: function (id) {
        var e = Store.getEstimates().find(function (x) { return x.id === id; });
        if (!e) return;
        Contracts.showModal(null, {
            siteName: e.siteName, title: e.title, client: e.client,
            amount: e.amount, estimateId: e.id
        });
    },

    remove: function (id) {
        if (!confirm('이 견적을 삭제하시겠습니까?')) return;
        Store.deleteEstimate(id); App.refreshPage();
        App.showToast('견적이 삭제되었습니다.', 'info');
    }
};


/* =======================================
   ② 계약 관리
   ======================================= */
var Contracts = {
    render: function () {
        var guide = OrderUtil.needSite();
        if (guide) return this._header() + guide;

        var esc = Store.escapeHtml;
        var list = Store.getContracts();
        var rows = '';

        for (var i = 0; i < list.length; i++) {
            var c = list[i];
            var f = Store.getSiteFinance(c.siteName);
            rows += '<tr>' +
                '<td>' + esc(c.contractDate || '-') + '</td>' +
                '<td>' + esc(c.siteName || '-') + '</td>' +
                '<td style="color:var(--text-primary);font-weight:500;">' + esc(c.title) + '</td>' +
                '<td>' + esc(c.client || '-') + '</td>' +
                '<td class="amount">' + OrderUtil.money(c.amount) + '</td>' +
                '<td><div class="settle-bar" style="width:90px;"><i style="width:' + Math.min(100, f.billRate) + '%"></i></div>' +
                '<span style="font-size:11px;color:var(--text-muted);">기성 ' + f.billRate + '%</span></td>' +
                '<td>' + OrderUtil.badge(c.status) + '</td>' +
                '<td><div class="action-btns">' +
                '<button class="action-btn edit" title="기성 청구" onclick="Billings.showModal(null,{contractId:\'' + c.id + '\'})">💵</button>' +
                '<button class="action-btn edit" onclick="Contracts.showModal(\'' + c.id + '\')" title="수정">✏️</button>' +
                '<button class="action-btn delete" onclick="Contracts.remove(\'' + c.id + '\')" title="삭제">🗑️</button>' +
                '</div></td></tr>';
        }
        if (!rows) {
            rows = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📑</div>' +
                '<p>계약이 없습니다</p><button class="btn btn-primary" onclick="Contracts.showModal()">첫 계약 등록</button>' +
                '</div></td></tr>';
        }

        return this._header() +
            '<div class="card">' +
            '<div class="toolbar"><div class="toolbar-left"><span style="color:var(--text-muted);font-size:13px;">' +
            list.length + '건</span></div>' +
            '<button class="btn btn-primary" onclick="Contracts.showModal()">➕ 계약 등록</button></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>계약일</th><th>현장</th><th>공사명</th><th>발주처</th><th>계약금액</th><th>기성 진행</th><th>상태</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    },

    _header: function () {
        var list = Store.getContracts();
        var active = list.filter(function (c) { return c.status === '진행중'; });
        var total = active.reduce(function (s, c) { return s + (Number(c.amount) || 0); }, 0);
        var fin = Store.getAllSiteFinance().total;

        return '<div class="page-header"><h1 class="page-title">📑 계약 관리</h1>' +
            '<p class="page-subtitle">수주한 공사의 계약 내용을 관리합니다</p></div>' +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon green">📑</div><div class="stat-info">' +
            '<div class="stat-label">진행중 계약</div><div class="stat-value">' + active.length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon blue">💰</div><div class="stat-info">' +
            '<div class="stat-label">계약 총액</div><div class="stat-value">' + OrderUtil.money(total) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple">📊</div><div class="stat-info">' +
            '<div class="stat-label">기성 청구 누계</div><div class="stat-value">' + OrderUtil.money(fin.billed) + '</div>' +
            '<div class="stat-sub">잔여 ' + OrderUtil.money(total - fin.billed) + '</div></div></div>' +
            '</div>';
    },

    showModal: function (id, preset) {
        var c = id ? Store.getContracts().find(function (x) { return x.id === id; }) : null;
        c = c || preset || {};
        var esc = Store.escapeHtml;

        App.showModal(
            '<div class="modal-header"><h3>' + (id ? '✏️ 계약 수정' : '📑 계약 등록') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>계약일</label><input type="date" class="form-control" id="ctDate" value="' + esc(c.contractDate || Store.getToday()) + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="ctSite">' + OrderUtil.siteOptions(c.siteName, true) + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>공사명</label><input type="text" class="form-control" id="ctTitle" value="' + esc(c.title || '') + '"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>발주처</label><input type="text" class="form-control" id="ctClient" value="' + esc(c.client || '') + '"></div>' +
            '<div class="form-group"><label>계약금액 (원)</label><input type="number" class="form-control" id="ctAmount" value="' + (c.amount || '') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>착공일</label><input type="date" class="form-control" id="ctStart" value="' + esc(c.startDate || '') + '"></div>' +
            '<div class="form-group"><label>준공 예정일</label><input type="date" class="form-control" id="ctEnd" value="' + esc(c.endDate || '') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="ctStatus">' +
            OrderUtil.statusOptions(Store.CONTRACT_STATUS, c.status || '진행중') + '</select></div>' +
            '<div class="form-group"><label>메모</label><input type="text" class="form-control" id="ctMemo" value="' + esc(c.memo || '') + '" placeholder="지급 조건, 하자보증 등"></div>' +
            '<input type="hidden" id="ctEstimateId" value="' + esc(c.estimateId || '') + '">' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Contracts.save(' + (id ? "'" + id + "'" : '') + ')">저장</button></div>'
        );
    },

    save: function (id) {
        function v(x) { var el = document.getElementById(x); return el ? el.value.trim() : ''; }
        var d = {
            contractDate: v('ctDate'), siteName: v('ctSite'), title: v('ctTitle'),
            client: v('ctClient'), amount: Number(v('ctAmount')) || 0,
            startDate: v('ctStart'), endDate: v('ctEnd'),
            status: v('ctStatus'), memo: v('ctMemo'), estimateId: v('ctEstimateId')
        };
        if (!d.siteName || !d.title || !d.amount) {
            App.showToast('현장·공사명·계약금액을 입력해주세요.', 'error'); return;
        }
        if (id) Store.updateContract(id, d); else Store.addContract(d);
        App.closeModal(); App.refreshPage();
        App.showToast(id ? '계약이 수정되었습니다.' : '계약이 등록되었습니다.', 'success');
    },

    remove: function (id) {
        if (!confirm('이 계약을 삭제하시겠습니까?\n연결된 기성 내역은 남습니다.')) return;
        Store.deleteContract(id); App.refreshPage();
        App.showToast('계약이 삭제되었습니다.', 'info');
    }
};


/* =======================================
   ③ 기성 관리 (회차별 청구 · 입금)
   ======================================= */
var Billings = {
    filter: 'all',

    render: function () {
        if (!Store.getContracts().length) {
            return this._header() +
                '<div class="empty-state" style="padding:40px 24px;"><div class="empty-icon">📑</div>' +
                '<p><strong>계약을 먼저 등록해주세요.</strong></p>' +
                '<p style="font-size:13px;color:var(--text-muted);margin:8px 0 16px;">기성은 계약에 회차별로 붙습니다.</p>' +
                '<button class="btn btn-primary" onclick="App.navigate(\'contracts\')">📑 계약 관리로</button></div>';
        }

        var esc = Store.escapeHtml;
        var all = Store.getBillings().slice().sort(function (a, b) {
            if (a.siteName !== b.siteName) return a.siteName > b.siteName ? 1 : -1;
            return (Number(a.round) || 0) - (Number(b.round) || 0);
        });
        var list = (this.filter === 'all') ? all : all.filter(function (b) { return b.status === Billings.filter; });

        var rows = '';
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            var unpaid = (Number(b.billAmount) || 0) - (Number(b.paidAmount) || 0);
            rows += '<tr>' +
                '<td style="font-weight:700;text-align:center;">' + (b.round || '-') + '회</td>' +
                '<td>' + esc(b.siteName || '-') + '</td>' +
                '<td>' + esc(b.billDate || '<span style="color:var(--text-muted);">미청구</span>') + '</td>' +
                '<td class="amount">' + OrderUtil.money(b.billAmount) + '</td>' +
                '<td class="amount" style="color:var(--accent-success);">' + OrderUtil.money(b.paidAmount) + '</td>' +
                '<td class="amount" style="color:' + (unpaid > 0 ? 'var(--accent-danger)' : 'var(--text-muted)') + ';">' +
                OrderUtil.money(unpaid) + '</td>' +
                '<td>' + esc(b.paidDate || '-') + '</td>' +
                '<td>' + OrderUtil.badge(b.status) + '</td>' +
                '<td><div class="action-btns">' +
                '<button class="action-btn edit" title="입금 등록" onclick="Billings.showPayModal(\'' + b.id + '\')">💰</button>' +
                '<button class="action-btn edit" onclick="Billings.showModal(\'' + b.id + '\')" title="수정">✏️</button>' +
                '<button class="action-btn delete" onclick="Billings.remove(\'' + b.id + '\')" title="삭제">🗑️</button>' +
                '</div></td></tr>';
        }
        if (!rows) {
            rows = '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">💵</div>' +
                '<p>기성 내역이 없습니다</p><button class="btn btn-primary" onclick="Billings.showModal()">첫 기성 청구</button>' +
                '</div></td></tr>';
        }

        var chips = '<button class="wi-chip ' + (this.filter === 'all' ? 'active' : '') + '" onclick="Billings.setFilter(\'all\')">전체</button>';
        for (var s = 0; s < Store.BILLING_STATUS.length; s++) {
            var st = Store.BILLING_STATUS[s];
            chips += '<button class="wi-chip ' + (this.filter === st ? 'active' : '') + '" onclick="Billings.setFilter(\'' + st + '\')">' + st + '</button>';
        }

        return this._header() +
            '<div class="card">' +
            '<div class="wi-chips" style="margin-bottom:14px;">' + chips + '</div>' +
            '<div class="toolbar"><div class="toolbar-left"><span style="color:var(--text-muted);font-size:13px;">' +
            list.length + '건</span></div>' +
            '<button class="btn btn-primary" onclick="Billings.showModal()">➕ 기성 청구</button></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>회차</th><th>현장</th><th>청구일</th><th>청구액</th><th>입금액</th><th>미수금</th><th>입금일</th><th>상태</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    },

    _header: function () {
        var f = Store.getAllSiteFinance().total;
        return '<div class="page-header"><h1 class="page-title">💵 기성 관리</h1>' +
            '<p class="page-subtitle">회차별로 청구하고 입금을 확인합니다</p></div>' +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">📤</div><div class="stat-info">' +
            '<div class="stat-label">청구 누계</div><div class="stat-value">' + OrderUtil.money(f.billed) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">💰</div><div class="stat-info">' +
            '<div class="stat-label">입금 완료</div><div class="stat-value">' + OrderUtil.money(f.received) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon red">⚠️</div><div class="stat-info">' +
            '<div class="stat-label">미수금</div><div class="stat-value">' + OrderUtil.money(f.receivable) + '</div>' +
            '<div class="stat-sub">청구했는데 안 들어온 돈</div></div></div>' +
            '</div>';
    },

    setFilter: function (f) { this.filter = f; App.refreshPage(); },

    showModal: function (id, preset) {
        var b = id ? Store.getBillings().find(function (x) { return x.id === id; }) : null;
        b = b || preset || {};
        var esc = Store.escapeHtml;
        var contracts = Store.getContracts().filter(function (c) { return c.status !== '해지'; });

        var ctOpts = '<option value="">계약 선택</option>';
        for (var i = 0; i < contracts.length; i++) {
            var c = contracts[i];
            var sel = c.id === b.contractId ? ' selected' : '';
            ctOpts += '<option value="' + c.id + '"' + sel + '>' +
                esc(c.siteName) + ' · ' + esc(c.title) + ' (' + OrderUtil.money(c.amount) + ')</option>';
        }

        // 선택된 계약의 기성 현황을 안내한다
        var info = '';
        if (b.contractId) {
            var ct = contracts.find(function (x) { return x.id === b.contractId; });
            if (ct) {
                var prev = Store.getBillings().filter(function (x) {
                    return x.contractId === ct.id && x.id !== b.id;
                });
                var done = prev.reduce(function (s, x) { return s + (Number(x.billAmount) || 0); }, 0);
                info = '<div class="payroll-info"><p><strong>' + esc(ct.title) + '</strong></p>' +
                    '<p>계약 ' + OrderUtil.money(ct.amount) + ' · 기청구 ' + OrderUtil.money(done) +
                    ' · <strong>잔여 ' + OrderUtil.money(ct.amount - done) + '</strong></p></div>';
            }
        }

        App.showModal(
            '<div class="modal-header"><h3>' + (id ? '✏️ 기성 수정' : '💵 기성 청구') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>계약</label>' +
            '<select class="form-control" id="blContract" onchange="Billings.onContractChange()">' + ctOpts + '</select></div>' +
            '<div id="blInfo">' + info + '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>회차</label><input type="number" class="form-control" id="blRound" min="1" value="' + (b.round || '') + '" placeholder="자동"></div>' +
            '<div class="form-group"><label>공정률 (%)</label><input type="number" class="form-control" id="blProgress" min="0" max="100" value="' + (b.progressRate || '') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>청구일</label><input type="date" class="form-control" id="blDate" value="' + esc(b.billDate || '') + '"></div>' +
            '<div class="form-group"><label>청구액 (원)</label><input type="number" class="form-control" id="blAmount" value="' + (b.billAmount || '') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>메모</label><input type="text" class="form-control" id="blMemo" value="' + esc(b.memo || '') + '" placeholder="예: 3월분 기성"></div>' +
            '<div class="payroll-info"><p>📌 청구일을 비워두면 <strong>청구예정</strong>으로 잡힙니다. 입금은 저장 후 💰 버튼으로 등록하세요.</p></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Billings.save(' + (id ? "'" + id + "'" : '') + ')">저장</button></div>'
        );
        this.onContractChange();
    },

    // 계약을 고르면 회차를 자동으로 채우고 잔여액을 보여준다
    onContractChange: function () {
        var sel = document.getElementById('blContract');
        var roundEl = document.getElementById('blRound');
        var infoEl = document.getElementById('blInfo');
        if (!sel || !sel.value) { if (infoEl) infoEl.innerHTML = ''; return; }

        var ct = Store.getContracts().find(function (x) { return x.id === sel.value; });
        if (!ct) return;

        if (roundEl && !roundEl.value) roundEl.value = Store.nextBillingRound(ct.id);

        var prev = Store.getBillings().filter(function (x) { return x.contractId === ct.id; });
        var done = prev.reduce(function (s, x) { return s + (Number(x.billAmount) || 0); }, 0);
        if (infoEl) {
            infoEl.innerHTML = '<div class="payroll-info"><p><strong>' + Store.escapeHtml(ct.title) + '</strong></p>' +
                '<p>계약 ' + OrderUtil.money(ct.amount) + ' · 기청구 ' + OrderUtil.money(done) +
                ' · <strong>잔여 ' + OrderUtil.money(ct.amount - done) + '</strong></p></div>';
        }
    },

    save: function (id) {
        function v(x) { var el = document.getElementById(x); return el ? el.value.trim() : ''; }
        var contractId = v('blContract');
        if (!contractId) { App.showToast('계약을 선택해주세요.', 'error'); return; }

        var ct = Store.getContracts().find(function (x) { return x.id === contractId; });
        var amount = Number(v('blAmount')) || 0;
        if (!amount) { App.showToast('청구액을 입력해주세요.', 'error'); return; }

        // 계약금액을 넘겨 청구하려 하면 알려준다 (막지는 않는다 — 설계변경이 있을 수 있다)
        var others = Store.getBillings().filter(function (x) { return x.contractId === contractId && x.id !== id; });
        var done = others.reduce(function (s, x) { return s + (Number(x.billAmount) || 0); }, 0);
        if (ct && done + amount > ct.amount) {
            if (!confirm('청구 누계가 계약금액을 초과합니다.\n' +
                '계약 ' + OrderUtil.money(ct.amount) + ' / 누계 ' + OrderUtil.money(done + amount) +
                '\n\n설계변경 등으로 맞는 경우라면 계속 진행하세요.')) return;
        }

        var d = {
            contractId: contractId,
            siteName: ct ? ct.siteName : '',
            round: Number(v('blRound')) || Store.nextBillingRound(contractId),
            progressRate: Number(v('blProgress')) || 0,
            billDate: v('blDate'),
            billAmount: amount,
            memo: v('blMemo')
        };

        if (id) Store.updateBilling(id, d);
        else { d.paidAmount = 0; Store.addBilling(d); }

        App.closeModal(); App.refreshPage();
        App.showToast(id ? '기성이 수정되었습니다.' : d.round + '회차 기성이 등록되었습니다.', 'success');
    },

    // 입금 등록 — 부분 입금도 받는다
    showPayModal: function (id) {
        var b = Store.getBillings().find(function (x) { return x.id === id; });
        if (!b) return;
        var esc = Store.escapeHtml;
        var unpaid = (Number(b.billAmount) || 0) - (Number(b.paidAmount) || 0);

        App.showModal(
            '<div class="modal-header"><h3>💰 입금 등록</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="payroll-info" style="margin-bottom:16px;">' +
            '<p><strong>' + esc(b.siteName) + ' · ' + (b.round || '-') + '회차</strong></p>' +
            '<p>청구 ' + OrderUtil.money(b.billAmount) + ' · 기입금 ' + OrderUtil.money(b.paidAmount) +
            ' · <strong style="color:var(--accent-danger);">미수 ' + OrderUtil.money(unpaid) + '</strong></p></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>입금일</label><input type="date" class="form-control" id="blPaidDate" value="' + esc(b.paidDate || Store.getToday()) + '"></div>' +
            '<div class="form-group"><label>입금 누계액 (원)</label><input type="number" class="form-control" id="blPaidAmount" value="' + (b.paidAmount || '') + '"></div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById(\'blPaidAmount\').value=' + (b.billAmount || 0) + '">전액 입금</button>' +
            '</div>' +
            '<div class="payroll-info"><p>📌 <strong>누계액</strong>을 적습니다. 일부만 들어왔으면 그만큼만 적으면 자동으로 <strong>일부입금</strong>으로 잡힙니다.</p></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Billings.savePay(\'' + id + '\')">저장</button></div>'
        );
    },

    savePay: function (id) {
        function v(x) { var el = document.getElementById(x); return el ? el.value.trim() : ''; }
        var paid = Number(v('blPaidAmount')) || 0;
        Store.updateBilling(id, { paidAmount: paid, paidDate: paid > 0 ? v('blPaidDate') : '' });
        var b = Store.getBillings().find(function (x) { return x.id === id; });
        App.closeModal(); App.refreshPage();
        App.showToast('입금 등록 완료 — ' + b.status, 'success');
    },

    remove: function (id) {
        if (!confirm('이 기성 내역을 삭제하시겠습니까?')) return;
        Store.deleteBilling(id); App.refreshPage();
        App.showToast('기성이 삭제되었습니다.', 'info');
    }
};
