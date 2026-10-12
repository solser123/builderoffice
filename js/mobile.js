/* =======================================
   BuilderOffice - 모바일 UI 헬퍼
   모바일 감지 + 카드 렌더러 + 바텀시트
   ======================================= */

var MobileUI = {

    // ===== 모바일 감지 =====
    isMobile: function () {
        return window.innerWidth <= 768;
    },

    // ===== 공통 카드 생성 =====

    // 비용 카드
    costCard: function (c, esc) {
        var catColor = {
            '인건비': '#06b6d4', '자재비': '#8b5cf6', '장비비': '#f59e0b',
            '외주비': '#10b981', '운송비': '#3b82f6', '기타': '#94a3b8'
        };
        var color = catColor[c.category] || '#94a3b8';
        return '<div class="mob-card" style="border-left-color:' + color + '">' +
            '<div class="mob-card-top">' +
            '<div>' +
            '<div class="mob-card-title">' + esc(c.name) + '</div>' +
            '<div class="mob-card-meta" style="margin-top:4px;">' +
            '<span class="badge" style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44;">' + esc(c.category) + '</span>' +
            '<span class="mob-card-sub">' + esc(c.date) + '</span>' +
            (c.memo ? '<span class="mob-card-sub">· ' + esc(c.memo) + '</span>' : '') +
            '</div>' +
            '</div>' +
            '<div class="mob-card-value">' + Store.formatCurrency(c.amount) + '</div>' +
            '</div>' +
            '<div class="mob-card-actions">' +
            '<button class="mob-card-btn" onclick="Costs.showEditModal(\'' + c.id + '\')">✏️ 수정</button>' +
            '<button class="mob-card-btn" onclick="Costs.confirmDelete(\'' + c.id + '\')">🗑️ 삭제</button>' +
            '</div>' +
            '</div>';
    },

    // 현장 카드
    siteCard: function (s, esc) {
        var statusColor = s.status === '진행중' ? '#10b981' : s.status === '완료' ? '#06b6d4' : '#94a3b8';
        var progress = s.progress || 0;
        return '<div class="mob-card">' +
            '<div class="mob-card-top">' +
            '<div style="flex:1">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
            '<div class="mob-card-title">' + esc(s.name) + '</div>' +
            '<span class="badge" style="background:' + statusColor + '22;color:' + statusColor + ';border:1px solid ' + statusColor + '44;">' + esc(s.status) + '</span>' +
            '</div>' +
            '<div class="mob-card-meta">' +
            '<span class="mob-card-sub">🏢 ' + esc(s.client || '-') + '</span>' +
            '<span class="mob-card-sub">👷 ' + (s.workerCount || 0) + '명</span>' +
            '</div>' +
            '<div style="margin-top:10px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);margin-bottom:4px;">' +
            '<span>공정률</span><span style="color:#06b6d4;font-weight:700;">' + progress + '%</span>' +
            '</div>' +
            '<div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;">' +
            '<div style="width:' + progress + '%;height:100%;background:linear-gradient(90deg,#06b6d4,#8b5cf6);border-radius:3px;"></div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="mob-card-actions">' +
            '<button class="mob-card-btn primary" onclick="Sites.showEditModal(\'' + s.id + '\')">✏️ 수정</button>' +
            '<button class="mob-card-btn" onclick="Sites.confirmDelete(\'' + s.id + '\')">🗑️ 삭제</button>' +
            '</div>' +
            '</div>';
    },

    // 인원 카드
    personnelCard: function (p, esc) {
        var statusColor = p.status === '활성' ? '#10b981' : '#94a3b8';
        return '<div class="mob-card">' +
            '<div class="mob-card-top">' +
            '<div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
            '<div class="mob-card-title">' + esc(p.name) + '</div>' +
            '<span class="badge" style="background:' + statusColor + '22;color:' + statusColor + ';">' + esc(p.status || '활성') + '</span>' +
            '</div>' +
            '<div class="mob-card-meta">' +
            '<span class="mob-card-sub">🔨 ' + esc(p.jobType || '-') + '</span>' +
            '<span class="mob-card-sub">📱 ' + esc(p.phone || '-') + '</span>' +
            '</div>' +
            '</div>' +
            '<div class="mob-card-value" style="font-size:14px;">' +
            (p._privateAvailable ? Store.formatCurrency(p.dailyWage || 0) : '🔒') +
            '<div style="font-size:10px;color:var(--text-secondary);font-weight:400;">일당</div></div>' +
            '</div>' +
            '</div>';
    },

    // 자재 카드
    materialCard: function (m, esc) {
        var minS = Number(m.minStock) || 0;
        var curS = Number(m.stock) || 0;
        var isLow = curS <= minS;
        var statusColor = isLow ? '#ef4444' : '#10b981';
        return '<div class="mob-card">' +
            '<div class="mob-card-top">' +
            '<div>' +
            '<div class="mob-card-title">' + esc(m.name) + '</div>' +
            '<div class="mob-card-meta" style="margin-top:4px;">' +
            '<span class="mob-card-sub">' + esc(m.category || '') + '</span>' +
            '<span class="mob-card-sub">' + esc(m.spec || '') + '</span>' +
            '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
            '<div style="font-size:20px;font-weight:800;color:' + statusColor + ';">' + curS + '<span style="font-size:12px;font-weight:400;"> ' + esc(m.unit || '') + '</span></div>' +
            '<div style="font-size:11px;color:var(--text-secondary);">최소 ' + minS + esc(m.unit || '') + '</div>' +
            (isLow ? '<span class="badge badge-red" style="margin-top:4px;">부족</span>' : '') +
            '</div>' +
            '</div>' +
            '<div class="mob-card-actions">' +
            '<button class="mob-card-btn primary" onclick="Materials.showInOutModal(\'' + m.id + '\',\'in\')">📥 입고</button>' +
            '<button class="mob-card-btn" onclick="Materials.showInOutModal(\'' + m.id + '\',\'out\')">📤 출고</button>' +
            '<button class="mob-card-btn" onclick="Materials.showEditModal(\'' + m.id + '\')">✏️</button>' +
            '</div>' +
            '</div>';
    },

    // 안전점검 카드
    safetyCard: function (c, esc) {
        var checkCount = c.checklist ? c.checklist.length : 0;
        var checkedCount = c.checklist ? c.checklist.filter(function (x) { return x.checked; }).length : 0;
        var rate = checkCount > 0 ? Math.round((checkedCount / checkCount) * 100) : 0;
        var statusColor = c.status === '완료' ? '#10b981' : '#ef4444';
        return '<div class="mob-card" onclick="Safety.showDetail(\'' + c.id + '\')">' +
            '<div class="mob-card-top">' +
            '<div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
            '<span class="badge badge-blue">' + esc(c.type) + '</span>' +
            '<span class="badge" style="background:' + statusColor + '22;color:' + statusColor + ';">' + esc(c.status) + '</span>' +
            '</div>' +
            '<div class="mob-card-title" style="margin:4px 0;">' + esc(c.siteName || '-') + '</div>' +
            '<div class="mob-card-sub">' + esc(c.date) + ' · 점검자: ' + esc(c.inspector || '-') + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
            '<div style="font-size:22px;font-weight:800;color:' + statusColor + ';">' + rate + '%</div>' +
            '<div style="font-size:11px;color:var(--text-secondary);">' + checkedCount + '/' + checkCount + '항목</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    // 승인 카드
    approvalCard: function (a, esc) {
        var isPending = a.status === '대기';
        return '<div class="mob-card">' +
            '<div class="mob-card-top">' +
            '<div style="flex:1;">' +
            '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
            '<span class="badge badge-blue">' + esc(a.type) + '</span>' +
            '<span class="badge ' + (isPending ? 'badge-orange' : 'badge-green') + '">' + esc(a.status) + '</span>' +
            '</div>' +
            '<div class="mob-card-title">' + esc(a.title) + '</div>' +
            '<div class="mob-card-meta" style="margin-top:4px;">' +
            '<span class="mob-card-sub">👤 ' + esc(a.requester || '-') + '</span>' +
            '<span class="mob-card-sub">📅 ' + esc(a.requestDate || '-') + '</span>' +
            '</div>' +
            '</div>' +
            '</div>' +
            (isPending ? '<div class="mob-card-actions"><button class="mob-card-btn primary" onclick="Approvals.approve(\'' + a.id + '\')">✅ 승인</button><button class="mob-card-btn" onclick="Approvals.reject(\'' + a.id + '\')">❌ 반려</button></div>' : '') +
            '</div>';
    },

    // 문서 카드
    documentCard: function (d, esc) {
        return '<div class="mob-card">' +
            '<div class="mob-card-top">' +
            '<div>' +
            '<div class="mob-card-title">' + esc(d.name) + '</div>' +
            '<div class="mob-card-meta" style="margin-top:4px;">' +
            '<span class="badge badge-blue">' + esc(d.type) + '</span>' +
            '<span class="mob-card-sub">' + esc(d.siteName || '-') + '</span>' +
            '<span class="mob-card-sub">' + esc(d.uploadDate || '') + '</span>' +
            '</div>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-secondary);">' + esc(d.fileSize || '') + '</div>' +
            '</div>' +
            '</div>';
    },

    // ===== 모바일 페이지 헤더 =====
    pageHeader: function (title, actionLabel, actionOnClick) {
        var btn = actionOnClick
            ? '<button class="mob-page-action" onclick="' + actionOnClick + '">➕</button>'
            : '';
        return '<div class="mob-page-header">' +
            '<div class="mob-page-title">' + title + '</div>' +
            btn +
            '</div>';
    },

    // ===== 빈 카드 리스트 상태 =====
    emptyCard: function (icon, text, btnText, btnAction) {
        return '<div class="mob-card" style="text-align:center;padding:40px 20px;">' +
            '<div style="font-size:40px;margin-bottom:12px;">' + icon + '</div>' +
            '<div style="color:var(--text-secondary);margin-bottom:16px;">' + text + '</div>' +
            (btnText ? '<button class="btn btn-primary" onclick="' + btnAction + '">' + btnText + '</button>' : '') +
            '</div>';
    }
};
