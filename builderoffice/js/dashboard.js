/* =======================================
   BuilderOffice - Dashboard Module
   대시보드 페이지
   ======================================= */

const Dashboard = {
    render() {
        const costStats = Store.getCostStats();
        const personnelStats = Store.getPersonnelStats();
        const materialStats = Store.getMaterialStats();

        // Recent activities
        const recentCosts = Store.getCosts().slice(0, 3);
        const recentAttendance = Store.getAttendance().slice(0, 3);
        const recentLogs = Store.getMaterialLogs().slice(0, 3);

        // Job type chart data
        const jobTypes = personnelStats.byJobType;
        const maxJobCount = Math.max(...Object.values(jobTypes), 1);

        // Cost category chart data
        const costCats = costStats.byCategory;
        const maxCost = Math.max(...Object.values(costCats), 1);
        const barColors = ['cyan', 'purple', 'green', 'orange', 'red', 'blue'];

        return `
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon blue">💰</div>
          <div class="stat-info">
            <div class="stat-label">총 투입 비용</div>
            <div class="stat-value">${Store.formatCurrency(costStats.total)}</div>
            <div class="stat-change up">이번 달 ${Store.formatCurrency(costStats.monthTotal)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">👷</div>
          <div class="stat-info">
            <div class="stat-label">금일 투입 인원</div>
            <div class="stat-value">${personnelStats.todayCount}명</div>
            <div class="stat-change">등록 인원 ${personnelStats.totalRegistered}명</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">📦</div>
          <div class="stat-info">
            <div class="stat-label">자재 품목 수</div>
            <div class="stat-value">${materialStats.totalItems}개</div>
            <div class="stat-change">재고 가치 ${Store.formatCurrency(materialStats.totalValue)}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">⚠️</div>
          <div class="stat-info">
            <div class="stat-label">부족 자재</div>
            <div class="stat-value">${materialStats.lowStockCount}건</div>
            <div class="stat-change ${materialStats.lowStockCount > 0 ? 'down' : 'up'}">
              ${materialStats.lowStockCount > 0 ? '보충 필요' : '양호'}
            </div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 비용 카테고리별 현황</h3>
          </div>
          <div class="chart-bar-container">
            ${Object.entries(costCats).map(([cat, amount], i) => `
              <div class="chart-bar-item">
                <span class="chart-bar-label">${cat}</span>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill ${barColors[i % barColors.length]}" style="width: ${(amount / maxCost * 100)}%">
                    ${Store.formatCurrency(amount)}
                  </div>
                </div>
              </div>
            `).join('')}
            ${Object.keys(costCats).length === 0 ? '<p style="color: var(--text-muted); text-align: center; padding: 20px;">비용 데이터가 없습니다</p>' : ''}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">👷 직종별 등록 인원</h3>
          </div>
          <div class="chart-bar-container">
            ${Object.entries(jobTypes).map(([job, count], i) => `
              <div class="chart-bar-item">
                <span class="chart-bar-label">${job}</span>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill ${barColors[i % barColors.length]}" style="width: ${(count / maxJobCount * 100)}%">
                    ${count}명
                  </div>
                </div>
              </div>
            `).join('')}
            ${Object.keys(jobTypes).length === 0 ? '<p style="color: var(--text-muted); text-align: center; padding: 20px;">등록된 인원이 없습니다</p>' : ''}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <div class="card-header">
          <h3 class="card-title">🕐 최근 활동</h3>
        </div>
        <div class="activity-list">
          ${recentCosts.map(c => `
            <div class="activity-item">
              <div class="activity-icon cost">💰</div>
              <div class="activity-info">
                <div class="activity-title">${c.name} - ${Store.formatCurrency(c.amount)}</div>
                <div class="activity-time">${c.date} · ${c.category}</div>
              </div>
            </div>
          `).join('')}
          ${recentAttendance.map(a => `
            <div class="activity-item">
              <div class="activity-icon personnel">👷</div>
              <div class="activity-info">
                <div class="activity-title">${a.personName} 출역 (${a.hours}시간)</div>
                <div class="activity-time">${a.date} · ${a.jobType}</div>
              </div>
            </div>
          `).join('')}
          ${recentLogs.map(l => `
            <div class="activity-item">
              <div class="activity-icon material">📦</div>
              <div class="activity-info">
                <div class="activity-title">${l.materialName} ${l.type === 'in' ? '입고' : '출고'} ${l.quantity}${l.unit || ''}</div>
                <div class="activity-time">${l.date}</div>
              </div>
            </div>
          `).join('')}
          ${(recentCosts.length + recentAttendance.length + recentLogs.length) === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <p>아직 등록된 활동이 없습니다</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    }
};
