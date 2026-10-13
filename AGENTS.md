# AGENTS.md — BuilderOffice 작업 가이드

이 파일은 **AI 코딩 에이전트(Codex, Claude Code 등)가 이 저장소에서 작업할 때
반드시 먼저 읽어야 하는 지침**입니다. 사람이 읽어도 됩니다.
여기 적힌 규약과 함정은 실제로 데이터 유실·먹통을 일으킨 적이 있는 것들입니다.

---

## 0. 이 프로젝트의 성격

- **프레임워크 없는 순수 HTML/CSS/JS.** 빌드 단계 없음. `index.html`이 `<script>`를
  순서대로 로드하면 각 파일이 전역 객체(`App`, `Store`, `Sync`, `Costs` …)를 정의한다.
- **백엔드 서버 없음.** Firebase(Auth·Firestore·Storage)가 전부.
- 각 화면 모듈은 `var Xxx = { render: function(){...}, ... }` 패턴. `render()`가
  **HTML 문자열을 반환**하면 `App.renderPage()`가 `innerHTML`에 넣는다. (동기 방식)

---

## 1. ⭐ 동기화 엔진 — 가장 먼저 이해할 것

`js/sync.js`가 이 앱의 심장이다. 잘못 건드리면 **입력한 데이터가 사라진다.**

### 구조
```
UI 모듈 → Store._get(key)/_set(key,data) → Sync.read/write
  읽기: 메모리 캐시에서 즉시 반환 (동기)
  쓰기: 메모리 + localStorage 즉시 → Firestore에 문서 단위 diff 전송 (비동기)
  수신: onSnapshot으로 타 사용자 변경을 캐시에 반영 → 화면 자동 갱신
```

### 왜 이렇게 만들었나
UI 모듈 20여 개가 전부 `Store`를 **동기 함수**로 호출한다. Firestore는 async라
모듈을 전부 async로 바꾸지 않으면 연결이 불가능했다. 그래서 `Store._get/_set`
**두 지점만** Sync로 우회시켜, 모듈 코드를 한 줄도 안 고치고 클라우드화했다.

### 절대 깨면 안 되는 불변식
1. **`Store`의 mutator는 반드시 "`_get`으로 받은 배열/객체를 그 자리에서 변형한 뒤
   같은 참조를 `_set`에 넘기는" 패턴을 따른다.** Sync는 `_shadow`(직전 상태 깊은 복사본)와
   비교해 diff를 만든다. 이 패턴을 벗어나면 변경이 감지되지 않는다.
2. **새 컬렉션을 추가하면 `Store.KEYS`와 `Sync.ARRAY_KEYS`(또는 `MAP_KEYS`)
   양쪽에 등록**해야 동기화된다. 한쪽만 하면 저장은 되는데 다른 기기에 안 간다.
3. **스냅샷이 미전송 문서를 덮어쓰지 않도록 보호하는 로직**(`_pendingOps`, `_inflight`)을
   건드리지 말 것. 이게 없으면 "저장 직후 서버의 옛 상태가 도착 → 입력 내용 소실"이
   발생한다. (실제로 비용 5건이 0건이 된 적 있음 → 수정 완료)
4. **로그인은 회사별로 캐시를 격리한다.** localStorage 캐시 키는 회사별로 나뉘지
   않으므로, `Sync.bootstrap`이 `builderoffice_cache_company`로 회사 전환을 감지해
   이전 회사 캐시를 비운다. 이게 없으면 공용 PC에서 앞사람 회사 데이터가 섞인다.

---

## 2. 🚨 배포할 때마다 지켜야 할 3단계

웹 루트는 `www/`다 (`firebase.json`의 `"public": "www"`). **www는 루트 js/css/index.html의
복사본**이고 git에 추적되지 않는다. 그래서 배포 전 항상:

```bash
# ① 캐시 무효화: index.html의 ?v=N 을 전부 +1 (예: v=15 → v=16)
#    파일명에 해시가 없어 이걸 안 올리면 사용자 브라우저가 옛 파일을 계속 쓴다.
#    → 실제로 이것 때문에 "고쳤는데 반영이 안 돼 먹통"으로 보인 적 있음.

# ② 루트 → www 복사
npm run sync          # 또는 수동: cp -r js css index.html www/

# ③ 배포 (Windows PowerShell은 .ps1 차단 때문에 cmd /c 경유)
cmd /c "npx firebase deploy --only hosting --project buildermaster-b9e9c"
```

> **배포(firebase deploy)와 백업(git push)은 별개다.** 둘 다 챙길 것.
> 호스팅 루트를 `.`(루트 전체)로 바꾸면 `firestore.rules`·`package.json`·로컬 경로가
> 담긴 문서까지 공개돼 버린다. 반드시 `www/`로 둘 것.

---

## 3. 보안 규칙 (firestore.rules) — 수정 시 필수 검증

저장소가 **공개(Public)**다. 규칙 구조가 노출돼 있으니 빈틈이 생기면 바로 악용된다.
규칙을 고치면 **반드시 공격 시나리오로 검증**하고 배포할 것.

- Firestore 규칙은 여러 `match`가 겹치면 **OR로 평가**된다. 와일드카드 `match`가
  `members`·`personnelPrivate` 같은 제한을 통째로 무력화할 수 있으니 명시적으로 제외한다.
- 역할 부여는 **화이트리스트**(`grantableRole`: admin/siteManager/worker/partner)로만.
  `owner`를 빼지 않으면 관리자가 스스로를 대표로 승격 → 아무도 못 건드리는 계정이 된다.
- 최초 대표 등록은 회사 문서의 `ownerId == request.auth.uid` 대조가 필요하다.
  없으면 아무나 남의 회사에 자신을 대표로 추가할 수 있다.
- `inviteCodes`는 `allow list: if false` 유지 (전체 코드 훑기 차단).
- 개인정보(주민번호·계좌·일당)는 `companies/{id}/personnelPrivate`에 분리 보관,
  owner/admin과 본인만 열람.

---

## 4. 도메인 규칙 (잘못 고치면 돈 계산이 틀어짐)

### 일용직 노무비 — `Store.calcPayroll` / `calcDailyIncomeTax` 한 곳에서만
- 소득세는 **반드시 일 단위**로 계산: `(일급 − 15만원) × 6% × (1 − 55%)`,
  1일 산출세액 1,000원 미만은 소액부징수(0원). 월 총액에 한 번 적용하면 틀린다.
- `(1 - 0.55)`는 부동소수점상 `0.44999…`라 10원 절사가 어긋난다 → 소수점 2자리 정규화 후 절사.
- 국민연금·건강보험은 월 8일(또는 60시간) 이상일 때만 공제. 고용보험은 무관하게 적용.
- 요율은 `Store.INSURANCE_RATES`에만 존재(`basisYear` 포함). 화면 문구도 이 값을 읽는다.
  **요율은 매년 바뀐다** — 연초에 갱신.

### 비용 — 두 축 모델
- 승인 축(`approvalStatus`: 대기/승인/반려) × 지급 축(`paymentStatus`: 미지급/홀딩/지급완료).
  "결재는 났는데 자금이 안 되는" 건이 **홀딩**. 한 값으로 합치지 말 것.

### 기성 — 청구/입금 분리
- `billAmount`(청구)와 `paidAmount`(입금)는 별개. 상태는 `Store.billingStatus()`가 금액으로 자동 판정.
- 회차는 `Store.nextBillingRound(contractId)`로 자동 채번.

### 대표용 지표
- `Store.getSiteFinance(siteName)` / `getAllSiteFinance()` — 계약·기성·입금·미수·지출·손익.
  현장 미지정 비용은 본사 비용으로 집계.

---

## 5. 사진 업로드 — `js/photos.js`
- 폰 사진은 4~8MB. 올리기 전 **긴 변 1600px + JPEG 80%로 자동 압축**(약 83% 감소). 필수다.
- EXIF 회전 보정(`createImageBitmap(file,{imageOrientation:'from-image'})`) — 빼면 사진이 눕는다.
- 저장된 사진 표시는 **`<img src>`로** 할 것. 버킷에 CORS 미설정이라 `fetch()`는 실패한다(표시는 정상).
- 새 화면에 붙일 때: `Photos.render({id,folder})` → 저장 전 `Photos.isBusy(id)` 확인 필수 → `Photos.getUploaded(id)`.

---

## 6. 코드 규약
- **ES5 스타일** (`var`, `function`). 화살표함수·`const`/`let`도 쓰이지만 기존 파일 톤을 따를 것.
- `firebase-config.js`만 `type="module"`. 나머지는 전역 스크립트.
- 사용자 입력은 `Store.escapeHtml()`로 이스케이프 후 `innerHTML`에 넣는다(XSS 방지).
- 금액은 `Store.formatCurrency()`, 날짜는 `YYYY-MM-DD` 문자열.
- 새 전역 모듈을 추가하면 `index.html`의 `<script>` 목록과 `App.pages`(라우팅)에 등록.

---

## 7. 테스트 방법 (중요)
- 브라우저 콘솔에서 로그인·데이터 생성 후 검증하는 식으로 테스트해 왔다.
- **테스트 계정은 `@botest.com` 도메인으로 만들고, 끝나면 반드시 삭제한다.**
  (운영 Firebase에 쓰레기 데이터가 쌓이면 안 됨)
- 파일 수정 후에는 `node --check js/파일.js`로 문법부터 확인.

---

## 8. 운영 환경 정보
| 항목 | 값 |
|---|---|
| Firebase 프로젝트 ID | `buildermaster-b9e9c` |
| 라이브 URL | https://buildermaster-b9e9c.web.app |
| Firestore 위치 | asia-northeast3 (서울) |
| Storage 위치 | US-WEST1 (Blaze 요금제, 5GB 무료) |
| GitHub | https://github.com/solser123/builderoffice (Public) |

> `firebase login`은 사람이 1회 해야 한다(에이전트가 대신 로그인 불가).
> 로그인 후에는 에이전트가 `firebase deploy`를 실행할 수 있다.

---

## 9. 앞으로 할 일 (로드맵)
현장에서 실사용 → 피드백 반영이 최우선. 그다음:
- 대표용 "저녁 1페이지 요약" (오늘 한 일 / 쓴 돈 / 내일 위험·승인 필요)
- 사진 AI 분석(작업내용 자동 추출) — Storage 사용 중이므로 가능
- 안드로이드 APK 빌드 (Capacitor, `npm run android`)

여러 에이전트가 함께 작업할 때는 **이 파일을 기준 문서로 삼고**, 새로 알게 된
함정·규약은 여기에 추가할 것.
