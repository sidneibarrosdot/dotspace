import { db } from '../firebase';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppSettings, DevelopmentLockKey } from '../types';

const APP_SETTINGS_COLLECTION = 'config';
const APP_SETTINGS_DOC_ID = 'appSettings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  manualInteractionsEnabled: true,
  developmentLockedSections: [],
  environment: 'production',
};

const DEVELOPMENT_LOCK_KEYS: DevelopmentLockKey[] = ['processos', 'treinamentos', 'krs', 'forum'];

const normalizeAppSettings = (data: Partial<AppSettings> | undefined | null): AppSettings => {
  const legacyData = data as (Partial<AppSettings> & {
    developmentLockEnabled?: boolean;
    developmentLockTarget?: string;
  }) | undefined | null;
  const savedLocks = Array.isArray(data?.developmentLockedSections)
    ? data.developmentLockedSections.filter((key): key is DevelopmentLockKey => DEVELOPMENT_LOCK_KEYS.includes(key as DevelopmentLockKey))
    : [];
  const legacyTarget = legacyData?.developmentLockTarget?.trim().toLocaleLowerCase('pt-BR') || '';
  const migratedLegacyLock: DevelopmentLockKey[] = legacyData?.developmentLockEnabled
    ? legacyTarget.includes('process')
      ? ['processos']
      : legacyTarget.includes('trein')
        ? ['treinamentos']
        : legacyTarget.includes('okr') || legacyTarget.includes('kr')
          ? ['krs']
          : ['forum']
    : [];

  return {
    manualInteractionsEnabled: data?.manualInteractionsEnabled ?? DEFAULT_APP_SETTINGS.manualInteractionsEnabled,
    developmentLockedSections: savedLocks.length > 0 ? savedLocks : migratedLegacyLock,
    environment: DEFAULT_APP_SETTINGS.environment,
    updatedAt: data?.updatedAt,
    updatedBy: data?.updatedBy,
  };
};

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
