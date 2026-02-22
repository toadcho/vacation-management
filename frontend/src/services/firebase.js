import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Provider 설정 (watch2.co.kr 도메인만 허용)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  hd: 'watch2.co.kr'
});

// 인증 서비스
export const authService = {
  // Google 로그인
  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // watch2.co.kr 도메인 확인
      if (!user.email.endsWith('@watch2.co.kr')) {
        await signOut(auth);
        throw new Error('watch2.co.kr 도메인 계정만 사용 가능합니다.');
      }

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // 인증 상태 변경 감지
  onAuthChange: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // 현재 사용자
  getCurrentUser: () => {
    return auth.currentUser;
  }
};