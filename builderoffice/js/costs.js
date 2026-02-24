/* =======================================
   BuilderOffice - Cost Management Module
   비용 관리 페이지
   ======================================= */

var Costs = {
    currentFilter: 'all',
    currentDateFilter: '',

    render: function () {
        var costs = this._getFilteredCosts();
        var stats = Store.getCostStats();
        var total = costs.reduce(function (sum, c) { return sum + Number(c.amount); }, 0);

        var catOptions = '';
        for (var i = 0; i < Store.COST_CATEGORIES.length; i++) {
            var sel = this.currentFilter === Store.COST_CATEGORIES[i] ? ' selected' : '';
            catOptions += '<option value="' + Store.COST_CATEGORIES[i] + '"' + sel + '>' + Store.COST_CATEGORIES[i] + '</option>';
        }

        var rows = '';
        if (costs.length > 0) {
            for (var j = 0; j < costs.length; j++) {
                var c = costs[j];
                rows += '<tr>' +
                    '<td>' + c.date + '</td>' +
                    '<td><span class="badge badge-blue">' + c.category + '</span></td>' +
                    '<td style="color: var(--text-primary); font-weight: 500;">' + c.name + '</td>' +
                    '<td class="amount">' + Store.formatCurrency(c.amount) + '</td>' +
                    '<td>' + (c.memo || '-') + '</td>' +
                    '<td><div class="action-btns">' +
                    '<button class="action-btn edit" onclick="Costs.showEditModal(\'' + c.id + '\')" title="수정">✏️</button>' +
                    '<button class="action-btn delete" onclick="Costs.confirmDelete(\'' + c.id + '\')" title="삭제">🗑️</button>' +
                    '</div></td>' +
                    '</tr>';
            }
        } else {
            rows = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">💰</div><p>등록된 비용이 없습니다</p>' +
                '<button class="btn btn-primary" onclick="Costs.showAddModal()">첫 비용 추가하기</button></div></td></tr>';
        }

        var summaryHtml = costs.length > 0 ? '<div class="summary-row"><span>합계:</span> ' + Store.formatCurrency(total) + '</div>' : '';

        return '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">💰</div><div class="stat-info"><div class="stat-label">총 비용</div><div class="stat-value">' + Store.formatCurrency(stats.total) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">📅</div><div class="stat-info"><div class="stat-label">이번 달</div><div class="stat-value">' + Store.formatCurrency(stats.monthTotal) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">📝</div><div class="stat-info"><div class="stat-label">등록 건수</div><div class="stat-value">' + stats.count + '건</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="toolbar">' +
            '<div class="toolbar-left">' +
            '<select class="filter-select" id="costCategoryFilter" onchange="Costs.setFilter(this.value)"><option value="all">전체 카테고리</option>' + catOptions + '</select>' +
            '<input type="date" class="filter-input" id="costDateFilter" value="' + this.currentDateFilter + '" onchange="Costs.setDateFilter(this.value)">' +
            '</div>' +
            '<button class="btn btn-primary" onclick="Costs.showAddModal()">➕ 비용 추가</button>' +
            '</div>' +
            '<div class="table-container"><table><thead><tr><th>날짜</th><th>카테고리</th><th>항목명</th><th>금액</th><th>메모</th><th>작업</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table>' + summaryHtml + '</div>' +
            '</div>';
    },

    _getFilteredCosts: function () {
        var costs = Store.getCosts();
        var self = this;
        if (this.currentFilter !== 'all') {
            costs = costs.filter(function (c) { return c.category === self.currentFilter; });
        }
        if (this.currentDateFilter) {
            costs = costs.filter(function (c) { return c.date === self.currentDateFilter; });
        }
        return costs;
    },

    setFilter: function (val) {
        this.currentFilter = val;
        App.refreshPage();
    },

    setDateFilter: function (val) {
        this.currentDateFilter = val;
        App.refreshPage();
    },

    showAddModal: function () {
        var catOptions = '';
        for (var i = 0; i < Store.COST_CATEGORIES.length; i++) {
            catOptions += '<option value="' + Store.COST_CATEGORIES[i] + '">' + Store.COST_CATEGORIES[i] + '</option>';
        }

        var html = '<div class="modal-header"><h3>💰 비용 추가</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="costDate" value="' + Store.getToday() + '"></div>' +
            '<div class="form-group"><label>카테고리</label><select class="form-control" id="costCategory">' + catOptions + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>항목명</label><input type="text" class="form-control" id="costName" placeholder="예: 철근 D16 구매"></div>' +
            '<div class="form-group"><label>금액 (원)</label><input type="number" class="form-control" id="costAmount" placeholder="0"></div>' +
            '<div class="form-group"><label>메모</label><input type="text" class="form-control" id="costMemo" placeholder="상세 내용"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button><button class="btn btn-primary" onclick="Costs.saveCost()">저장</button></div>';
        App.showModal(html);
    },

    showEditModal: function (id) {
        var cost = Store.getCosts().find(function (c) { return c.id === id; });
        if (!cost) return;

        var catOptions = '';
        for (var i = 0; i < Store.COST_CATEGORIES.length; i++) {
            var sel = Store.COST_CATEGORIES[i] === cost.category ? ' selected' : '';
            catOptions += '<option value="' + Store.COST_CATEGORIES[i] + '"' + sel + '>' + Store.COST_CATEGORIES[i] + '</option>';
        }

        var html = '<div class="modal-header"><h3>✏️ 비용 수정</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="costDate" value="' + cost.date + '"></div>' +
            '<div class="form-group"><label>카테고리</label><select class="form-control" id="costCategory">' + catOptions + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>항목명</label><input type="text" class="form-control" id="costName" value="' + cost.name + '"></div>' +
            '<div class="form-group"><label>금액 (원)</label><input type="number" class="form-control" id="costAmount" value="' + cost.amount + '"></div>' +
            '<div class="form-group"><label>메모</label><input type="text" class="form-control" id="costMemo" value="' + (cost.memo || '') + '"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button><button class="btn btn-primary" onclick="Costs.updateCost(\'' + id + '\')">수정</button></div>';
        App.showModal(html);
    },

    saveCost: function () {
        var date = document.getElementById('costDate').value;
        var category = document.getElementById('costCategory').value;
        var name = document.getElementById('costName').value.trim();
        var amount = document.getElementById('costAmount').value;
        var memo = document.getElementById('costMemo').value.trim();

        if (!date || !name || !amount) {
            App.showToast('날짜, 항목명, 금액을 입력해주세요.', 'error');
            return;
        }

        Store.addCost({ date: date, category: category, name: name, amount: Number(amount), memo: memo });
        App.closeModal();
        App.refreshPage();
        App.showToast('비용이 추가되었습니다.', 'success');
    },

    updateCost: function (id) {
        var date = document.getElementById('costDate').value;
        var category = document.getElementById('costCategory').value;
        var name = document.getElementById('costName').value.trim();
        var amount = document.getElementById('costAmount').value;
        var memo = document.getElementById('costMemo').value.trim();

        if (!date || !name || !amount) {
            App.showToast('날짜, 항목명, 금액을 입력해주세요.', 'error');
            return;
        }

        Store.updateCost(id, { date: date, category: category, name: name, amount: Number(amount), memo: memo });
        App.closeModal();
        App.refreshPage();
        App.showToast('비용이 수정되었습니다.', 'success');
    },

    confirmDelete: function (id) {
        if (confirm('이 비용 항목을 삭제하시겠습니까?')) {
            Store.deleteCost(id);
            App.refreshPage();
            App.showToast('비용이 삭제되었습니다.', 'info');
        }
    }
};
