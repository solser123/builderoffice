/* =======================================
   BuilderOffice - Site Management Module
   현장 관리 페이지
   ======================================= */

var Sites = {
    render: function () {
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

    showSiteDetail: function (id) {
        var site = Store.getSites().find(function (s) { return s.id === id; });
        if (!site) return;
        var esc = Store.escapeHtml;
        var row = function (label, val) {
            return '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">' + label + '</span><span style="color:var(--text-primary);font-weight:600;">' + val + '</span></div>';
        };

        var html = '<div class="modal-header"><h3>🏗️ ' + esc(site.name) + '</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body"><div style="display:grid;gap:0;">' +
            row('발주처', esc(site.client || '-')) +
            row('현장소장', esc(site.manager || '-')) +
            row('주소', esc(site.address || '-')) +
            row('착공일', esc(site.startDate || '-')) +
            row('준공예정일', esc(site.endDate || '-')) +
            row('도급금액', Store.formatCurrency(site.contractAmount || 0)) +
            row('공정률', (site.progress || 0) + '%') +
            row('상태', '<span class="badge ' + (site.status === '진행중' ? 'badge-green' : 'badge-orange') + '">' + esc(site.status) + '</span>') +
            row('비고', esc(site.memo || '-')) +
            '</div></div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-danger" onclick="Sites.confirmDelete(\'' + id + '\')">삭제</button>' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">닫기</button>' +
            '<button class="btn btn-primary" onclick="App.closeModal(); Sites.showEditModal(\'' + id + '\')">수정</button>' +
            '</div>';
        App.showModal(html);
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
    }
};
