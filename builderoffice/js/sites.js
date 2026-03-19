/* =======================================
   BuilderOffice - 현장 관리 (Site Management)
   ======================================= */

var Sites = {

    render: function () {
        var sites = Store.getSites();
        var stats = Store.getSiteStats();
        var currentSiteId = Store.getCurrentSiteId();
        var html = '<div class="page-section">' +
            '<div class="stat-cards">' +
            this._statCard('🏗️', '전체 현장', stats.total + '개', 'blue') +
            this._statCard('🔨', '진행중', stats.active + '개', 'green') +
            this._statCard('✅', '완료', stats.completed + '개', 'purple') +
            this._statCard('⏸️', '일시중지', stats.paused + '개', 'orange') +
            '</div>' +
            '<div class="card">' +
            '<div class="card-header">' +
            '<div class="card-title">현장 목록</div>' +
            '<button class="btn btn-primary btn-sm" onclick="Sites.openModal()">+ 현장 추가</button>' +
            '</div>' +
            (sites.length === 0 ?
                '<div class="empty-state"><div class="empty-icon">🏗️</div><p>등록된 현장이 없습니다.<br>현장을 추가하여 체계적으로 관리하세요.</p></div>' :
                '<div class="sites-grid">' + sites.map(function (s) { return Sites._renderSiteCard(s, currentSiteId); }).join('') + '</div>'
            ) +
            '</div>' +
            '</div>';
        return html;
    },

    _statCard: function (icon, label, value, color) {
        return '<div class="stat-card"><div class="stat-icon ' + color + '">' + icon + '</div>' +
            '<div class="stat-info"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + '</div></div></div>';
    },

    _renderSiteCard: function (site, currentSiteId) {
        var isActive = site.id === currentSiteId;
        var statusClass = { '진행중': 'green', '완료': 'blue', '일시중지': 'orange' }[site.status] || 'blue';
        var daysLeft = '';
        if (site.endDate && site.status === '진행중') {
            var diff = Math.ceil((new Date(site.endDate) - new Date()) / 86400000);
            daysLeft = diff > 0 ? 'D-' + diff : '기간초과';
        }
        var progress = '';
        if (site.startDate && site.endDate) {
            var total = new Date(site.endDate) - new Date(site.startDate);
            var elapsed = new Date() - new Date(site.startDate);
            var pct = Math.min(100, Math.max(0, Math.round(elapsed / total * 100)));
            progress = '<div class="site-progress">' +
                '<div class="site-progress-bar"><div class="site-progress-fill" style="width:' + pct + '%"></div></div>' +
                '<span class="site-progress-pct">' + pct + '% 경과</span>' +
                '</div>';
        }
        return '<div class="site-card' + (isActive ? ' site-card-active' : '') + '">' +
            '<div class="site-card-header">' +
            '<div><div class="site-name">' + site.name + '</div>' +
            (site.code ? '<div class="site-code">' + site.code + '</div>' : '') +
            '</div>' +
            '<span class="badge badge-' + statusClass + '">' + site.status + '</span>' +
            '</div>' +
            '<div class="site-meta"><span>📍 ' + (site.address || '주소 미입력') + '</span></div>' +
            '<div class="site-meta">' +
            (site.type ? '<span>🏢 ' + site.type + '</span>' : '') +
            (site.client ? '<span>👔 ' + site.client + '</span>' : '') +
            '</div>' +
            '<div class="site-meta">' +
            '<span>📅 ' + (site.startDate || '?') + ' ~ ' + (site.endDate || '?') + '</span>' +
            (daysLeft ? '<span class="site-days-left' + (daysLeft === '기간초과' ? ' overdue' : '') + '">' + daysLeft + '</span>' : '') +
            '</div>' +
            (site.manager ? '<div class="site-meta"><span>👤 ' + site.manager + (site.managerPhone ? ' (' + site.managerPhone + ')' : '') + '</span></div>' : '') +
            (site.contractAmount ? '<div class="site-meta"><span>💰 계약금액: ' + Store.formatCurrency(site.contractAmount) + '</span></div>' : '') +
            progress +
            '<div class="site-card-actions">' +
            '<button class="btn btn-sm ' + (isActive ? 'btn-primary' : 'btn-secondary') + '" onclick="Sites.selectSite(\'' + site.id + '\')">' +
            (isActive ? '✓ 선택됨' : '이 현장 선택') + '</button>' +
            '<button class="action-btn edit" onclick="Sites.openModal(\'' + site.id + '\')" title="편집">✏️</button>' +
            '<button class="action-btn delete" onclick="Sites.deleteSite(\'' + site.id + '\')" title="삭제">🗑️</button>' +
            '</div>' +
            '</div>';
    },

    openModal: function (id) {
        var site = id ? Store.getSites().find(function (s) { return s.id === id; }) : null;
        var v = function (field) { return site && site[field] ? site[field] : ''; };
        var typeOpts = [''].concat(Store.SITE_TYPES).map(function (t) {
            return '<option value="' + t + '"' + (v('type') === t ? ' selected' : '') + '>' + (t || '선택') + '</option>';
        }).join('');
        var statusOpts = Store.SITE_STATUSES.map(function (s) {
            return '<option value="' + s + '"' + (v('status') === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '현장 수정' : '현장 추가') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editSiteId" value="' + id + '">' : '') +
            '<div class="form-row">' +
            '<div class="form-group"><label>현장명 *</label><input type="text" class="form-control" id="si_name" value="' + v('name') + '" placeholder="예: 힐스테이트 광교 신축공사"></div>' +
            '<div class="form-group"><label>현장코드</label><input type="text" class="form-control" id="si_code" value="' + v('code') + '" placeholder="PRJ-001"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>공사 유형</label><select class="form-control" id="si_type">' + typeOpts + '</select></div>' +
            '<div class="form-group"><label>진행 상태</label><select class="form-control" id="si_status">' + statusOpts + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>현장 주소</label><input type="text" class="form-control" id="si_address" value="' + v('address') + '" placeholder="경기도 수원시..."></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>발주처</label><input type="text" class="form-control" id="si_client" value="' + v('client') + '"></div>' +
            '<div class="form-group"><label>원청사</label><input type="text" class="form-control" id="si_contractor" value="' + v('contractor') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>착공일</label><input type="date" class="form-control" id="si_startDate" value="' + v('startDate') + '"></div>' +
            '<div class="form-group"><label>준공(예정)일</label><input type="date" class="form-control" id="si_endDate" value="' + v('endDate') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>현장소장</label><input type="text" class="form-control" id="si_manager" value="' + v('manager') + '"></div>' +
            '<div class="form-group"><label>연락처</label><input type="text" class="form-control" id="si_managerPhone" value="' + v('managerPhone') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>계약금액 (원)</label><input type="number" class="form-control" id="si_contractAmount" value="' + v('contractAmount') + '" placeholder="0"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Sites.save()">저장</button>' +
            '</div>';
        App.showModal(html);
    },

    save: function () {
        var name = document.getElementById('si_name').value.trim();
        if (!name) { App.showToast('현장명을 입력해주세요.', 'error'); return; }
        var idEl = document.getElementById('editSiteId');
        var data = {
            name: name,
            code: document.getElementById('si_code').value.trim(),
            type: document.getElementById('si_type').value,
            status: document.getElementById('si_status').value || '진행중',
            address: document.getElementById('si_address').value.trim(),
            client: document.getElementById('si_client').value.trim(),
            contractor: document.getElementById('si_contractor').value.trim(),
            startDate: document.getElementById('si_startDate').value,
            endDate: document.getElementById('si_endDate').value,
            manager: document.getElementById('si_manager').value.trim(),
            managerPhone: document.getElementById('si_managerPhone').value.trim(),
            contractAmount: Number(document.getElementById('si_contractAmount').value) || 0,
        };
        if (idEl) {
            Store.updateSite(idEl.value, data);
            App.showToast('현장 정보가 수정되었습니다.', 'success');
        } else {
            Store.addSite(data);
            App.showToast('현장이 추가되었습니다.', 'success');
        }
        App.closeModal();
        App.refreshPage();
        Sites.updateSiteSelector();
    },

    deleteSite: function (id) {
        if (!confirm('이 현장을 삭제하시겠습니까?')) return;
        Store.deleteSite(id);
        if (Store.getCurrentSiteId() === id) Store.setCurrentSiteId('all');
        App.showToast('현장이 삭제되었습니다.', 'success');
        App.refreshPage();
        Sites.updateSiteSelector();
    },

    selectSite: function (siteId) {
        Store.setCurrentSiteId(siteId);
        var site = Store.getSites().find(function (s) { return s.id === siteId; });
        App.showToast((site ? site.name : '전체 현장') + ' 선택됨', 'info');
        App.refreshPage();
        Sites.updateSiteSelector();
    },

    updateSiteSelector: function () {
        var sel = document.getElementById('siteSelector');
        if (!sel) return;
        var sites = Store.getSites();
        var currentId = Store.getCurrentSiteId();
        sel.innerHTML = '<option value="all">📍 전체 현장</option>' +
            sites.map(function (s) {
                return '<option value="' + s.id + '"' + (s.id === currentId ? ' selected' : '') + '>' + s.name + '</option>';
            }).join('');
        sel.value = currentId;
    }
};
