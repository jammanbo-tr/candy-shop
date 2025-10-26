import { initializeApp, getApps } from "../libs/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "../libs/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  deleteDoc
} from "../libs/firebase-firestore.js";

let firebaseState = {
  app: null,
  auth: null,
  db: null,
  initialized: false,
  pending: null
};

export async function ensureFirebase(config) {
  if (firebaseState.initialized) {
    return firebaseState;
  }

  if (!config) {
    throw new Error("Firebase 설정이 필요합니다. 옵션 페이지에서 설정을 저장하세요.");
  }

  if (!firebaseState.pending) {
    firebaseState.pending = (async () => {
      if (!getApps().length) {
        firebaseState.app = initializeApp(config);
      } else {
        firebaseState.app = getApps()[0];
      }
      firebaseState.auth = getAuth(firebaseState.app);
      firebaseState.db = getFirestore(firebaseState.app);
      firebaseState.initialized = true;
      return firebaseState;
    })();
  }

  return firebaseState.pending;
}

export function getFirebase() {
  if (!firebaseState.initialized || !firebaseState.app) {
    throw new Error("Firebase가 아직 초기화되지 않았습니다.");
  }
  return firebaseState;
}

export const firebaseAuth = {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
};

export const firestore = {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  deleteDoc
};
