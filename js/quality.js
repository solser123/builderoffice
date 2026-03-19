/* =======================================
   BuilderOffice - 품질 관리 (Quality Management)
   품질검사 기록 및 관리
   ======================================= */

var Quality = {
    render: function () {
        var checks = Store.getQualityChecks();
        var passCount = checks.filter(function (c) { return c.result === '합격'; }).length;
        var failCount = checks.filter(function (c) { return c.result === '불합격'; }).length;
        var condCount = checks.filter(function (c) { return c.result === '조건부합격'; }).length;

        var html = '<div class="page-section">' +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><div class="stat-label">합격</div><div class="stat-value">' + passCount + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon red">❌</div><div class="stat-info"><div class="stat-label">불합격</div><div class="stat-value">' + failCount + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon orange">⚠️</div><div class="stat-info"><div class="stat-label">조건부</div><div class="stat-value">' + condCount + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><div class="stat-label">전체 검사</div><div class="stat-value">' + checks.length + '건</div></div></div>' +
            '</div>';

        html += '<div class="card"><div class="card-header"><div class="card-title">품질검사 기록</div>' +
            '<button class="btn btn-primary btn-sm" onclick="Quality.openModal()">+ 검사 등록</button></div>';

        if (checks.length === 0) {
            html += '<div class="empty-state"><div class="empty-icon">🔍</div><p>품질검사 기록이 없습니다.<br>검사를 등록해 주세요.</p></div>';
        } else {
            html += '<div class="dl-list">';
            for (var i = 0; i < checks.length; i++) {
                html += Quality._renderCard(checks[i]);
            }
            html += '</div>';
        }

        html += '</div></div>';
        return html;
    },

    _renderCard: function (c) {
        var resultClass = c.result === '합격' ? 'green' : c.result === '불합격' ? 'red' : 'orange';
        var typeClass = { '자재검사': 'blue', '시공검사': 'purple', '중간검사': 'orange', '완료검사': 'green' }[c.checkType] || 'blue';

        return '<div class="dl-card">' +
            '<div class="dl-card-header">' +
            '<div class="dl-date-wrap">' +
            '<div class="dl-date">' + c.date + '</div>' +
            '<div class="dl-site">' + (c.siteName || '') + '</div>' +
            '</div>' +
            '<div class="dl-meta-right">' +
            '<span class="badge badge-' + typeClass + '">' + (c.checkType || '검사') + '</span>' +
            '<span class="badge badge-' + resultClass + '">' + c.result + '</span>' +
            '</div></div>' +
            '<div class="dl-progress" style="border-left-color:' + (c.result === '합격' ? '#10b981' : c.result === '불합격' ? '#ef4444' : '#f59e0b') + '">' +
            '<strong>' + c.workType + '</strong>' +
            (c.specification ? '<br><span style="font-size:0.82rem;color:var(--text-muted)">규격: ' + c.specification + '</span>' : '') +
            '</div>' +
            (c.defects ? '<div class="dl-issue">⚠️ 하자사항: ' + c.defects + '</div>' : '') +
            (c.corrective ? '<div class="dl-tomorrow">🔧 시정조치: ' + c.corrective + '</div>' : '') +
            '<div class="dl-footer"><span class="dl-writer">검사자: ' + (c.inspector || '-') + '</span>' +
            '<div class="action-btns">' +
            '<button class="action-btn edit" onclick="Quality.openModal(\'' + c.id + '\')" title="수정">✏️</button>' +
            '<button class="action-btn delete" onclick="Quality.deleteCheck(\'' + c.id + '\')" title="삭제">🗑️</button>' +
            '</div></div></div>';
    },

    openModal: function (id) {
        var c = id ? Store.getQualityChecks().find(function (x) { return x.id === id; }) : null;
        var v = function (f, d) { return c && c[f] !== undefined ? c[f] : (d || ''); };
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();

        var siteOpts = '<option value="">현장 선택</option>' + sites.map(function (s) {
            var sel = (v('siteId') === s.id) || (!c && currentSiteId === s.id) ? ' selected' : '';
            return '<option value="' + s.id + '" data-name="' + s.name + '"' + sel + '>' + s.name + '</option>';
        }).join('');

        var typeOpts = Store.QUALITY_CHECK_TYPES.map(function (t) {
            return '<option value="' + t + '"' + (v('checkType') === t ? ' selected' : '') + '>' + t + '</option>';
        }).join('');

        var resultOpts = Store.QUALITY_CHECK_RESULTS.map(function (r) {
            return '<option value="' + r + '"' + (v('result', '합격') === r ? ' selected' : '') + '>' + r + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '품질검사 수정' : '품질검사 등록') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editQualityId" value="' + id + '">' : '') +
            '<div class="form-row">' +
            '<div class="form-group"><label>검사일</label><input type="date" class="form-control" id="qc_date" value="' + v('date', Store.getToday()) + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="qc_site">' + siteOpts + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>검사 유형</label><select class="form-control" id="qc_type">' + typeOpts + '</select></div>' +
            '<div class="form-group"><label>검사자</label><input type="text" class="form-control" id="qc_inspector" value="' + v('inspector') + '"></div>' +
            '</div>' +
            '<div class="form-group"><label>공종 / 작업명</label><input type="text" class="form-control" id="qc_work" value="' + v('workType') + '" placeholder="예: 철근 배근 검사"></div>' +
            '<div class="form-group"><label>규격 / 기준</label><input type="text" class="form-control" id="qc_spec" value="' + v('specification') + '" placeholder="예: HD13 @200, KS D 3504"></div>' +
            '<div class="form-group"><label>검사 내용</label><textarea class="form-control" id="qc_content" rows="3" placeholder="검사 상세 내용">' + v('content') + '</textarea></div>' +
            '<div class="form-group"><label>판정 결과</label><select class="form-control" id="qc_result">' + resultOpts + '</select></div>' +
            '<div class="form-group"><label>하자 / 지적사항</label><textarea class="form-control" id="qc_defects" rows="2" placeholder="발견된 하자 사항">' + v('defects') + '</textarea></div>' +
            '<div class="form-group"><label>시정 조치</label><textarea class="form-control" id="qc_corrective" rows="2" placeholder="시정 조치 내용">' + v('corrective') + '</textarea></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="Quality.saveCheck()">저장</button></div>';
        App.showModal(html);
    },

    saveCheck: function () {
        var workType = document.getElementById('qc_work').value.trim();
        if (!workType) { App.showToast('공종/작업명을 입력해주세요.', 'error'); return; }
        var siteEl = document.getElementById('qc_site');
        var data = {
            date: document.getElementById('qc_date').value,
            siteId: siteEl.value,
            siteName: siteEl.selectedOptions[0] && siteEl.value ? siteEl.selectedOptions[0].text : '',
            checkType: document.getElementById('qc_type').value,
            inspector: document.getElementById('qc_inspector').value.trim(),
            workType: workType,
            specification: document.getElementById('qc_spec').value.trim(),
            content: document.getElementById('qc_content').value.trim(),
            result: document.getElementById('qc_result').value,
            defects: document.getElementById('qc_defects').value.trim(),
            corrective: document.getElementById('qc_corrective').value.trim(),
        };
        var idEl = document.getElementById('editQualityId');
        if (idEl) { Store.updateQualityCheck(idEl.value, data); App.showToast('수정되었습니다.', 'success'); }
        else { Store.addQualityCheck(data); App.showToast('품질검사가 등록되었습니다.', 'success'); }
        App.closeModal(); App.refreshPage();
    },

    deleteCheck: function (id) {
        if (!confirm('삭제하시겠습니까?')) return;
        Store.deleteQualityCheck(id); App.showToast('삭제됨', 'success'); App.refreshPage();
    }
};
