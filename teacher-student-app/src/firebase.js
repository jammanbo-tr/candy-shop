// Firebase App (the core Firebase SDK) is always required and must be listed first
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyCQzb-xECyWXRt5pEe1ktpzzZ6E3q8QzEg",
    authDomain: "candy-shop-8394b.firebaseapp.com",
    projectId: "candy-shop-8394b",
    storageBucket: "candy-shop-8394b.appspot.com",
    messagingSenderId: "37833066657",
    appId: "1:37833066657:web:75e8f44ff8817b9e1788e0"
  };
  

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { db, firebaseConfig, auth, storage, googleProvider }; 