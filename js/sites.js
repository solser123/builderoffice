/* =======================================
   BuilderOffice - Site Management Module
   현장 관리 페이지
   ======================================= */

var Sites = {
    detailId: null,     // 현장 허브로 보고 있는 현장 id (null이면 목록)
    /**
     * 현장별 수지 현황 — 대표가 한눈에 보는 표.
     * "어느 현장에 얼마 썼고, 얼마 받아야 하고, 남는지"를 한 줄로 보여준다.
     * 급여·단가가 섞이므로 대표·관리자에게만 노출한다.
     */
    _renderFinanceTable: function () {
        if (!App.isAdminUser()) return '';

        var fin = Store.getAllSiteFinance();
        if (!fin.rows.length) return '';

        var esc = Store.escapeHtml;
        var t = fin.total;
        var rows = '';

        for (var i = 0; i < fin.rows.length; i++) {
            var r = fin.rows[i];
            // 계약도 지출도 없는 현장은 표를 어지럽히므로 건너뛴다
            if (!r.contractAmount && !r.spent && !r.billed) continue;

            var profitColor = r.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
            rows += '<tr>' +
                '<td style="font-weight:600;color:var(--text-primary);">' + esc(r.siteName) +
                '<br><span style="font-size:11px;color:var(--text-muted);">' + esc(r.client || '') + '</span></td>' +
                '<td class="amount">' + Store.formatCurrency(r.contractAmount) + '</td>' +
                '<td class="amount">' + Store.formatCurrency(r.billed) +
                '<br><span style="font-size:11px;color:var(--text-muted);">' + r.billRate + '%</span></td>' +
                '<td class="amount" style="color:var(--accent-success);">' + Store.formatCurrency(r.received) + '</td>' +
                '<td class="amount" style="color:' + (r.receivable > 0 ? 'var(--accent-danger)' : 'var(--text-muted)') + ';">' +
                Store.formatCurrency(r.receivable) + '</td>' +
                '<td class="amount">' + Store.formatCurrency(r.spent) +
                (r.unpaidCost > 0 ? '<br><span style="font-size:11px;color:var(--accent-warning);">미지급 ' +
                    Store.formatCurrency(r.unpaidCost) + '</span>' : '') + '</td>' +
                '<td class="amount" style="color:' + profitColor + ';font-weight:700;">' +
                Store.formatCurrency(r.profit) + '</td>' +
                '</tr>';
        }

        if (!rows) return '';

        var totalProfitColor = t.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
        var footer = '<tr class="payroll-footer">' +
            '<td><strong>합 계</strong></td>' +
            '<td class="amount"><strong>' + Store.formatCurrency(t.contractAmount) + '</strong></td>' +
            '<td class="amount"><strong>' + Store.formatCurrency(t.billed) + '</strong></td>' +
            '<td class="amount"><strong>' + Store.formatCurrency(t.received) + '</strong></td>' +
            '<td class="amount"><strong>' + Store.formatCurrency(t.receivable) + '</strong></td>' +
            '<td class="amount"><strong>' + Store.formatCurrency(t.spent) + '</strong></td>' +
            '<td class="amount" style="color:' + totalProfitColor + ';"><strong>' +
            Store.formatCurrency(t.received - t.spent) + '</strong></td>' +
            '</tr>';

        var hqNote = t.hqSpent > 0
            ? '<p>📌 위 표에는 <strong>본사 비용 ' + Store.formatCurrency(t.hqSpent) +
              '</strong>이 빠져 있습니다. 본사까지 포함한 실제 손익은 <strong style="color:' +
              (t.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)') + ';">' +
              Store.formatCurrency(t.profit) + '</strong>입니다.</p>'
            : '';

        return '<div class="card" style="margin-bottom:20px;">' +
            '<div class="toolbar"><div class="toolbar-left">' +
            '<h3 style="font-size:16px;font-weight:700;">💹 현장별 수지 현황</h3></div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-secondary btn-sm" onclick="App.navigate(\'billings\')">💵 기성 관리</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="App.navigate(\'costs\')">💰 비용 관리</button>' +
            '</div></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>현장</th><th>계약금액</th><th>기성 청구</th><th>입금</th><th>미수금</th><th>지출</th><th>손익</th>' +
            '</tr></thead><tbody>' + rows + footer + '</tbody></table></div>' +
            '<div class="payroll-info">' + hqNote +
            '<p style="color:var(--text-muted);">손익 = 입금 − 지출 (아직 청구 안 한 금액은 빠져 있습니다)</p></div>' +
            '</div>';
    },

    render: function () {
        // 현장 하나를 선택했으면 그 현장의 허브를 보여준다
        if (this.detailId) {
            var sel = Store.getSites().find(function (s) { return s.id === Sites.detailId; });
            if (sel) return this._renderHub(sel);
            this.detailId = null;   // 삭제된 현장이면 목록으로
        }

        if (MobileUI.isMobile()) return this.renderMobile();
        var sites = Store.getSites();
        var esc = Store.escapeHtml;

        var siteCards = '';
        if (sites.length > 0) {
            for (var i = 0; i < sites.length; i++) {
                var s = sites[i];
                var statusBadge = s.status === '진행중' ? 'badge-green' : s.status === '준비중' ? 'badge-orange' : 'badge-blue';
                var progress = Number(s.progress) || 0;

                siteCards += '<div class="site-card" onclick="Sites.showSiteDetail(\'' + s.id + '\')">' +
                    '<div class="site-card-header">' +
                    '<h3 class="site-card-name">' + esc(s.name) + '</h3>' +
                    '<span class="badge ' + statusBadge + '">' + esc(s.status) + '</span>' +
                    '</div>' +
                    '<div class="site-card-info">' +
                    '<div class="site-info-row"><span class="site-info-label">발주처</span><span>' + esc(s.client || '-') + '</span></div>' +
                    '<div class="site-info-row"><span class="site-info-label">현장소장</span><span>' + esc(s.manager || '-') + '</span></div>' +
                    '<div class="site-info-row"><span class="site-info-label">공사기간</span><span>' + esc(s.startDate || '') + ' ~ ' + esc(s.endDate || '') + '</span></div>' +
                    '<div class="site-info-row"><span class="site-info-label">도급금액</span><span>' + Store.formatCurrency(s.contractAmount || 0) + '</span></div>' +
                    '</div>' +
                    '<div class="site-card-progress">' +
                    '<div class="site-progress-header"><span>공정률</span><span>' + progress + '%</span></div>' +
                    '<div class="mat-bar-wrap"><div class="mat-bar ok" style="width:' + progress + '%"></div></div>' +
                    '</div>' +
                    '<div class="site-card-footer">' +
                    '<span class="site-footer-item">👷 ' + (s.workerCount || 0) + '명</span>' +
                    '<span class="site-footer-item">📋 ' + esc(s.safetyGrade || '-') + '</span>' +
                    '<span class="site-footer-item">📍 ' + esc(s.address || '-') + '</span>' +
                    '</div>' +
                    '</div>';
            }
        } else {
            siteCards = '<div class="empty-state"><div class="empty-icon">🏗️</div><p>등록된 현장이 없습니다</p>' +
                '<button class="btn btn-primary" onclick="Sites.showAddModal()">첫 현장 등록하기</button></div>';
        }

        return '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">🏗️</div><div class="stat-info"><div class="stat-label">총 현장</div><div class="stat-value">' + sites.length + '개</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">🔨</div><div class="stat-info"><div class="stat-label">진행중</div><div class="stat-value">' + sites.filter(function (s) { return s.status === '진행중'; }).length + '개</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">📅</div><div class="stat-info"><div class="stat-label">준비중</div><div class="stat-value">' + sites.filter(function (s) { return s.status === '준비중'; }).length + '개</div></div></div>' +
            '</div>' +
            Sites._renderFinanceTable() +
            '<div class="card">' +
            '<div class="toolbar">' +
            '<div class="toolbar-left"><span style="color:var(--text-muted);font-size:13px;">총 ' + sites.length + '개 현장</span></div>' +
            '<button class="btn btn-primary" onclick="Sites.showAddModal()">➕ 현장 등록</button>' +
            '</div>' +
            '<div class="site-grid">' + siteCards + '</div>' +
            '</div>';
    },

    showAddModal: function () {
        var html = '<div class="modal-header"><h3>🏗️ 현장 등록</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>현장명 *</label><input type="text" class="form-control" id="siteName" placeholder="예: 강남 오피스텔 신축공사"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>발주처</label><input type="text" class="form-control" id="siteClient" placeholder="예: (주)한국건설"></div>' +
            '<div class="form-group"><label>현장소장</label><input type="text" class="form-control" id="siteManager" placeholder="예: 김소장"></div>' +
            '</div>' +
            '<div class="form-group"><label>주소</label><input type="text" class="form-control" id="siteAddress" placeholder="서울시 강남구 역삼동 123"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>착공일</label><input type="date" class="form-control" id="siteStart"></div>' +
            '<div class="form-group"><label>준공예정일</label><input type="date" class="form-control" id="siteEnd"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>도급금액 (원)</label><input type="number" class="form-control" id="siteAmount" placeholder="0"></div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="siteStatus"><option value="준비중">준비중</option><option value="진행중" selected>진행중</option><option value="완료">완료</option><option value="중지">중지</option></select></div>' +
            '</div>' +
            '<div class="form-group"><label>비고</label><textarea class="form-control" id="siteMemo" rows="2" placeholder="현장 특이사항"></textarea></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button><button class="btn btn-primary" onclick="Sites.saveSite()">등록</button></div>';
        App.showModal(html);
    },

    saveSite: function () {
        var name = document.getElementById('siteName').value.trim();
        if (!name) { App.showToast('현장명을 입력해주세요.', 'error'); return; }

        Store.addSite({
            name: name,
            client: document.getElementById('siteClient').value.trim(),
            manager: document.getElementById('siteManager').value.trim(),
            address: document.getElementById('siteAddress').value.trim(),
            startDate: document.getElementById('siteStart').value,
            endDate: document.getElementById('siteEnd').value,
            contractAmount: Number(document.getElementById('siteAmount').value) || 0,
            status: document.getElementById('siteStatus').value,
            memo: document.getElementById('siteMemo').value.trim(),
            progress: 0,
            workerCount: 0,
            safetyGrade: '-'
        });
        App.closeModal();
        App.refreshPage();
        App.showToast('현장이 등록되었습니다.', 'success');
    },

    // 현장을 누르면 그 현장의 '허브'로 들어간다 (모든 것이 한 화면에)
    showSiteDetail: function (id) {
        this.detailId = id;
        App.refreshPage();
        window.scrollTo(0, 0);
    },

    backToList: function () {
        this.detailId = null;
        App.refreshPage();
    },

    /* ===== 현장 허브 =============================================
       하나의 현장에 연결된 견적·계약·기성·비용·일일보고·문서·안전을
       한 화면에 모은다. 여기서 추가하면 현장이 자동 지정돼,
       메뉴마다 현장을 다시 고르고 따로 입력할 필요가 없다.
       ============================================================ */
    _renderHub: function (site) {
        var esc = Store.escapeHtml;
        var f = Store.formatCurrency;
        var name = site.name;
        var sid = site.id;
        var isAdmin = App.isAdminUser && App.isAdminUser();

        function by(arr) { return arr.filter(function (x) { return x.siteName === name; }); }
        var estimates = by(Store.getEstimates());
        var contracts = by(Store.getContracts());
        var billings = by(Store.getBillings());
        var costs = by(Store.getCosts()).map(function (c) { return Store.normalizeCost(c); });
        var works = by(Store.getWorkInputs());
        var kosha = by(Store._get('builderoffice_koshaRecords') || []);
        var fin = Store.getSiteFinance(name);
        var firstContract = contracts.length ? contracts[0].id : '';

        // ── 수지 요약 (대표·관리자) ──
        var finance = '';
        if (isAdmin) {
            var pc = fin.profit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
            function m(l, v, c, s) {
                return '<div class="cf-card"><div class="cf-label">' + l + '</div>' +
                    '<div class="cf-value" style="color:' + (c || 'var(--text-primary)') + ';font-size:18px;">' + v + '</div>' +
                    (s ? '<div class="cf-sub">' + s + '</div>' : '') + '</div>';
            }
            finance = '<div class="cf-cards" style="margin-bottom:18px;">' +
                m('계약금액', f(fin.contractAmount), null, estimates.length + '건 견적') +
                m('기성 청구', f(fin.billed), null, fin.billRate + '% · 입금 ' + f(fin.received)) +
                m('미수금', f(fin.receivable), fin.receivable > 0 ? 'var(--accent-danger)' : 'var(--text-muted)', '받을 돈') +
                m('지출', f(fin.spent), null, (fin.unpaidCost > 0 ? '미지급 ' + f(fin.unpaidCost) : '')) +
                m('손익', f(fin.profit), pc, '입금 − 지출') +
                '</div>';
        }

        // ── 섹션 헬퍼 ──
        function section(icon, title, addLabel, addAction, items, emptyMsg) {
            var body = items.length ? items.join('') :
                '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">' + emptyMsg + '</div>';
            return '<div class="hub-section">' +
                '<div class="hub-section-head">' +
                '<h3>' + icon + ' ' + title + (items.length ? ' <span class="hub-count">' + items.length + '</span>' : '') + '</h3>' +
                (addAction ? '<button class="btn btn-secondary btn-sm" onclick="' + addAction + '">' + addLabel + '</button>' : '') +
                '</div>' +
                '<div class="hub-list">' + body + '</div>' +
                '</div>';
        }
        function line(left, right, sub) {
            return '<div class="hub-item">' +
                '<div class="hub-item-main">' + left + (sub ? '<div class="hub-item-sub">' + sub + '</div>' : '') + '</div>' +
                '<div class="hub-item-right">' + right + '</div></div>';
        }

        // 견적
        var estItems = estimates.slice(0, 5).map(function (e) {
            return line(esc(e.title), OrderUtil.badge(e.status), f(e.amount) + (e.date ? ' · ' + esc(e.date) : ''));
        });
        // 계약
        var ctItems = contracts.slice(0, 5).map(function (c) {
            return line(esc(c.title), OrderUtil.badge(c.status), f(c.amount));
        });
        // 기성
        var blItems = billings.slice().sort(function (a, b) { return (a.round || 0) - (b.round || 0); }).slice(0, 6).map(function (b) {
            var unpaid = (b.billAmount || 0) - (b.paidAmount || 0);
            return line((b.round || '-') + '회차 · ' + f(b.billAmount), OrderUtil.badge(b.status),
                '입금 ' + f(b.paidAmount) + (unpaid > 0 ? ' · 미수 ' + f(unpaid) : ''));
        });
        // 비용
        var costItems = costs.slice(0, 6).map(function (c) {
            return line(esc(c.name), Costs._paymentBadge ? Costs._paymentBadge(c) : c.paymentStatus,
                esc(c.category) + ' · ' + f(c.amount) + (c.fromWorkInput ? ' · 📝일보' : ''));
        });
        // 일일보고
        var workItems = works.slice(0, 5).map(function (w) {
            return line(esc(w.date) + (w.weather ? ' · ' + esc(w.weather) : ''),
                '<span class="badge ' + (w.status === '승인완료' ? 'badge-green' : 'badge-orange') + '">' + esc(w.status) + '</span>',
                (w.workers ? w.workers.length + '명' : '') + (w.workContent ? ' · ' + esc(w.workContent).slice(0, 24) : ''));
        });
        // 문서 (단계별 필수 현황)
        var docStages = Store.getSiteDocStatus(name);
        var docItems = docStages.filter(function (st) { return st.totalRequired > 0; }).map(function (st) {
            var ok = st.complete;
            return line(st.label, ok ? '<span class="badge badge-green">완료</span>' :
                '<span class="badge badge-orange">' + st.haveRequired + '/' + st.totalRequired + '</span>',
                st.items.filter(function (it) { return it.required && !it.count; }).map(function (it) { return it.name; }).join(', ') || '필수 서류 준비됨');
        });
        // 안전
        var koshaItems = kosha.slice(0, 5).map(function (r) {
            return line(esc(r.formName || r.formCode), '<span class="badge badge-blue">' + esc(r.date) + '</span>',
                esc(r.writer || '') + (r.photos && r.photos.length ? ' · 📷' + r.photos.length : ''));
        });

        var sections =
            section('📄', '견적', '+ 견적', "Estimates.showModal(null,{siteName:'" + esc(name).replace(/'/g, "\\'") + "',client:'" + esc(site.client || '').replace(/'/g, "\\'") + "'})", estItems, '견적이 없습니다') +
            section('📑', '계약', '+ 계약', "Contracts.showModal(null,{siteName:'" + esc(name).replace(/'/g, "\\'") + "',client:'" + esc(site.client || '').replace(/'/g, "\\'") + "'})", ctItems, '계약이 없습니다') +
            section('💵', '기성', '+ 기성', firstContract ? "Billings.showModal(null,{contractId:'" + firstContract + "'})" : "App.navigate('contracts')", blItems, '기성 내역이 없습니다') +
            section('💰', '비용', '+ 비용', "Sites.addCostForSite('" + esc(name).replace(/'/g, "\\'") + "')", costItems, '비용이 없습니다') +
            section('📝', '작업일보', '+ 일보', "App.navigate('workinput')", workItems, '작업일보가 없습니다') +
            section('📂', '문서', '+ 문서', "Sites.addDocForSite('" + esc(name).replace(/'/g, "\\'") + "')", docItems, '필수 서류 단계가 없습니다') +
            section('🦺', '안전 서류', '+ 안전', "App.navigate('safety')", koshaItems, '안전 기록이 없습니다');

        var statusBadge = site.status === '진행중' ? 'badge-green' : site.status === '준비중' ? 'badge-orange' : 'badge-blue';

        return '<div class="hub">' +
            '<div class="hub-top">' +
            '<button class="btn btn-secondary btn-sm" onclick="Sites.backToList()">← 현장 목록</button>' +
            '<div class="hub-title"><h1>🏗️ ' + esc(site.name) + '</h1>' +
            '<span class="badge ' + statusBadge + '">' + esc(site.status) + '</span></div>' +
            '<button class="btn btn-secondary btn-sm" onclick="Sites.showEditModal(\'' + sid + '\')">현장 정보 수정</button>' +
            '</div>' +
            '<div class="hub-meta">' +
            '<span>👤 ' + esc(site.client || '발주처 미정') + '</span>' +
            '<span>👷 ' + esc(site.manager || '소장 미정') + '</span>' +
            '<span>📍 ' + esc(site.address || '-') + '</span>' +
            '<span>📅 ' + esc(site.startDate || '') + ' ~ ' + esc(site.endDate || '') + '</span>' +
            '</div>' +
            finance +
            '<div class="hub-grid">' + sections + '</div>' +
            '</div>';
    },

    // 허브에서 현장 지정된 채로 비용/문서 추가
    addCostForSite: function (siteName) {
        if (typeof Costs !== 'undefined' && Costs.showAddModal) Costs.showAddModal({ siteName: siteName });
    },
    addDocForSite: function (siteName) {
        if (typeof Documents !== 'undefined') { Documents.siteFilter = siteName; Documents.showAddModal(); }
    },

    showEditModal: function (id) {
        var s = Store.getSites().find(function (x) { return x.id === id; });
        if (!s) return;
        var esc = Store.escapeHtml;

        var statusOpts = ['준비중', '진행중', '완료', '중지'].map(function (st) {
            return '<option value="' + st + '"' + (s.status === st ? ' selected' : '') + '>' + st + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>✏️ 현장 수정</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>현장명 *</label><input type="text" class="form-control" id="siteName" value="' + esc(s.name) + '"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>발주처</label><input type="text" class="form-control" id="siteClient" value="' + esc(s.client || '') + '"></div>' +
            '<div class="form-group"><label>현장소장</label><input type="text" class="form-control" id="siteManager" value="' + esc(s.manager || '') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>주소</label><input type="text" class="form-control" id="siteAddress" value="' + esc(s.address || '') + '"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>착공일</label><input type="date" class="form-control" id="siteStart" value="' + (s.startDate || '') + '"></div>' +
            '<div class="form-group"><label>준공예정일</label><input type="date" class="form-control" id="siteEnd" value="' + (s.endDate || '') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>도급금액 (원)</label><input type="number" class="form-control" id="siteAmount" value="' + (s.contractAmount || 0) + '"></div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="siteStatus">' + statusOpts + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>공정률 (%)</label><input type="number" class="form-control" id="siteProgress" value="' + (s.progress || 0) + '" min="0" max="100"></div>' +
            '<div class="form-group"><label>비고</label><textarea class="form-control" id="siteMemo" rows="2">' + esc(s.memo || '') + '</textarea></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button><button class="btn btn-primary" onclick="Sites.updateSite(\'' + id + '\')">수정</button></div>';
        App.showModal(html);
    },

    updateSite: function (id) {
        var name = document.getElementById('siteName').value.trim();
        if (!name) { App.showToast('현장명을 입력해주세요.', 'error'); return; }

        Store.updateSite(id, {
            name: name,
            client: document.getElementById('siteClient').value.trim(),
            manager: document.getElementById('siteManager').value.trim(),
            address: document.getElementById('siteAddress').value.trim(),
            startDate: document.getElementById('siteStart').value,
            endDate: document.getElementById('siteEnd').value,
            contractAmount: Number(document.getElementById('siteAmount').value) || 0,
            status: document.getElementById('siteStatus').value,
            progress: Number(document.getElementById('siteProgress').value) || 0,
            memo: document.getElementById('siteMemo').value.trim()
        });
        App.closeModal();
        App.refreshPage();
        App.showToast('현장 정보가 수정되었습니다.', 'success');
    },

    confirmDelete: function (id) {
        if (confirm('이 현장을 삭제하시겠습니까?')) {
            Store.deleteSite(id);
            App.closeModal();
            App.refreshPage();
            App.showToast('현장이 삭제되었습니다.', 'info');
        }
    },

    renderMobile: function () {
        var sites = Store.getSites();
        var esc = Store.escapeHtml;
        var activeSites = sites.filter(function (s) { return s.status === '진행중'; }).length;
        var cards = '';
        for (var i = 0; i < sites.length; i++) {
            cards += MobileUI.siteCard(sites[i], esc);
        }
        if (!cards) cards = MobileUI.emptyCard('🏗️', '등록된 현장이 없습니다', '➕ 현장 추가', 'Sites.showAddModal()');
        return MobileUI.pageHeader('🏗️ 현장 관리', '추가', 'Sites.showAddModal()') +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon green">🏗️</div><div class="stat-info"><div class="stat-label">진행중 현장</div><div class="stat-value">' + activeSites + '개</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><div class="stat-label">전체 현장</div><div class="stat-value">' + sites.length + '개</div></div></div>' +
            '</div>' +
            '<div class="mob-card-list">' + cards + '</div>';
    }
};
