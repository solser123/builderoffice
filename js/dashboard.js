/* =======================================
   BuilderOffice - Dashboard / Portal Module
   메인 포털 화면 (Bento Grid - 1등 시안)
   ======================================= */

var Dashboard = {
    render: function () {
        var costStats = Store.getCostStats();
        var personnelStats = Store.getPersonnelStats();
        var materialStats = Store.getMaterialStats();
        var siteStats = Store.getSiteStats();
        var approvals = Store.getApprovals();
        var pendingApprovals = approvals.filter(function (a) { return a.status === '대기중'; });
        var dailyLogs = Store.getDailyLogs();
        var todayLog = dailyLogs.find(function (l) { return l.date === Store.getToday(); });
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();
        var currentSite = currentSiteId !== 'all' ? sites.find(function (s) { return s.id === currentSiteId; }) : null;

        var recentCosts = Store.getCosts().slice(0, 5);
        var recentAttendance = Store.getAttendance().slice(0, 5);
        var materials = Store.getMaterials();

        // 최근 활동 rows
        var activityRows = '';
        for (var ci = 0; ci < recentCosts.length; ci++) {
            var c = recentCosts[ci];
            activityRows += '<tr>' +
                '<td><span class="badge badge-orange">비용</span></td>' +
                '<td class="act-name">' + c.name + '</td>' +
                '<td class="act-sub">' + c.category + '</td>' +
                '<td class="act-val">' + Store.formatCurrency(c.amount) + '</td>' +
                '</tr>';
        }
        for (var ai = 0; ai < recentAttendance.length; ai++) {
            var a = recentAttendance[ai];
            activityRows += '<tr>' +
                '<td><span class="badge badge-blue">출근</span></td>' +
                '<td class="act-name">' + a.personName + '</td>' +
                '<td class="act-sub">' + a.jobType + '</td>' +
                '<td class="act-val">' + a.hours + 'h</td>' +
                '</tr>';
        }
        if (!activityRows) {
            activityRows = '<tr><td colspan="4" class="empty-cell">최근 내역이 없습니다.</td></tr>';
        }

        // 자재 재고 현황 (상위 5개)
        var materialRows = '';
        var topMaterials = materials.slice(0, 6);
        for (var mi = 0; mi < topMaterials.length; mi++) {
            var m = topMaterials[mi];
            var minS = Number(m.minStock) || 0;
            var curS = Number(m.stock) || 0;
            var maxS = Math.max(minS * 3, curS, 1);
            var stockPct = Math.min(100, Math.round((curS / maxS) * 100));
            var statusClass = curS <= minS ? 'danger' : curS <= minS * 2 ? 'warning' : 'ok';
            materialRows +=
                '<div class="mat-row">' +
                '<div class="mat-info">' +
                '<span class="mat-name">' + m.name + '</span>' +
                '<span class="mat-stock ' + statusClass + '">' + curS + (m.unit ? ' ' + m.unit : '') + ' / 최소 ' + minS + '</span>' +
                '</div>' +
                '<div class="mat-bar-wrap"><div class="mat-bar ' + statusClass + '" style="width:' + stockPct + '%"></div></div>' +
                '</div>';
        }
        if (!materialRows) {
            materialRows = '<p class="empty-msg">등록된 자재가 없습니다.</p>';
        }

        var today = new Date();
        var dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
        var greeting = currentSite ? currentSite.name : '전체 현장';
        var todayLogStatus = todayLog ?
            '<span style="color:#059669;font-weight:700">✓ 오늘 일지 작성됨</span>' :
            '<span style="color:#f59e0b;font-weight:600">⚠️ 오늘 일지 미작성</span>';

        return `
        <div class="bento-portal">

            <!-- Portal Header -->
            <div class="bento-header">
                <div class="bento-greeting">
                    <h1>📍 <strong>${greeting}</strong></h1>
                    <p class="bento-date">${dateStr} &nbsp;·&nbsp; ${todayLogStatus}</p>
                </div>
                <div class="bento-header-actions">
                    <button class="bento-action-btn" onclick="App.navigate('dailylog')">
                        <span>📋</span> 현장 일지
                    </button>
                    <button class="bento-action-btn primary" onclick="App.navigate('costs')">
                        <span>💳</span> 비용 지출
                    </button>
                </div>
            </div>

            <!-- ===== BENTO GRID ===== -->
            <div class="bento-grid">

                <!-- [A] KPI: 이번 달 결재 비용 (큰 타일) -->
                <div class="bento-tile tile-a glass-purple" onclick="document.querySelector('[data-page=costs]').click()">
                    <div class="tile-label">💰 이번 달 결재 비용</div>
                    <div class="tile-value">${Store.formatCurrency(costStats.monthTotal)}</div>
                    <div class="tile-sub">전월 대비 변동을 확인하세요</div>
                    <div class="tile-icon-bg">💰</div>
                </div>

                <!-- [B] KPI: 금일 투입 인원 -->
                <div class="bento-tile tile-b glass-blue" onclick="document.querySelector('[data-page=personnel]').click()">
                    <div class="tile-label">👷 금일 투입 인원</div>
                    <div class="tile-value">${personnelStats.todayCount}<span class="tile-unit">명</span></div>
                    <div class="tile-sub">출역 현황 확인 →</div>
                    <div class="tile-icon-bg">👷</div>
                </div>

                <!-- [C] KPI: 부족 자재 -->
                <div class="bento-tile tile-c glass-orange" onclick="document.querySelector('[data-page=materials]').click()">
                    <div class="tile-label">⚠️ 부족 자재 (발주필요)</div>
                    <div class="tile-value">${materialStats.lowStockCount}<span class="tile-unit">건</span></div>
                    <div class="tile-sub">자재 목록 확인 →</div>
                    <div class="tile-icon-bg">📦</div>
                </div>

                <!-- [D] KPI: 총 등록 인원 -->
                <div class="bento-tile tile-d glass-green" onclick="document.querySelector('[data-page=personnel]').click()">
                    <div class="tile-label">🧑‍🤝‍🧑 총 등록 인원</div>
                    <div class="tile-value">${personnelStats.totalRegistered}<span class="tile-unit">명</span></div>
                    <div class="tile-sub">인원 관리 →</div>
                    <div class="tile-icon-bg">👥</div>
                </div>

                <!-- [E] 실시간 처리 내역 (와이드 타일) -->
                <div class="bento-tile tile-e glass-white">
                    <div class="tile-header">
                        <span class="tile-title">🕐 실시간 처리 내역</span>
                        <a class="tile-more" onclick="document.querySelector('[data-page=costs]').click()">전체보기 →</a>
                    </div>
                    <div class="bento-table-wrap">
                        <table class="bento-table">
                            <thead><tr><th>유형</th><th>내용</th><th>구분</th><th>금액/시간</th></tr></thead>
                            <tbody>${activityRows}</tbody>
                        </table>
                    </div>
                </div>

                <!-- [F] 자재 재고 현황 (미디엄 타일) -->
                <div class="bento-tile tile-f glass-white">
                    <div class="tile-header">
                        <span class="tile-title">📦 자재 재고 현황</span>
                        <a class="tile-more" onclick="document.querySelector('[data-page=materials]').click()">전체보기 →</a>
                    </div>
                    <div class="mat-list">${materialRows}</div>
                </div>

                <!-- [G] 빠른 실행 -->
                <div class="bento-tile tile-g glass-white">
                    <div class="tile-header">
                        <span class="tile-title">⚡ 빠른 실행</span>
                    </div>
                    <div class="quick-grid">
                        <div class="quick-item" onclick="App.navigate('dailylog')">
                            <div class="quick-icon" style="background:linear-gradient(135deg,#FF9A9E,#FECFEF)">📋</div>
                            <span>현장 일지</span>
                        </div>
                        <div class="quick-item" onclick="App.navigate('personnel')">
                            <div class="quick-icon" style="background:linear-gradient(135deg,#84fab0,#8fd3f4)">👷</div>
                            <span>공수 입력</span>
                        </div>
                        <div class="quick-item" onclick="App.navigate('costs')">
                            <div class="quick-icon" style="background:linear-gradient(135deg,#a18cd1,#fbc2eb)">💳</div>
                            <span>비용 지출</span>
                        </div>
                        <div class="quick-item" onclick="App.navigate('approvals')">
                            <div class="quick-icon" style="background:linear-gradient(135deg,#f6d365,#fda085)">✅</div>
                            <span>전자 결재</span>
                        </div>
                        <div class="quick-item" onclick="App.navigate('materials')">
                            <div class="quick-icon" style="background:linear-gradient(135deg,#96fbc4,#f9f586)">📦</div>
                            <span>자재 관리</span>
                        </div>
                        <div class="quick-item" onclick="App.navigate('reports')">
                            <div class="quick-icon" style="background:linear-gradient(135deg,#a1c4fd,#c2e9fb)">📈</div>
                            <span>보고서</span>
                        </div>
                    </div>
                </div>

                <!-- [H] 결재 대기 & 현장일지 -->
                <div class="bento-tile tile-h glass-white">
                    <div class="tile-header">
                        <span class="tile-title">📝 결재 대기 · 현황</span>
                        <a class="tile-more" onclick="App.navigate('approvals')">전체보기 →</a>
                    </div>
                    <div class="notice-list">
                        ${pendingApprovals.slice(0, 3).map(function(ap) {
                            return '<div class="notice-item pending"><span class="notice-badge">대기</span>' +
                                '<div class="notice-body"><div class="notice-title">' + ap.title + '</div>' +
                                '<div class="notice-meta">' + ap.requestDate + ' · ' + ap.requestor + ' · ' + Store.formatCurrency(ap.amount) + '</div></div></div>';
                        }).join('')}
                        ${pendingApprovals.length === 0 ? '<div class="notice-item info"><span class="notice-badge info">정상</span><div class="notice-body"><div class="notice-title">대기 중인 결재가 없습니다</div></div></div>' : ''}
                        <div style="border-top:1px dashed var(--border-color);margin-top:8px;padding-top:8px">
                            <div class="notice-item info">
                                <span class="notice-badge info">현장</span>
                                <div class="notice-body">
                                    <div class="notice-title">진행중인 현장 ${siteStats.active}개 / 전체 ${siteStats.total}개</div>
                                    <div class="notice-meta">현장 관리에서 상세 확인</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div><!-- end .bento-grid -->
        </div><!-- end .bento-portal -->
        `;
    }
};
