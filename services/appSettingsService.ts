import { db } from '../firebase';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppSettings } from '../types';

const APP_SETTINGS_COLLECTION = 'config';
const APP_SETTINGS_DOC_ID = 'appSettings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  manualInteractionsEnabled: true,
  environment: 'production',
};

const normalizeAppSettings = (data: Partial<AppSettings> | undefined | null): AppSettings => ({
  manualInteractionsEnabled: data?.manualInteractionsEnabled ?? DEFAULT_APP_SETTINGS.manualInteractionsEnabled,
  environment: DEFAULT_APP_SETTINGS.environment,
  updatedAt: data?.updatedAt,
  updatedBy: data?.updatedBy,
});

export const subscribeToAppSettings = (callback: (settings: AppSettings) => void) => {
  const settingsRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);

  return onSnapshot(settingsRef, (snapshot) => {
    callback(normalizeAppSettings(snapshot.exists() ? (snapshot.data() as Partial<AppSettings>) : null));
  });
};

export const updateAppSettings = async (
  patch: Partial<AppSettings>,
  updatedBy?: string | null
) => {
  const settingsRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
  const payload: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  };

  if (updatedBy) {
    payload.updatedBy = updatedBy;
  }

  await setDoc(settingsRef, payload, { merge: true });
};
