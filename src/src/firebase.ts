import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuration supplied directly by the user, with environment overrides if present.
const env = (import.meta as any).env || {};

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDa9gqTOSVCQlIiTOI4QquHnVXQXBWtrFk",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "wecare-hospitals-e6a6c.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "wecare-hospitals-e6a6c",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "wecare-hospitals-e6a6c.firebasestorage.app",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "394669000692",
    appId: env.VITE_FIREBASE_APP_ID || "1:394669000692:web:fc3621aff0cccd305d5ba1"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
