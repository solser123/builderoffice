/* =======================================
   BuilderOffice - 계약/기성 관리 (Contracts & Billings)
   계약 관리 + 기성 청구/관리
   ======================================= */

var Contracts = {
    currentTab: 'contracts',

    render: function () {
        var contracts = Store.getContracts();
        var billings = Store.getBillings();
        var totalContract = 0, totalBilled = 0, totalPaid = 0;
        for (var i = 0; i < contracts.length; i++) {
            totalContract += Number(contracts[i].amount) || 0;
        }
        for (var j = 0; j < billings.length; j++) {
            totalBilled += Number(billings[j].amount) || 0;
            if (billings[j].status === '수금완료') totalPaid += Number(billings[j].amount) || 0;
        }

        var html = '<div class="page-section">' +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">📄</div><div class="stat-info"><div class="stat-label">총 계약액</div><div class="stat-value">' + Store.formatCurrency(totalContract) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">📑</div><div class="stat-info"><div class="stat-label">기성 청구액</div><div class="stat-value">' + Store.formatCurrency(totalBilled) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">💰</div><div class="stat-info"><div class="stat-label">수금 완료액</div><div class="stat-value">' + Store.formatCurrency(totalPaid) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon ' + (totalBilled - totalPaid > 0 ? 'red' : 'green') + '">⏳</div><div class="stat-info"><div class="stat-label">미수금</div><div class="stat-value">' + Store.formatCurrency(totalBilled - totalPaid) + '</div></div></div>' +
            '</div>' +
            '<div class="tab-nav">' +
            '<button class="tab-btn' + (this.currentTab === 'contracts' ? ' active' : '') + '" onclick="Contracts.setTab(\'contracts\')">📄 계약 관리</button>' +
            '<button class="tab-btn' + (this.currentTab === 'billings' ? ' active' : '') + '" onclick="Contracts.setTab(\'billings\')">📑 기성 관리</button>' +
            '</div>';

        if (this.currentTab === 'contracts') html += this._renderContracts();
        else html += this._renderBillings();

        html += '</div>';
        return html;
    },

    setTab: function (tab) {
        this.currentTab = tab;
        App.refreshPage();
    },

    // ========== 계약 관리 ==========
    _renderContracts: function () {
        var contracts = Store.getContracts();
        var html = '<div class="card"><div class="card-header"><div class="card-title">계약 목록</div>' +
            '<button class="btn btn-primary btn-sm" onclick="Contracts.openContractModal()">+ 계약 등록</button></div>';

        if (contracts.length === 0) {
            html += '<div class="empty-state"><div class="empty-icon">📄</div><p>등록된 계약이 없습니다.</p></div>';
        } else {
            html += '<div class="dl-list">';
            for (var i = 0; i < contracts.length; i++) {
                var c = contracts[i];
                var statusClass = { '진행중': 'blue', '완료': 'green', '해지': 'red', '대기': 'orange' }[c.status] || 'blue';
                var typeClass = { '원도급': 'purple', '하도급': 'blue', '자재': 'orange', '장비': 'green' }[c.type] || 'blue';

                html += '<div class="dl-card">' +
                    '<div class="dl-card-header">' +
                    '<div class="dl-date-wrap">' +
                    '<div class="dl-date">' + c.name + '</div>' +
                    '<div class="dl-site">' + (c.siteName || '') + ' · ' + (c.contractor || '') + '</div>' +
                    '</div>' +
                    '<div class="dl-meta-right">' +
                    '<span class="badge badge-' + typeClass + '">' + (c.type || '계약') + '</span>' +
                    '<span class="badge badge-' + statusClass + '">' + c.status + '</span>' +
                    '</div></div>' +
                    '<div class="contract-detail">' +
                    '<div class="contract-row"><span>계약금액</span><strong>' + Store.formatCurrency(c.amount) + '</strong></div>' +
                    '<div class="contract-row"><span>계약기간</span><span>' + (c.startDate || '') + ' ~ ' + (c.endDate || '') + '</span></div>' +
                    (c.description ? '<div style="font-size:0.83rem;color:var(--text-secondary);margin-top:6px">' + c.description + '</div>' : '') +
                    '</div>' +
                    '<div class="dl-footer">' +
                    '<span class="dl-writer">등록일: ' + (c.createdAt || c.startDate || '-') + '</span>' +
                    '<div class="action-btns">' +
                    '<button class="action-btn edit" onclick="Contracts.openContractModal(\'' + c.id + '\')" title="수정">✏️</button>' +
                    '<button class="action-btn delete" onclick="Contracts.deleteContract(\'' + c.id + '\')" title="삭제">🗑️</button>' +
                    '</div></div></div>';
            }
            html += '</div>';
        }
        return html + '</div>';
    },

    openContractModal: function (id) {
        var c = id ? Store.getContracts().find(function (x) { return x.id === id; }) : null;
        var v = function (f, d) { return c && c[f] !== undefined ? c[f] : (d || ''); };
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();

        var siteOpts = '<option value="">현장 선택</option>' + sites.map(function (s) {
            var sel = (v('siteId') === s.id) || (!c && currentSiteId === s.id) ? ' selected' : '';
            return '<option value="' + s.id + '" data-name="' + s.name + '"' + sel + '>' + s.name + '</option>';
        }).join('');

        var typeOpts = Store.CONTRACT_TYPES.map(function (t) {
            return '<option value="' + t + '"' + (v('type') === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('');

        var statusOpts = Store.CONTRACT_STATUSES.map(function (s) {
            return '<option value="' + s + '"' + (v('status', '진행중') === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '계약 수정' : '계약 등록') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editContractId" value="' + id + '">' : '') +
            '<div class="form-group"><label>계약명</label><input type="text" class="form-control" id="ct_name" value="' + v('name') + '" placeholder="예: 골조공사 하도급 계약"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="ct_site">' + siteOpts + '</select></div>' +
            '<div class="form-group"><label>계약 유형</label><select class="form-control" id="ct_type">' + typeOpts + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>계약 상대방</label><input type="text" class="form-control" id="ct_contractor" value="' + v('contractor') + '" placeholder="업체명"></div>' +
            '<div class="form-group"><label>계약금액 (원)</label><input type="number" class="form-control" id="ct_amount" value="' + v('amount', 0) + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>시작일</label><input type="date" class="form-control" id="ct_start" value="' + v('startDate') + '"></div>' +
            '<div class="form-group"><label>종료일</label><input type="date" class="form-control" id="ct_end" value="' + v('endDate') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="ct_status">' + statusOpts + '</select></div>' +
            '<div class="form-group"><label>비고</label><textarea class="form-control" id="ct_desc" rows="2">' + v('description') + '</textarea></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Contracts.saveContract()">저장</button></div>';
        App.showModal(html);
    },

    saveContract: function () {
        var name = document.getElementById('ct_name').value.trim();
        if (!name) { App.showToast('계약명을 입력해주세요.', 'error'); return; }
        var siteEl = document.getElementById('ct_site');
        var data = {
            name: name,
            siteId: siteEl.value,
            siteName: siteEl.selectedOptions[0] && siteEl.value ? siteEl.selectedOptions[0].text : '',
            type: document.getElementById('ct_type').value,
            contractor: document.getElementById('ct_contractor').value.trim(),
            amount: Number(document.getElementById('ct_amount').value) || 0,
            startDate: document.getElementById('ct_start').value,
            endDate: document.getElementById('ct_end').value,
            status: document.getElementById('ct_status').value,
            description: document.getElementById('ct_desc').value.trim(),
        };
        var idEl = document.getElementById('editContractId');
        if (idEl) { Store.updateContract(idEl.value, data); App.showToast('수정되었습니다.', 'success'); }
        else { data.createdAt = Store.getToday(); Store.addContract(data); App.showToast('계약이 등록되었습니다.', 'success'); }
        App.closeModal(); App.refreshPage();
    },

    deleteContract: function (id) {
        if (!confirm('계약을 삭제하시겠습니까?')) return;
        Store.deleteContract(id); App.showToast('삭제됨', 'success'); App.refreshPage();
    },

    // ========== 기성 관리 ==========
    _renderBillings: function () {
        var billings = Store.getBillings();
        var contracts = Store.getContracts();
        var html = '<div class="card"><div class="card-header"><div class="card-title">기성 청구 목록</div>' +
            '<button class="btn btn-primary btn-sm" onclick="Contracts.openBillingModal()">+ 기성 등록</button></div>';

        if (billings.length === 0) {
            html += '<div class="empty-state"><div class="empty-icon">📑</div><p>기성 청구 기록이 없습니다.</p></div>';
        } else {
            html += '<div class="table-container"><table><thead><tr>' +
                '<th>회차</th><th>계약</th><th>기성기간</th><th>청구금액</th><th>누적금액</th><th>상태</th><th></th>' +
                '</tr></thead><tbody>';
            for (var i = 0; i < billings.length; i++) {
                var b = billings[i];
                var stClass = { '청구중': 'orange', '승인': 'blue', '수금완료': 'green', '반려': 'red' }[b.status] || 'blue';
                var contract = contracts.find(function (ct) { return ct.id === b.contractId; });
                html += '<tr>' +
                    '<td style="font-weight:700">' + (b.round || '-') + '차</td>' +
                    '<td>' + (contract ? contract.name : (b.contractName || '-')) + '</td>' +
                    '<td style="font-size:0.82rem">' + (b.periodStart || '') + ' ~ ' + (b.periodEnd || '') + '</td>' +
                    '<td style="font-weight:700;color:#4f46e5">' + Store.formatCurrency(b.amount) + '</td>' +
                    '<td style="font-size:0.82rem">' + Store.formatCurrency(b.cumulativeAmount || b.amount) + '</td>' +
                    '<td><span class="badge badge-' + stClass + '">' + b.status + '</span></td>' +
                    '<td><div class="action-btns">' +
                    '<button class="action-btn edit" onclick="Contracts.openBillingModal(\'' + b.id + '\')">✏️</button>' +
                    '<button class="action-btn delete" onclick="Contracts.deleteBilling(\'' + b.id + '\')">🗑️</button>' +
                    '</div></td></tr>';
            }
            html += '</tbody></table></div>';
        }
        return html + '</div>';
    },

    openBillingModal: function (id) {
        var b = id ? Store.getBillings().find(function (x) { return x.id === id; }) : null;
        var v = function (f, d) { return b && b[f] !== undefined ? b[f] : (d || ''); };
        var contracts = Store.getContracts();

        var contractOpts = '<option value="">계약 선택</option>' + contracts.map(function (c) {
            var sel = v('contractId') === c.id ? ' selected' : '';
            return '<option value="' + c.id + '" data-name="' + c.name + '"' + sel + '>' + c.name + ' (' + Store.formatCurrency(c.amount) + ')</option>';
        }).join('');

        var statusOpts = Store.BILLING_STATUSES.map(function (s) {
            return '<option value="' + s + '"' + (v('status', '청구중') === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '기성 수정' : '기성 등록') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editBillingId" value="' + id + '">' : '') +
            '<div class="form-row">' +
            '<div class="form-group"><label>계약</label><select class="form-control" id="bl_contract">' + contractOpts + '</select></div>' +
            '<div class="form-group"><label>회차</label><input type="number" class="form-control" id="bl_round" value="' + v('round', 1) + '" min="1"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>기성 시작일</label><input type="date" class="form-control" id="bl_start" value="' + v('periodStart') + '"></div>' +
            '<div class="form-group"><label>기성 종료일</label><input type="date" class="form-control" id="bl_end" value="' + v('periodEnd') + '"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>청구금액 (원)</label><input type="number" class="form-control" id="bl_amount" value="' + v('amount', 0) + '"></div>' +
            '<div class="form-group"><label>누적금액 (원)</label><input type="number" class="form-control" id="bl_cumulative" value="' + v('cumulativeAmount', 0) + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="bl_status">' + statusOpts + '</select></div>' +
            '<div class="form-group"><label>비고</label><textarea class="form-control" id="bl_desc" rows="2">' + v('description') + '</textarea></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Contracts.saveBilling()">저장</button></div>';
        App.showModal(html);
    },

    saveBilling: function () {
        var contractEl = document.getElementById('bl_contract');
        if (!contractEl.value) { App.showToast('계약을 선택해주세요.', 'error'); return; }
        var data = {
            contractId: contractEl.value,
            contractName: contractEl.selectedOptions[0] ? contractEl.selectedOptions[0].text : '',
            round: Number(document.getElementById('bl_round').value) || 1,
            periodStart: document.getElementById('bl_start').value,
            periodEnd: document.getElementById('bl_end').value,
            amount: Number(document.getElementById('bl_amount').value) || 0,
            cumulativeAmount: Number(document.getElementById('bl_cumulative').value) || 0,
            status: document.getElementById('bl_status').value,
            description: document.getElementById('bl_desc').value.trim(),
        };
        var idEl = document.getElementById('editBillingId');
        if (idEl) { Store.updateBilling(idEl.value, data); App.showToast('수정되었습니다.', 'success'); }
        else { Store.addBilling(data); App.showToast('기성이 등록되었습니다.', 'success'); }
        App.closeModal(); App.refreshPage();
    },

    deleteBilling: function (id) {
        if (!confirm('삭제하시겠습니까?')) return;
        Store.deleteBilling(id); App.showToast('삭제됨', 'success'); App.refreshPage();
    }
};
