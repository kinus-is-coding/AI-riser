import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore/lite";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Khởi tạo app an toàn
const getFirebaseApp = () => {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
};

// Lazy initialization cho Auth, DB, Storage (chỉ khởi tạo khi thực sự gọi đến ở Client)
export const auth = (typeof window !== "undefined" ? getAuth(getFirebaseApp()) : {}) as Auth;
export const db = (typeof window !== "undefined" ? getFirestore(getFirebaseApp()) : {}) as Firestore;
export const storage = (typeof window !== "undefined" ? getStorage(getFirebaseApp()) : {}) as FirebaseStorage;

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const authInstance = getAuth(getFirebaseApp());
    const result = await signInWithPopup(authInstance, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return null;
  }
};

export const logout = () => {
  if (typeof window !== "undefined") {
    const authInstance = getAuth(getFirebaseApp());
    return signOut(authInstance);
  }
};