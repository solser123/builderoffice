/* =======================================
   BuilderOffice - 안전 관리 (Safety Management)
   TBM, 안전점검, 안전교육, 위험성평가
   ======================================= */

var Safety = {
    currentTab: 'checks',

    render: function () {
        var checks = Store.getSafetyChecks();
        var edu = Store.getSafetyEducation();
        var risks = Store.getRiskAssessments();
        var todayStr = Store.getToday();
        var todayTBM = checks.find(function (c) { return c.date === todayStr && c.type === 'TBM'; });
        var todayCheck = checks.find(function (c) { return c.date === todayStr && c.type !== 'TBM'; });
        var highRisks = risks.filter(function (r) { return r.riskLevel === '상' && r.status === '진행중'; });

        return '<div class="page-section">' +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon ' + (todayTBM ? 'green' : 'orange') + '">' + (todayTBM ? '✅' : '⚠️') + '</div>' +
            '<div class="stat-info"><div class="stat-label">오늘 TBM</div><div class="stat-value">' + (todayTBM ? '완료' : '미실시') + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon ' + (todayCheck ? 'green' : 'orange') + '">' + (todayCheck ? '✅' : '⚠️') + '</div>' +
            '<div class="stat-info"><div class="stat-label">오늘 안전점검</div><div class="stat-value">' + (todayCheck ? '완료' : '미실시') + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon blue">📚</div><div class="stat-info"><div class="stat-label">안전교육</div><div class="stat-value">' + edu.length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon ' + (highRisks.length > 0 ? 'red' : 'green') + '">⚠️</div>' +
            '<div class="stat-info"><div class="stat-label">고위험 항목</div><div class="stat-value">' + highRisks.length + '건</div></div></div>' +
            '</div>' +
            '<div class="tab-nav">' +
            '<button class="tab-btn' + (this.currentTab === 'checks' ? ' active' : '') + '" onclick="Safety.setTab(\'checks\')">🦺 안전점검/TBM</button>' +
            '<button class="tab-btn' + (this.currentTab === 'education' ? ' active' : '') + '" onclick="Safety.setTab(\'education\')">📚 안전교육</button>' +
            '<button class="tab-btn' + (this.currentTab === 'risk' ? ' active' : '') + '" onclick="Safety.setTab(\'risk\')">⚠️ 위험성 평가</button>' +
            '</div>';

        // Tab content is appended via setTab → renderTab
    },

    setTab: function (tab) {
        this.currentTab = tab;
        App.refreshPage();
    },

    // Override render to include tab content
    _init: function () {
        var base = Safety.render;
        Safety.render = function () {
            var html = base.call(Safety);
            if (Safety.currentTab === 'checks') html += Safety._renderChecks();
            else if (Safety.currentTab === 'education') html += Safety._renderEducation();
            else if (Safety.currentTab === 'risk') html += Safety._renderRisk();
            html += '</div>';
            return html;
        };
    },

    // ========== 안전점검/TBM ==========
    _renderChecks: function () {
        var checks = Store.getSafetyChecks();
        var html = '<div class="card"><div class="card-header"><div class="card-title">안전점검 / TBM 기록</div>' +
            '<div style="display:flex;gap:8px">' +
            '<button class="btn btn-primary btn-sm" onclick="Safety.openCheckModal(null,\'TBM\')">+ TBM 작성</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="Safety.openCheckModal(null,\'일일점검\')">+ 안전점검</button>' +
            '</div></div>';
        if (checks.length === 0) {
            html += '<div class="empty-state"><div class="empty-icon">🦺</div><p>안전점검 기록이 없습니다.<br>오늘 TBM부터 시작하세요!</p></div>';
        } else {
            html += '<div class="dl-list">' + checks.map(function (c) { return Safety._renderCheckCard(c); }).join('') + '</div>';
        }
        return html + '</div>';
    },

    _renderCheckCard: function (c) {
        var typeClass = c.type === 'TBM' ? 'purple' : c.type === '일일점검' ? 'blue' : 'orange';
        var resultClass = c.result === '적합' ? 'green' : c.result === '부적합' ? 'red' : 'orange';
        var checkedCount = 0, totalCount = 0;
        if (c.checkItems && c.checkItems.length) {
            totalCount = c.checkItems.length;
            checkedCount = c.checkItems.filter(function (i) { return i.checked; }).length;
        }
        return '<div class="dl-card">' +
            '<div class="dl-card-header">' +
            '<div class="dl-date-wrap">' +
            '<div class="dl-date">' + c.date + '</div>' +
            '<div class="dl-site">' + (c.siteName || '') + '</div>' +
            '</div>' +
            '<div class="dl-meta-right">' +
            '<span class="badge badge-' + typeClass + '">' + c.type + '</span>' +
            '<span class="badge badge-' + resultClass + '">' + c.result + '</span>' +
            (totalCount ? '<span style="font-size:0.8rem;font-weight:600">' + checkedCount + '/' + totalCount + '</span>' : '') +
            (c.participants ? '<span class="dl-personnel">👷 ' + c.participants + '명</span>' : '') +
            '</div></div>' +
            (c.issues && c.issues !== '없음' ? '<div class="dl-issue">⚠️ ' + c.issues + '</div>' : '') +
            (c.actions ? '<div class="dl-tomorrow">🔧 조치: ' + c.actions + '</div>' : '') +
            '<div class="dl-footer"><span class="dl-writer">점검자: ' + (c.inspector || '-') + '</span>' +
            '<div class="action-btns">' +
            '<button class="action-btn edit" onclick="Safety.openCheckModal(\'' + c.id + '\')" title="수정">✏️</button>' +
            '<button class="action-btn delete" onclick="Safety.deleteCheck(\'' + c.id + '\')" title="삭제">🗑️</button>' +
            '</div></div></div>';
    },

    openCheckModal: function (id, defaultType) {
        var c = id ? Store.getSafetyChecks().find(function (x) { return x.id === id; }) : null;
        var v = function (f, d) { return c && c[f] !== undefined ? c[f] : (d || ''); };
        var today = Store.getToday();
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();
        var checkType = c ? c.type : (defaultType || 'TBM');

        var siteOpts = '<option value="">현장 선택</option>' + sites.map(function (s) {
            var sel = (v('siteId') === s.id) || (!c && currentSiteId === s.id) ? ' selected' : '';
            return '<option value="' + s.id + '" data-name="' + s.name + '"' + sel + '>' + s.name + '</option>';
        }).join('');
        var typeOpts = Store.SAFETY_CHECK_TYPES.map(function (t) {
            return '<option value="' + t + '"' + (checkType === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('');
        var resultOpts = ['적합', '부적합', '조건부적합'].map(function (r) {
            return '<option value="' + r + '"' + (v('result', '적합') === r ? ' selected' : '') + '>' + r + '</option>';
        }).join('');

        // Build checklist items
        var existingItems = c ? c.checkItems : null;
        var checklistSource = (checkType === 'TBM') ? Store.TBM_CHECKLIST : Store.SAFETY_CHECKLIST;
        var checklistHtml = checklistSource.map(function (item, idx) {
            var checked = existingItems ? (existingItems[idx] && existingItems[idx].checked) : true;
            return '<label class="safety-check-item">' +
                '<input type="checkbox" name="checkItem" value="' + idx + '"' + (checked ? ' checked' : '') + '>' +
                '<span class="safety-check-label">' + item + '</span></label>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '안전점검 수정' : (checkType === 'TBM' ? 'TBM 작성' : '안전점검 작성')) + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editSafetyId" value="' + id + '">' : '') +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="sc_date" value="' + v('date', today) + '"></div>' +
            '<div class="form-group"><label>점검 유형</label><select class="form-control" id="sc_type" onchange="Safety._updateChecklist()">' + typeOpts + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="sc_site">' + siteOpts + '</select></div>' +
            '<div class="form-group"><label>점검자</label><input type="text" class="form-control" id="sc_inspector" value="' + v('inspector') + '"></div>' +
            '</div>' +
            (checkType === 'TBM' ? '<div class="form-group"><label>참석 인원 수</label><input type="number" class="form-control" id="sc_participants" value="' + v('participants', 0) + '"></div>' : '') +
            '<div class="form-group"><label>점검 체크리스트</label><div class="safety-checklist" id="safetyChecklist">' + checklistHtml + '</div></div>' +
            '<div class="form-group"><label>판정</label><select class="form-control" id="sc_result">' + resultOpts + '</select></div>' +
            '<div class="form-group"><label>지적 사항</label><textarea class="form-control" id="sc_issues" rows="2" placeholder="발견된 문제점">' + v('issues', '없음') + '</textarea></div>' +
            '<div class="form-group"><label>조치 사항</label><textarea class="form-control" id="sc_actions" rows="2" placeholder="조치 내용">' + v('actions') + '</textarea></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Safety.saveCheck()">저장</button>' +
            '</div>';
        App.showModal(html);
    },

    _updateChecklist: function () {
        var type = document.getElementById('sc_type').value;
        var source = (type === 'TBM') ? Store.TBM_CHECKLIST : Store.SAFETY_CHECKLIST;
        var container = document.getElementById('safetyChecklist');
        if (!container) return;
        container.innerHTML = source.map(function (item, idx) {
            return '<label class="safety-check-item"><input type="checkbox" name="checkItem" value="' + idx + '" checked><span class="safety-check-label">' + item + '</span></label>';
        }).join('');
    },

    saveCheck: function () {
        var siteEl = document.getElementById('sc_site');
        var checkboxes = document.querySelectorAll('input[name="checkItem"]');
        var type = document.getElementById('sc_type').value;
        var source = (type === 'TBM') ? Store.TBM_CHECKLIST : Store.SAFETY_CHECKLIST;
        var items = [];
        for (var i = 0; i < checkboxes.length; i++) {
            items.push({ item: source[i] || '', checked: checkboxes[i].checked });
        }
        var participantsEl = document.getElementById('sc_participants');
        var data = {
            date: document.getElementById('sc_date').value,
            siteId: siteEl.value,
            siteName: siteEl.selectedOptions[0] ? siteEl.selectedOptions[0].text : '',
            type: type,
            inspector: document.getElementById('sc_inspector').value.trim(),
            participants: participantsEl ? Number(participantsEl.value) || 0 : 0,
            checkItems: items,
            result: document.getElementById('sc_result').value,
            issues: document.getElementById('sc_issues').value.trim() || '없음',
            actions: document.getElementById('sc_actions').value.trim(),
        };
        var idEl = document.getElementById('editSafetyId');
        if (idEl) { Store.updateSafetyCheck(idEl.value, data); App.showToast('수정되었습니다.', 'success'); }
        else { Store.addSafetyCheck(data); App.showToast('안전점검이 저장되었습니다.', 'success'); }
        App.closeModal(); App.refreshPage();
    },

    deleteCheck: function (id) {
        if (!confirm('삭제하시겠습니까?')) return;
        Store.deleteSafetyCheck(id); App.showToast('삭제됨', 'success'); App.refreshPage();
    },

    // ========== 안전교육 ==========
    _renderEducation: function () {
        var edu = Store.getSafetyEducation();
        var html = '<div class="card"><div class="card-header"><div class="card-title">안전교육 기록</div>' +
            '<button class="btn btn-primary btn-sm" onclick="Safety.openEduModal()">+ 교육 등록</button></div>';
        if (edu.length === 0) {
            html += '<div class="empty-state"><div class="empty-icon">📚</div><p>안전교육 기록이 없습니다.</p></div>';
        } else {
            html += '<div class="table-container"><table><thead><tr><th>날짜</th><th>유형</th><th>교육명</th><th>강사</th><th>시간</th><th>인원</th><th>현장</th><th></th></tr></thead><tbody>' +
                edu.map(function (e) {
                    var typeClass = { '신규채용시': 'green', '정기교육': 'blue', '특별교육': 'orange', '변경시교육': 'purple' }[e.type] || 'blue';
                    return '<tr><td>' + e.date + '</td><td><span class="badge badge-' + typeClass + '">' + e.type + '</span></td>' +
                        '<td style="font-weight:600">' + e.title + '</td><td>' + (e.instructor || '-') + '</td>' +
                        '<td>' + (e.duration || 0) + 'h</td><td>' + (e.participants || 0) + '명</td>' +
                        '<td>' + (e.siteName || '-') + '</td>' +
                        '<td><div class="action-btns"><button class="action-btn edit" onclick="Safety.openEduModal(\'' + e.id + '\')">✏️</button>' +
                        '<button class="action-btn delete" onclick="Safety.deleteEdu(\'' + e.id + '\')">🗑️</button></div></td></tr>';
                }).join('') +
                '</tbody></table></div>';
        }
        return html + '</div>';
    },

    openEduModal: function (id) {
        var e = id ? Store.getSafetyEducation().find(function (x) { return x.id === id; }) : null;
        var v = function (f, d) { return e && e[f] !== undefined ? e[f] : (d || ''); };
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();
        var siteOpts = '<option value="">현장 선택</option>' + sites.map(function (s) {
            var sel = (v('siteId') === s.id) || (!e && currentSiteId === s.id) ? ' selected' : '';
            return '<option value="' + s.id + '" data-name="' + s.name + '"' + sel + '>' + s.name + '</option>';
        }).join('');
        var typeOpts = Store.SAFETY_EDU_TYPES.map(function (t) {
            return '<option value="' + t + '"' + (v('type') === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '안전교육 수정' : '안전교육 등록') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editEduId" value="' + id + '">' : '') +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="edu_date" value="' + v('date', Store.getToday()) + '"></div>' +
            '<div class="form-group"><label>교육 유형</label><select class="form-control" id="edu_type">' + typeOpts + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>교육명</label><input type="text" class="form-control" id="edu_title" value="' + v('title') + '" placeholder="예: 3월 정기 안전교육"></div>' +
            '<div class="form-group"><label>교육 내용</label><textarea class="form-control" id="edu_content" rows="3" placeholder="교육 내용을 기록하세요.">' + v('content') + '</textarea></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>강사/교육자</label><input type="text" class="form-control" id="edu_instructor" value="' + v('instructor') + '"></div>' +
            '<div class="form-group"><label>교육 시간 (h)</label><input type="number" class="form-control" id="edu_duration" value="' + v('duration', 1) + '" min="0.5" step="0.5"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>교육 인원 수</label><input type="number" class="form-control" id="edu_participants" value="' + v('participants') + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="edu_site">' + siteOpts + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>참석자 명단</label><textarea class="form-control" id="edu_names" rows="2" placeholder="홍길동, 김철수, 이영희...">' + v('participantNames') + '</textarea></div>' +
            '</div><div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Safety.saveEdu()">저장</button></div>';
        App.showModal(html);
    },

    saveEdu: function () {
        var title = document.getElementById('edu_title').value.trim();
        if (!title) { App.showToast('교육명을 입력해주세요.', 'error'); return; }
        var siteEl = document.getElementById('edu_site');
        var data = {
            date: document.getElementById('edu_date').value,
            siteId: siteEl.value, siteName: siteEl.selectedOptions[0] && siteEl.value ? siteEl.selectedOptions[0].text : '',
            type: document.getElementById('edu_type').value, title: title,
            content: document.getElementById('edu_content').value.trim(),
            instructor: document.getElementById('edu_instructor').value.trim(),
            duration: Number(document.getElementById('edu_duration').value) || 1,
            participants: Number(document.getElementById('edu_participants').value) || 0,
            participantNames: document.getElementById('edu_names').value.trim(),
        };
        var idEl = document.getElementById('editEduId');
        if (idEl) { Store.updateSafetyEducation(idEl.value, data); App.showToast('수정됨', 'success'); }
        else { Store.addSafetyEducation(data); App.showToast('등록됨', 'success'); }
        App.closeModal(); App.refreshPage();
    },

    deleteEdu: function (id) {
        if (!confirm('삭제하시겠습니까?')) return;
        Store.deleteSafetyEducation(id); App.showToast('삭제됨', 'success'); App.refreshPage();
    },

    // ========== 위험성 평가 ==========
    _renderRisk: function () {
        var risks = Store.getRiskAssessments();
        var html = '<div class="card"><div class="card-header"><div class="card-title">위험성 평가</div>' +
            '<button class="btn btn-primary btn-sm" onclick="Safety.openRiskModal()">+ 평가 등록</button></div>';
        if (risks.length === 0) {
            html += '<div class="empty-state"><div class="empty-icon">⚠️</div><p>위험성 평가 기록이 없습니다.</p></div>';
        } else {
            html += '<div class="table-container"><table><thead><tr><th>날짜</th><th>작업</th><th>위험요인</th><th>빈도</th><th>강도</th><th>위험도</th><th>등급</th><th>현재조치</th><th>상태</th><th></th></tr></thead><tbody>' +
                risks.map(function (r) {
                    var lvlClass = { '상': 'red', '중': 'orange', '하': 'green' }[r.riskLevel] || 'blue';
                    var stClass = r.status === '완료' ? 'green' : 'orange';
                    return '<tr><td>' + r.date + '</td><td style="font-weight:600">' + r.workType + '</td>' +
                        '<td>' + r.hazard + '</td>' +
                        '<td>' + r.frequency + '</td><td>' + r.severity + '</td>' +
                        '<td style="font-weight:700">' + r.riskScore + '</td>' +
                        '<td><span class="badge badge-' + lvlClass + '">' + r.riskLevel + '</span></td>' +
                        '<td style="font-size:0.8rem">' + (r.currentMeasures || '-') + '</td>' +
                        '<td><span class="badge badge-' + stClass + '">' + r.status + '</span></td>' +
                        '<td><div class="action-btns"><button class="action-btn edit" onclick="Safety.openRiskModal(\'' + r.id + '\')">✏️</button>' +
                        '<button class="action-btn delete" onclick="Safety.deleteRisk(\'' + r.id + '\')">🗑️</button></div></td></tr>';
                }).join('') +
                '</tbody></table></div>';
        }
        return html + '</div>';
    },

    openRiskModal: function (id) {
        var r = id ? Store.getRiskAssessments().find(function (x) { return x.id === id; }) : null;
        var v = function (f, d) { return r && r[f] !== undefined ? r[f] : (d || ''); };
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();
        var siteOpts = '<option value="">현장 선택</option>' + sites.map(function (s) {
            var sel = (v('siteId') === s.id) || (!r && currentSiteId === s.id) ? ' selected' : '';
            return '<option value="' + s.id + '" data-name="' + s.name + '"' + sel + '>' + s.name + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '위험성 평가 수정' : '위험성 평가 등록') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editRiskId" value="' + id + '">' : '') +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="rk_date" value="' + v('date', Store.getToday()) + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="rk_site">' + siteOpts + '</select></div>' +
            '</div>' +
            '<div class="form-group"><label>작업 종류</label><input type="text" class="form-control" id="rk_work" value="' + v('workType') + '" placeholder="예: 거푸집 설치 작업"></div>' +
            '<div class="form-group"><label>유해위험요인</label><input type="text" class="form-control" id="rk_hazard" value="' + v('hazard') + '" placeholder="예: 고소작업 중 추락"></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>빈도 (1~5)</label><input type="number" class="form-control" id="rk_freq" value="' + v('frequency', 3) + '" min="1" max="5" onchange="Safety._calcRisk()"></div>' +
            '<div class="form-group"><label>강도 (1~5)</label><input type="number" class="form-control" id="rk_sev" value="' + v('severity', 3) + '" min="1" max="5" onchange="Safety._calcRisk()"></div>' +
            '</div>' +
            '<div class="form-group"><label>현재 안전조치</label><textarea class="form-control" id="rk_current" rows="2">' + v('currentMeasures') + '</textarea></div>' +
            '<div class="form-group"><label>추가 필요 조치</label><textarea class="form-control" id="rk_additional" rows="2">' + v('additionalMeasures') + '</textarea></div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>담당자</label><input type="text" class="form-control" id="rk_responsible" value="' + v('responsible') + '"></div>' +
            '<div class="form-group"><label>상태</label><select class="form-control" id="rk_status">' +
            '<option value="진행중"' + (v('status', '진행중') === '진행중' ? ' selected' : '') + '>진행중</option>' +
            '<option value="완료"' + (v('status') === '완료' ? ' selected' : '') + '>완료</option></select></div>' +
            '</div></div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Safety.saveRisk()">저장</button></div>';
        App.showModal(html);
    },

    _calcRisk: function () { /* visual feedback in future */ },

    saveRisk: function () {
        var workType = document.getElementById('rk_work').value.trim();
        if (!workType) { App.showToast('작업 종류를 입력해주세요.', 'error'); return; }
        var siteEl = document.getElementById('rk_site');
        var freq = Number(document.getElementById('rk_freq').value) || 3;
        var sev = Number(document.getElementById('rk_sev').value) || 3;
        var score = freq * sev;
        var level = score >= 15 ? '상' : score >= 8 ? '중' : '하';
        var data = {
            date: document.getElementById('rk_date').value,
            siteId: siteEl.value, siteName: siteEl.selectedOptions[0] && siteEl.value ? siteEl.selectedOptions[0].text : '',
            workType: workType, hazard: document.getElementById('rk_hazard').value.trim(),
            frequency: freq, severity: sev, riskScore: score, riskLevel: level,
            currentMeasures: document.getElementById('rk_current').value.trim(),
            additionalMeasures: document.getElementById('rk_additional').value.trim(),
            responsible: document.getElementById('rk_responsible').value.trim(),
            status: document.getElementById('rk_status').value,
        };
        var idEl = document.getElementById('editRiskId');
        if (idEl) { Store.updateRiskAssessment(idEl.value, data); App.showToast('수정됨', 'success'); }
        else { Store.addRiskAssessment(data); App.showToast('등록됨', 'success'); }
        App.closeModal(); App.refreshPage();
    },

    deleteRisk: function (id) {
        if (!confirm('삭제하시겠습니까?')) return;
        Store.deleteRiskAssessment(id); App.showToast('삭제됨', 'success'); App.refreshPage();
    }
};

// Self-init to wrap render with tab content
Safety._init();
