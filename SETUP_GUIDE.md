# BuilderOffice - Firebase + Android 앱 설정 가이드

## ⚠️ 지금 당장 해야 할 작업 순서

---

## STEP 1: Node.js 설치

1. https://nodejs.org 접속
2. **LTS 버전** 다운로드 (예: 20.x.x LTS)
3. 설치 완료 후 PowerShell에서 확인:
   ```
   node --version   → v20.x.x
   npm --version    → 10.x.x
   ```

---

## STEP 2: npm 패키지 설치 (Firebase + Capacitor)

PowerShell에서 이 프로젝트 폴더로 이동 후 실행:

```powershell
cd "E:\999. 김영윤\클로드코드\BuilderMaster\builderoffice-main\builderoffice-main"
npm install
```

설치되는 패키지:
- `firebase@10` — Firebase SDK (Auth + Firestore + Storage)
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` — Android 앱 래퍼

---

## STEP 3: Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속 (Google 계정 필요)
2. **"프로젝트 추가"** 클릭
3. 프로젝트 이름: `builderoffice-app` (또는 원하는 이름)
4. Google Analytics: 선택 사항
5. 프로젝트 생성 완료

### 3-1. Authentication 설정
- Firebase Console → Authentication → 시작하기
- **이메일/비밀번호** 로그인 제공업체 → 사용 설정 → 저장

### 3-2. Firestore 데이터베이스 설정
- Firebase Console → Firestore Database → 데이터베이스 만들기
- **프로덕션 모드**로 시작 → 위치: `asia-northeast3 (서울)`
- 완료 후 아래 보안 규칙 적용:
  - "규칙" 탭 클릭 → `firestore.rules` 파일 내용 붙여넣기 → 게시

### 3-3. Storage 설정
- Firebase Console → Storage → 시작하기
- 기본 설정으로 진행 → 완료
- "규칙" 탭 → `storage.rules` 파일 내용 붙여넣기 → 게시

### 3-4. 웹 앱 추가 및 config 복사
- Firebase Console → 프로젝트 설정(⚙️) → 일반
- "앱 추가" → 웹(`</>`) 클릭
- 앱 닉네임: `BuilderOffice Web`
- Firebase SDK 코드에서 `firebaseConfig` 값 복사

---

## STEP 4: firebase-config.js 수정

`js/firebase-config.js` 파일을 열어 아래 부분을 실제 값으로 교체:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",              // ← Firebase에서 복사한 값
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

---

## STEP 5: Capacitor Android 동기화 ✅ (이미 완료됨)

이 단계는 이미 완료되었습니다. `android/` 폴더가 생성되어 있습니다.

앱 파일을 수정한 후 다시 동기화할 때:
```powershell
cd "E:\999. 김영윤\클로드코드\BuilderMaster\builderoffice-main\builderoffice-main"
npm run build
```

---

## STEP 6: Android Studio 설치 및 APK 빌드

1. https://developer.android.com/studio 에서 Android Studio 다운로드 및 설치
2. Android Studio 최초 실행 시 SDK 설치 (자동)
3. 프로젝트 열기:
   ```powershell
   npx cap open android
   ```
   → Android Studio가 `android/` 폴더를 자동으로 열어줌

4. Android Studio에서:
   - **Build → Generate Signed Bundle / APK**
   - APK 선택 → 키스토어 생성 → 빌드
   - `android/app/release/app-release.apk` 생성됨

---

## STEP 7: Google Play Store 등록

1. https://play.google.com/console 접속
2. 개발자 계정 생성 (최초 등록비 $25 일회성)
3. 새 앱 만들기 → APK/AAB 업로드
4. 스토어 등록 정보 작성 (앱 이름, 설명, 스크린샷)
5. 검토 제출 → 보통 1~3일 내 승인

---

## 앱 기본 정보

| 항목 | 값 |
|------|-----|
| 앱 ID | `com.builderoffice.app` |
| 앱 이름 | `BuilderOffice` |
| 버전 | `1.0.0` |

변경하려면 `capacitor.config.json` 수정.

---

## 일상적인 개발 명령어

```powershell
# 웹앱 수정 후 Android에 반영
npx cap sync android

# Android Studio로 앱 실행
npx cap open android

# Firebase Hosting에 웹 배포
npm run deploy:hosting

# 로컬 개발 서버 실행
npm start
```

---

## 문제 해결

**Q: `npx cap add android` 실패 시**
→ `npm install` 먼저 실행 후 재시도

**Q: Firebase 로그인이 안 될 때**
→ `js/firebase-config.js`의 config 값 확인, Firebase Console에서 Authentication 활성화 여부 확인

**Q: Firebase 없이 테스트하고 싶을 때**
→ 앱은 Firebase 없이도 localStorage 모드로 동작합니다. `js/firebase-config.js`의 config가 placeholder 상태면 자동으로 로컬 모드로 전환됩니다.
