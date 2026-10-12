/* =======================================
   BuilderOffice - 팀 관리 (계정 · 초대 코드)

   대표(owner)와 시스템 관리자(admin)만 접근한다.
   - 초대 코드를 발급해서 팀원을 가입시킨다
   - 가입한 팀원의 역할을 바꾸거나 내보낸다

   ※ 여기 표시되는 것은 "로그인 계정"이다.
      현장 인원(일용직) 명부는 '인원 관리'에서 따로 다룬다.
   ======================================= */

var Team = {
    activeTab: 'members',
    _members: null,
    _invites: null,
    _loading: false,

    // 대표는 초대로 만들 수 없다 (회사당 1명, 최초 등록자)
    ASSIGNABLE_ROLES: [
        { id: 'admin', label: '시스템 관리자', icon: '🏢', desc: '정산·승인·문서, 개인정보 열람 가능' },
        { id: 'siteManager', label: '현장소장', icon: '👷', desc: '현장 투입·안전·일일입력' },
        { id: 'worker', label: '직원', icon: '🧑‍🔧', desc: '출역 확인, 본인 정보' },
        { id: 'partner', label: '협력업체', icon: '🤝', desc: '조회 전용' }
    ],

    roleLabel: function (id) {
        if (id === 'owner') return '대표';
        for (var i = 0; i < this.ASSIGNABLE_ROLES.length; i++) {
            if (this.ASSIGNABLE_ROLES[i].id === id) return this.ASSIGNABLE_ROLES[i].label;
        }
        return '직원';
    },

    roleIcon: function (id) {
        if (id === 'owner') return '👔';
        for (var i = 0; i < this.ASSIGNABLE_ROLES.length; i++) {
            if (this.ASSIGNABLE_ROLES[i].id === id) return this.ASSIGNABLE_ROLES[i].icon;
        }
        return '🧑‍🔧';
    },

    _isAdmin: function () {
        var u = App.currentUser;
        return !!(u && (u.role === 'owner' || u.role === 'admin'));
    },

    render: function () {
        if (!this._isAdmin()) {
            return '<div class="page-header"><h1 class="page-title">🎟️ 팀 관리</h1></div>' +
                '<div class="empty-state" style="padding:48px 24px;"><div class="empty-icon">🔒</div>' +
                '<p><strong>대표·시스템 관리자만</strong> 접근할 수 있습니다.</p></div>';
        }

        // 클라우드 모드가 아니면 계정 개념이 없다
        if (typeof Sync === 'undefined' || Sync.MODE !== 'cloud') {
            return '<div class="page-header"><h1 class="page-title">🎟️ 팀 관리</h1></div>' +
                '<div class="empty-state" style="padding:48px 24px;"><div class="empty-icon">⚪</div>' +
                '<p><strong>로컬 모드</strong>에서는 계정을 초대할 수 없습니다.</p>' +
                '<p style="font-size:13px;color:var(--text-muted);margin-top:8px;">' +
                '서버에 로그인한 상태에서 이용해주세요.</p></div>';
        }

        // 최초 진입 시 데이터 로드 (비동기 → 완료되면 다시 그린다)
        if (this._members === null && !this._loading) {
            this._loadData();
        }

        var body = this._loading && this._members === null
            ? '<div class="empty-state" style="padding:40px;"><div class="loading-spinner"></div>' +
              '<p style="margin-top:14px;">불러오는 중...</p></div>'
            : (this.activeTab === 'members' ? this._renderMembers() : this._renderInvites());

        return '<div class="page-header">' +
            '<h1 class="page-title">🎟️ 팀 관리</h1>' +
            '<p class="page-subtitle">로그인 계정과 가입 코드를 관리합니다</p>' +
            '</div>' +
            (this._invites === null ? '' : this._renderPrimaryBanner()) +
            '<div class="tab-nav">' +
            '<button class="tab-btn ' + (this.activeTab === 'members' ? 'active' : '') + '" ' +
            'onclick="Team.switchTab(\'members\')">👥 팀원 계정</button>' +
            '<button class="tab-btn ' + (this.activeTab === 'invites' ? 'active' : '') + '" ' +
            'onclick="Team.switchTab(\'invites\')">🎟️ 가입 코드</button>' +
            '</div>' + body;
    },

    switchTab: function (t) {
        this.activeTab = t;
        App.refreshPage();
    },

    _loadData: async function () {
        this._loading = true;
        try {
            var m = await DB.listMembers();
            var i = await DB.listInvites();
            this._members = m;
            this._invites = i;
        } catch (e) {
            console.warn('[Team] 로드 실패', e);
            this._members = [];
            this._invites = [];
        }
        this._loading = false;
        if (App.currentPage === 'team') App.refreshPage();
    },

    reload: function () {
        this._members = null;
        this._invites = null;
        this._loadData();
    },

    // ===== 팀원 계정 =====
    _renderMembers: function () {
        var list = this._members || [];
        var me = App.currentUser ? App.currentUser.id : null;
        var iAmOwner = App.currentUser && App.currentUser.role === 'owner';
        var esc = Store.escapeHtml;
        var rows = '';

        for (var i = 0; i < list.length; i++) {
            var m = list[i];
            var isOwner = m.role === 'owner';
            var isMe = m.uid === me;

            var actions = '';
            if (isOwner) {
                actions = '<span style="color:var(--text-muted);font-size:12px;">변경 불가</span>';
            } else if (isMe) {
                actions = '<span style="color:var(--text-muted);font-size:12px;">본인</span>';
            } else {
                actions = '<div class="action-btns">' +
                    '<button class="action-btn edit" title="역할 변경" ' +
                    'onclick="Team.showRoleModal(\'' + m.uid + '\')">✏️</button>' +
                    '<button class="action-btn delete" title="내보내기" ' +
                    'onclick="Team.confirmRemove(\'' + m.uid + '\')">🗑️</button></div>';
            }

            rows += '<tr>' +
                '<td style="font-weight:500;color:var(--text-primary);">' +
                this.roleIcon(m.role) + ' ' + esc(m.name || '-') +
                (isMe ? ' <span class="badge badge-blue" style="font-size:10px;">나</span>' : '') + '</td>' +
                '<td>' + esc(m.email || '-') + '</td>' +
                '<td><span class="badge ' + (isOwner ? 'badge-orange' : 'badge-green') + '">' +
                esc(m.roleLabel || this.roleLabel(m.role)) + '</span></td>' +
                '<td>' + (m.joinedAt ? String(m.joinedAt).substring(0, 10) : '-') + '</td>' +
                '<td>' + actions + '</td></tr>';
        }

        if (!rows) {
            rows = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👥</div>' +
                '<p>아직 팀원이 없습니다.</p>' +
                '<button class="btn btn-primary" onclick="Team.switchTab(\'invites\')">가입 코드 만들기</button>' +
                '</div></td></tr>';
        }

        var notice = iAmOwner ? '' :
            '<div class="payroll-info" style="margin-bottom:12px;">' +
            '<p>📌 대표 계정의 역할은 변경하거나 삭제할 수 없습니다.</p></div>';

        return notice +
            '<div class="toolbar">' +
            '<div class="toolbar-left"><span style="color:var(--text-muted);font-size:13px;">총 ' +
            list.length + '명</span></div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-secondary" onclick="Team.reload()">🔄 새로고침</button>' +
            '<button class="btn btn-primary" onclick="Team.showCreateInvite()">➕ 가입 코드 발급</button>' +
            '</div></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>이름</th><th>이메일</th><th>역할</th><th>가입일</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    },

    // ===== 가입 코드 =====
    _renderInvites: function () {
        var list = this._invites || [];
        var esc = Store.escapeHtml;
        var rows = '';

        for (var i = 0; i < list.length; i++) {
            var v = list[i];
            var expired = v.expiresAt && new Date(v.expiresAt) < new Date();
            var used = v.maxUses > 0 && v.usedCount >= v.maxUses;
            var dead = !v.active || expired || used;

            var status = !v.active ? '<span class="badge badge-red">중지됨</span>'
                : expired ? '<span class="badge badge-red">기간만료</span>'
                : used ? '<span class="badge badge-red">횟수소진</span>'
                : '<span class="badge badge-green">사용 가능</span>';

            rows += '<tr>' +
                '<td><code style="font-size:15px;font-weight:700;letter-spacing:1px;color:var(--accent-primary);">' +
                esc(v.code) + '</code></td>' +
                '<td><span class="badge badge-blue">' + esc(v.roleLabel || this.roleLabel(v.role)) + '</span></td>' +
                '<td>' + status + '</td>' +
                '<td style="font-variant-numeric:tabular-nums;">' +
                (v.usedCount || 0) + (v.maxUses > 0 ? ' / ' + v.maxUses : ' / 무제한') + '</td>' +
                '<td>' + (v.expiresAt ? String(v.expiresAt).substring(0, 10) : '무기한') + '</td>' +
                '<td>' + esc(v.memo || '-') + '</td>' +
                '<td><div class="action-btns">' +
                '<button class="action-btn edit" title="코드 복사" ' +
                'onclick="Team.copyCode(\'' + esc(v.code) + '\')">📋</button>' +
                (dead ? '' :
                    '<button class="action-btn edit" title="사용 중지" ' +
                    'onclick="Team.toggleInvite(\'' + esc(v.code) + '\',false)">⏸️</button>') +
                (!v.active ?
                    '<button class="action-btn edit" title="다시 사용" ' +
                    'onclick="Team.toggleInvite(\'' + esc(v.code) + '\',true)">▶️</button>' : '') +
                '<button class="action-btn delete" title="삭제" ' +
                'onclick="Team.confirmDeleteInvite(\'' + esc(v.code) + '\')">🗑️</button>' +
                '</div></td></tr>';
        }

        if (!rows) {
            rows = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🎟️</div>' +
                '<p>발급된 코드가 없습니다.</p>' +
                '<button class="btn btn-primary" onclick="Team.showCreateInvite()">첫 코드 발급하기</button>' +
                '</div></td></tr>';
        }

        return '<div class="payroll-info" style="margin-bottom:12px;">' +
            '<p>📌 코드를 팀원에게 전달하면, 로그인 화면의 <strong>🎟️ 초대 코드로 참여</strong>에서 가입합니다.</p>' +
            '<p style="color:var(--text-muted);">코드는 비밀번호와 같습니다. 외부에 노출되지 않게 주의하고, ' +
            '더 이상 쓰지 않는 코드는 중지하거나 삭제하세요.</p></div>' +
            '<div class="toolbar">' +
            '<div class="toolbar-left"><span style="color:var(--text-muted);font-size:13px;">총 ' +
            list.length + '개</span></div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-secondary" onclick="Team.reload()">🔄 새로고침</button>' +
            '<button class="btn btn-primary" onclick="Team.showCreateInvite()">➕ 가입 코드 발급</button>' +
            '</div></div>' +
            '<div class="table-container"><table><thead><tr>' +
            '<th>코드</th><th>부여 역할</th><th>상태</th><th>사용</th><th>만료</th><th>메모</th><th>작업</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    },

    /** 회사 등록 직후 뜨는 환영 화면 — 업체 코드를 크게 보여준다 */
    showWelcomeCode: function (inv, companyName) {
        var esc = Store.escapeHtml;
        App.showModal(
            '<div class="modal-header"><h3>🎉 ' + esc(companyName) + ' 등록 완료</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body" style="text-align:center;">' +
            '<p style="color:var(--text-secondary);margin-bottom:4px;">직원들에게 아래 <strong>업체 코드</strong>를 알려주세요</p>' +
            '<p style="color:var(--text-muted);font-size:13px;margin-bottom:12px;">' +
            '이 코드로 가입하면 <strong>바로 승인</strong>되어 함께 쓸 수 있습니다</p>' +
            '<div style="font-size:36px;font-weight:800;letter-spacing:5px;color:var(--accent-primary);' +
            'padding:22px;background:#f1f5f9;border:2px dashed var(--accent-primary);border-radius:14px;' +
            'margin:10px 0;font-variant-numeric:tabular-nums;">' + esc(inv.code) + '</div>' +
            '<button class="btn btn-primary" style="width:100%;" ' +
            'onclick="Team.copyCode(\'' + esc(inv.code) + '\')">📋 코드 복사하기</button>' +
            '<div class="payroll-info" style="text-align:left;margin-top:18px;">' +
            '<p><strong>직원 가입 방법</strong></p>' +
            '<p>로그인 화면 → <strong>🎟️ 업체 코드로 참여</strong> → 코드 입력 → 끝</p>' +
            '<p style="color:var(--text-muted);margin-top:8px;">가입한 사람은 <strong>직원</strong> 권한으로 들어옵니다. ' +
            '현장소장·관리자로 올리려면 <strong>팀 관리</strong>에서 역할을 바꿔주세요. ' +
            '이 코드는 언제든 다시 확인할 수 있습니다.</p></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-primary" onclick="App.closeModal();App.navigate(\'team\');">팀 관리로 이동</button></div>'
        );
    },

    /** 업체 코드 배너 — 팀 관리 상단에 항상 노출 */
    _renderPrimaryBanner: function () {
        var list = this._invites || [];
        var p = null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].isPrimary && list[i].active) { p = list[i]; break; }
        }

        if (!p) {
            return '<div class="payroll-info" style="margin-bottom:14px;">' +
                '<p>📌 업체 코드가 없습니다. ' +
                '<button class="btn btn-primary btn-sm" onclick="Team.createPrimary()">업체 코드 만들기</button></p>' +
                '</div>';
        }

        var esc = Store.escapeHtml;
        return '<div style="background:var(--bg-card);border:1px solid var(--border-color);' +
            'border-radius:14px;padding:18px 20px;margin-bottom:16px;box-shadow:var(--shadow-sm);">' +
            '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;justify-content:space-between;">' +
            '<div>' +
            '<div style="font-size:13px;color:var(--text-muted);font-weight:600;margin-bottom:4px;">🏢 우리 업체 코드</div>' +
            '<div style="font-size:28px;font-weight:800;letter-spacing:4px;color:var(--accent-primary);' +
            'font-variant-numeric:tabular-nums;">' + esc(p.code) + '</div>' +
            '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">' +
            '이 코드로 가입하면 <strong>직원</strong> 권한으로 자동 승인 · 지금까지 ' + (p.usedCount || 0) + '명 사용</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="btn btn-primary" onclick="Team.copyCode(\'' + esc(p.code) + '\')">📋 복사</button>' +
            '<button class="btn btn-secondary" onclick="Team.confirmRegenerate(\'' + esc(p.code) + '\')">🔄 새 코드</button>' +
            '</div></div></div>';
    },

    createPrimary: async function () {
        App.showLoading('업체 코드를 만드는 중...');
        try {
            var inv = await DB.createPrimaryCode(
                (App.currentUser && App.currentUser.companyName) || '',
                (App.currentUser && App.currentUser.name) || ''
            );
            App.hideLoading();
            this.showWelcomeCode(inv, '업체 코드');
            this.reload();
        } catch (e) {
            App.hideLoading();
            App.showToast('발급에 실패했습니다: ' + (e.message || ''), 'error');
        }
    },

    confirmRegenerate: async function (oldCode) {
        if (!confirm('새 업체 코드를 만들까요?\n\n기존 코드(' + oldCode + ')는 더 이상 쓸 수 없게 됩니다.\n이미 가입한 사람은 그대로 유지됩니다.')) return;
        App.showLoading('새 코드를 만드는 중...');
        try {
            await DB.setInviteActive(oldCode, false);
            var inv = await DB.createPrimaryCode(
                (App.currentUser && App.currentUser.companyName) || '',
                (App.currentUser && App.currentUser.name) || ''
            );
            App.hideLoading();
            this.showWelcomeCode(inv, '새 업체 코드');
            this.reload();
        } catch (e) {
            App.hideLoading();
            App.showToast('발급에 실패했습니다.', 'error');
        }
    },

    // ===== 코드 발급 =====
    showCreateInvite: function () {
        var opts = '';
        for (var i = 0; i < this.ASSIGNABLE_ROLES.length; i++) {
            var r = this.ASSIGNABLE_ROLES[i];
            opts += '<option value="' + r.id + '">' + r.icon + ' ' + r.label + ' — ' + r.desc + '</option>';
        }

        App.showModal(
            '<div class="modal-header"><h3>🎟️ 가입 코드 발급</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>이 코드로 가입하면 받게 될 역할</label>' +
            '<select class="form-control" id="invRole">' + opts + '</select></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>사용 가능 횟수</label>' +
            '<select class="form-control" id="invMax">' +
            '<option value="1">1명만 (권장)</option>' +
            '<option value="5">5명까지</option>' +
            '<option value="10">10명까지</option>' +
            '<option value="0">무제한</option>' +
            '</select></div>' +
            '<div class="form-group"><label>유효기간</label>' +
            '<select class="form-control" id="invDays">' +
            '<option value="7">7일</option>' +
            '<option value="30">30일</option>' +
            '<option value="90">90일</option>' +
            '<option value="0">무기한</option>' +
            '</select></div></div>' +
            '<div class="form-group"><label>메모 (선택)</label>' +
            '<input type="text" class="form-control" id="invMemo" placeholder="예: 강남현장 김소장용"></div>' +
            '<div class="payroll-info"><p>📌 <strong>시스템 관리자</strong>는 정산·승인은 물론 ' +
            '주민등록번호·계좌·일당까지 열람할 수 있습니다. 신뢰하는 사람에게만 발급하세요.</p></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Team.createInvite()">발급하기</button></div>'
        );
    },

    createInvite: async function () {
        var role = document.getElementById('invRole').value;
        var maxUses = document.getElementById('invMax').value;
        var days = document.getElementById('invDays').value;
        var memo = document.getElementById('invMemo').value.trim();
        var label = this.roleLabel(role);

        App.closeModal();
        App.showLoading('코드를 만드는 중...');
        try {
            var inv = await DB.createInvite({
                role: role,
                roleLabel: label,
                memo: memo,
                maxUses: maxUses,
                expiresInDays: days,
                companyName: (App.currentUser && App.currentUser.companyName) || '',
                createdByName: (App.currentUser && App.currentUser.name) || ''
            });
            App.hideLoading();
            this.showCodeResult(inv);
            this.reload();
        } catch (e) {
            App.hideLoading();
            console.error('[Team] 코드 발급 실패', e);
            App.showToast('코드 발급에 실패했습니다: ' + (e.message || ''), 'error');
        }
    },

    showCodeResult: function (inv) {
        var esc = Store.escapeHtml;
        App.showModal(
            '<div class="modal-header"><h3>✅ 가입 코드가 만들어졌습니다</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body" style="text-align:center;">' +
            '<p style="color:var(--text-secondary);margin-bottom:6px;">아래 코드를 전달하세요</p>' +
            '<div style="font-size:34px;font-weight:800;letter-spacing:5px;color:var(--accent-primary);' +
            'padding:20px;background:var(--bg-input);border-radius:12px;margin:10px 0;' +
            'font-variant-numeric:tabular-nums;">' + esc(inv.code) + '</div>' +
            '<button class="btn btn-primary" style="width:100%;" ' +
            'onclick="Team.copyCode(\'' + esc(inv.code) + '\')">📋 코드 복사</button>' +
            '<div style="text-align:left;margin-top:18px;" class="payroll-info">' +
            '<p>부여 역할: <strong>' + esc(inv.roleLabel) + '</strong></p>' +
            '<p>사용 가능: <strong>' + (inv.maxUses > 0 ? inv.maxUses + '명' : '무제한') + '</strong> · ' +
            '만료: <strong>' + (inv.expiresAt ? String(inv.expiresAt).substring(0, 10) : '무기한') + '</strong></p>' +
            '<p style="color:var(--text-muted);margin-top:8px;">받는 사람은 로그인 화면에서 ' +
            '<strong>🎟️ 초대 코드로 참여</strong>를 눌러 가입합니다.</p></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-primary" onclick="App.closeModal()">확인</button></div>'
        );
    },

    copyCode: function (code) {
        var done = function () { App.showToast('코드가 복사되었습니다: ' + code, 'success'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(done, function () { Team._fallbackCopy(code, done); });
        } else {
            this._fallbackCopy(code, done);
        }
    },

    _fallbackCopy: function (text, done) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); }
        catch (e) { App.showToast('복사에 실패했습니다. 코드: ' + text, 'info'); }
        document.body.removeChild(ta);
    },

    toggleInvite: async function (code, active) {
        try {
            await DB.setInviteActive(code, active);
            App.showToast(active ? '코드를 다시 사용합니다.' : '코드를 중지했습니다.', 'success');
            this.reload();
        } catch (e) {
            App.showToast('변경에 실패했습니다.', 'error');
        }
    },

    confirmDeleteInvite: function (code) {
        if (!confirm('가입 코드 ' + code + ' 를 삭제할까요?\n이미 가입한 사람은 그대로 유지됩니다.')) return;
        var self = this;
        DB.deleteInvite(code).then(function () {
            App.showToast('코드가 삭제되었습니다.', 'info');
            self.reload();
        }, function () {
            App.showToast('삭제에 실패했습니다.', 'error');
        });
    },

    // ===== 역할 변경 / 내보내기 =====
    showRoleModal: function (uid) {
        var m = null, list = this._members || [];
        for (var i = 0; i < list.length; i++) if (list[i].uid === uid) m = list[i];
        if (!m) return;

        var opts = '';
        for (var j = 0; j < this.ASSIGNABLE_ROLES.length; j++) {
            var r = this.ASSIGNABLE_ROLES[j];
            opts += '<option value="' + r.id + '"' + (r.id === m.role ? ' selected' : '') + '>' +
                r.icon + ' ' + r.label + ' — ' + r.desc + '</option>';
        }

        App.showModal(
            '<div class="modal-header"><h3>✏️ 역할 변경</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="payroll-info" style="margin-bottom:14px;">' +
            '<p><strong>' + Store.escapeHtml(m.name) + '</strong> (' + Store.escapeHtml(m.email) + ')</p></div>' +
            '<div class="form-group"><label>새 역할</label>' +
            '<select class="form-control" id="mRole">' + opts + '</select></div>' +
            '<div class="payroll-info"><p>📌 <strong>시스템 관리자</strong>로 올리면 ' +
            '주민등록번호·계좌·일당을 열람할 수 있게 됩니다.</p></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Team.saveRole(\'' + uid + '\')">변경</button></div>'
        );
    },

    saveRole: async function (uid) {
        var role = document.getElementById('mRole').value;
        var label = this.roleLabel(role);
        App.closeModal();
        try {
            await DB.updateMemberRole(uid, role, label);
            App.showToast('역할이 ' + label + '(으)로 변경되었습니다.', 'success');
            this.reload();
        } catch (e) {
            App.showToast('변경에 실패했습니다. 권한을 확인하세요.', 'error');
        }
    },

    confirmRemove: function (uid) {
        var m = null, list = this._members || [];
        for (var i = 0; i < list.length; i++) if (list[i].uid === uid) m = list[i];
        if (!m) return;
        if (!confirm(m.name + '님을 회사에서 내보낼까요?\n다시 들어오려면 새 가입 코드가 필요합니다.')) return;

        var self = this;
        DB.removeMember(uid).then(function () {
            App.showToast(m.name + '님을 내보냈습니다.', 'info');
            self.reload();
        }, function () {
            App.showToast('실패했습니다. 권한을 확인하세요.', 'error');
        });
    }
};
