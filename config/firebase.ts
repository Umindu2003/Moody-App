import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIcsdnErEBMw4ufozdHFomNiWLaLzeeOY",
  authDomain: "moody-5044f.firebaseapp.com",
  projectId: "moody-5044f",
  storageBucket: "moody-5044f.firebasestorage.app",
  messagingSenderId: "28166919300",
  appId: "1:28166919300:web:2a4f7de71af3a2d6b29ed1",
  measurementId: "G-P22YF1MG9T"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);