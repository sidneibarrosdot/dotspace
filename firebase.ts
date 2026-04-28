import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
// Se for "default", converte para undefined para usar o banco padrão (default)
const finalDbId = (dbId === 'default' || !dbId) ? undefined : dbId;
export const db = getFirestore(app, finalDbId);
export const auth = getAuth(app);
