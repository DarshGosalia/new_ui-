import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBk9gfwvvwZaduZSlPctOOXeuwyWcnXh3Q',
  authDomain: 'fir-authentication-fa72e.firebaseapp.com',
  projectId: 'fir-authentication-fa72e',
  storageBucket: 'fir-authentication-fa72e.firebasestorage.app',
  messagingSenderId: '290140721786',
  appId: '1:290140721786:web:f8bb19b0dc408574dee1c3',
  measurementId: 'G-9Y5VKVK44Y',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
