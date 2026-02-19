/* =======================================
   BuilderOffice - Materials Management Module
   자재 관리 페이지
   ======================================= */

const Materials = {
    activeTab: 'inventory',
    categoryFilter: 'all',

    render() {
        const stats = Store.getMaterialStats();

        return `
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon purple">📦</div>
          <div class="stat-info">
            <div class="stat-label">총 자재 품목</div>
            <div class="stat-value">${stats.totalItems}개</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue">💵</div>
          <div class="stat-info">
            <div class="stat-label">재고 총 가치</div>
            <div class="stat-value">${Store.formatCurrency(stats.totalValue)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon ${stats.lowStockCount > 0 ? 'red' : 'green'}">
            ${stats.lowStockCount > 0 ? '⚠️' : '✅'}
          </div>
          <div class="stat-info">
            <div class="stat-label">부족 자재</div>
            <div class="stat-value">${stats.lowStockCount}건</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="tab-nav">
          <button class="tab-btn ${this.activeTab === 'inventory' ? 'active' : ''}" onclick="Materials.switchTab('inventory')">📦 자재 목록</button>
          <button class="tab-btn ${this.activeTab === 'logs' ? 'active' : ''}" onclick="Materials.switchTab('logs')">📋 입출고 기록</button>
        </div>

        <div class="tab-content ${this.activeTab === 'inventory' ? 'active' : ''}" id="tabInventory">
          ${this._renderInventory()}
        </div>
        <div class="tab-content ${this.activeTab === 'logs' ? 'active' : ''}" id="tabLogs">
          ${this._renderLogs()}
        </div>
      </div>
    `;
    },

    _renderInventory() {
        let materials = Store.getMaterials();
        if (this.categoryFilter !== 'all') {
            materials = materials.filter(m => m.category === this.categoryFilter);
        }

        return `
      <div class="toolbar">
        <div class="toolbar-left">
          <select class="filter-select" onchange="Materials.setCategoryFilter(this.value)">
            <option value="all">전체 카테고리</option>
            ${Store.MATERIAL_CATEGORIES.map(c => `<option value="${c}" ${this.categoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <span style="color: var(--text-muted); font-size: 13px;">${materials.length}개 품목</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary" onclick="Materials.showAddLogModal()">📋 입출고 등록</button>
          <button class="btn btn-primary" onclick="Materials.showAddMaterialModal()">➕ 자재 등록</button>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>자재명</th>
              <th>카테고리</th>
              <th>규격</th>
              <th>단위</th>
              <th>재고</th>
              <th>단가</th>
              <th>재고 가치</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            ${materials.length > 0 ? materials.map(m => {
            const stock = Number(m.stock);
            const minStock = Number(m.minStock || 10);
            const value = stock * Number(m.unitPrice || 0);
            let stockStatus = 'badge-green';
            let stockLabel = '양호';
            if (stock <= 0) { stockStatus = 'badge-red'; stockLabel = '없음'; }
            else if (stock <= minStock) { stockStatus = 'badge-orange'; stockLabel = '부족'; }

            return `
                <tr>
                  <td style="color: var(--text-primary); font-weight: 500;">${m.name}</td>
                  <td><span class="badge badge-purple">${m.category}</span></td>
                  <td>${m.spec || '-'}</td>
                  <td>${m.unit}</td>
                  <td class="amount" style="color: ${stock <= minStock ? 'var(--accent-warning)' : 'var(--text-primary)'}">${Store.formatNumber(stock)}</td>
                  <td>${Store.formatCurrency(m.unitPrice || 0)}</td>
                  <td class="amount">${Store.formatCurrency(value)}</td>
                  <td><span class="badge ${stockStatus}">${stockLabel}</span></td>
                  <td>
                    <div class="action-btns">
                      <button class="action-btn edit" onclick="Materials.showEditMaterialModal('${m.id}')" title="수정">✏️</button>
                      <button class="action-btn delete" onclick="Materials.confirmDeleteMaterial('${m.id}')" title="삭제">🗑️</button>
                    </div>
                  </td>
                </tr>
              `;
        }).join('') : `
              <tr>
                <td colspan="9">
                  <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <p>등록된 자재가 없습니다</p>
                    <button class="btn btn-primary" onclick="Materials.showAddMaterialModal()">자재 등록하기</button>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
    },

    _renderLogs() {
        const logs = Store.getMaterialLogs();

        return `
      <div class="toolbar">
        <div class="toolbar-left">
          <span style="color: var(--text-muted); font-size: 13px;">총 ${logs.length}건</span>
        </div>
        <button class="btn btn-primary" onclick="Materials.showAddLogModal()">
          ➕ 입출고 등록
        </button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>자재명</th>
              <th>구분</th>
              <th>수량</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length > 0 ? logs.map(l => `
              <tr>
                <td>${l.date}</td>
                <td style="color: var(--text-primary); font-weight: 500;">${l.materialName}</td>
                <td>
                  <span class="badge ${l.type === 'in' ? 'badge-green' : 'badge-orange'}">
                    ${l.type === 'in' ? '📥 입고' : '📤 출고'}
                  </span>
                </td>
                <td class="amount ${l.type === 'in' ? 'positive' : 'negative'}">
                  ${l.type === 'in' ? '+' : '-'}${Store.formatNumber(l.quantity)}
                </td>
                <td>${l.note || '-'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5">
                  <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>입출고 기록이 없습니다</p>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
    },

    switchTab(tab) {
        this.activeTab = tab;
        App.refreshPage();
    },

    setCategoryFilter(val) {
        this.categoryFilter = val;
        App.refreshPage();
    },

    // === Material CRUD ===
    showAddMaterialModal() {
        const html = `
      <div class="modal-header">
        <h3>📦 자재 등록</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>자재명</label>
            <input type="text" class="form-control" id="matName" placeholder="예: 철근 D16">
          </div>
          <div class="form-group">
            <label>카테고리</label>
            <select class="form-control" id="matCategory">
              ${Store.MATERIAL_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>규격</label>
            <input type="text" class="form-control" id="matSpec" placeholder="예: SD400 D16">
          </div>
          <div class="form-group">
            <label>단위</label>
            <input type="text" class="form-control" id="matUnit" placeholder="예: ton, ㎥, 장">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>초기 재고</label>
            <input type="number" class="form-control" id="matStock" value="0" min="0">
          </div>
          <div class="form-group">
            <label>단가 (원)</label>
            <input type="number" class="form-control" id="matPrice" placeholder="0">
          </div>
        </div>
        <div class="form-group">
          <label>최소 재고 (이하 시 경고)</label>
          <input type="number" class="form-control" id="matMinStock" value="10" min="0">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="Materials.saveMaterial()">등록</button>
      </div>
    `;
        App.showModal(html);
    },

    showEditMaterialModal(id) {
        const mat = Store.getMaterials().find(m => m.id === id);
        if (!mat) return;

        const html = `
      <div class="modal-header">
        <h3>✏️ 자재 수정</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>자재명</label>
            <input type="text" class="form-control" id="matName" value="${mat.name}">
          </div>
          <div class="form-group">
            <label>카테고리</label>
            <select class="form-control" id="matCategory">
              ${Store.MATERIAL_CATEGORIES.map(c => `<option value="${c}" ${c === mat.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>규격</label>
            <input type="text" class="form-control" id="matSpec" value="${mat.spec || ''}">
          </div>
          <div class="form-group">
            <label>단위</label>
            <input type="text" class="form-control" id="matUnit" value="${mat.unit}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>재고</label>
            <input type="number" class="form-control" id="matStock" value="${mat.stock}" min="0">
          </div>
          <div class="form-group">
            <label>단가 (원)</label>
            <input type="number" class="form-control" id="matPrice" value="${mat.unitPrice || 0}">
          </div>
        </div>
        <div class="form-group">
          <label>최소 재고</label>
          <input type="number" class="form-control" id="matMinStock" value="${mat.minStock || 10}" min="0">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="Materials.updateMaterial('${id}')">수정</button>
      </div>
    `;
        App.showModal(html);
    },

    saveMaterial() {
        const name = document.getElementById('matName').value.trim();
        const category = document.getElementById('matCategory').value;
        const spec = document.getElementById('matSpec').value.trim();
        const unit = document.getElementById('matUnit').value.trim();
        const stock = document.getElementById('matStock').value;
        const unitPrice = document.getElementById('matPrice').value;
        const minStock = document.getElementById('matMinStock').value;

        if (!name || !unit) {
            App.showToast('자재명과 단위를 입력해주세요.', 'error');
            return;
        }

        Store.addMaterial({ name, category, spec, unit, stock: Number(stock), unitPrice: Number(unitPrice) || 0, minStock: Number(minStock) || 10 });
        App.closeModal();
        App.refreshPage();
        App.showToast(`${name} 자재가 등록되었습니다.`, 'success');
    },

    updateMaterial(id) {
        const name = document.getElementById('matName').value.trim();
        const category = document.getElementById('matCategory').value;
        const spec = document.getElementById('matSpec').value.trim();
        const unit = document.getElementById('matUnit').value.trim();
        const stock = document.getElementById('matStock').value;
        const unitPrice = document.getElementById('matPrice').value;
        const minStock = document.getElementById('matMinStock').value;

        if (!name || !unit) {
            App.showToast('자재명과 단위를 입력해주세요.', 'error');
            return;
        }

        Store.updateMaterial(id, { name, category, spec, unit, stock: Number(stock), unitPrice: Number(unitPrice) || 0, minStock: Number(minStock) || 10 });
        App.closeModal();
        App.refreshPage();
        App.showToast('자재 정보가 수정되었습니다.', 'success');
    },

    confirmDeleteMaterial(id) {
        if (confirm('이 자재와 관련 입출고 기록을 모두 삭제하시겠습니까?')) {
            Store.deleteMaterial(id);
            App.refreshPage();
            App.showToast('자재가 삭제되었습니다.', 'info');
        }
    },

    // === Material Log ===
    showAddLogModal() {
        const materials = Store.getMaterials();

        const html = `
      <div class="modal-header">
        <h3>📋 입출고 등록</h3>
        <button class="modal-close" onclick="App.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label>날짜</label>
            <input type="date" class="form-control" id="logDate" value="${Store.getToday()}">
          </div>
          <div class="form-group">
            <label>구분</label>
            <select class="form-control" id="logType">
              <option value="in">📥 입고</option>
              <option value="out">📤 출고</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>자재</label>
          <select class="form-control" id="logMaterial">
            <option value="">선택하세요</option>
            ${materials.map(m => `<option value="${m.id}" data-name="${m.name}" data-unit="${m.unit}" data-stock="${m.stock}">${m.name} (재고: ${m.stock} ${m.unit})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>수량</label>
          <input type="number" class="form-control" id="logQuantity" min="1" placeholder="0">
        </div>
        <div class="form-group">
          <label>비고</label>
          <input type="text" class="form-control" id="logNote" placeholder="사유 또는 상세내용">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeModal()">취소</button>
        <button class="btn btn-primary" onclick="Materials.saveLog()">등록</button>
      </div>
    `;
        App.showModal(html);
    },

    saveLog() {
        const date = document.getElementById('logDate').value;
        const type = document.getElementById('logType').value;
        const materialSelect = document.getElementById('logMaterial');
        const materialId = materialSelect.value;
        const quantity = document.getElementById('logQuantity').value;
        const note = document.getElementById('logNote').value.trim();

        if (!date || !materialId || !quantity || Number(quantity) <= 0) {
            App.showToast('날짜, 자재, 수량을 입력해주세요.', 'error');
            return;
        }

        const selectedOption = materialSelect.options[materialSelect.selectedIndex];
        const materialName = selectedOption.dataset.name;

        Store.addMaterialLog({
            materialId, materialName, type,
            quantity: Number(quantity), date, note
        });
        App.closeModal();
        App.refreshPage();
        App.showToast(`${materialName} ${type === 'in' ? '입고' : '출고'} 처리되었습니다.`, 'success');
    }
};
