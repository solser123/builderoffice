/* =======================================
   BuilderOffice - 전자결재 (Approvals)
   ======================================= */

var Approvals = {
    filterStatus: '전체',
    filterType: '전체',

    render: function () {
        var all = Store.getApprovals();
        var pending = all.filter(function (a) { return a.status === '대기중'; });
        var approved = all.filter(function (a) { return a.status === '승인'; });
        var rejected = all.filter(function (a) { return a.status === '반려'; });

        var filtered = all.filter(function (a) {
            var stMatch = Approvals.filterStatus === '전체' || a.status === Approvals.filterStatus;
            var tyMatch = Approvals.filterType === '전체' || a.type === Approvals.filterType;
            return stMatch && tyMatch;
        });

        var statusOpts = ['전체', '대기중', '승인', '반려'].map(function (s) {
            return '<option value="' + s + '"' + (Approvals.filterStatus === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('');
        var typeOpts = ['전체'].concat(Store.APPROVAL_TYPES).map(function (t) {
            return '<option value="' + t + '"' + (Approvals.filterType === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('');

        var pendingTotal = pending.reduce(function (s, a) { return s + Number(a.amount || 0); }, 0);

        return '<div class="page-section">' +
            '<div class="stat-cards">' +
            '<div class="stat-card" style="cursor:pointer" onclick="Approvals.filterStatus=\'대기중\';App.refreshPage()">' +
            '<div class="stat-icon orange">⏳</div><div class="stat-info"><div class="stat-label">결재 대기</div><div class="stat-value">' + pending.length + '건</div>' +
            '<div style="font-size:12px;color:#94a3b8;margin-top:2px">' + Store.formatCurrency(pendingTotal) + '</div></div></div>' +
            '<div class="stat-card" style="cursor:pointer" onclick="Approvals.filterStatus=\'승인\';App.refreshPage()">' +
            '<div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-label">승인</div><div class="stat-value">' + approved.length + '건</div></div></div>' +
            '<div class="stat-card" style="cursor:pointer" onclick="Approvals.filterStatus=\'반려\';App.refreshPage()">' +
            '<div class="stat-icon red">✗</div><div class="stat-info"><div class="stat-label">반려</div><div class="stat-value">' + rejected.length + '건</div></div></div>' +
            '<div class="stat-card" style="cursor:pointer" onclick="Approvals.filterStatus=\'전체\';App.refreshPage()">' +
            '<div class="stat-icon blue">📋</div><div class="stat-info"><div class="stat-label">전체</div><div class="stat-value">' + all.length + '건</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card-header"><div class="card-title">전자결재 목록</div>' +
            '<button class="btn btn-primary btn-sm" onclick="Approvals.openModal()">+ 결재 요청</button>' +
            '</div>' +
            '<div class="toolbar">' +
            '<div class="toolbar-left">' +
            '<select class="filter-select" onchange="Approvals.filterStatus=this.value;App.refreshPage()">' + statusOpts + '</select>' +
            '<select class="filter-select" onchange="Approvals.filterType=this.value;App.refreshPage()">' + typeOpts + '</select>' +
            '</div>' +
            '</div>' +
            (filtered.length === 0 ?
                '<div class="empty-state"><div class="empty-icon">📋</div><p>결재 요청이 없습니다.</p></div>' :
                '<div class="approvals-list">' + filtered.map(function (a) { return Approvals._renderCard(a); }).join('') + '</div>'
            ) +
            '</div></div>';
    },

    _renderCard: function (a) {
        var statusClass = { '대기중': 'orange', '승인': 'green', '반려': 'red' }[a.status] || 'blue';
        var statusIcon = { '대기중': '⏳', '승인': '✅', '반려': '✗' }[a.status] || '📋';
        var typeClass = {
            '비용결재': 'blue', '자재요청': 'purple', '인원요청': 'green', '공사계획': 'orange', '기타': 'blue'
        }[a.type] || 'blue';

        var actionBtns = '';
        if (a.status === '대기중') {
            actionBtns = '<button class="btn btn-sm" style="background:rgba(16,185,129,0.15);color:#059669;border:1px solid rgba(16,185,129,0.3)" onclick="Approvals.approve(\'' + a.id + '\')">✅ 승인</button>' +
                '<button class="btn btn-sm" style="background:rgba(239,68,68,0.15);color:#dc2626;border:1px solid rgba(239,68,68,0.3)" onclick="Approvals.reject(\'' + a.id + '\')">✗ 반려</button>';
        }

        return '<div class="approval-card">' +
            '<div class="approval-card-header">' +
            '<div class="approval-left">' +
            '<span class="badge badge-' + typeClass + '" style="margin-right:8px">' + a.type + '</span>' +
            '<span class="approval-title">' + a.title + '</span>' +
            '</div>' +
            '<div class="approval-right">' +
            '<span class="badge badge-' + statusClass + '">' + statusIcon + ' ' + a.status + '</span>' +
            '</div>' +
            '</div>' +
            '<div class="approval-body">' +
            '<div class="approval-meta">' +
            (a.siteName ? '<span>🏗️ ' + a.siteName + '</span>' : '') +
            (a.amount ? '<span class="approval-amount">💰 ' + Store.formatCurrency(a.amount) + '</span>' : '') +
            '<span>👤 ' + (a.requestor || '-') + '</span>' +
            '<span>📅 ' + (a.requestDate || '-') + '</span>' +
            '</div>' +
            (a.description ? '<div class="approval-desc">' + a.description + '</div>' : '') +
            (a.status !== '대기중' && (a.approvedBy || a.approvalDate) ?
                '<div class="approval-result ' + (a.status === '반려' ? 'rejected' : 'approved') + '">' +
                statusIcon + ' ' + a.status + ' · ' + a.approvedBy + ' · ' + a.approvalDate +
                (a.rejectReason ? '<br>사유: ' + a.rejectReason : '') +
                '</div>' : '') +
            '</div>' +
            '<div class="approval-footer">' +
            actionBtns +
            '<button class="action-btn edit" onclick="Approvals.openModal(\'' + a.id + '\')" title="편집">✏️</button>' +
            '<button class="action-btn delete" onclick="Approvals.deleteApproval(\'' + a.id + '\')" title="삭제">🗑️</button>' +
            '</div>' +
            '</div>';
    },

    openModal: function (id) {
        var a = id ? Store.getApprovals().find(function (x) { return x.id === id; }) : null;
        var v = function (f, def) { return a && a[f] !== undefined ? a[f] : (def || ''); };
        var today = Store.getToday();
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();

        var siteOpts = '<option value="">현장 선택</option>' + sites.map(function (s) {
            var sel = (v('siteId') === s.id) || (!a && currentSiteId === s.id) ? ' selected' : '';
            return '<option value="' + s.id + '" data-name="' + s.name + '"' + sel + '>' + s.name + '</option>';
        }).join('');
        var typeOpts = Store.APPROVAL_TYPES.map(function (t) {
            return '<option value="' + t + '"' + (v('type') === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '결재 수정' : '결재 요청') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editApprovalId" value="' + id + '">' : '') +
            '<div class="form-row">' +
            '<div class="form-group"><label>결재 유형 *</label><select class="form-control" id="ap_type">' + typeOpts + '</select></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="ap_site">' + siteOpts + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>제목 *</label><input type="text" class="form-control" id="ap_title" value="' + v('title') + '" placeholder="결재 요청 제목"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>금액 (원)</label><input type="number" class="form-control" id="ap_amount" value="' + v('amount') + '" placeholder="0"></div>' +
            '<div class="form-group"><label>요청일</label><input type="date" class="form-control" id="ap_date" value="' + v('requestDate', today) + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>요청자</label><input type="text" class="form-control" id="ap_requestor" value="' + v('requestor') + '" placeholder="현장소장 이름"></div>' +
            '<div class="form-group"><label>상세 내용</label><textarea class="form-control" id="ap_desc" rows="4" placeholder="결재 요청 내용을 상세히 기술하세요.">' + v('description') + '</textarea></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Approvals.save()">저장</button>' +
            '</div>';
        App.showModal(html);
    },

    save: function () {
        var title = document.getElementById('ap_title').value.trim();
        if (!title) { App.showToast('제목을 입력해주세요.', 'error'); return; }
        var siteEl = document.getElementById('ap_site');
        var siteId = siteEl.value;
        var siteName = siteEl.selectedOptions[0] && siteEl.value ? siteEl.selectedOptions[0].text : '';
        var idEl = document.getElementById('editApprovalId');
        var data = {
            type: document.getElementById('ap_type').value,
            title: title,
            amount: Number(document.getElementById('ap_amount').value) || 0,
            requestDate: document.getElementById('ap_date').value,
            requestor: document.getElementById('ap_requestor').value.trim(),
            description: document.getElementById('ap_desc').value.trim(),
            siteId: siteId,
            siteName: siteName,
            status: '대기중',
            approvedBy: '',
            approvalDate: '',
            rejectReason: '',
        };
        if (idEl) {
            var existing = Store.getApprovals().find(function (a) { return a.id === idEl.value; });
            if (existing) { data.status = existing.status; data.approvedBy = existing.approvedBy; data.approvalDate = existing.approvalDate; data.rejectReason = existing.rejectReason; }
            Store.updateApproval(idEl.value, data);
            App.showToast('결재 정보가 수정되었습니다.', 'success');
        } else {
            Store.addApproval(data);
            App.showToast('결재 요청이 등록되었습니다.', 'success');
        }
        App.closeModal();
        App.refreshPage();
    },

    approve: function (id) {
        var approver = prompt('승인자 이름을 입력하세요:');
        if (!approver) return;
        Store.updateApproval(id, { status: '승인', approvedBy: approver, approvalDate: Store.getToday(), rejectReason: '' });
        App.showToast('결재가 승인되었습니다.', 'success');
        App.refreshPage();
    },

    reject: function (id) {
        var reason = prompt('반려 사유를 입력하세요:');
        if (!reason) return;
        var approver = prompt('반려자 이름:') || '담당자';
        Store.updateApproval(id, { status: '반려', approvedBy: approver, approvalDate: Store.getToday(), rejectReason: reason });
        App.showToast('결재가 반려되었습니다.', 'info');
        App.refreshPage();
    },

    deleteApproval: function (id) {
        if (!confirm('이 결재 건을 삭제하시겠습니까?')) return;
        Store.deleteApproval(id);
        App.showToast('삭제되었습니다.', 'success');
        App.refreshPage();
    }
};
