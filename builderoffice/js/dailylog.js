/* =======================================
   BuilderOffice - 현장 일지 (Daily Field Log)
   ======================================= */

var DailyLog = {
    filterMonth: '',
    filterSite: 'all',
    filterWeather: '',

    render: function () {
        var now = new Date();
        if (!this.filterMonth) this.filterMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

        var allLogs = Store.getDailyLogs();
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();
        if (currentSiteId !== 'all' && this.filterSite === 'all') this.filterSite = currentSiteId;

        var logs = allLogs.filter(function (l) {
            var monthMatch = !DailyLog.filterMonth || (l.date && l.date.startsWith(DailyLog.filterMonth));
            var siteMatch = DailyLog.filterSite === 'all' || l.siteId === DailyLog.filterSite;
            var wxMatch = !DailyLog.filterWeather || l.weather === DailyLog.filterWeather;
            return monthMatch && siteMatch && wxMatch;
        });

        var siteOpts = '<option value="all">전체 현장</option>' + sites.map(function (s) {
            return '<option value="' + s.id + '"' + (DailyLog.filterSite === s.id ? ' selected' : '') + '>' + s.name + '</option>';
        }).join('');
        var wxOpts = '<option value="">전체 날씨</option>' + Store.WEATHER_TYPES.map(function (w) {
            return '<option value="' + w + '"' + (DailyLog.filterWeather === w ? ' selected' : '') + '>' + w + '</option>';
        }).join('');

        // Stats for this month
        var todayStr = Store.getToday();
        var todayLog = allLogs.find(function (l) { return l.date === todayStr; });
        var monthLogs = allLogs.filter(function (l) { return l.date && l.date.startsWith(DailyLog.filterMonth); });
        var totalPersonnel = monthLogs.reduce(function (s, l) { return s + (Number(l.personnelTotal) || 0); }, 0);
        var avgPersonnel = monthLogs.length ? Math.round(totalPersonnel / monthLogs.length) : 0;

        return '<div class="page-section">' +
            '<div class="stat-cards">' +
            '<div class="stat-card"><div class="stat-icon blue">📋</div><div class="stat-info"><div class="stat-label">이번 달 일지</div><div class="stat-value">' + monthLogs.length + '건</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">👷</div><div class="stat-info"><div class="stat-label">월 평균 인원</div><div class="stat-value">' + avgPersonnel + '명</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon ' + (todayLog ? 'green' : 'orange') + '">' + (todayLog ? '✅' : '⚠️') + '</div><div class="stat-info"><div class="stat-label">오늘 일지</div><div class="stat-value">' + (todayLog ? '작성완료' : '미작성') + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon purple">📊</div><div class="stat-info"><div class="stat-label">전체 일지</div><div class="stat-value">' + allLogs.length + '건</div></div></div>' +
            '</div>' +
            '<div class="card">' +
            '<div class="card-header">' +
            '<div class="card-title">현장 일지</div>' +
            '<button class="btn btn-primary btn-sm" onclick="DailyLog.openModal()">+ 일지 작성</button>' +
            '</div>' +
            '<div class="toolbar">' +
            '<div class="toolbar-left">' +
            '<input type="month" class="filter-input" value="' + this.filterMonth + '" onchange="DailyLog.filterMonth=this.value;App.refreshPage()" style="min-width:140px">' +
            '<select class="filter-select" onchange="DailyLog.filterSite=this.value;App.refreshPage()">' + siteOpts + '</select>' +
            '<select class="filter-select" onchange="DailyLog.filterWeather=this.value;App.refreshPage()">' + wxOpts + '</select>' +
            '</div>' +
            '</div>' +
            (logs.length === 0 ?
                '<div class="empty-state"><div class="empty-icon">📋</div><p>작성된 현장 일지가 없습니다.<br>오늘 작업 내역을 기록하세요.</p>' +
                '<button class="btn btn-primary" onclick="DailyLog.openModal()">+ 오늘 일지 작성</button></div>' :
                '<div class="dl-list">' + logs.map(function (l) { return DailyLog._renderCard(l); }).join('') + '</div>'
            ) +
            '</div>' +
            '</div>';
    },

    _renderCard: function (log) {
        var wxIcon = { '맑음': '☀️', '구름조금': '⛅', '흐림': '☁️', '비': '🌧️', '눈': '❄️', '강풍': '💨' };
        var icon = wxIcon[log.weather] || '🌤️';
        var safetyBadge = log.safetyCheck ?
            '<span class="badge badge-green" style="font-size:0.7rem">✓ 안전점검</span>' :
            '<span class="badge badge-red" style="font-size:0.7rem">✗ 안전점검 미실시</span>';
        return '<div class="dl-card">' +
            '<div class="dl-card-header">' +
            '<div class="dl-date-wrap">' +
            '<div class="dl-date">' + log.date + '</div>' +
            '<div class="dl-site">' + (log.siteName || '') + '</div>' +
            '</div>' +
            '<div class="dl-meta-right">' +
            '<span class="dl-weather">' + icon + ' ' + (log.weather || '') + (log.temperature ? ' ' + log.temperature + '°C' : '') + '</span>' +
            '<span class="dl-personnel">👷 ' + (log.personnelTotal || 0) + '명</span>' +
            safetyBadge +
            '</div>' +
            '</div>' +
            '<div class="dl-progress">' + (log.workProgress || '작업 내용 없음') + '</div>' +
            (log.issues && log.issues !== '없음' ? '<div class="dl-issue">⚠️ ' + log.issues + '</div>' : '') +
            (log.tomorrowPlan ? '<div class="dl-tomorrow">📌 내일: ' + log.tomorrowPlan + '</div>' : '') +
            '<div class="dl-footer">' +
            '<span class="dl-writer">작성자: ' + (log.writer || '-') + '</span>' +
            '<div class="action-btns">' +
            '<button class="action-btn edit" onclick="DailyLog.openModal(\'' + log.id + '\')" title="편집">✏️</button>' +
            '<button class="action-btn delete" onclick="DailyLog.deleteLog(\'' + log.id + '\')" title="삭제">🗑️</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    },

    openModal: function (id) {
        var log = id ? Store.getDailyLogs().find(function (l) { return l.id === id; }) : null;
        var v = function (field, def) { return log && log[field] !== undefined ? log[field] : (def || ''); };
        var today = Store.getToday();
        var sites = Store.getSites();
        var currentSiteId = Store.getCurrentSiteId();

        var siteOpts = '<option value="">현장 선택</option>' + sites.map(function (s) {
            var sel = (v('siteId') === s.id) || (!log && currentSiteId === s.id) ? ' selected' : '';
            return '<option value="' + s.id + '" data-name="' + s.name + '"' + sel + '>' + s.name + '</option>';
        }).join('');
        var wxOpts = Store.WEATHER_TYPES.map(function (w) {
            return '<option value="' + w + '"' + (v('weather', '맑음') === w ? ' selected' : '') + '>' + w + '</option>';
        }).join('');

        var html = '<div class="modal-header"><h3>' + (id ? '현장 일지 수정' : '현장 일지 작성') + '</h3>' +
            '<button class="modal-close" onclick="App.closeModal()">✕</button></div>' +
            '<div class="modal-body">' +
            (id ? '<input type="hidden" id="editLogId" value="' + id + '">' : '') +
            '<div class="form-row">' +
            '<div class="form-group"><label>날짜 *</label><input type="date" class="form-control" id="dl_date" value="' + v('date', today) + '"></div>' +
            '<div class="form-group"><label>현장</label><select class="form-control" id="dl_site">' + siteOpts + '</select></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>날씨</label><select class="form-control" id="dl_weather">' + wxOpts + '</select></div>' +
            '<div class="form-group"><label>기온 (°C)</label><input type="number" class="form-control" id="dl_temp" value="' + v('temperature') + '" placeholder="15"></div>' +
            '</div>' +
            '<div class="form-row">' +
            '<div class="form-group"><label>총 투입 인원 (명)</label><input type="number" class="form-control" id="dl_personnel" value="' + v('personnelTotal') + '" placeholder="0"></div>' +
            '<div class="form-group"><label>작성자</label><input type="text" class="form-control" id="dl_writer" value="' + v('writer') + '" placeholder="현장소장 이름"></div>' +
            '</div>' +
            '<div class="form-group"><label>직종별 인원</label><input type="text" class="form-control" id="dl_personnelType" value="' + v('personnelByType') + '" placeholder="철근공 4명, 형틀공 5명, 콘크리트공 3명"></div>' +
            '<div class="form-group"><label>금일 작업 내용 *</label><textarea class="form-control" id="dl_progress" rows="4" placeholder="오늘 진행한 작업 내용을 기록하세요.">' + v('workProgress') + '</textarea></div>' +
            '<div class="form-group"><label>안전 점검</label>' +
            '<div style="display:flex;gap:16px;align-items:center;margin-top:6px">' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="radio" name="safetyCheck" value="true"' + (v('safetyCheck', true) ? ' checked' : '') + '> 실시</label>' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="radio" name="safetyCheck" value="false"' + (!v('safetyCheck', true) ? ' checked' : '') + '> 미실시</label>' +
            '</div></div>' +
            '<div class="form-group"><label>안전 특이사항</label><input type="text" class="form-control" id="dl_safety" value="' + v('safetyNotes') + '" placeholder="안전 관련 특이사항을 입력하세요."></div>' +
            '<div class="form-group"><label>문제 / 특이사항</label><textarea class="form-control" id="dl_issues" rows="2" placeholder="공사 중 발생한 문제나 특이사항 (없으면 없음)">' + v('issues', '없음') + '</textarea></div>' +
            '<div class="form-group"><label>명일 작업 계획</label><input type="text" class="form-control" id="dl_tomorrow" value="' + v('tomorrowPlan') + '" placeholder="내일 진행할 작업 계획"></div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button class="btn btn-secondary" onclick="App.closeModal()">취소</button>' +
            '<button class="btn btn-primary" onclick="DailyLog.save()">저장</button>' +
            '</div>';
        App.showModal(html);
    },

    save: function () {
        var date = document.getElementById('dl_date').value;
        var progress = document.getElementById('dl_progress').value.trim();
        if (!date) { App.showToast('날짜를 선택해주세요.', 'error'); return; }
        if (!progress) { App.showToast('작업 내용을 입력해주세요.', 'error'); return; }

        var siteEl = document.getElementById('dl_site');
        var siteId = siteEl.value;
        var siteName = siteEl.selectedOptions[0] ? siteEl.selectedOptions[0].text : '';

        var safetyEl = document.querySelector('input[name="safetyCheck"]:checked');

        var idEl = document.getElementById('editLogId');
        var data = {
            date: date,
            siteId: siteId,
            siteName: siteName,
            weather: document.getElementById('dl_weather').value,
            temperature: document.getElementById('dl_temp').value,
            personnelTotal: Number(document.getElementById('dl_personnel').value) || 0,
            personnelByType: document.getElementById('dl_personnelType').value.trim(),
            workProgress: progress,
            safetyCheck: safetyEl ? safetyEl.value === 'true' : true,
            safetyNotes: document.getElementById('dl_safety').value.trim(),
            issues: document.getElementById('dl_issues').value.trim() || '없음',
            tomorrowPlan: document.getElementById('dl_tomorrow').value.trim(),
            writer: document.getElementById('dl_writer').value.trim(),
        };

        if (idEl) {
            Store.updateDailyLog(idEl.value, data);
            App.showToast('현장 일지가 수정되었습니다.', 'success');
        } else {
            Store.addDailyLog(data);
            App.showToast('현장 일지가 저장되었습니다.', 'success');
        }
        App.closeModal();
        App.refreshPage();
    },

    deleteLog: function (id) {
        if (!confirm('이 현장 일지를 삭제하시겠습니까?')) return;
        Store.deleteDailyLog(id);
        App.showToast('삭제되었습니다.', 'success');
        App.refreshPage();
    }
};
