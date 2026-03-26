/* =======================================
   BuilderOffice - App Controller
   SPA 라우터 및 앱 초기화
   ======================================= */

var App = {
    currentPage: 'dashboard',
    isLoggedIn: false,
    currentUser: null,

    pages: {
        dashboard: { title: '대시보드', icon: '📊', module: function () { return Dashboard; } },
        sites: { title: '현장 관리', icon: '🏗️', module: function () { return Sites; } },
        workinput: { title: '일일 입력', icon: '📝', module: function () { return WorkInput; } },
        costs: { title: '비용 관리', icon: '💰', module: function () { return Costs; } },
        personnel: { title: '인원 관리', icon: '👷', module: function () { return Personnel; } },
        materials: { title: '자재 관리', icon: '📦', module: function () { return Materials; } },
        safety: { title: '안전 관리', icon: '🦺', module: function () { return Safety; } },
        documents: { title: '문서 관리', icon: '📂', module: function () { return Documents; } },
        approvals: { title: '승인함', icon: '✅', module: function () { return Approvals; } }
    },

    init: function () {
        Store.initSampleData();

        var self = this;
        window.addEventListener('hashchange', function () { self.handleRoute(); });

        // Check login state
        var user = Login.getCurrentUser();
        if (user) {
            this.isLoggedIn = true;
            this.currentUser = user;
            this.handleRoute();
        } else {
            this.renderLogin();
        }
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

        var hash = window.location.hash.replace('#', '') || 'dashboard';
        if (this.pages[hash]) {
            this.currentPage = hash;
        } else {
            this.currentPage = 'dashboard';
        }
        this.renderPage();
        this._updateActiveNav();
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
