/* =======================================
   BuilderOffice - Firebase 설정

   Firebase Console에서 발급받은 config 값을 아래에 입력하세요.
   https://console.firebase.google.com → 프로젝트 설정 → 웹앱 추가

   참고: 웹 apiKey는 비밀값이 아닙니다. 클라이언트에 반드시 노출되며,
   실제 접근 통제는 firestore.rules / storage.rules가 담당합니다.
   ======================================= */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    writeBatch,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

/* =============================================
   ⚠️  아래 값을 Firebase Console에서 복사하세요
   Firebase Console → 프로젝트 설정 → 일반 → 웹앱 → firebaseConfig
   ============================================= */
const firebaseConfig = {
    apiKey: "AIzaSyCtXnaM-wr25xIK9VloPXrD2UY-qBP4Qs4",
    authDomain: "buildermaster-b9e9c.firebaseapp.com",
    projectId: "buildermaster-b9e9c",
    storageBucket: "buildermaster-b9e9c.firebasestorage.app",
    messagingSenderId: "443607637111",
    appId: "1:443607637111:web:d323b3e19cda5466c3ba72",
    measurementId: "G-X51RX6K82P"
};

// 설정값이 아직 placeholder면 Firebase를 초기화하지 않는다.
// window.FB를 만들지 않으므로 앱은 자동으로 로컬 모드로 동작한다.
const isPlaceholder = Object.keys(firebaseConfig).some(function (k) {
    return String(firebaseConfig[k]).indexOf('YOUR_') === 0;
});

if (isPlaceholder) {
    console.warn(
        '[BuilderOffice] Firebase 설정이 아직 입력되지 않았습니다 → 로컬 모드로 동작합니다.\n' +
        'js/firebase-config.js의 firebaseConfig를 실제 값으로 교체하세요. (SETUP_GUIDE.md STEP 3~4)'
    );
    window.FIREBASE_READY = false;
} else {
    const firebaseApp = initializeApp(firebaseConfig);
    const auth = getAuth(firebaseApp);

    // 오프라인 지속 캐시 + 다중 탭 동기화.
    // 현장은 통신이 끊기는 일이 잦으므로 IndexedDB 캐시를 반드시 켠다.
    let db;
    try {
        db = initializeFirestore(firebaseApp, {
            localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
    } catch (e) {
        console.warn('[BuilderOffice] 오프라인 캐시 활성화 실패 — 메모리 캐시로 진행합니다.', e);
        db = initializeFirestore(firebaseApp, {});
    }

    const storage = getStorage(firebaseApp);

    window.FirebaseApp = firebaseApp;
    window.FirebaseAuth = auth;
    window.FirebaseDB = db;
    window.FirebaseStorage = storage;

    window.FB = {
        // Auth
        signInWithEmailAndPassword: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
        createUserWithEmailAndPassword: (email, pw) => createUserWithEmailAndPassword(auth, email, pw),
        signOut: () => signOut(auth),
        onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
        updateProfile: (user, profile) => updateProfile(user, profile),
        getCurrentUser: () => auth.currentUser,

        // Firestore helpers
        collection: (path) => collection(db, path),
        // 두 가지 호출 형태를 모두 지원한다:
        //   FB.doc('컬렉션/경로', id)         → doc(db, '경로', id)   (Sync가 사용)
        //   FB.doc(collectionRef, id)         → doc(collectionRef, id) (db.js가 사용)
        // 참조를 넘겼는데 앞에 db를 또 붙이면 "s.indexOf is not a function"으로 터진다.
        doc: (ref, ...segments) =>
            (typeof ref === 'string' ? doc(db, ref, ...segments) : doc(ref, ...segments)),
        getDoc,
        getDocs,
        addDoc,
        updateDoc,
        deleteDoc,
        setDoc,
        writeBatch: () => writeBatch(db),
        query,
        where,
        orderBy,
        onSnapshot,
        serverTimestamp,
        Timestamp,

        // Storage
        storageRef: (path) => ref(storage, path),
        uploadBytes,
        getDownloadURL,
        deleteObject
    };

    window.FIREBASE_READY = true;
    console.log('[BuilderOffice] Firebase 초기화 완료 (오프라인 캐시 활성)');
}

// 모듈 스크립트는 DOMContentLoaded 이전에 실행되지만,
// 앱 초기화가 이미 끝난 뒤에 로드되는 경우를 대비해 신호를 보낸다.
window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { ready: !!window.FIREBASE_READY } }));
