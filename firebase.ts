import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = (import.meta as any).env || {};
const firebaseReady = Boolean(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_AUTH_DOMAIN &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_STORAGE_BUCKET &&
  env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
  env.VITE_FIREBASE_APP_ID &&
  env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
);

const resolvedFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'missing-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'missing-auth-domain',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'missing-project-id',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'missing-storage-bucket',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'missing-messaging-sender-id',
  appId: env.VITE_FIREBASE_APP_ID || 'missing-app-id',
  firestoreDatabaseId: env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'missing-firestore-database-id',
};

if (!firebaseReady) {
  console.warn('Firebase credentials are missing. The app will load in limited mode until .env is configured.');
}

// Initialize Firebase SDK
const app = initializeApp(resolvedFirebaseConfig);
export const db = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export { firebaseReady };
