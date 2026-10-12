/* =======================================
   BuilderOffice - Dashboard / Portal Module
   메인 포털 화면 (Bento Grid)
   ======================================= */

var Dashboard = {
    render: function () {
        if (MobileUI.isMobile()) return this.renderMobile();
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

            // 갓 시작한 회사에는 무엇부터 할지 안내한다
            (typeof Onboarding !== 'undefined' ? Onboarding.render() : '') +

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

    renderMobile: function () {
        var costStats = Store.getCostStats();
        var personnelStats = Store.getPersonnelStats();
        var approvals = Store.getApprovals();
        var safetyChecks = Store.getSafetyChecks();
        var workInputs = Store.getWorkInputs();
        var sites = Store.getSites();
        var esc = Store.escapeHtml;

        var pending = approvals.filter(function (a) { return a.status === '대기'; });
        var needFix = safetyChecks.filter(function (c) { return c.status === '시정필요'; });
        var todaySafety = safetyChecks.filter(function (c) { return c.date === Store.getToday(); });
        var activeSites = sites.filter(function (s) { return s.status === '진행중'; });
        var userName = (App.currentUser && App.currentUser.name) || '관리자';
        var today = new Date();
        var dateStr = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

        // 최근 작업일지 카드
        var recentHtml = '';
        var recent = workInputs.slice(0, 3);
        for (var i = 0; i < recent.length; i++) {
            var w = recent[i];
            recentHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
                '<div><div style="font-size:14px;font-weight:600;">' + esc(w.siteName || '-') + '</div>' +
                '<div style="font-size:12px;color:var(--text-secondary);">👷 ' + (w.workers ? w.workers.length : 0) + '명 · ' + esc(w.date) + '</div></div>' +
                '<span class="badge ' + (w.status === '승인완료' ? 'badge-green' : 'badge-orange') + '">' + esc(w.status) + '</span>' +
                '</div>';
        }
        if (!recentHtml) recentHtml = '<div style="text-align:center;padding:20px;color:var(--text-secondary);">최근 내역 없음</div>';

        return '<div style="padding-top:4px;">' +
            // 인사
            '<div style="margin-bottom:16px;">' +
            '<div style="font-size:22px;font-weight:800;">안녕하세요, <span style="background:linear-gradient(135deg,#06b6d4,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">' + esc(userName) + '</span>님 👋</div>' +
            '<div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">' + dateStr + '</div>' +
            '</div>' +

            // 주요 지표 그리드
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">' +
            '<div class="mob-card" style="cursor:pointer;" onclick="App.navigate(\'costs\')">' +
            '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">💰 이번 달 비용</div>' +
            '<div style="font-size:18px;font-weight:800;color:#06b6d4;">' + Store.formatCurrency(costStats.monthTotal) + '</div>' +
            '</div>' +
            '<div class="mob-card" style="cursor:pointer;" onclick="App.navigate(\'personnel\')">' +
            '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">👷 금일 투입</div>' +
            '<div style="font-size:28px;font-weight:800;color:#8b5cf6;">' + personnelStats.todayCount + '<span style="font-size:14px;">명</span></div>' +
            '</div>' +
            '<div class="mob-card" style="cursor:pointer;" onclick="App.navigate(\'safety\')">' +
            '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">' + (needFix.length > 0 ? '⚠️ 시정 필요' : '✅ 안전 양호') + '</div>' +
            '<div style="font-size:28px;font-weight:800;color:' + (needFix.length > 0 ? '#ef4444' : '#10b981') + ';">' + (needFix.length > 0 ? needFix.length : todaySafety.length) + '<span style="font-size:14px;">건</span></div>' +
            '</div>' +
            '<div class="mob-card" style="cursor:pointer;" onclick="App.navigate(\'approvals\')">' +
            '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">📋 결재 대기</div>' +
            '<div style="font-size:28px;font-weight:800;color:#f59e0b;">' + pending.length + '<span style="font-size:14px;">건</span></div>' +
            '</div>' +
            '</div>' +

            // 빠른 실행
            '<div class="mob-card" style="margin-bottom:12px;">' +
            '<div style="font-size:14px;font-weight:700;margin-bottom:14px;">⚡ 빠른 실행</div>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' +
            '<div onclick="App.navigate(\'workinput\')" style="text-align:center;cursor:pointer;padding:12px 6px;background:rgba(255,152,158,0.1);border-radius:12px;"><div style="font-size:24px;">📝</div><div style="font-size:11px;margin-top:4px;color:var(--text-secondary);">일일입력</div></div>' +
            '<div onclick="App.navigate(\'safety\')" style="text-align:center;cursor:pointer;padding:12px 6px;background:rgba(139,92,246,0.1);border-radius:12px;"><div style="font-size:24px;">🦺</div><div style="font-size:11px;margin-top:4px;color:var(--text-secondary);">안전점검</div></div>' +
            '<div onclick="App.navigate(\'costs\')" style="text-align:center;cursor:pointer;padding:12px 6px;background:rgba(16,185,129,0.1);border-radius:12px;"><div style="font-size:24px;">💰</div><div style="font-size:11px;margin-top:4px;color:var(--text-secondary);">비용입력</div></div>' +
            '<div onclick="App.navigate(\'personnel\')" style="text-align:center;cursor:pointer;padding:12px 6px;background:rgba(6,182,212,0.1);border-radius:12px;"><div style="font-size:24px;">👷</div><div style="font-size:11px;margin-top:4px;color:var(--text-secondary);">인원관리</div></div>' +
            '<div onclick="App.navigate(\'sites\')" style="text-align:center;cursor:pointer;padding:12px 6px;background:rgba(245,158,11,0.1);border-radius:12px;"><div style="font-size:24px;">🏗️</div><div style="font-size:11px;margin-top:4px;color:var(--text-secondary);">현장관리</div></div>' +
            '<div onclick="App.navigate(\'approvals\')" style="text-align:center;cursor:pointer;padding:12px 6px;background:rgba(59,130,246,0.1);border-radius:12px;"><div style="font-size:24px;">✅</div><div style="font-size:11px;margin-top:4px;color:var(--text-secondary);">승인함</div></div>' +
            '</div></div>' +

            // 최근 작업일지
            '<div class="mob-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<div style="font-size:14px;font-weight:700;">🕐 최근 작업일지</div>' +
            '<button class="mob-card-btn" style="flex:none;padding:4px 10px;" onclick="App.navigate(\'workinput\')">전체보기</button>' +
            '</div>' +
            recentHtml +
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
