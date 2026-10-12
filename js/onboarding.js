/* =======================================
   BuilderOffice - 시작 안내

   회사를 갓 등록하면 현장도 직원도 없어서,
   일일 입력 화면에 들어가도 고를 게 없다.
   무엇을 먼저 해야 하는지 순서대로 알려준다.

   할 일을 다 마치면 자동으로 사라진다.
   ======================================= */

var Onboarding = {
    DISMISS_KEY: 'builderoffice_onboarding_dismissed',

    /** 단계별 완료 여부 — 실제 데이터로 판단한다 */
    steps: function () {
        var sites = Store.getSites();
        var people = Store.getPersonnel();
        var inputs = Store.getWorkInputs();
        var isAdmin = (typeof App !== 'undefined' && App.isAdminUser && App.isAdminUser());

        var list = [
            {
                key: 'site',
                icon: '🏗️',
                title: '현장 등록하기',
                desc: '공사 현장을 먼저 등록해야 일보를 쓸 수 있습니다',
                done: sites.length > 0,
                doneText: sites.length + '개 현장',
                action: "App.navigate('sites')",
                actionText: '현장 등록'
            },
            {
                key: 'people',
                icon: '👷',
                title: '직원 등록하기',
                desc: '투입 인원을 등록하면 공수·노무비가 자동 계산됩니다',
                done: people.length > 0,
                doneText: people.length + '명 등록',
                action: "App.navigate('personnel')",
                actionText: '직원 등록'
            },
            {
                key: 'input',
                icon: '📝',
                title: '첫 일일 입력 해보기',
                desc: '사진과 함께 올리면 그대로 기성청구 증빙이 됩니다',
                done: inputs.length > 0,
                doneText: inputs.length + '건 작성',
                action: "App.navigate('workinput')",
                actionText: '일일 입력'
            }
        ];

        // 대표·관리자에게만 팀 초대 단계를 보여준다
        if (isAdmin) {
            list.push({
                key: 'team',
                icon: '🎟️',
                title: '직원들 초대하기',
                desc: '업체 코드를 알려주면 각자 폰으로 접속할 수 있습니다',
                done: false,          // 멤버 수는 비동기라 여기서 판단하지 않는다
                optional: true,
                action: "App.navigate('team')",
                actionText: '코드 확인'
            });
        }
        return list;
    },

    /** 필수 단계(선택 제외)를 모두 마쳤는지 */
    isComplete: function () {
        var s = this.steps();
        for (var i = 0; i < s.length; i++) {
            if (!s[i].optional && !s[i].done) return false;
        }
        return true;
    },

    isDismissed: function () {
        try { return localStorage.getItem(this.DISMISS_KEY) === '1'; }
        catch (e) { return false; }
    },

    dismiss: function () {
        try { localStorage.setItem(this.DISMISS_KEY, '1'); } catch (e) {}
        App.refreshPage();
    },

    shouldShow: function () {
        if (this.isDismissed()) return false;
        return !this.isComplete();
    },

    /** 대시보드 상단에 넣을 시작 안내 카드 */
    render: function () {
        if (!this.shouldShow()) return '';

        var s = this.steps();
        var required = s.filter(function (x) { return !x.optional; });
        var doneCount = required.filter(function (x) { return x.done; }).length;
        var pct = Math.round((doneCount / required.length) * 100);

        var rows = '';
        for (var i = 0; i < s.length; i++) {
            var st = s[i];
            var num = st.optional ? '＋' : String(i + 1);

            rows += '<div class="ob-step' + (st.done ? ' ob-done' : '') + '">' +
                '<div class="ob-num">' + (st.done ? '✓' : num) + '</div>' +
                '<div class="ob-body">' +
                '<div class="ob-title">' + st.icon + ' ' + st.title +
                (st.done ? ' <span class="ob-chip">' + Store.escapeHtml(st.doneText) + '</span>' : '') +
                '</div>' +
                '<div class="ob-desc">' + st.desc + '</div>' +
                '</div>' +
                (st.done
                    ? '<div class="ob-action-done">완료</div>'
                    : '<button class="btn btn-primary btn-sm ob-action" onclick="' + st.action + '">' +
                      st.actionText + '</button>') +
                '</div>';
        }

        return '<div class="ob-card">' +
            '<div class="ob-head">' +
            '<div>' +
            '<div class="ob-heading">🚀 시작하기</div>' +
            '<div class="ob-sub">아래 순서대로 하시면 바로 쓰실 수 있습니다</div>' +
            '</div>' +
            '<button class="ob-close" title="숨기기" onclick="Onboarding.dismiss()">✕</button>' +
            '</div>' +
            '<div class="ob-bar"><i style="width:' + pct + '%"></i></div>' +
            '<div class="ob-progress-text">' + doneCount + ' / ' + required.length + ' 단계 완료</div>' +
            '<div class="ob-steps">' + rows + '</div>' +
            '</div>';
    },

    /**
     * 화면에 필요한 선행 데이터가 없을 때 보여줄 안내.
     * 예: 일일 입력인데 현장이 없음
     */
    needData: function (opts) {
        var missing = [];
        if (opts.site && Store.getSites().length === 0) {
            missing.push({ label: '현장', action: "App.navigate('sites')", btn: '🏗️ 현장 등록하기' });
        }
        if (opts.people && Store.getPersonnel().length === 0) {
            missing.push({ label: '직원', action: "App.navigate('personnel')", btn: '👷 직원 등록하기' });
        }
        if (!missing.length) return '';

        var names = missing.map(function (m) { return m.label; }).join('·');
        var btns = missing.map(function (m) {
            return '<button class="btn btn-primary" onclick="' + m.action + '">' + m.btn + '</button>';
        }).join('');

        return '<div class="empty-state" style="padding:40px 24px;">' +
            '<div class="empty-icon">📋</div>' +
            '<p><strong>' + names + '</strong>을(를) 먼저 등록해주세요.</p>' +
            '<p style="font-size:13px;color:var(--text-muted);margin:8px 0 16px;">' +
            '등록하고 나면 여기서 바로 입력할 수 있습니다.</p>' +
            '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">' + btns + '</div>' +
            '</div>';
    }
};
