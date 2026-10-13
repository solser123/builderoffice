# BuilderOffice · 건설현장 통합관리

건설·플랜트 현장의 **수주 → 시공 → 기성 → 정산**과 **인력·비용·안전·문서**를
한 곳에서 관리하는 웹 애플리케이션입니다. 여러 사람이 **실시간으로 같은 데이터를
공유**하며, 현장에서는 폰으로, 사무실에서는 PC로 씁니다.

- **라이브**: https://buildermaster-b9e9c.web.app
- **기술**: 순수 HTML/CSS/JS (프레임워크 없음) + Firebase(Auth·Firestore·Storage) + Capacitor(Android)
- **백엔드 서버 없음** — Firebase가 저장소·인증·동기화를 담당

---

## 빠른 시작

```bash
# 1) 의존성 설치
npm install

# 2) 로컬 실행 (둘 중 하나)
npx serve .                      # 루트를 그대로 서빙
python -m http.server 5180       # 파이썬이 있으면 이것도 가능

# 3) 브라우저에서 http://localhost:5180 접속
```

> Firebase 설정이 비어 있으면(`js/firebase-config.js`가 `YOUR_...`) 앱은 자동으로
> **로컬 모드**(localStorage 단독)로 동작합니다. 실제 클라우드 동기화는 config가
> 채워져 있어야 작동합니다. 이 저장소에는 운영 프로젝트(`buildermaster-b9e9c`)
> config가 들어 있습니다.

로컬 테스트 계정 (Firebase 미설정 시):
`admin@builder.com` / `1234` · `owner@builder.com` / `1234`

---

## 주요 기능

| 영역 | 내용 |
|---|---|
| 🏗️ 현장 관리 | 현장 등록 + **대표용 현장별 수지 현황**(계약·기성·입금·미수·지출·손익) |
| 📄 견적 → 📑 계약 → 💵 기성 | 수주 흐름. 기성은 **회차별 청구·입금** 분리 관리 |
| 📝 일일 입력 | 하루 흐름(작업 전 → 출역 → 작업 → 마감). TBM·날씨·공수 기록, 사진 첨부 |
| 💰 비용 관리 | **승인 축**(대기/승인/반려) × **지급 축**(미지급/홀딩/지급완료), 월·분기·연 결산 |
| 👷 인원 관리 | 공수 입력 → 통합 공수 → **노무비 대장**(일용직 세액 자동 계산) |
| 🦺 안전 관리 | KOSHA-MS 양식 체계. 작성 주기·인원수 기준으로 필요 서류 판정 |
| 📂 문서 관리 | 공사 6단계 + 안전 분류, **현장별 필수 서류 누락** 표시 |
| 🎟️ 팀 관리 | 업체 코드 발급·가입, 역할별 권한 |

---

## 디렉터리 구조

```
builderoffice/
├── index.html              # 단일 진입점. 모든 스크립트를 순서대로 로드
├── css/
│   ├── styles.css          # 기본 디자인 시스템(어두운 테마 기준)
│   ├── portal.css          # 밝은 테마 보정 + 로그인/GNB
│   └── mobile.css          # 모바일 전용
├── js/
│   ├── firebase-config.js  # Firebase 초기화 (type=module)
│   ├── sync.js             # ⭐ 실시간 동기화 엔진 (가장 중요)
│   ├── store.js            # 데이터 계층 + 비즈니스 로직(세액·수지 등)
│   ├── db.js               # Firestore CRUD·초대코드·멤버 관리
│   ├── photos.js           # 사진 업로드(자동 압축)
│   ├── <각 화면>.js         # dashboard/sites/workinput/costs/orders/
│   │                       #   personnel/materials/safety/documents/approvals/team
│   ├── kosha-forms.js      # KOSHA 양식 정의(데이터)
│   ├── kosha-ui.js         # KOSHA 화면(Safety 확장)
│   ├── onboarding.js       # 신규 업체 시작 안내
│   └── app.js              # SPA 라우터·모달·토스트·검색
├── firestore.rules         # Firestore 보안 규칙
├── storage.rules           # Storage 보안 규칙
├── firebase.json           # 호스팅/규칙 배포 설정 (웹 루트 = www/)
└── www/                    # 빌드 산출물(배포용). git 미추적 — 커밋 금지
```

상세한 아키텍처·규약·배포 절차·주의점은 **[AGENTS.md](AGENTS.md)** 를 참고하세요.
(Codex·Claude 등 AI 에이전트가 이 저장소에서 이어 작업할 때 반드시 먼저 읽어야 합니다.)

---

## 배포

```bash
# 웹(호스팅)만 배포 — www로 복사 후 배포
npm run deploy:hosting

# 규칙만 배포
npx firebase deploy --only firestore:rules,storage

# 전체
npm run deploy
```

> ⚠️ **파일을 고치면 `index.html`의 `?v=N` 숫자를 반드시 올려야** 사용자 브라우저가
> 새 파일을 받습니다. 자세한 이유는 AGENTS.md 참조.

---

## 라이선스 / 성격

회사 내부 운영 도구입니다. 외부 배포·상업적 사용을 전제로 하지 않습니다.
