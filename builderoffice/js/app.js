/* =======================================
   BuilderOffice - App Controller
   SPA 라우터 및 앱 초기화
   ======================================= */

const App = {
    currentPage: 'dashboard',

    pages: {
        dashboard: { title: '대시보드', icon: '📊', module: () => Dashboard },
        costs: { title: '비용 관리', icon: '💰', module: () => Costs },
        personnel: { title: '인원 관리', icon: '👷', module: () => Personnel },
        materials: { title: '자재 관리', icon: '📦', module: () => Materials },
    },

    init() {
        // Initialize sample data
        Store.initSampleData();

        // Handle hash routing
        this.handleRoute();
        window.addEventListener('hashchange', () => this.handleRoute());

        // Update date display
        this._updateDate();

        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => this.toggleMobileMenu());
        document.getElementById('sidebarOverlay').addEventListener('click', () => this.closeMobileMenu());
    },

    handleRoute() {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        if (this.pages[hash]) {
            this.currentPage = hash;
        } else {
            this.currentPage = 'dashboard';
        }
        this.renderPage();
        this._updateActiveNav();
        this.closeMobileMenu();
    },

    renderPage() {
        const page = this.pages[this.currentPage];
        const module = page.module();
        const content = document.getElementById('pageContent');
        const titleEl = document.getElementById('pageTitle');

        titleEl.innerHTML = `${page.icon} <span>${page.title}</span>`;
        content.innerHTML = module.render();
    },

    refreshPage() {
        this.renderPage();
    },

    navigate(page) {
        window.location.hash = page;
    },

    _updateActiveNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === this.currentPage);
        });
    },

    _updateDate() {
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            dateEl.textContent = now.toLocaleDateString('ko-KR', options);
        }
    },

    // === Mobile Menu ===
    toggleMobileMenu() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebarOverlay').classList.toggle('active');
    },

    closeMobileMenu() {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    },

    // === Modal ===
    showModal(html) {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.getElementById('modalContent');
        modal.innerHTML = html;
        overlay.classList.add('active');

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeModal();
        });

        // Close on Escape
        document.addEventListener('keydown', this._escHandler);
    },

    closeModal() {
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('active');
        document.removeEventListener('keydown', this._escHandler);
    },

    _escHandler(e) {
        if (e.key === 'Escape') App.closeModal();
    },

    // === Toast ===
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
