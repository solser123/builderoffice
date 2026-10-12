/* =======================================
   BuilderOffice - KOSHA-MS 안전보건 서류 체계

   기존에는 체크박스 목록이었지만, 실제 KOSHA-MS는
   절차서(SHI/SHP)마다 정해진 양식(F01, F02…)이 있고
   각 양식에 제출·작성 주기가 있다.

   자료 출처: Kosha-Ms 안전 기준자료\1. 절차서 및 지침서 양식
     예) SHI-09-F08 ( )월 순회점검일지   → 월간
         SHP-09-F01 년 안전보건 교육계획 → 연간
         TBM위험예지활동일지             → 일일

   ⚠️ 인원수 기준(minWorkers)은 산업안전보건법 시행령 기준이며
      법 개정 시 바뀐다. 설정에서 조정할 수 있게 두었다.
   ======================================= */

var KoshaForms = {

    CYCLES: [
        { id: 'daily', label: '일일', icon: '📅', days: 1 },
        { id: 'weekly', label: '주간', icon: '🗓️', days: 7 },
        { id: 'monthly', label: '월간', icon: '📆', days: 30 },
        { id: 'quarterly', label: '분기', icon: '📊', days: 90 },
        { id: 'halfyear', label: '반기', icon: '🌗', days: 182 },
        { id: 'yearly', label: '연간', icon: '🗂️', days: 365 },
        { id: 'asneeded', label: '수시', icon: '⚡', days: 0 }
    ],

    /* 상시근로자 수에 따른 법정 의무 단계
       (산업안전보건법 시행령 — 개정 시 확인 필요) */
    THRESHOLDS: [
        {
            min: 5, label: '5인 이상',
            duties: ['중대재해처벌법 적용', '위험성평가 실시', '안전보건교육', '산업재해 기록·보존']
        },
        {
            min: 20, label: '20인 이상',
            duties: ['안전보건관리담당자 선임 (제조·임업·하수처리 등)']
        },
        {
            min: 50, label: '50인 이상',
            duties: ['안전보건관리책임자 선임', '안전관리자 선임', '보건관리자 선임',
                     '산업안전보건위원회 설치·운영', '안전보건관리규정 작성']
        },
        {
            min: 100, label: '100인 이상',
            duties: ['산업안전보건위원회 분기별 개최', '안전보건 전담조직 검토']
        }
    ],

    // 건설업은 인원이 아니라 공사금액이 기준이 되는 항목이 있다
    CONSTRUCTION_NOTE:
        '건설업은 공사금액 기준이 별도 적용됩니다. ' +
        '안전관리자 선임 50억원 이상 / 산업안전보건위원회 120억원 이상(토목 150억원 이상).',

    /* ===== 절차서별 양식 =====
       code: 양식번호 · cycle: 작성 주기 · minWorkers: 이 인원 이상일 때 필요
       (minWorkers 0 = 인원과 무관하게 필요) */
    CATEGORIES: [
        {
            code: 'SHI-01', series: 'SHI', title: '안전작업절차 수립·이행', icon: '📋',
            forms: [
                { code: 'SHI-01-F01', name: '안전작업 절차서', cycle: 'asneeded', minWorkers: 0, note: '작업별 표준 절차' },
                { code: 'SHI-01-F02', name: '표준문서 관리대장', cycle: 'yearly', minWorkers: 0, note: '연도별 관리' }
            ]
        },
        {
            code: 'SHI-02', series: 'SHI', title: '위험기계·기구·설비 관리', icon: '⚙️',
            forms: [
                { code: 'SHI-02-F01', name: '위험 기계·기구 이력카드', cycle: 'asneeded', minWorkers: 0 },
                { code: 'SHI-02-F02', name: '위험 기계·기구 관리대장', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHI-02-F03', name: '위험기계·기구 점검 기준', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHI-02-F04', name: '안전점검표(기계별)', cycle: 'monthly', minWorkers: 0, note: '공기압축기·크레인·호이스트 등' }
            ]
        },
        {
            code: 'SHI-03', series: 'SHI', title: '보호구 관리', icon: '🦺',
            forms: [
                { code: 'SHI-03-F01', name: '보호구 지급·관리대장', cycle: 'yearly', minWorkers: 0, note: '연도별 작성' },
                { code: 'SHI-03-F02', name: '보호구 점검표', cycle: 'monthly', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-04', series: 'SHI', title: '화재예방 관리', icon: '🔥',
            forms: [
                { code: 'SHI-04-F01', name: '소방시설 점검표', cycle: 'monthly', minWorkers: 0 },
                { code: 'SHI-04-F02', name: '화기작업 허가서', cycle: 'asneeded', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-05', series: 'SHI', title: '밀폐공간 안전작업', icon: '🕳️',
            forms: [
                { code: 'SHI-05-F01', name: '밀폐공간 작업허가서', cycle: 'asneeded', minWorkers: 0, note: '작업 시마다' },
                { code: 'SHI-05-F02', name: '산소·유해가스 측정기록', cycle: 'asneeded', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-06', series: 'SHI', title: '건강검진·유소견자 관리', icon: '🏥',
            forms: [
                { code: 'SHI-06-F01', name: '일반건강검진 결과', cycle: 'yearly', minWorkers: 0, note: '사무직 2년 1회' },
                { code: 'SHI-06-F02', name: '특수건강검진 결과', cycle: 'yearly', minWorkers: 0, note: '유해인자 노출자' },
                { code: 'SHI-06-F08', name: '개인별 상담일지', cycle: 'asneeded', minWorkers: 50 }
            ]
        },
        {
            code: 'SHI-07', series: 'SHI', title: '작업환경 측정·개선', icon: '🌡️',
            forms: [
                { code: 'SHI-07-F01', name: '작업환경측정 결과서', cycle: 'halfyear', minWorkers: 0, note: '상·하반기 각 1회' },
                { code: 'SHI-07-F02', name: '측정 결과 개선계획', cycle: 'halfyear', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-08', series: 'SHI', title: '근골격계 질환 예방', icon: '💪',
            forms: [
                { code: 'SHI-08-F01', name: '근골격계 유해요인 조사', cycle: 'yearly', minWorkers: 50, note: '3년마다 정기조사' },
                { code: 'SHI-08-F02', name: '증상 설문조사', cycle: 'yearly', minWorkers: 50 }
            ]
        },
        {
            code: 'SHI-09', series: 'SHI', title: '도급업체·용역 안전보건 관리', icon: '🤝',
            forms: [
                { code: 'SHI-09-F07', name: '도급업체 안전보건 점검일지', cycle: 'monthly', minWorkers: 0 },
                { code: 'SHI-09-F08', name: '월 순회점검일지', cycle: 'monthly', minWorkers: 0, note: '도급 시 필수' },
                { code: 'SHI-09-F09', name: '합동 안전보건 점검일지', cycle: 'quarterly', minWorkers: 0, note: '분기 1회 이상' },
                { code: 'SHI-09-F11', name: '도급업체 정기평가표', cycle: 'yearly', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-10', series: 'SHI', title: '안전조회·점검', icon: '🔍',
            forms: [
                { code: 'SHI-10-F01', name: 'TBM 위험예지활동일지', cycle: 'daily', minWorkers: 0, note: '수시 위험성평가 겸함' },
                { code: 'SHI-10-F02', name: '관리감독자 안전점검일지', cycle: 'daily', minWorkers: 0 },
                { code: 'SHI-10-F03', name: '현장 안전점검 및 지도일지', cycle: 'weekly', minWorkers: 0 },
                { code: 'SHI-10-F04', name: '출근부', cycle: 'daily', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-11', series: 'SHI', title: '작업허가 관리', icon: '📝',
            forms: [
                { code: 'SHI-11-F01', name: '일반 작업허가서', cycle: 'asneeded', minWorkers: 0 },
                { code: 'SHI-11-F02', name: '고소작업 허가서', cycle: 'asneeded', minWorkers: 0 },
                { code: 'SHI-11-F03', name: '중장비 작업허가서', cycle: 'asneeded', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-12', series: 'SHI', title: '위험신고·작업중지', icon: '🛑',
            forms: [
                { code: 'SHI-12-F01', name: '작업중지 요청·조치 기록', cycle: 'asneeded', minWorkers: 0 },
                { code: 'SHI-12-F02', name: '위험신고 대장', cycle: 'yearly', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-13', series: 'SHI', title: '폭염·고열 작업 관리', icon: '🌞',
            forms: [
                { code: 'SHI-13-F01', name: '폭염 대응 점검표', cycle: 'daily', minWorkers: 0, note: '여름철(6~9월)' }
            ]
        },
        {
            code: 'SHI-18', series: 'SHI', title: '공구 관리', icon: '🔧',
            forms: [
                { code: 'SHI-18-F05', name: '월 공구 안전점검일지', cycle: 'monthly', minWorkers: 0 }
            ]
        },
        {
            code: 'SHI-19', series: 'SHI', title: '유해물질·MSDS 관리', icon: '🧪',
            forms: [
                { code: 'SHI-19-F01', name: 'MSDS 비치·게시', cycle: 'asneeded', minWorkers: 0 },
                { code: 'SHI-19-F02', name: '물질 보관창고 안전점검일지', cycle: 'monthly', minWorkers: 0 },
                { code: 'SHI-19-F03', name: '경고표지 부착 점검', cycle: 'monthly', minWorkers: 0 }
            ]
        },

        /* ===== SHP : 경영 시스템 ===== */
        {
            code: 'SHP-01', series: 'SHP', title: '안전보건경영 리스크', icon: '⚠️',
            forms: [
                { code: 'SHP-01-F01', name: '리스크·기회 식별표', cycle: 'yearly', minWorkers: 50 }
            ]
        },
        {
            code: 'SHP-02', series: 'SHP', title: '문서·기록 관리', icon: '🗄️',
            forms: [
                { code: 'SHP-02-F01', name: '문서 관리대장', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHP-02-F02', name: '기록 보존 목록', cycle: 'yearly', minWorkers: 0 }
            ]
        },
        {
            code: 'SHP-03', series: 'SHP', title: '안전보건방침·목표관리', icon: '🎯',
            forms: [
                { code: 'SHP-03-F01', name: '사업부 안전보건계획', cycle: 'yearly', minWorkers: 0, note: '연초 수립' },
                { code: 'SHP-03-F02', name: '팀 안전보건 계획', cycle: 'yearly', minWorkers: 50 },
                { code: 'SHP-03-F03', name: '사업부 안전보건 실적', cycle: 'quarterly', minWorkers: 0 },
                { code: 'SHP-03-F05', name: '경영검토 보고서', cycle: 'yearly', minWorkers: 50, note: '연 1회 이상' }
            ]
        },
        {
            code: 'SHP-04', series: 'SHP', title: '조직·업무분장', icon: '🏢',
            forms: [
                { code: 'SHP-04-F01', name: '안전보건 조직도', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHP-04-F02', name: '선임계·업무분장표', cycle: 'yearly', minWorkers: 20, note: '관리담당자 선임' }
            ]
        },
        {
            code: 'SHP-05', series: 'SHP', title: '정보제공·회의체 운영', icon: '💬',
            forms: [
                { code: 'SHP-05-F01', name: '산업안전보건위원회 회의록', cycle: 'quarterly', minWorkers: 50, note: '분기 1회 이상' },
                { code: 'SHP-05-F02', name: '노사협의체 회의록', cycle: 'quarterly', minWorkers: 50 }
            ]
        },
        {
            code: 'SHP-06', series: 'SHP', title: '위험성평가', icon: '🎲',
            forms: [
                { code: 'SHP-06-F01', name: '위험성평가서(4M/KRAS)', cycle: 'yearly', minWorkers: 0, note: '최초·정기(연1회)' },
                { code: 'SHP-06-F04', name: '위험성평가 검토회의록', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHP-06-F05', name: '안전보건 위험개선 현황', cycle: 'quarterly', minWorkers: 0 },
                { code: 'SHP-06-F11', name: '위험성평가 계획', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHP-06-F12', name: '위험예지활동일지', cycle: 'daily', minWorkers: 0 }
            ]
        },
        {
            code: 'SHP-07', series: 'SHP', title: '법규·준수관리', icon: '⚖️',
            forms: [
                { code: 'SHP-07-F01', name: '법규 등록부', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHP-07-F02', name: '준수평가표', cycle: 'yearly', minWorkers: 50 }
            ]
        },
        {
            code: 'SHP-08', series: 'SHP', title: '안전보건 예산 관리', icon: '💰',
            forms: [
                { code: 'SHP-08-F01', name: '안전보건 예산 계획', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHP-08-F02', name: '산업안전보건관리비 사용내역', cycle: 'monthly', minWorkers: 0, note: '건설업 필수' }
            ]
        },
        {
            code: 'SHP-09', series: 'SHP', title: '교육·자격관리', icon: '🎓',
            forms: [
                { code: 'SHP-09-F01', name: '연간 안전보건 교육계획', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHP-09-F02', name: '안전보건교육일지', cycle: 'quarterly', minWorkers: 0, note: '정기교육 분기별' },
                { code: 'SHP-09-F03', name: '교육 실적표', cycle: 'quarterly', minWorkers: 0 },
                { code: 'SHP-09-F04', name: '자격관리대장', cycle: 'yearly', minWorkers: 0 }
            ]
        },
        {
            code: 'SHP-10', series: 'SHP', title: '개선제안 관리', icon: '💡',
            forms: [
                { code: 'SHP-10-F01', name: '개선제안서', cycle: 'asneeded', minWorkers: 0 }
            ]
        },
        {
            code: 'SHP-12', series: 'SHP', title: '보건 운영관리', icon: '🩺',
            forms: [
                { code: 'SHP-12-F01', name: '보건관리 계획', cycle: 'yearly', minWorkers: 50 },
                { code: 'SHP-12-F02', name: '월 혈압측정 일지', cycle: 'monthly', minWorkers: 0 }
            ]
        },
        {
            code: 'SHP-13', series: 'SHP', title: '모니터링·시정조치', icon: '📈',
            forms: [
                { code: 'SHP-13-F01', name: '안전보건 모니터링 결과', cycle: 'monthly', minWorkers: 0 },
                { code: 'SHP-13-F02', name: '시정조치 요구서', cycle: 'asneeded', minWorkers: 0 }
            ]
        },
        {
            code: 'SHP-14', series: 'SHP', title: '비상시 대응', icon: '🚨',
            forms: [
                { code: 'SHP-14-F01', name: '비상대응 계획서', cycle: 'yearly', minWorkers: 0 },
                { code: 'SHP-14-F02', name: '비상대응 훈련일지', cycle: 'halfyear', minWorkers: 0, note: '연 2회 권장' },
                { code: 'SHP-14-F03', name: '비상연락망', cycle: 'yearly', minWorkers: 0 }
            ]
        },
        {
            code: 'SHP-15', series: 'SHP', title: '내부심사', icon: '🔎',
            forms: [
                { code: 'SHP-15-F01', name: '내부심사 계획서', cycle: 'yearly', minWorkers: 50 },
                { code: 'SHP-15-F02', name: '내부심사 보고서', cycle: 'yearly', minWorkers: 50 }
            ]
        },
        {
            code: 'SHP-16', series: 'SHP', title: '사고 조사·관리', icon: '🩹',
            forms: [
                { code: 'SHP-16-F01', name: '사고 조사보고서', cycle: 'asneeded', minWorkers: 0 },
                { code: 'SHP-16-F02', name: '산업재해조사표', cycle: 'asneeded', minWorkers: 0, note: '3일 이상 휴업 시 1개월 내 제출' },
                { code: 'SHP-16-F03', name: '아차사고 보고서', cycle: 'asneeded', minWorkers: 0 }
            ]
        },
        {
            code: 'SHP-17', series: 'SHP', title: '상벌관리', icon: '🏅',
            forms: [
                { code: 'SHP-17-F01', name: '안전보건 상벌 기록', cycle: 'yearly', minWorkers: 50 }
            ]
        }
    ],

    // ===== 조회 헬퍼 =====

    cycle: function (id) {
        for (var i = 0; i < this.CYCLES.length; i++) {
            if (this.CYCLES[i].id === id) return this.CYCLES[i];
        }
        return this.CYCLES[this.CYCLES.length - 1];
    },

    category: function (code) {
        for (var i = 0; i < this.CATEGORIES.length; i++) {
            if (this.CATEGORIES[i].code === code) return this.CATEGORIES[i];
        }
        return null;
    },

    /** 인원수에 해당하는 법정 의무 목록 */
    dutiesFor: function (workers) {
        var out = [];
        for (var i = 0; i < this.THRESHOLDS.length; i++) {
            if (workers >= this.THRESHOLDS[i].min) out.push(this.THRESHOLDS[i]);
        }
        return out;
    },

    /** 인원수 기준으로 필요한 양식만 추린다 */
    formsFor: function (workers, cycleId) {
        var out = [];
        for (var i = 0; i < this.CATEGORIES.length; i++) {
            var cat = this.CATEGORIES[i];
            for (var j = 0; j < cat.forms.length; j++) {
                var f = cat.forms[j];
                if (workers < (f.minWorkers || 0)) continue;
                if (cycleId && cycleId !== 'all' && f.cycle !== cycleId) continue;
                out.push({
                    catCode: cat.code, catTitle: cat.title, catIcon: cat.icon, series: cat.series,
                    code: f.code, name: f.name, cycle: f.cycle, note: f.note || '',
                    minWorkers: f.minWorkers || 0
                });
            }
        }
        return out;
    },

    /** 주기별 다음 마감일 계산 (마지막 작성일 기준) */
    nextDue: function (cycleId, lastDate) {
        var c = this.cycle(cycleId);
        if (!c.days) return null;                 // 수시는 마감이 없다
        if (!lastDate) return null;               // 한 번도 안 했으면 '미작성'
        var d = new Date(lastDate);
        d.setDate(d.getDate() + c.days);
        return d.toISOString().split('T')[0];
    },

    /** 상태 판정: 미작성 | 기한임박 | 기한초과 | 정상 */
    statusOf: function (cycleId, lastDate) {
        var c = this.cycle(cycleId);
        if (!c.days) return lastDate ? 'ok' : 'none';
        if (!lastDate) return 'none';
        var due = new Date(this.nextDue(cycleId, lastDate));
        var today = new Date(new Date().toISOString().split('T')[0]);
        var diff = Math.round((due - today) / 86400000);
        if (diff < 0) return 'overdue';
        if (diff <= Math.max(1, Math.round(c.days * 0.2))) return 'soon';
        return 'ok';
    }
};
