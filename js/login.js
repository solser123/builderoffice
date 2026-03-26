/* =======================================
   BuilderOffice - Login Module
   프로토타입용 로그인/역할 선택
   ======================================= */

var Login = {
    ROLES: [
        { id: 'owner', label: '대표', icon: '👔', desc: '전체 현장 총괄, 경영 대시보드' },
        { id: 'admin', label: '본사 관리자', icon: '🏢', desc: '정산, 승인, 문서 관리' },
        { id: 'siteManager', label: '현장소장', icon: '👷', desc: '현장 투입/안전/일일입력' },
        { id: 'worker', label: '직원', icon: '🧑‍🔧', desc: '출역 확인, 개인 정보' },
        { id: 'partner', label: '협력업체', icon: '🤝', desc: '공유 문서, 투입 현황 조회' }
    ],

    render: function () {
        var roleCards = '';
        for (var i = 0; i < this.ROLES.length; i++) {
            var r = this.ROLES[i];
            roleCards += '<div class="login-role-card" onclick="Login.selectRole(\'' + r.id + '\')">' +
                '<div class="login-role-icon">' + r.icon + '</div>' +
                '<div class="login-role-info">' +
                '<div class="login-role-label">' + r.label + '</div>' +
                '<div class="login-role-desc">' + r.desc + '</div>' +
                '</div>' +
                '<div class="login-role-arrow">→</div>' +
                '</div>';
        }

        return '<div class="login-page">' +
            '<div class="login-container">' +
            '<div class="login-header">' +
            '<div class="login-logo">🏗️</div>' +
            '<h1 class="login-title">BuilderOffice</h1>' +
            '<p class="login-subtitle">건설현장 통합 관리 시스템</p>' +
            '</div>' +
            '<div class="login-form-section">' +
            '<div class="login-input-group">' +
            '<label>아이디</label>' +
            '<input type="text" class="form-control" id="loginId" placeholder="admin" value="admin">' +
            '</div>' +
            '<div class="login-input-group">' +
            '<label>비밀번호</label>' +
            '<input type="password" class="form-control" id="loginPw" placeholder="••••••••" value="1234">' +
            '</div>' +
            '</div>' +
            '<div class="login-divider"><span>역할 선택 (프로토타입)</span></div>' +
            '<div class="login-role-list">' + roleCards + '</div>' +
            '</div>' +
            '</div>';
    },

    selectRole: function (roleId) {
        var role = this.ROLES.find(function (r) { return r.id === roleId; });
        if (!role) return;

        Store._set('builderoffice_current_user', {
            id: 'user_' + roleId,
            name: role.label === '현장소장' ? '김소장' : role.label === '대표' ? '박대���' : role.label,
            role: roleId,
            roleLabel: role.label,
            loginAt: new Date().toISOString()
        });

        App.isLoggedIn = true;
        App.currentUser = Store._get('builderoffice_current_user');
        App.handleRoute();
        App.showToast(role.label + '(으)로 로그인되었습니다.', 'success');
    },

    logout: function () {
        localStorage.removeItem('builderoffice_current_user');
        App.isLoggedIn = false;
        App.currentUser = null;
        App.renderLogin();
        App.showToast('로그아웃되었습니다.', 'info');
    },

    getCurrentUser: function () {
        try {
            var data = localStorage.getItem('builderoffice_current_user');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }
};
