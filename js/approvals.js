/* =======================================
   BuilderOffice - Approval Module
   승인함 (결재 대기, 승인, 반려)
   ======================================= */

var Approvals = {
    statusFilter: 'all',

    render: function () {
        var approvals = Store.getApprovals();
        var pending = approvals.filter(function (a) { return a.status === '대기'; });
        var approved = approvals.filter(function (a) { return a.status === '승인'; });
        var rejected = approvals.filter(function (a) { return a.status === '반려'; });

        var filtered = this.statusFilter === 'all' ? approvals :
            approvals.filter(function (a) { return a.status === Approvals.statusFilter; });

        var esc = Store.escapeHtml;
        var cards = '';

        if (filtered.length > 0) {
            for (var i = 0; i < filtered.length; i++) {
                var a = filtered[i];
                var statusClass = a.status === '대기' ? 'approval-pending' : a.status === '승인' ? 'approval-approved' : 'approval-rejected';
                var statusBadge = a.status === '대기' ? 'badge-orange' : a.status === '승인' ? 'badge-green' : 'badge-red';
                var typeIcon = { '일일입력': '📝', '비용': '💰', '안전': '🦺', '문서': '📄' };

                cards += '<div class="approval-card ' + statusClass + '">' +
                    '<div class="approval-card-top">' +
                    '<div class="approval-type"><span>' + (typeIcon[a.type] || '📋') + '</span> ' + esc(a.type) + '</div>' +
                    '<span class="badge ' + statusBadge + '">' + esc(a.status) + '</span>' +
                    '</div>' +
                    '<div class="approval-title">' + esc(a.title) + '</div>' +
                    '<div class="approval-meta">' +
                    '<span>요청: ' + esc(a.requester || '-') + '</span>' +
                    '<span>' + esc(a.requestDate || '-') + '</span>' +
                    '</div>' +
                    (a.detail ? '<div class="approval-detail">' + esc(a.detail) + '</div>' : '') +
                    (a.status === '대기' ?
                        '<div class="approval-actions">' +
                        '<button class="btn btn-danger btn-sm" onclick="Approvals.reject(\'' + a.id + '\')">반려</button>' +
                        '<button class="btn btn-primary btn-sm" onclick="Approvals.approve(\'' + a.id + '\')">승인</button>' +
                        '</div>' :
                        (a.approver ? '<div class="approval-result">' + (a.status === '승인' ? '✅' : '❌') + ' ' + esc(a.approver) + ' · ' + esc(a.approvedDate || '') + '</div>' : '')) +
                    '</div>';
            }
        } else {
            cards = '<div class="empty-state"><div class="empty-icon">✅</div><p>해당하는 결재 건이 없습니다</p></div>';
        }

        return '<div class="stat-cards">' +
            '<div class="stat-card" onclick="Approvals.setFilter(\'대기\')" style="cursor:pointer;"><div class="stat-icon orange">⏳</div><div class="stat-info"><div class="stat-label">결재 대기</div><div class="stat-value">' + pending.length + '건</div></div></div>' +
            '<div class="stat-card" onclick="Approvals.setFilter(\'승인\')" style="cursor:pointer;"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-label">승인 완료</div><div class="stat-value">' + approved.length + '건</div></div></div>' +
            '<div class="stat-card" onclick="Approvals.setFilter(\'반려\')" style="cursor:pointer;"><div class="stat-icon red">❌</div><div class="stat-info"><div class="stat-label">반려</div><div class="stat-value">' + rejected.length + '건</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="toolbar">' +
            '<div class="toolbar-left">' +
            '<select class="filter-select" onchange="Approvals.setFilter(this.value)">' +
            '<option value="all"' + (this.statusFilter === 'all' ? ' selected' : '') + '>전체</option>' +
            '<option value="대기"' + (this.statusFilter === '대기' ? ' selected' : '') + '>대기</option>' +
            '<option value="승인"' + (this.statusFilter === '승인' ? ' selected' : '') + '>승인</option>' +
            '<option value="반려"' + (this.statusFilter === '반려' ? ' selected' : '') + '>반려</option>' +
            '</select>' +
            '<span style="color:var(--text-muted);font-size:13px;">' + filtered.length + '건</span>' +
            '</div>' +
            '</div>' +
            '<div class="approval-list">' + cards + '</div>' +
            '</div>';
    },

    setFilter: function (val) {
        this.statusFilter = val;
        App.refreshPage();
    },

    approve: function (id) {
        Store.updateApproval(id, {
            status: '승인',
            approver: (App.currentUser && App.currentUser.name) || '관리자',
            approvedDate: Store.getToday()
        });
        App.refreshPage();
        App.showToast('승인 처리되었습니다.', 'success');
    },

    reject: function (id) {
        var reason = prompt('반려 사유를 입력해주세요:');
        if (reason === null) return;

        Store.updateApproval(id, {
            status: '반려',
            approver: (App.currentUser && App.currentUser.name) || '관리자',
            approvedDate: Store.getToday(),
            rejectReason: reason
        });
        App.refreshPage();
        App.showToast('반려 처리되었습니다.', 'info');
    }
};
