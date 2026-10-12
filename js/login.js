/* =======================================
   BuilderOffice - Login Module
   Firebase Authentication 기반 로그인
   ======================================= */

var Login = {
    ROLES: [
        { id: 'owner',       label: '대표',      icon: '👔', desc: '전체 현장 총괄, 경영 대시보드' },
        { id: 'admin',       label: '본사 관리자', icon: '🏢', desc: '정산, 승인, 문서 관리' },
        { id: 'siteManager', label: '현장소장',   icon: '👷', desc: '현장 투입/안전/일일입력' },
        { id: 'worker',      label: '직원',       icon: '🧑‍🔧', desc: '출역 확인, 개인 정보' },
        { id: 'partner',     label: '협력업체',   icon: '🤝', desc: '공유 문서, 투입 현황 조회' }
    ],

    _mode: 'login', // 'login' | 'register' | 'setup'

    render: function () {
        if (this._mode === 'register') return this._renderRegister();
        if (this._mode === 'join') return this._renderJoin();
        if (this._mode === 'setup') return this._renderCompanySetup();
        return this._renderLogin();
    },

    showJoin: function () {
        this._mode = 'join';
        App.renderLogin();
    },

    // 초대 코드로 기존 회사에 합류
    _renderJoin: function () {
        return '<div class="login-page">' +
            '<div class="login-container">' +
            '<div class="login-header">' +
            '<div class="login-logo">🎟️</div>' +
            '<h1 class="login-title">업체 코드로 참여</h1>' +
            '<p class="login-subtitle">회사에서 받은 업체 코드를 입력하면 바로 승인됩니다</p>' +
            '</div>' +
            '<div class="login-form-section">' +
            '<div class="login-input-group"><label>업체 코드</label>' +
            '<input type="text" class="form-control" id="joinCode" placeholder="ABCD-2345" ' +
            'style="text-transform:uppercase;letter-spacing:2px;font-weight:700;text-align:center;" ' +
            'oninput="Login.onCodeInput(this)" autocomplete="off"></div>' +
            '<div id="joinCodeInfo" style="margin:8px 0;font-size:13px;"></div>' +
            '<div class="login-input-group"><label>이름</label>' +
            '<input type="text" class="form-control" id="joinName" placeholder="홍길동"></div>' +
            '<div class="login-input-group"><label>이메일</label>' +
            '<input type="email" class="form-control" id="joinEmail" placeholder="example@company.com"></div>' +
            '<div class="login-input-group"><label>비밀번호 (6자 이상)</label>' +
            '<input type="password" class="form-control" id="joinPw" placeholder="••••••••"></div>' +
            '<button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="Login.doJoin()">✅ 참여하기</button>' +
            '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="Login.showLogin()">← 로그인으로 돌아가기</button>' +
            '</div>' +
            '<div id="joinError" style="color:var(--danger);text-align:center;margin-top:8px;font-size:14px;"></div>' +
            '</div>' +
            '</div>';
    },

    // 입력하는 대로 ABCD-2345 형태로 정리해준다
    onCodeInput: function (el) {
        var s = String(el.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        el.value = s.length > 4 ? s.slice(0, 4) + '-' + s.slice(4) : s;
        var info = document.getElementById('joinCodeInfo');
        if (info) info.innerHTML = '';
    },

    doJoin: async function () {
        var code = (document.getElementById('joinCode').value || '').trim();
        var name = (document.getElementById('joinName').value || '').trim();
        var email = (document.getElementById('joinEmail').value || '').trim();
        var pw = document.getElementById('joinPw').value;
        var errEl = document.getElementById('joinError');
        var infoEl = document.getElementById('joinCodeInfo');

        if (!code || !name || !email || !pw) { errEl.textContent = '모든 항목을 입력해주세요.'; return; }
        if (pw.length < 6) { errEl.textContent = '비밀번호는 6자 이상이어야 합니다.'; return; }
        if (typeof FB === 'undefined' || !FB.createUserWithEmailAndPassword) {
            errEl.textContent = '서버에 연결할 수 없습니다.'; return;
        }

        App._registering = true;
        var created = false, cred = null;
        try {
            errEl.textContent = '';
            infoEl.innerHTML = '<span style="color:var(--text-muted);">확인 중...</span>';

            // 코드 조회는 로그인 상태에서만 가능하므로 계정을 먼저 만든다
            cred = await FB.createUserWithEmailAndPassword(email, pw);
            created = true;
            await FB.updateProfile(cred.user, { displayName: name });

            var companyId = await DB.joinWithInvite(code, cred.user, name);

            infoEl.innerHTML = '';
            App._registering = false;
            await App.enterCompany(companyId, cred.user);
        } catch (e) {
            App._registering = false;
            App.hideLoading();
            infoEl.innerHTML = '';

            // 코드가 틀려서 실패했다면 방금 만든 계정을 정리한다.
            // (남겨두면 다시 시도할 때 "이미 사용 중인 이메일"이 되어 막힌다)
            if (created && cred) {
                try { await cred.user.delete(); } catch (e2) { try { await FB.signOut(); } catch (e3) {} }
            }

            var msg = e.message || '참여 실패';
            if (e.code === 'auth/email-already-in-use') msg = '이미 사용 중인 이메일입니다. 로그인해주세요.';
            else if (e.code === 'auth/invalid-email') msg = '이메일 형식이 올바르지 않습니다.';
            else if (e.code === 'auth/weak-password') msg = '비밀번호가 너무 약합니다.';
            else if (e.code === 'permission-denied') msg = '코드가 유효하지 않거나 만료되었습니다.';
            errEl.textContent = msg;
        }
    },

    _renderLogin: function () {
        return '<div class="login-page">' +
            '<div class="login-container">' +
            '<div class="login-header">' +
            '<div class="login-logo">🏗️</div>' +
            '<h1 class="login-title">BuilderOffice</h1>' +
            '<p class="login-subtitle">건설현장 통합 관리 시스템</p>' +
            '</div>' +
            '<div class="login-form-section">' +
            '<div class="login-input-group">' +
            '<label>이메일</label>' +
            '<input type="email" class="form-control" id="loginEmail" placeholder="example@company.com" autocomplete="email">' +
            '</div>' +
            '<div class="login-input-group">' +
            '<label>비밀번호</label>' +
            '<input type="password" class="form-control" id="loginPw" placeholder="••••••••" autocomplete="current-password"' +
            ' onkeydown="if(event.key===\'Enter\') Login.doLogin();">' +
            '</div>' +
            '<button class="btn btn-primary" style="width:100%;margin-top:12px;" onclick="Login.doLogin()">🔐 로그인</button>' +
            '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="Login.showJoin()">🎟️ 업체 코드로 참여</button>' +
            '<div style="text-align:center;margin-top:14px;">' +
            '<a href="#" onclick="Login.showRegister();return false;" style="color:var(--text-secondary);font-size:13px;text-decoration:underline;">업체를 새로 등록하시나요?</a>' +
            '</div>' +
            '</div>' +
            '<div id="loginError" style="color:var(--danger);text-align:center;margin-top:8px;font-size:14px;"></div>' +
            '</div>' +
            '</div>';
    },

    _renderRegister: function () {
        return '<div class="login-page">' +
            '<div class="login-container">' +
            '<div class="login-header">' +
            '<div class="login-logo">🏗️</div>' +
            '<h1 class="login-title">회원가입</h1>' +
            '<p class="login-subtitle">새 계정 및 회사를 등록합니다</p>' +
            '</div>' +
            '<div class="login-form-section">' +
            '<div class="login-input-group"><label>이름</label>' +
            '<input type="text" class="form-control" id="regName" placeholder="홍길동"></div>' +
            '<div class="login-input-group"><label>이메일</label>' +
            '<input type="email" class="form-control" id="regEmail" placeholder="example@company.com"></div>' +
            '<div class="login-input-group"><label>비밀번호 (6자 이상)</label>' +
            '<input type="password" class="form-control" id="regPw" placeholder="••••••••"></div>' +
            '<div class="login-input-group"><label>회사명</label>' +
            '<input type="text" class="form-control" id="regCompany" placeholder="(주)건설회사"></div>' +
            '<div class="login-divider"><span>역할 선택</span></div>' +
            '<div class="login-role-list">' + this._renderRoleCards() + '</div>' +
            '<input type="hidden" id="regRole" value="owner">' +
            '<button class="btn btn-primary" style="width:100%;margin-top:16px;" onclick="Login.doRegister()">✅ 가입하기</button>' +
            '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="Login.showLogin()">← 로그인으로 돌아가기</button>' +
            '</div>' +
            '<div id="regError" style="color:var(--danger);text-align:center;margin-top:8px;font-size:14px;"></div>' +
            '</div>' +
            '</div>';
    },

    _renderRoleCards: function () {
        var html = '';
        for (var i = 0; i < this.ROLES.length; i++) {
            var r = this.ROLES[i];
            html += '<div class="login-role-card" id="roleCard_' + r.id + '" onclick="Login.selectRoleCard(\'' + r.id + '\')">' +
                '<div class="login-role-icon">' + r.icon + '</div>' +
                '<div class="login-role-info">' +
                '<div class="login-role-label">' + r.label + '</div>' +
                '<div class="login-role-desc">' + r.desc + '</div>' +
                '</div></div>';
        }
        return html;
    },

    selectRoleCard: function (roleId) {
        var cards = document.querySelectorAll('.login-role-card');
        for (var i = 0; i < cards.length; i++) cards[i].style.borderColor = '';
        var card = document.getElementById('roleCard_' + roleId);
        if (card) card.style.borderColor = 'var(--primary)';
        var input = document.getElementById('regRole');
        if (input) input.value = roleId;
    },

    showLogin: function () {
        this._mode = 'login';
        App.renderLogin();
    },

    showRegister: function () {
        this._mode = 'register';
        App.renderLogin();
    },

    // 로컬 테스트 계정 (Firebase 미설정 시 사용)
    LOCAL_ACCOUNTS: [
        { email: 'admin@builder.com', pw: '1234', name: '관리자', role: 'admin', company: 'BuilderOffice', companyId: 'local' },
        { email: 'owner@builder.com', pw: '1234', name: '대표', role: 'owner', company: 'BuilderOffice', companyId: 'local' }
    ],

    // Firebase 이메일 로그인
    doLogin: async function () {
        var email = (document.getElementById('loginEmail').value || '').trim();
        var pw = document.getElementById('loginPw').value;
        var errEl = document.getElementById('loginError');
        if (!email || !pw) { errEl.textContent = '이메일과 비밀번호를 입력해주세요.'; return; }

        // Firebase 미설정 시 로컬 계정으로 로그인
        var local = this.LOCAL_ACCOUNTS.find(function (a) { return a.email === email && a.pw === pw; });
        if (local) {
            var user = { uid: 'local_' + local.role, name: local.name, email: local.email, role: local.role, roleLabel: local.role === 'admin' ? '본사 관리자' : '대표', company: local.company, companyId: local.companyId };
            localStorage.setItem('builderoffice_current_user', JSON.stringify(user));
            App.currentUser = user;
            App.isLoggedIn = true;
            if (typeof DB !== 'undefined') DB.setContext(local.companyId, user.uid);
            await Sync.bootstrap(local.companyId, user.uid);
            Store.initSampleData();
            Store.migratePersonnelPrivate();
            App.handleRoute();
            App.showToast(user.name + '님 안녕하세요!', 'success');
            return;
        }

        if ((typeof FB === 'undefined') || !FB.signInWithEmailAndPassword) {
            errEl.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.';
            return;
        }

        try {
            errEl.textContent = '로그인 중...';
            var cred = await FB.signInWithEmailAndPassword(email, pw);
            // onAuthStateChanged가 자동으로 처리함
        } catch (e) {
            var msg = '로그인 실패';
            if (e.code === 'auth/user-not-found') msg = '등록되지 않은 이메일입니다.';
            else if (e.code === 'auth/wrong-password') msg = '비밀번호가 올바르지 않습니다.';
            else if (e.code === 'auth/invalid-email') msg = '이메일 형식이 올바르지 않습니다.';
            else if (e.code === 'auth/too-many-requests') msg = '로그인 시도 횟수 초과. 잠시 후 다시 시도해주세요.';
            errEl.textContent = msg;
        }
    },

    // Firebase 회원가입
    doRegister: async function () {
        var name = (document.getElementById('regName').value || '').trim();
        var email = (document.getElementById('regEmail').value || '').trim();
        var pw = document.getElementById('regPw').value;
        var company = (document.getElementById('regCompany').value || '').trim();
        var role = document.getElementById('regRole').value || 'owner';
        var errEl = document.getElementById('regError');

        if (!name || !email || !pw || !company) {
            errEl.textContent = '모든 항목을 입력해주세요.'; return;
        }
        if (pw.length < 6) { errEl.textContent = '비밀번호는 6자 이상이어야 합니다.'; return; }

        // 회원가입 중에는 onAuthStateChanged가 개입하지 않도록 막는다.
        // (createUser 성공 즉시 발동하지만, 회사·프로필은 아직 생성 전이다.)
        App._registering = true;
        try {
            errEl.textContent = '계정 생성 중...';
            var cred = await FB.createUserWithEmailAndPassword(email, pw);
            await FB.updateProfile(cred.user, { displayName: name });

            // 회사 생성 및 프로필 저장
            var roleObj = Login.ROLES.find(function (r) { return r.id === role; }) || Login.ROLES[0];
            var companyId = await DB.createCompany(company, cred.user.uid, email, name);
            await DB.saveUserProfile(cred.user.uid, {
                uid: cred.user.uid,
                name: name,
                email: email,
                companyId: companyId,
                role: role,
                roleLabel: roleObj.label,
                createdAt: new Date().toISOString()
            });

            // 업체 코드 자동 발급 — 대표가 따로 찾아 들어가지 않아도 되게 한다
            DB.setContext(companyId, cred.user.uid);
            var primary = null;
            try {
                primary = await DB.createPrimaryCode(company, name);
            } catch (e) {
                console.warn('[Login] 업체 코드 자동 발급 실패', e);
            }

            this._mode = 'login';

            // 회사·프로필이 확정됐으니 직접 앱에 진입한다 (경합 없이 확실하게).
            App._registering = false;
            await App.enterCompany(companyId, cred.user);

            // 진입 후 코드를 크게 보여준다
            if (primary) {
                Team.showWelcomeCode(primary, company);
            } else {
                App.showToast('업체 코드 발급에 실패했습니다. 팀 관리에서 직접 발급해주세요.', 'error');
            }
        } catch (e) {
            App._registering = false;
            App.hideLoading();
            var msg = '가입 실패';
            if (e.code === 'auth/email-already-in-use') msg = '이미 사용 중인 이메일입니다.';
            else if (e.code === 'auth/invalid-email') msg = '이메일 형식이 올바르지 않습니다.';
            else if (e.code === 'auth/weak-password') msg = '비밀번호가 너무 약합니다.';
            else if (e.code === 'permission-denied') msg = '회사 등록 권한 오류 — 보안 규칙 배포 상태를 확인하세요.';
            else if (e.message) msg = '가입 실패: ' + e.message;
            errEl.textContent = msg;
        }
    },

    logout: async function () {
        try {
            await FB.signOut();
        } catch (e) {
            // Firebase 없을 때 fallback
            localStorage.removeItem('builderoffice_current_user');
        }
        if (typeof Sync !== 'undefined') Sync.teardown();
        App.isLoggedIn = false;
        App.currentUser = null;
        App.renderLogin();
        App.showToast('로그아웃되었습니다.', 'info');
    },

    getCurrentUser: function () {
        // Firebase Auth 우선, localStorage fallback
        var fbUser = (typeof FB !== 'undefined' && FB.getCurrentUser) ? FB.getCurrentUser() : null;
        if (fbUser) {
            var cached = localStorage.getItem('builderoffice_current_user');
            if (cached) {
                try { return JSON.parse(cached); } catch (e) {}
            }
        }
        try {
            var data = localStorage.getItem('builderoffice_current_user');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }
};
