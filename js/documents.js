/* =======================================
   BuilderOffice - 문서 관리

   기존에는 "문서를 올리는 곳"만 있고, 어떤 서류를 만들어야 하는지가
   어디에도 없었다. 회사 폴더(공무부/관리부/안전)를 그대로 옮기되
   공사 진행 단계로 묶어, 담당자가 "지금 뭘 만들어야 하는지" 알 수 있게 한다.

   탭
     · 서류 현황 — 현장별로 단계별 필수 서류가 있는지/빠졌는지
     · 문서함   — 실제 등록된 문서 목록
   ======================================= */

var Documents = {
    activeTab: 'status',
    siteFilter: '',
    stageFilter: 'all',
    PHOTO_ID: 'docPhotos',

    render: function () {
        if (MobileUI.isMobile()) return this.renderMobile();

        var sites = Store.getSites();
        if (!this.siteFilter && sites.length) this.siteFilter = sites[0].name;

        var navs = '', panes = '';
        var tabs = [
            { id: 'status', label: '📋 서류 현황' },
            { id: 'list', label: '📂 문서함' }
        ];
        for (var i = 0; i < tabs.length; i++) {
            var on = (this.activeTab === tabs[i].id);
            navs += '<button class="tab-btn ' + (on ? 'active' : '') + '" ' +
                'onclick="Documents.switchTab(\'' + tabs[i].id + '\')">' + tabs[i].label + '</button>';
            panes += '<div class="tab-content ' + (on ? 'active' : '') + '">' +
                (tabs[i].id === 'status' ? this._renderStatus() : this._renderList()) + '</div>';
        }

        return this._header() +
            '<div class="card"><div class="tab-nav">' + navs + '</div>' + panes + '</div>';
    },

    switchTab: function (t) { this.activeTab = t; App.refreshPage(); },
    setSite: function (v) { this.siteFilter = v; App.refreshPage(); },
    setStage: function (v) { this.stageFilter = v; App.refreshPage(); },

    _header: function () {
        var docs = Store.getDocuments();
        var withPhoto = docs.filter(function (d) { return d.photos && d.photos.length; }).length;
        return '<div class="page-header"><h1 class="page-title">📂 문서 관리</h1>' +
            '<p class="page-subtitle">공사 단계별로 필요한 서류를 챙깁니다</p></div>' +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">📂</div><div class="stat-info">' +
            '<div class="stat-label">등록 문서</div><div class="stat-value">' + docs.length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">📷</div><div class="stat-info">' +
            '<div class="stat-label">사진 첨부</div><div class="stat-value">' + withPhoto + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple">🏗️</div><div class="stat-info">' +
            '<div class="stat-label">관리 현장</div><div class="stat-value">' + Store.getSites().length + '개</div></div></div>' +
            '</div>';
    },

    // ===== 탭 1: 서류 현황 (핵심) =====

    _renderStatus: function () {
        var sites = Store.getSites();
        if (!sites.length) {
            return '<div class="empty-state" style="padding:40px 24px;"><div class="empty-icon">🏗️</div>' +
                '<p><strong>현장을 먼저 등록해주세요.</strong></p>' +
                '<p style="font-size:13px;color:var(--text-muted);margin:8px 0 16px;">서류는 현장별로 관리됩니다.</p>' +
                '<button class="btn btn-primary" onclick="App.navigate(\'sites\')">🏗️ 현장 등록하기</button></div>';
        }

        var esc = Store.escapeHtml;
        var siteOpts = '';
        for (var s = 0; s < sites.length; s++) {
            siteOpts += '<option value="' + esc(sites[s].name) + '"' +
                (sites[s].name === this.siteFilter ? ' selected' : '') + '>' + esc(sites[s].name) + '</option>';
        }

        var stages = Store.getSiteDocStatus(this.siteFilter);
        var body = '';
        var totalReq = 0, haveReq = 0;

        for (var i = 0; i < stages.length; i++) {
            var st = stages[i];
            totalReq += st.totalRequired;
            haveReq += st.haveRequired;

            var items = '';
            for (var j = 0; j < st.items.length; j++) {
                var it = st.items[j];
                var ok = it.count > 0;
                var mark = ok ? '✅' : (it.required ? '⬜' : '·');
                var cls = ok ? 'doc-have' : (it.required ? 'doc-missing' : 'doc-optional');

                items += '<div class="doc-item ' + cls + '">' +
                    '<span class="doc-mark">' + mark + '</span>' +
                    '<span class="doc-name">' + esc(it.name) +
                    (it.required ? '<span class="doc-req">필수</span>' : '') +
                    (it.note ? '<span class="doc-note">' + esc(it.note) + '</span>' : '') +
                    '</span>' +
                    (ok
                        ? '<span class="doc-count">' + it.count + '건</span>'
                        : '<button class="btn btn-secondary btn-sm" onclick="Documents.showAddModal(\'' +
                          st.id + '\',\'' + esc(it.name).replace(/'/g, "\\'") + '\')">등록</button>') +
                    '</div>';
            }

            var pct = st.totalRequired ? Math.round((st.haveRequired / st.totalRequired) * 100) : 100;
            body += '<div class="doc-stage' + (st.complete ? ' stage-done' : '') + '">' +
                '<div class="doc-stage-head">' +
                '<div><div class="doc-stage-title">' + st.label + '</div>' +
                '<div class="doc-stage-desc">' + st.desc + ' · <span style="color:var(--text-muted);">' + st.dept + '</span></div></div>' +
                '<div class="doc-stage-pct">' +
                (st.totalRequired ? st.haveRequired + '/' + st.totalRequired + ' 필수' : '선택') +
                '</div></div>' +
                (st.totalRequired ? '<div class="ob-bar"><i style="width:' + pct + '%"></i></div>' : '') +
                '<div class="doc-items">' + items + '</div>' +
                '</div>';
        }

        var overall = totalReq ? Math.round((haveReq / totalReq) * 100) : 0;

        return '<div class="toolbar">' +
            '<div class="toolbar-left" style="display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:13px;color:var(--text-muted);">현장</span>' +
            '<select class="filter-select" onchange="Documents.setSite(this.value)">' + siteOpts + '</select>' +
            '</div>' +
            '<button class="btn btn-primary" onclick="Documents.showAddModal()">➕ 문서 등록</button>' +
            '</div>' +
            '<div class="payroll-info" style="margin-bottom:16px;">' +
            '<p>📌 <strong>' + esc(this.siteFilter) + '</strong> 필수 서류 <strong>' + haveReq + ' / ' + totalReq +
            '</strong> 준비됨 (' + overall + '%)</p>' +
            '<p style="color:var(--text-muted);">⬜ 표시가 아직 없는 필수 서류입니다. 등록 버튼으로 바로 올릴 수 있습니다.</p></div>' +
            '<div class="doc-stages">' + body + '</div>';
    },

    // ===== 탭 2: 문서함 =====

    _renderList: function () {
        var esc = Store.escapeHtml;
        var docs = Store.getDocuments();
        var self = this;

        if (this.stageFilter !== 'all') {
            docs = docs.filter(function (d) { return d.stage === self.stageFilter; });
        }

        var chips = '<button class="wi-chip ' + (this.stageFilter === 'all' ? 'active' : '') +
            '" onclick="Documents.setStage(\'all\')">전체</button>';
        for (var s = 0; s < Store.DOC_STAGES.length; s++) {
            var st = Store.DOC_STAGES[s];
            chips += '<button class="wi-chip ' + (this.stageFilter === st.id ? 'active' : '') +
                '" onclick="Documents.setStage(\'' + st.id + '\')">' + st.label + '</button>';
        }

        var rows = '';
        for (var i = 0; i < docs.length; i++) {
            var d = docs[i];
            var stage = Store.getStage(d.stage);
            rows += '<tr>' +
                '<td>' + esc(d.uploadDate || '-') + '</td>' +
                '<td>' + (stage ? '<span class="badge badge-blue">' + stage.label + '</span>' : '-') + '</td>' +
                '<td>' + esc(d.docType || d.type || '-') + '</td>' +
                '<td style="color:var(--text-primary);font-weight:500;">' + esc(d.name) + '</td>' +
                '<td>' + esc(d.siteName || '-') + '</td>' +
                '<td>' + esc(d.uploader || '-') + '</td>' +
                '<td>' + (d.photos && d.photos.length ? '📷 ' + d.photos.length : '-') + '</td>' +
                '<td><div class="action-btns">' +
                '<button class="action-btn edit" onclick="Documents.showDetail(\'' + d.id + '\')" title="상세">👁️</button>' +
                '<button class="action-btn delete" onclick="Documents.confirmDelete(\'' + d.id + '\')" title="삭제">🗑️</button>' +
                '</div></td></tr>';
        }
        if (!rows) {
            rows = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📂</div>' +
                '<p>등록된 문서가 없습니다</p>' +
                '<button class="btn btn-primary" onclick="Documents.showAddModal()">첫 문서 등록</button></div></td></tr>';
        }

        return '<div class="wi-chips" style="margin-bottom:14px;">' + chips + '</div>' +
            '<div class="toolbar"><div class="toolbar-left">' +
            '<span style="color:var(--text-muted);font-size:13px;">' + docs.length + '건</span></div>' +
            '<button class="btn btn-primary" onclick="Documents.showAddModal()">➕ 문서 등록</button></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>등록일</th><th>단계</th><th>문서 종류</th><th>문서명</th><th>현장</th><th>등록자</th><th>사진</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    },

    // ===== 등록 =====

    _renderPhotoArea: function () {
        if (typeof Sync === 'undefined' || Sync.MODE !== 'cloud') {
            return '<div class="wi-photo-area"><div class="wi-photo-placeholder" ' +
                'onclick="App.showToast(\'로그인 후 첨부할 수 있습니다.\', \'info\')">' +
                '<span>📎</span><p>사진 첨부 (로그인 필요)</p></div></div>';
        }
        return Photos.render({ id: this.PHOTO_ID, folder: 'documents' });
    },

    showAddModal: function (stageId, docType) {
        var esc = Store.escapeHtml;

        var stageOpts = '';
        for (var i = 0; i < Store.DOC_STAGES.length; i++) {
            var st = Store.DOC_STAGES[i];
            stageOpts += '<option value="' + st.id + '"' + (st.id === stageId ? ' selected' : '') + '>' +
                st.label + '</option>';
        }

        var siteOpts = '<option value="">현장 선택 (본사 문서는 비워두세요)</option>';
        var sites = Store.getSites();
        for (var s = 0; s < sites.length; s++) {
            var sel = sites[s].name === this.siteFilter ? ' selected' : '';
            siteOpts += '<option value="' + esc(sites[s].name) + '"' + sel + '>' + esc(sites[s].name) + '</option>';
        }

        App.showModal(
            '<div class="modal-header"><h3>📂 문서 등록</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>공사 단계</label>' +
            '<select class="form-control" id="docStage" onchange="Documents.onStageChange()">' + stageOpts + '</select></div>' +
            '<div class="form-group"><label>문서 종류</label>' +
            '<select class="form-control" id="docType"></select></div>' +
            '</div>' +
            '<div class="form-group"><label>문서명</label>' +
            '<input type="text" class="form-control" id="docName" placeholder="예: 2026년 3월 기성 청구서"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="docSite">' + siteOpts + '</select></div>' +
            '<div class="form-group"><label>거래처</label>' +
            '<input type="text" class="form-control" id="docVendor" placeholder="예: (주)한국철강"></div>' +
            '</div>' +
            '<div class="form-group"><label>사진 첨부</label>' + this._renderPhotoArea() + '</div>' +
            '<div class="form-group"><label>비고</label>' +
            '<input type="text" class="form-control" id="docNote" placeholder="메모"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Documents.saveDocument()">등록</button></div>'
        );

        this.onStageChange(docType);
    },

    // 단계를 고르면 그 단계의 문서 종류만 보여준다
    onStageChange: function (preselect) {
        var sel = document.getElementById('docStage');
        var typeSel = document.getElementById('docType');
        if (!sel || !typeSel) return;

        var st = Store.getStage(sel.value);
        var h = '';
        if (st) {
            for (var i = 0; i < st.docs.length; i++) {
                var d = st.docs[i];
                h += '<option value="' + Store.escapeHtml(d.name) + '"' +
                    (d.name === preselect ? ' selected' : '') + '>' +
                    d.name + (d.required ? ' (필수)' : '') + '</option>';
            }
        }
        typeSel.innerHTML = h;

        // 문서명이 비어 있으면 "종류 - 현장" 으로 채워준다
        var nameEl = document.getElementById('docName');
        var siteEl = document.getElementById('docSite');
        if (nameEl && !nameEl.value && typeSel.value) {
            nameEl.value = typeSel.value + (siteEl && siteEl.value ? ' - ' + siteEl.value : '');
        }
    },

    saveDocument: function () {
        function v(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
        var name = v('docName');
        if (!name) { App.showToast('문서명을 입력해주세요.', 'error'); return; }

        if (typeof Photos !== 'undefined' && Photos.isBusy(this.PHOTO_ID)) {
            App.showToast('사진 업로드가 끝날 때까지 잠시만 기다려주세요.', 'info');
            return;
        }

        var photos = (typeof Photos !== 'undefined') ? Photos.getUploaded(this.PHOTO_ID) : [];
        var bytes = photos.reduce(function (s, p) { return s + (p.size || 0); }, 0);

        Store.addDocument({
            name: name,
            stage: v('docStage'),
            docType: v('docType'),
            type: v('docType'),            // 예전 필드와 호환
            siteName: v('docSite'),
            vendor: v('docVendor'),
            uploadDate: Store.getToday(),
            uploader: (App.currentUser && App.currentUser.name) || '사용자',
            fileSize: bytes ? (Math.round(bytes / 1024) + 'KB') : '-',
            photos: photos,
            note: v('docNote')
        });

        if (typeof Photos !== 'undefined') Photos.reset(this.PHOTO_ID);
        App.closeModal();
        App.refreshPage();
        App.showToast('문서가 등록되었습니다.' + (photos.length ? ' (사진 ' + photos.length + '장)' : ''), 'success');
    },

    showDetail: function (id) {
        var d = Store.getDocuments().find(function (x) { return x.id === id; });
        if (!d) return;
        var esc = Store.escapeHtml;
        var stage = Store.getStage(d.stage);

        function row(l, v) {
            return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);">' +
                '<span style="color:var(--text-muted);">' + l + '</span>' +
                '<span style="color:var(--text-primary);font-weight:600;">' + v + '</span></div>';
        }

        App.showModal(
            '<div class="modal-header"><h3>📄 문서 상세</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body"><div style="display:grid;gap:0;">' +
            row('문서명', esc(d.name)) +
            row('공사 단계', stage ? stage.label : '-') +
            row('문서 종류', esc(d.docType || d.type || '-')) +
            row('현장', esc(d.siteName || '본사')) +
            row('거래처', esc(d.vendor || '-')) +
            row('등록일', esc(d.uploadDate || '-')) +
            row('등록자', esc(d.uploader || '-')) +
            row('비고', esc(d.note || '-')) +
            '</div>' +
            (d.photos && d.photos.length
                ? '<div style="margin-top:14px;"><strong>📷 첨부 사진 (' + d.photos.length + '장)</strong>' +
                  '<div style="margin-top:8px;">' + Photos.renderGallery(d.photos) + '</div></div>'
                : '') +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">닫기</button></div>'
        );
    },

    confirmDelete: function (id) {
        if (!confirm('이 문서를 삭제하시겠습니까?')) return;
        Store.deleteDocument(id);
        App.refreshPage();
        App.showToast('문서가 삭제되었습니다.', 'info');
    },

    // ===== 모바일 =====

    renderMobile: function () {
        var esc = Store.escapeHtml;
        var sites = Store.getSites();
        if (!this.siteFilter && sites.length) this.siteFilter = sites[0].name;

        var siteOpts = '';
        for (var s = 0; s < sites.length; s++) {
            siteOpts += '<option value="' + esc(sites[s].name) + '"' +
                (sites[s].name === this.siteFilter ? ' selected' : '') + '>' + esc(sites[s].name) + '</option>';
        }

        if (!sites.length) {
            return MobileUI.pageHeader('📂 문서 관리', '', '') +
                MobileUI.emptyCard('🏗️', '현장을 먼저 등록해주세요', '현장 등록', "App.navigate('sites')");
        }

        // 모바일에서는 빠진 필수 서류만 간추려 보여준다
        var stages = Store.getSiteDocStatus(this.siteFilter);
        var missing = '';
        for (var i = 0; i < stages.length; i++) {
            for (var j = 0; j < stages[i].items.length; j++) {
                var it = stages[i].items[j];
                if (it.required && !it.count) {
                    missing += '<div class="mob-card" onclick="Documents.showAddModal(\'' + stages[i].id +
                        '\',\'' + esc(it.name).replace(/'/g, "\\'") + '\')">' +
                        '<div class="mob-card-row"><div>' +
                        '<div class="mob-card-title">⬜ ' + esc(it.name) + '</div>' +
                        '<div class="mob-card-meta"><span class="mob-card-sub">' + stages[i].label + '</span></div>' +
                        '</div><div class="mob-card-value" style="font-size:13px;">등록</div></div></div>';
                }
            }
        }
        if (!missing) {
            missing = '<div class="mob-card"><div class="mob-card-row"><div>' +
                '<div class="mob-card-title">✅ 필수 서류가 모두 준비됐습니다</div></div></div></div>';
        }

        return MobileUI.pageHeader('📂 문서 관리', '등록', 'Documents.showAddModal()') +
            '<select class="form-control" style="margin-bottom:12px;" onchange="Documents.setSite(this.value)">' +
            siteOpts + '</select>' +
            '<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">빠진 필수 서류</div>' +
            '<div class="mob-card-list">' + missing + '</div>';
    }
};
