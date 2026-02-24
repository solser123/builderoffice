/* =======================================
   BuilderOffice - App Controller
   SPA 라우터 및 앱 초기화
   ======================================= */

var App = {
    currentPage: 'dashboard',

    pages: {
        dashboard: { title: '대시보드', icon: '📊', module: function () { return Dashboard; } },
        costs: { title: '비용 관리', icon: '💰', module: function () { return Costs; } },
        personnel: { title: '인원 관리', icon: '👷', module: function () { return Personnel; } },
        materials: { title: '자재 관리', icon: '📦', module: function () { return Materials; } }
    },

    init: function () {
        // Initialize sample data
        Store.initSampleData();

        // Handle hash routing
        var self = this;
        this.handleRoute();
        window.addEventListener('hashchange', function () { self.handleRoute(); });

        // Update date display
        this._updateDate();

        // Mobile menu
        var mobileBtn = document.getElementById('mobileMenuBtn');
        if (mobileBtn) mobileBtn.addEventListener('click', function () { self.toggleMobileMenu(); });

        var overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.addEventListener('click', function () { self.closeMobileMenu(); });
    },

    handleRoute: function () {
        var hash = window.location.hash.replace('#', '') || 'dashboard';
        if (this.pages[hash]) {
            this.currentPage = hash;
        } else {
            this.currentPage = 'dashboard';
        }
        this.renderPage();
        this._updateActiveNav();
        this.closeMobileMenu();
    },

    renderPage: function () {
        var page = this.pages[this.currentPage];
        var mod = page.module();
        var content = document.getElementById('pageContent');
        var titleEl = document.getElementById('pageTitle');

        if (titleEl) {
            titleEl.innerHTML = page.icon + ' <span>' + page.title + '</span>';
        }
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
        var items = document.querySelectorAll('.nav-item');
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.dataset.page === self.currentPage) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    },

    _updateDate: function () {
        var dateEl = document.getElementById('currentDate');
        if (dateEl) {
            var now = new Date();
            var options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            dateEl.textContent = now.toLocaleDateString('ko-KR', options);
        }
    },

    // === Mobile Menu ===
    toggleMobileMenu: function () {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    },

    closeMobileMenu: function () {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
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
