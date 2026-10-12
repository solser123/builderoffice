/* =======================================
   BuilderOffice - KOSHA-MS 서류 관리 화면

   Safety 객체를 확장한다. 양식 정의는 kosha-forms.js.

   기존에는 체크박스를 눌러 이행률을 내는 방식이었는데,
   실제 KOSHA-MS는 절차서마다 정해진 양식이 있고
   각 양식에 작성 주기(일/월/분기/반기/연)가 있다.
   그래서 "무엇을 언제까지 써야 하는가"를 보여주는 화면으로 바꿨다.
   ======================================= */

(function () {
    if (typeof Safety === 'undefined') return;

    Safety.koshaCycle = 'all';
    Safety.koshaSeries = 'all';
    Safety.KOSHA_PHOTO_ID = 'koshaPhotos';
    Safety.WORKER_KEY = 'builderoffice_worker_count';

    /* 상시근로자 수 — 직접 지정한 값이 있으면 그것을,
       없으면 인원 관리의 활성 인원 수를 쓴다. */
    Safety.workerCount = function () {
        var manual = Number(localStorage.getItem(Safety.WORKER_KEY) || 0);
        if (manual > 0) return manual;
        return Store.getPersonnel().filter(function (p) { return p.status === '활성'; }).length;
    };

    Safety.setWorkerCount = function () {
        var cur = localStorage.getItem(Safety.WORKER_KEY) || '';
        var v = prompt('상시근로자 수를 입력하세요.\n비워두면 등록된 활성 인원 수를 사용합니다.', cur);
        if (v === null) return;
        if (String(v).trim() === '') localStorage.removeItem(Safety.WORKER_KEY);
        else localStorage.setItem(Safety.WORKER_KEY, String(Number(v) || 0));
        App.refreshPage();
    };

    Safety._koshaRecords = function () {
        return Store._get('builderoffice_koshaRecords') || [];
    };

    // 해당 양식의 가장 최근 작성일
    Safety._lastDateOf = function (formCode) {
        var recs = Safety._koshaRecords().filter(function (r) { return r.formCode === formCode; });
        if (!recs.length) return '';
        recs.sort(function (a, b) { return (b.date || '') > (a.date || '') ? 1 : -1; });
        return recs[0].date || '';
    };

    Safety.setKoshaCycle = function (c) { Safety.koshaCycle = c; App.refreshPage(); };
    Safety.setKoshaSeries = function (s) { Safety.koshaSeries = s; App.refreshPage(); };

    Safety._renderKosha = function () {
        var esc = Store.escapeHtml;
        var workers = Safety.workerCount();
        var duties = KoshaForms.dutiesFor(workers);

        var dutyHtml = '';
        for (var d = 0; d < duties.length; d++) {
            dutyHtml += '<div class="kosha-duty"><strong>' + duties[d].label + '</strong>' +
                '<span>' + duties[d].duties.join(' · ') + '</span></div>';
        }
        if (!dutyHtml) {
            dutyHtml = '<div class="kosha-duty"><span style="color:var(--text-muted);">' +
                '상시근로자 5인 미만 — 일부 법정 의무가 면제될 수 있습니다.</span></div>';
        }

        var cycleChips = '<button class="wi-chip ' + (Safety.koshaCycle === 'all' ? 'active' : '') +
            '" onclick="Safety.setKoshaCycle(\'all\')">전체</button>';
        for (var c = 0; c < KoshaForms.CYCLES.length; c++) {
            var cy = KoshaForms.CYCLES[c];
            cycleChips += '<button class="wi-chip ' + (Safety.koshaCycle === cy.id ? 'active' : '') +
                '" onclick="Safety.setKoshaCycle(\'' + cy.id + '\')">' + cy.icon + ' ' + cy.label + '</button>';
        }

        var seriesChips = '<button class="wi-chip ' + (Safety.koshaSeries === 'all' ? 'active' : '') +
            '" onclick="Safety.setKoshaSeries(\'all\')">전체</button>' +
            '<button class="wi-chip ' + (Safety.koshaSeries === 'SHI' ? 'active' : '') +
            '" onclick="Safety.setKoshaSeries(\'SHI\')">SHI 현장운영</button>' +
            '<button class="wi-chip ' + (Safety.koshaSeries === 'SHP' ? 'active' : '') +
            '" onclick="Safety.setKoshaSeries(\'SHP\')">SHP 경영시스템</button>';

        var forms = KoshaForms.formsFor(workers, Safety.koshaCycle);
        if (Safety.koshaSeries !== 'all') {
            forms = forms.filter(function (f) { return f.series === Safety.koshaSeries; });
        }

        var stat = { none: 0, overdue: 0, soon: 0, ok: 0 };
        var badges = {
            none: '<span class="badge badge-red">미작성</span>',
            overdue: '<span class="badge badge-red">기한초과</span>',
            soon: '<span class="badge badge-orange">기한임박</span>',
            ok: '<span class="badge badge-green">정상</span>'
        };

        var rows = '';
        for (var i = 0; i < forms.length; i++) {
            var f = forms[i];
            var last = Safety._lastDateOf(f.code);
            var st = KoshaForms.statusOf(f.cycle, last);
            stat[st]++;

            var cyc = KoshaForms.cycle(f.cycle);
            var due = KoshaForms.nextDue(f.cycle, last);
            var safeName = String(f.name).replace(/'/g, '&#39;');

            rows += '<tr>' +
                '<td><code style="font-size:11px;color:var(--text-muted);">' + esc(f.code) + '</code></td>' +
                '<td style="color:var(--text-primary);font-weight:500;">' + esc(f.name) +
                (f.note ? '<br><span style="font-size:11px;color:var(--text-muted);">' + esc(f.note) + '</span>' : '') +
                (f.minWorkers > 0 ? '<br><span style="font-size:10.5px;color:var(--accent-warning);">' +
                    f.minWorkers + '인 이상 대상</span>' : '') + '</td>' +
                '<td><span style="font-size:12px;">' + f.catIcon + ' ' + esc(f.catTitle) + '</span></td>' +
                '<td><span class="badge badge-blue">' + cyc.icon + ' ' + cyc.label + '</span></td>' +
                '<td>' + (last ? esc(last) : '<span style="color:var(--text-muted);">-</span>') + '</td>' +
                '<td>' + (due ? esc(due) : '<span style="color:var(--text-muted);">-</span>') + '</td>' +
                '<td>' + badges[st] + '</td>' +
                '<td><button class="btn btn-secondary btn-sm" ' +
                'onclick="Safety.showKoshaRecordModal(&quot;' + esc(f.code) + '&quot;,&quot;' + esc(safeName) + '&quot;)">작성</button></td>' +
                '</tr>';
        }
        if (!rows) {
            rows = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🏛️</div>' +
                '<p>해당 조건의 양식이 없습니다.</p></div></td></tr>';
        }

        return '<div class="kosha-head">' +
            '<div class="kosha-workers">' +
            '<div><div class="kosha-workers-label">상시근로자</div>' +
            '<div class="kosha-workers-value">' + workers + '명</div></div>' +
            '<button class="btn btn-secondary btn-sm" onclick="Safety.setWorkerCount()">인원 설정</button>' +
            '</div>' +
            '<div class="kosha-duties">' + dutyHtml +
            '<div class="kosha-note">📌 ' + KoshaForms.CONSTRUCTION_NOTE + '</div>' +
            '<div class="kosha-note" style="color:var(--accent-warning);">⚠️ 법령은 개정됩니다. 실제 적용 전 최신 고시를 확인하세요.</div>' +
            '</div></div>' +

            '<div class="settle-grid" style="margin:16px 0;">' +
            '<div class="settle-box"><div class="settle-label">대상 양식</div>' +
            '<div class="settle-value">' + forms.length + '건</div></div>' +
            '<div class="settle-box"><div class="settle-label">미작성</div>' +
            '<div class="settle-value" style="color:var(--accent-danger);">' + stat.none + '건</div></div>' +
            '<div class="settle-box"><div class="settle-label">기한초과</div>' +
            '<div class="settle-value" style="color:var(--accent-danger);">' + stat.overdue + '건</div></div>' +
            '<div class="settle-box"><div class="settle-label">기한임박</div>' +
            '<div class="settle-value" style="color:var(--accent-warning);">' + stat.soon + '건</div></div>' +
            '<div class="settle-box"><div class="settle-label">정상</div>' +
            '<div class="settle-value" style="color:var(--accent-success);">' + stat.ok + '건</div></div>' +
            '</div>' +

            '<div class="kosha-filter-label">작성 주기</div>' +
            '<div class="wi-chips" style="margin-bottom:12px;">' + cycleChips + '</div>' +
            '<div class="kosha-filter-label">계열</div>' +
            '<div class="wi-chips" style="margin-bottom:16px;">' + seriesChips + '</div>' +

            '<div class="table-container"><table><thead><tr>' +
            '<th>양식번호</th><th>양식명</th><th>절차서</th><th>주기</th><th>최근 작성</th><th>다음 기한</th><th>상태</th><th></th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    };

    Safety._renderKoshaPhoto = function () {
        if (typeof Sync === 'undefined' || Sync.MODE !== 'cloud') {
            return '<div class="wi-photo-area"><div class="wi-photo-placeholder" ' +
                'onclick="App.showToast(\'로그인 후 첨부할 수 있습니다.\', \'info\')">' +
                '<span>📷</span><p>사진 첨부 (로그인 필요)</p></div></div>';
        }
        return Photos.render({ id: Safety.KOSHA_PHOTO_ID, folder: 'kosha' });
    };

    Safety.showKoshaRecordModal = function (formCode, formName) {
        var esc = Store.escapeHtml;
        var sites = Store.getSites();
        var siteOpts = '<option value="">본사 / 전사</option>';
        for (var i = 0; i < sites.length; i++) {
            siteOpts += '<option value="' + esc(sites[i].name) + '">' + esc(sites[i].name) + '</option>';
        }

        // 지난 작성 이력
        var recs = Safety._koshaRecords().filter(function (r) { return r.formCode === formCode; });
        var hist = '';
        for (var h = 0; h < Math.min(5, recs.length); h++) {
            hist += '<div style="display:flex;justify-content:space-between;padding:6px 0;' +
                'border-bottom:1px solid var(--border-color);font-size:13px;">' +
                '<span>' + esc(recs[h].date) + (recs[h].siteName ? ' · ' + esc(recs[h].siteName) : '') + '</span>' +
                '<span style="color:var(--text-muted);">' + esc(recs[h].writer || '') +
                (recs[h].photos && recs[h].photos.length ? ' 📷' + recs[h].photos.length : '') + '</span></div>';
        }

        App.showModal(
            '<div class="modal-header"><h3>🏛️ ' + esc(formName) + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="payroll-info" style="margin-bottom:14px;">' +
            '<p>양식번호 <strong>' + esc(formCode) + '</strong></p>' +
            '<p style="color:var(--text-muted);">작성한 서류를 사진으로 남기면 그대로 증빙이 됩니다.</p></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>작성일</label>' +
            '<input type="date" class="form-control" id="kfDate" value="' + Store.getToday() + '"></div>' +
            '<div class="form-group"><label>현장</label>' +
            '<select class="form-control" id="kfSite">' + siteOpts + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>작성자</label>' +
            '<input type="text" class="form-control" id="kfWriter" value="' +
            esc((App.currentUser && App.currentUser.name) || '') + '"></div>' +
            '<div class="form-group"><label>내용 · 특이사항</label>' +
            '<textarea class="form-control" id="kfNote" rows="3" placeholder="점검 결과, 조치 내용 등"></textarea></div>' +
            '<div class="form-group"><label>서류 사진</label>' + Safety._renderKoshaPhoto() + '</div>' +
            (hist ? '<div style="margin-top:14px;"><strong style="font-size:13px;">최근 작성 이력</strong>' +
                '<div style="margin-top:6px;">' + hist + '</div></div>' : '') +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Safety.saveKoshaRecord()">저장</button></div>'
        );

        Safety._pendingForm = { code: formCode, name: formName };
    };

    Safety.saveKoshaRecord = function () {
        var pf = Safety._pendingForm;
        if (!pf) return;
        function v(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

        if (typeof Photos !== 'undefined' && Photos.isBusy(Safety.KOSHA_PHOTO_ID)) {
            App.showToast('사진 업로드가 끝날 때까지 기다려주세요.', 'info');
            return;
        }
        var photos = (typeof Photos !== 'undefined') ? Photos.getUploaded(Safety.KOSHA_PHOTO_ID) : [];

        var arr = Store._get('builderoffice_koshaRecords') || [];
        arr.unshift({
            id: Store._generateId(),
            formCode: pf.code,
            formName: pf.name,
            date: v('kfDate') || Store.getToday(),
            siteName: v('kfSite'),
            writer: v('kfWriter'),
            note: v('kfNote'),
            photos: photos,
            createdAt: new Date().toISOString()
        });
        Store._set('builderoffice_koshaRecords', arr);

        if (typeof Photos !== 'undefined') Photos.reset(Safety.KOSHA_PHOTO_ID);
        Safety._pendingForm = null;
        App.closeModal();
        App.refreshPage();
        App.showToast(pf.name + ' 작성 완료', 'success');
    };
})();
