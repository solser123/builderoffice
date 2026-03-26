/* =======================================
   BuilderOffice - Safety Management Module
   안전 관리 (체크리스트, 위험성평가, TBM, 시정조치)
   ======================================= */

var Safety = {
    activeTab: 'checklist',

    render: function () {
        var checks = Store.getSafetyChecks();
        var todayChecks = checks.filter(function (c) { return c.date === Store.getToday(); });
        var needFix = checks.filter(function (c) { return c.status === '시정필요'; });

        return '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon green">🦺</div><div class="stat-info"><div class="stat-label">오늘 점검</div><div class="stat-value">' + todayChecks.length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon ' + (needFix.length > 0 ? 'red' : 'green') + '">' + (needFix.length > 0 ? '⚠️' : '✅') + '</div><div class="stat-info"><div class="stat-label">시정 필요</div><div class="stat-value">' + needFix.length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><div class="stat-label">총 점검 기록</div><div class="stat-value">' + checks.length + '건</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="tab-nav">' +
            '<button class="tab-btn ' + (this.activeTab === 'checklist' ? 'active' : '') + '" onclick="Safety.switchTab(\'checklist\')">📋 점검 기록</button>' +
            '<button class="tab-btn ' + (this.activeTab === 'new' ? 'active' : '') + '" onclick="Safety.switchTab(\'new\')">➕ 새 점검</button>' +
            '</div>' +
            '<div class="tab-content ' + (this.activeTab === 'checklist' ? 'active' : '') + '">' + this._renderChecklist() + '</div>' +
            '<div class="tab-content ' + (this.activeTab === 'new' ? 'active' : '') + '">' + this._renderNewCheck() + '</div>' +
            '</div>';
    },

    _renderChecklist: function () {
        var checks = Store.getSafetyChecks();
        var esc = Store.escapeHtml;
        var rows = '';

        if (checks.length > 0) {
            for (var i = 0; i < checks.length; i++) {
                var c = checks[i];
                var statusBadge = c.status === '완료' ? 'badge-green' : c.status === '시정필요' ? 'badge-red' : 'badge-orange';
                var checkCount = c.checklist ? c.checklist.length : 0;
                var checkedCount = c.checklist ? c.checklist.filter(function (x) { return x.checked; }).length : 0;

                rows += '<tr onclick="Safety.showDetail(\'' + c.id + '\')" style="cursor:pointer;">' +
                    '<td>' + esc(c.date) + '</td>' +
                    '<td style="font-weight:600;">' + esc(c.siteName || '-') + '</td>' +
                    '<td><span class="badge badge-blue">' + esc(c.type) + '</span></td>' +
                    '<td>' + checkedCount + '/' + checkCount + '</td>' +
                    '<td>' + esc(c.inspector || '-') + '</td>' +
                    '<td><span class="badge ' + statusBadge + '">' + esc(c.status) + '</span></td>' +
                    '</tr>';
            }
        } else {
            rows = '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🦺</div><p>점검 기록이 없습니다</p></div></td></tr>';
        }

        return '<div class="table-container"><table><thead><tr><th>날짜</th><th>현장</th><th>점검유형</th><th>체크</th><th>점검자</th><th>상태</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div>';
    },

    _renderNewCheck: function () {
        var sites = Store.getSites();
        var esc = Store.escapeHtml;

        var siteOpts = '<option value="">현장 선택</option>';
        for (var i = 0; i < sites.length; i++) {
            if (sites[i].status === '진행중') {
                siteOpts += '<option value="' + esc(sites[i].name) + '">' + esc(sites[i].name) + '</option>';
            }
        }

        var typeOpts = '';
        for (var t = 0; t < Store.SAFETY_TYPES.length; t++) {
            typeOpts += '<option value="' + esc(Store.SAFETY_TYPES[t]) + '">' + esc(Store.SAFETY_TYPES[t]) + '</option>';
        }

        // 기본 체크리스트 항목들
        var defaultItems = [
            '안전모 착용 확인',
            '안전화 착용 확인',
            '안전대(안전벨트) 착용 확인',
            '작업구역 정리정돈',
            '추락방지시설 설치 확인',
            '개구부 덮개/안전난간 확인',
            '소화기 비치 확인',
            '비상연락망 게시 확인',
            '중장비 작업반경 통제 확인',
            '전기 임시배전반 상태 확인'
        ];

        var checkItems = '';
        for (var c = 0; c < defaultItems.length; c++) {
            checkItems += '<label class="safety-check-item">' +
                '<input type="checkbox" class="safety-item-check" data-idx="' + c + '">' +
                '<span>' + defaultItems[c] + '</span>' +
                '</label>';
        }

        return '<div class="wi-form">' +
            '<div class="wi-section">' +
            '<div class="wi-section-title">📅 점검 기본정보</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜</label><input type="date" class="form-control" id="safetyDate" value="' + Store.getToday() + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="safetySite">' + siteOpts + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>점검 유형</label><select class="form-control" id="safetyType">' + typeOpts + '</select></div>' +
            '<div class="form-group"><label>점검자</label><input type="text" class="form-control" id="safetyInspector" placeholder="이름" value="' + ((App.currentUser && App.currentUser.name) || '') + '"></div>' +
            '</div>' +
            '</div>' +

            '<div class="wi-section">' +
            '<div class="wi-section-title">✅ 점검 항목</div>' +
            '<div class="safety-checklist">' + checkItems + '</div>' +
            '<div class="form-group" style="margin-top:12px;"><label>추가 점검항목</label><input type="text" class="form-control" id="safetyExtraItem" placeholder="직접 입력 후 Enter" onkeydown="if(event.key===\'Enter\'){Safety.addCustomItem();event.preventDefault();}"></div>' +
            '<div id="safetyCustomItems"></div>' +
            '</div>' +

            '<div class="wi-section">' +
            '<div class="wi-section-title">📝 특이사항 · 시정조치</div>' +
            '<div class="form-group"><label>특이사항/시정사항</label><textarea class="form-control" id="safetyNote" rows="3" placeholder="미비점, 시정 필요 사항, 조치 내용 등"></textarea></div>' +
            '<div class="form-group"><label>증빙 사진</label>' +
            '<div class="wi-photo-area"><div class="wi-photo-placeholder" onclick="App.showToast(\'사진 업로드는 서버 연동 후 활성화됩니다.\', \'info\')"><span>📷</span><p>사진 추가 (프로토타입)</p></div></div>' +
            '</div>' +
            '</div>' +

            '<div class="wi-submit-area">' +
            '<button class="btn btn-primary" onclick="Safety.submitCheck()" style="flex:1;">📤 점검 완료 제출</button>' +
            '</div>' +
            '</div>';
    },

    switchTab: function (tab) {
        this.activeTab = tab;
        App.refreshPage();
    },

    addCustomItem: function () {
        var input = document.getElementById('safetyExtraItem');
        var text = input.value.trim();
        if (!text) return;

        var container = document.getElementById('safetyCustomItems');
        var label = document.createElement('label');
        label.className = 'safety-check-item';
        label.innerHTML = '<input type="checkbox" class="safety-item-check" checked><span>' + Store.escapeHtml(text) + '</span>';
        container.appendChild(label);
        input.value = '';
    },

    submitCheck: function () {
        var date = document.getElementById('safetyDate').value;
        var siteName = document.getElementById('safetySite').value;
        var type = document.getElementById('safetyType').value;
        var inspector = document.getElementById('safetyInspector').value.trim();
        var note = document.getElementById('safetyNote').value.trim();

        if (!date || !siteName) {
            App.showToast('날짜와 현장을 선택해주세요.', 'error');
            return;
        }

        var items = document.querySelectorAll('.safety-item-check');
        var checklist = [];
        var allChecked = true;
        for (var i = 0; i < items.length; i++) {
            var span = items[i].parentElement.querySelector('span');
            var itemText = span ? span.textContent : '';
            checklist.push({ item: itemText, checked: items[i].checked });
            if (!items[i].checked) allChecked = false;
        }

        var status = allChecked ? '완료' : '시정필요';

        Store.addSafetyCheck({
            date: date,
            siteName: siteName,
            type: type,
            checklist: checklist,
            inspector: inspector,
            status: status,
            note: note
        });

        if (status === '시정필요') {
            Store.addApproval({
                type: '안전',
                title: '시정조치 필요 - ' + siteName + ' ' + type,
                requester: inspector || '점검자',
                requestDate: Store.getToday(),
                status: '대기',
                detail: note || '미체크 항목 있음'
            });
        }

        App.showToast('안전 점검이 제출되었습니다. (' + status + ')', status === '완료' ? 'success' : 'error');
        this.activeTab = 'checklist';
        App.refreshPage();
    },

    showDetail: function (id) {
        var c = Store.getSafetyChecks().find(function (x) { return x.id === id; });
        if (!c) return;
        var esc = Store.escapeHtml;

        var items = '';
        if (c.checklist) {
            for (var i = 0; i < c.checklist.length; i++) {
                var ci = c.checklist[i];
                items += '<div class="safety-detail-item ' + (ci.checked ? 'checked' : 'unchecked') + '">' +
                    '<span>' + (ci.checked ? '✅' : '❌') + '</span> ' + esc(ci.item) +
                    '</div>';
            }
        }

        var html = '<div class="modal-header"><h3>🦺 점검 상세</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-weight:700;">' + esc(c.date) + '</span><span class="badge ' + (c.status === '완료' ? 'badge-green' : 'badge-red') + '">' + esc(c.status) + '</span></div>' +
            '<div style="margin-bottom:4px;">🏗️ <strong>' + esc(c.siteName || '-') + '</strong></div>' +
            '<div style="margin-bottom:12px;"><span class="badge badge-blue">' + esc(c.type) + '</span> · 점검자: ' + esc(c.inspector || '-') + '</div>' +
            '<div style="border-top:1px solid var(--border-color);padding-top:12px;">' +
            '<strong>점검 항목</strong>' +
            '<div style="margin-top:8px;">' + items + '</div>' +
            '</div>' +
            (c.note ? '<div style="border-top:1px solid var(--border-color);padding-top:12px;margin-top:12px;"><strong>특이사항</strong><p style="margin-top:4px;color:var(--text-secondary);">' + esc(c.note) + '</p></div>' : '') +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-secondary" onclick="App.closeModal()">닫기</button></div>';
        App.showModal(html);
    }
};
