/* =======================================
   BuilderOffice - App Controller
   SPA 라우터 및 앱 초기화
   ======================================= */

var App = {
    currentPage: 'dashboard',
    isLoggedIn: false,
    currentUser: null,
    _registering: false,   // 회원가입 진행 중 플래그 (onAuthStateChanged 개입 차단)

    pages: {
        dashboard: { title: '대시보드', icon: '📊', module: function () { return Dashboard; } },
        sites: { title: '현장 관리', icon: '🏗️', module: function () { return Sites; } },
        workinput: { title: '일일 입력', icon: '📝', module: function () { return WorkInput; } },
        costs: { title: '비용 관리', icon: '💰', module: function () { return Costs; } },
        personnel: { title: '인원 관리', icon: '👷', module: function () { return Personnel; } },
        materials: { title: '자재 관리', icon: '📦', module: function () { return Materials; } },
        safety: { title: '안전 관리', icon: '🦺', module: function () { return Safety; } },
        documents: { title: '문서 관리', icon: '📂', module: function () { return Documents; } },
        approvals: { title: '승인함', icon: '✅', module: function () { return Approvals; } },
        // 수주 흐름: 견적 → 계약 → 기성
        estimates: { title: '견적 관리', icon: '📄', module: function () { return Estimates; } },
        contracts: { title: '계약 관리', icon: '📑', module: function () { return Contracts; } },
        billings: { title: '기성 관리', icon: '💵', module: function () { return Billings; } },
        team: { title: '팀 관리', icon: '🎟️', module: function () { return Team; }, adminOnly: true }
    },

    init: function () {
        var self = this;
        window.addEventListener('hashchange', function () { self.handleRoute(); });

        // Firebase Auth 상태 감지 (Firebase 사용 가능한 경우)
        if (typeof FB !== 'undefined' && FB.onAuthStateChanged) {
            FB.onAuthStateChanged(async function (firebaseUser) {
                // 회원가입 진행 중에는 이 핸들러가 개입하지 않는다.
                // (createUser 성공 즉시 발동하지만 회사·프로필은 아직 생성 전이라,
                //  여기서 처리하면 신규 가입자가 로그인 화면으로 튕긴다.)
                if (self._registering) return;

                if (firebaseUser) {
                    self.showLoading('현장 데이터를 불러오는 중...');
                    // 방금 가입한 경우 프로필 문서가 아직 안 보일 수 있어 몇 번 재시도한다
                    var companyId = await self._resolveCompany(firebaseUser.uid, 5);
                    if (companyId) {
                        await self.enterCompany(companyId, firebaseUser);
                    } else {
                        // 회사 없음 → 신규 가입자(혹은 초대 대기) 처리
                        self.hideLoading();
                        self.isLoggedIn = false;
                        self.renderLogin();
                    }
                } else {
                    // 로그아웃 상태
                    Sync.teardown();
                    self.isLoggedIn = false;
                    self.currentUser = null;
                    localStorage.removeItem('builderoffice_current_user');
                    self.renderLogin();
                }
            });
        } else {
            // Firebase 미설정 → localStorage 방식으로 동작 (개발/데모 모드)
            var user = Login.getCurrentUser();
            if (user) {
                this.isLoggedIn = true;
                this.currentUser = user;
                Sync.bootstrap(user.companyId || 'local', user.id || user.uid || 'local').then(function () {
                    Store.initSampleData();
                    self.handleRoute();
                });
            } else {
                this.renderLogin();
            }
        }
    },

    // 회원가입 직후에는 users 프로필이 아직 전파 전일 수 있어 잠시 재시도한다
    _resolveCompany: async function (uid, tries) {
        for (var i = 0; i < (tries || 1); i++) {
            var cid = await DB.getUserCompany(uid);
            if (cid) return cid;
            if (i < tries - 1) await new Promise(function (r) { setTimeout(r, 400); });
        }
        return null;
    },

    /**
     * 로그인/가입이 확정된 뒤 앱에 진입하는 공통 경로.
     * onAuthStateChanged와 회원가입 흐름이 모두 이 함수를 통해 들어온다.
     */
    enterCompany: async function (companyId, firebaseUser) {
        DB.setContext(companyId, firebaseUser.uid);
        var memberInfo = await DB.getMemberRole(companyId, firebaseUser.uid);
        var userProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (memberInfo && memberInfo.name) || '사용자',
            email: firebaseUser.email,
            role: (memberInfo && memberInfo.role) || 'worker',
            roleLabel: (memberInfo && memberInfo.roleLabel) || '직원',
            companyId: companyId,
            loginAt: new Date().toISOString()
        };
        localStorage.setItem('builderoffice_current_user', JSON.stringify(userProfile));

        this.isLoggedIn = true;
        this.currentUser = userProfile;

        // 회사 데이터를 내려받고 실시간 구독을 건 뒤에 화면을 그린다
        this.showLoading('현장 데이터를 불러오는 중...');
        await Sync.bootstrap(companyId, firebaseUser.uid);

        // 기존 인원 기록에 남아 있는 민감 필드를 분리 컬렉션으로 이전 (관리자 1회)
        var movedCount = Store.migratePersonnelPrivate();
        this.hideLoading();

        this.handleRoute();
        if (movedCount > 0) {
            App.showToast(movedCount + '명의 개인정보를 보호 저장소로 이전했습니다.', 'success');
        }
        App.showToast(userProfile.name + '님 안녕하세요!', 'success');
    },

    // === 전체 화면 로딩 오버레이 ===
    showLoading: function (message) {
        var el = document.getElementById('loadingOverlay');
        if (!el) return;
        el.querySelector('.loading-text').textContent = message || '불러오는 중...';
        el.style.display = 'flex';
    },

    hideLoading: function () {
        var el = document.getElementById('loadingOverlay');
        if (el) el.style.display = 'none';
    },

    renderLogin: function () {
        document.getElementById('loginPage').style.display = 'block';
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('loginPage').innerHTML = Login.render();
    },

    handleRoute: function () {
        if (!this.isLoggedIn) {
            this.renderLogin();
            return;
        }

        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appContainer').style.display = '';

        // Update user badge
        var badge = document.getElementById('userBadge');
        if (badge && this.currentUser) {
            badge.textContent = this.currentUser.roleLabel + ' · ' + this.currentUser.name;
        }

        // 동기화 상태 표시 갱신
        if (typeof Sync !== 'undefined') Sync._renderStatus();

        // 관리자 전용 메뉴 표시/숨김
        this._applyRoleVisibility();

        var hash = window.location.hash.replace('#', '') || 'dashboard';
        if (this.pages[hash]) {
            // 권한이 없는 페이지는 대시보드로 돌린다
            if (this.pages[hash].adminOnly && !this.isAdminUser()) {
                this.currentPage = 'dashboard';
            } else {
                this.currentPage = hash;
            }
        } else {
            this.currentPage = 'dashboard';
        }
        this.renderPage();
        this._updateActiveNav();
    },

    isAdminUser: function () {
        var u = this.currentUser;
        return !!(u && (u.role === 'owner' || u.role === 'admin'));
    },

    _applyRoleVisibility: function () {
        var show = this.isAdminUser();
        var els = document.querySelectorAll('.admin-only');
        for (var i = 0; i < els.length; i++) {
            els[i].style.display = show ? '' : 'none';
        }
    },

    renderPage: function () {
        var page = this.pages[this.currentPage];
        var mod = page.module();
        var content = document.getElementById('pageContent');
        content.innerHTML = mod.render();
        window.scrollTo(0, 0);
    },

    refreshPage: function () {
        this.renderPage();
    },

    navigate: function (page) {
        window.location.hash = page;
    },

    _updateActiveNav: function () {
        var self = this;
        // Desktop nav
        var items = document.querySelectorAll('.nav-item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.dataset.page === self.currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
        // Mobile bottom nav
        var mobItems = document.querySelectorAll('.mob-nav-item');
        for (var j = 0; j < mobItems.length; j++) {
            var mi = mobItems[j];
            if (mi.dataset.page === self.currentPage) {
                mi.classList.add('active');
            } else {
                mi.classList.remove('active');
            }
        }
    },

    // === Mobile More Menu ===
    toggleMobileMenu: function (e) {
        if (e) e.preventDefault();
        var menu = document.getElementById('mobileMoreMenu');
        menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
    },

    closeMobileMore: function () {
        document.getElementById('mobileMoreMenu').style.display = 'none';
    },

    // === Modal ===
    showModal: function (html) {
        var overlay = document.getElementById('modalOverlay');
        var modal = document.getElementById('modalContent');
        modal.innerHTML = html;
        overlay.classList.add('active');

        var self = this;
        overlay.onclick = function (e) {
            if (e.target === overlay) self.closeModal();
        };
        document.addEventListener('keydown', this._escHandler);
    },

    closeModal: function () {
        var overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('active');
        document.removeEventListener('keydown', this._escHandler);
    },

    _escHandler: function (e) {
        if (e.key === 'Escape') App.closeModal();
    },

    /* === 통합 검색 =========================================
       현장·인원·자재·비용·문서를 한 번에 찾는다.
       입력 즉시가 아니라 Enter를 눌렀을 때 찾는다
       (현장에서 한 글자마다 목록이 튀면 오히려 불편하다).
       ====================================================== */
    search: function (q) {
        q = String(q || '').trim();
        if (!q) return;
        var lower = q.toLowerCase();

        function match(v) {
            return v && String(v).toLowerCase().indexOf(lower) !== -1;
        }
        function pick(arr, fields, type, icon, page, labelFn) {
            var out = [];
            for (var i = 0; i < arr.length && out.length < 8; i++) {
                var it = arr[i];
                for (var f = 0; f < fields.length; f++) {
                    if (match(it[fields[f]])) {
                        out.push({ type: type, icon: icon, page: page, label: labelFn(it) });
                        break;
                    }
                }
            }
            return out;
        }

        var groups = [
            { name: '현장', items: pick(Store.getSites(), ['name', 'client', 'address', 'manager'], '현장', '🏗️', 'sites',
                function (s) { return s.name + ' · ' + (s.client || '') + ' (' + (s.status || '') + ')'; }) },
            { name: '인원', items: pick(Store.getPersonnel(), ['name', 'jobType', 'phone'], '인원', '👷', 'personnel',
                function (p) { return p.name + ' · ' + (p.jobType || '') + ' ' + (p.phone || ''); }) },
            { name: '자재', items: pick(Store.getMaterials(), ['name', 'spec', 'category'], '자재', '📦', 'materials',
                function (m) { return m.name + ' · 재고 ' + (m.stock || 0) + (m.unit || ''); }) },
            { name: '비용', items: pick(Store.getCosts(), ['name', 'memo', 'category'], '비용', '💰', 'costs',
                function (c) { return c.date + ' ' + c.name + ' · ' + Store.formatCurrency(c.amount); }) },
            { name: '문서', items: pick(Store.getDocuments(), ['name', 'type', 'siteName', 'note'], '문서', '📂', 'documents',
                function (d) { return d.name + ' · ' + (d.type || ''); }) },
            { name: '작업일보', items: pick(Store.getWorkInputs(), ['siteName', 'workContent'], '일보', '📝', 'workinput',
                function (w) { return w.date + ' ' + w.siteName + ' · ' + (w.workContent || '').slice(0, 30); }) }
        ];

        var total = groups.reduce(function (s, g) { return s + g.items.length; }, 0);
        var esc = Store.escapeHtml;
        var body = '';

        if (!total) {
            body = '<div class="empty-state" style="padding:32px;"><div class="empty-icon">🔍</div>' +
                '<p><strong>"' + esc(q) + '"</strong>에 대한 결과가 없습니다.</p></div>';
        } else {
            for (var g = 0; g < groups.length; g++) {
                if (!groups[g].items.length) continue;
                body += '<div style="margin-bottom:14px;">' +
                    '<div style="font-size:12px;font-weight:700;color:var(--text-muted);' +
                    'text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">' +
                    groups[g].name + ' (' + groups[g].items.length + ')</div>';
                for (var i = 0; i < groups[g].items.length; i++) {
                    var it = groups[g].items[i];
                    body += '<div class="search-hit" onclick="App.closeModal();App.navigate(\'' + it.page + '\');">' +
                        '<span class="search-hit-icon">' + it.icon + '</span>' +
                        '<span class="search-hit-text">' + esc(it.label) + '</span>' +
                        '<span class="search-hit-go">→</span></div>';
                }
                body += '</div>';
            }
        }

        this.showModal(
            '<div class="modal-header"><h3>🔍 "' + esc(q) + '" 검색 결과 ' +
            (total ? '(' + total + '건)' : '') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' + body + '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">닫기</button></div>'
        );
    },

    /** 승인 대기 건을 알려준다 (기존 알림 버튼이 아무 일도 안 하던 것을 대체) */
    showNotifications: function () {
        var pending = Store.getApprovals().filter(function (a) { return a.status === '대기'; });
        var esc = Store.escapeHtml;

        if (!pending.length) {
            this.showToast('새로운 알림이 없습니다.', 'info');
            return;
        }

        var rows = '';
        for (var i = 0; i < pending.length && i < 10; i++) {
            var a = pending[i];
            rows += '<div class="search-hit" onclick="App.closeModal();App.navigate(\'approvals\');">' +
                '<span class="search-hit-icon">📋</span>' +
                '<span class="search-hit-text"><strong>' + esc(a.title) + '</strong><br>' +
                '<span style="font-size:12px;color:var(--text-muted);">' +
                esc(a.requester || '') + ' · ' + esc(a.requestDate || '') + '</span></span>' +
                '<span class="search-hit-go">→</span></div>';
        }

        this.showModal(
            '<div class="modal-header"><h3>🔔 결재 대기 ' + pending.length + '건</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' + rows +
            (pending.length > 10 ? '<p style="text-align:center;color:var(--text-muted);font-size:13px;">외 ' +
                (pending.length - 10) + '건</p>' : '') + '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-primary" onclick="App.closeModal();App.navigate(\'approvals\');">승인함 열기</button></div>'
        );
    },

    // === Toast ===
    showToast: function (message, type) {
        type = type || 'info';
        var container = document.getElementById('toastContainer');
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;

        var icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span> ' + message;

        container.appendChild(toast);

        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(function () { toast.remove(); }, 300);
        }, 3000);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () { App.init(); });
