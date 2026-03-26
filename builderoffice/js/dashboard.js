/* =======================================
   BuilderOffice - Dashboard / Portal Module
   메인 포털 화면 (Bento Grid)
   ======================================= */

var Dashboard = {
    render: function () {
        var costStats = Store.getCostStats();
        var personnelStats = Store.getPersonnelStats();
        var materialStats = Store.getMaterialStats();
        var sites = Store.getSites();
        var approvals = Store.getApprovals();
        var safetyChecks = Store.getSafetyChecks();
        var workInputs = Store.getWorkInputs();
        var esc = Store.escapeHtml;

        var pendingApprovals = approvals.filter(function (a) { return a.status === '대기'; });
        var todaySafety = safetyChecks.filter(function (c) { return c.date === Store.getToday(); });
        var needFix = safetyChecks.filter(function (c) { return c.status === '시정필요'; });
        var activeSites = sites.filter(function (s) { return s.status === '진행중'; });

        // 최근 활동 rows
        var activityRows = '';
        var recentInputs = workInputs.slice(0, 3);
        for (var wi = 0; wi < recentInputs.length; wi++) {
            var w = recentInputs[wi];
            var workerCount = w.workers ? w.workers.length : 0;
            activityRows += '<tr>' +
                '<td><span class="badge badge-blue">입력</span></td>' +
                '<td class="act-name">' + esc(w.siteName || '-') + '</td>' +
                '<td class="act-sub">' + workerCount + '명 · ' + esc(w.date) + '</td>' +
                '<td class="act-val"><span class="badge ' + (w.status === '승인완료' ? 'badge-green' : 'badge-orange') + '">' + esc(w.status) + '</span></td>' +
                '</tr>';
        }

        var recentCosts = Store.getCosts().slice(0, 3);
        for (var ci = 0; ci < recentCosts.length; ci++) {
            var c = recentCosts[ci];
            activityRows += '<tr>' +
                '<td><span class="badge badge-orange">비용</span></td>' +
                '<td class="act-name">' + esc(c.name) + '</td>' +
                '<td class="act-sub">' + esc(c.category) + '</td>' +
                '<td class="act-val">' + Store.formatCurrency(c.amount) + '</td>' +
                '</tr>';
        }
        if (!activityRows) {
            activityRows = '<tr><td colspan="4" class="empty-cell">최근 내역이 없습니다.</td></tr>';
        }

        // 자재 재고 현황
        var materialRows = '';
        var topMaterials = Store.getMaterials().slice(0, 6);
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
                '<span class="mat-name">' + esc(m.name) + '</span>' +
                '<span class="mat-stock ' + statusClass + '">' + curS + (m.unit ? ' ' + esc(m.unit) : '') + ' / 최소 ' + minS + '</span>' +
                '</div>' +
                '<div class="mat-bar-wrap"><div class="mat-bar ' + statusClass + '" style="width:' + stockPct + '%"></div></div>' +
                '</div>';
        }
        if (!materialRows) {
            materialRows = '<p class="empty-msg">등록된 자재가 없습니다.</p>';
        }

        var today = new Date();
        var dateStr = today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
        var userName = (App.currentUser && App.currentUser.name) || '관리자';

        return '<div class="bento-portal">' +

            '<div class="bento-header">' +
            '<div class="bento-greeting">' +
            '<h1>안녕하세요, <strong>' + esc(userName) + '</strong>님 👋</h1>' +
            '<p class="bento-date">' + dateStr + '</p>' +
            '</div>' +
            '<div class="bento-header-actions">' +
            '<button class="bento-action-btn" onclick="App.navigate(\'workinput\')"><span>📝</span> 일일 입력</button>' +
            '<button class="bento-action-btn" onclick="App.navigate(\'safety\')"><span>🦺</span> 안전 점검</button>' +
            '<button class="bento-action-btn primary" onclick="App.navigate(\'approvals\')"><span>✅</span> 승인함 (' + pendingApprovals.length + ')</button>' +
            '</div>' +
            '</div>' +

            '<div class="bento-grid">' +

            // [A] 이번 달 비용
            '<div class="bento-tile tile-a glass-purple" onclick="App.navigate(\'costs\')">' +
            '<div class="tile-label">💰 이번 달 비용</div>' +
            '<div class="tile-value">' + Store.formatCurrency(costStats.monthTotal) + '</div>' +
            '<div class="tile-sub">비용 관리 →</div>' +
            '<div class="tile-icon-bg">💰</div>' +
            '</div>' +

            // [B] 금일 투입 인원
            '<div class="bento-tile tile-b glass-blue" onclick="App.navigate(\'personnel\')">' +
            '<div class="tile-label">👷 금일 투입 인원</div>' +
            '<div class="tile-value">' + personnelStats.todayCount + '<span class="tile-unit">명</span></div>' +
            '<div class="tile-sub">인원 관리 →</div>' +
            '<div class="tile-icon-bg">👷</div>' +
            '</div>' +

            // [C] 안전 현황
            '<div class="bento-tile tile-c ' + (needFix.length > 0 ? 'glass-orange' : 'glass-green') + '" onclick="App.navigate(\'safety\')">' +
            '<div class="tile-label">' + (needFix.length > 0 ? '⚠️ 시정 필요' : '✅ 안전 양호') + '</div>' +
            '<div class="tile-value">' + (needFix.length > 0 ? needFix.length : todaySafety.length) + '<span class="tile-unit">' + (needFix.length > 0 ? '건' : '건 점검') + '</span></div>' +
            '<div class="tile-sub">안전 관리 →</div>' +
            '<div class="tile-icon-bg">🦺</div>' +
            '</div>' +

            // [D] 결재 대기
            '<div class="bento-tile tile-d glass-green" onclick="App.navigate(\'approvals\')">' +
            '<div class="tile-label">📋 결재 대기</div>' +
            '<div class="tile-value">' + pendingApprovals.length + '<span class="tile-unit">건</span></div>' +
            '<div class="tile-sub">승인함 →</div>' +
            '<div class="tile-icon-bg">✅</div>' +
            '</div>' +

            // [E] 실시간 처리 내역
            '<div class="bento-tile tile-e glass-white">' +
            '<div class="tile-header">' +
            '<span class="tile-title">🕐 최근 활동</span>' +
            '<a class="tile-more" onclick="App.navigate(\'workinput\')">전체보기 →</a>' +
            '</div>' +
            '<div class="bento-table-wrap">' +
            '<table class="bento-table">' +
            '<thead><tr><th>유형</th><th>내용</th><th>구분</th><th>상태/금액</th></tr></thead>' +
            '<tbody>' + activityRows + '</tbody>' +
            '</table></div>' +
            '</div>' +

            // [F] 자재 재고
            '<div class="bento-tile tile-f glass-white">' +
            '<div class="tile-header">' +
            '<span class="tile-title">📦 자재 재고 현황</span>' +
            '<a class="tile-more" onclick="App.navigate(\'materials\')">전체보기 →</a>' +
            '</div>' +
            '<div class="mat-list">' + materialRows + '</div>' +
            '</div>' +

            // [G] 빠른 실행
            '<div class="bento-tile tile-g glass-white">' +
            '<div class="tile-header"><span class="tile-title">⚡ 빠른 실행</span></div>' +
            '<div class="quick-grid">' +
            '<div class="quick-item" onclick="App.navigate(\'workinput\')"><div class="quick-icon" style="background:linear-gradient(135deg,#FF9A9E,#FECFEF)">📝</div><span>일일 입력</span></div>' +
            '<div class="quick-item" onclick="App.navigate(\'safety\')"><div class="quick-icon" style="background:linear-gradient(135deg,#a18cd1,#fbc2eb)">🦺</div><span>안전 점검</span></div>' +
            '<div class="quick-item" onclick="App.navigate(\'costs\')"><div class="quick-icon" style="background:linear-gradient(135deg,#84fab0,#8fd3f4)">💰</div><span>비용 지출</span></div>' +
            '<div class="quick-item" onclick="App.navigate(\'documents\')"><div class="quick-icon" style="background:linear-gradient(135deg,#f6d365,#fda085)">📤</div><span>문서 업로드</span></div>' +
            '<div class="quick-item" onclick="App.navigate(\'sites\')"><div class="quick-icon" style="background:linear-gradient(135deg,#96fbc4,#f9f586)">🏗️</div><span>현장 관리</span></div>' +
            '<div class="quick-item" onclick="App.navigate(\'approvals\')"><div class="quick-icon" style="background:linear-gradient(135deg,#a1c4fd,#c2e9fb)">✅</div><span>승인함</span></div>' +
            '</div>' +
            '</div>' +

            // [H] 현장 현황 + 결재 대기
            '<div class="bento-tile tile-h glass-white">' +
            '<div class="tile-header"><span class="tile-title">🏗️ 현장 현황 · 결재</span></div>' +
            '<div class="notice-list">' +
            this._renderSiteNotices(activeSites, pendingApprovals) +
            '</div>' +
            '</div>' +

            '</div>' +
            '</div>';
    },

    _renderSiteNotices: function (sites, approvals) {
        var esc = Store.escapeHtml;
        var html = '';

        for (var i = 0; i < Math.min(sites.length, 2); i++) {
            var s = sites[i];
            html += '<div class="notice-item info">' +
                '<span class="notice-badge info">현장</span>' +
                '<div class="notice-body">' +
                '<div class="notice-title">' + esc(s.name) + ' (공정 ' + (s.progress || 0) + '%)</div>' +
                '<div class="notice-meta">👷 ' + (s.workerCount || 0) + '명 · ' + esc(s.address || '') + '</div>' +
                '</div></div>';
        }

        for (var j = 0; j < Math.min(approvals.length, 3); j++) {
            var a = approvals[j];
            html += '<div class="notice-item pending">' +
                '<span class="notice-badge">대기</span>' +
                '<div class="notice-body">' +
                '<div class="notice-title">' + esc(a.title) + '</div>' +
                '<div class="notice-meta">' + esc(a.requester || '') + ' · ' + esc(a.requestDate || '') + '</div>' +
                '</div></div>';
        }

        if (!html) {
            html = '<div class="empty-notice-hint">현재 대기 중인 항목이 없습니다</div>';
        }

        return html;
    }
};
