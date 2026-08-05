import { db } from '../firebase';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppSettings, DevelopmentLockKey, HomeSectionKey } from '../types';

const APP_SETTINGS_COLLECTION = 'config';
const APP_SETTINGS_DOC_ID = 'appSettings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  manualInteractionsEnabled: true,
  developmentLockedSections: ['forum'],
  hiddenHomeSections: [],
  environment: 'production',
};

const DEVELOPMENT_LOCK_KEYS: DevelopmentLockKey[] = ['processos', 'treinamentos', 'krs', 'forum'];
const HOME_SECTION_KEYS: HomeSectionKey[] = ['hero', 'updates', 'featured', 'aiHub', 'calendar'];

const normalizeAppSettings = (data: Partial<AppSettings> | undefined | null): AppSettings => {
  const legacyData = data as (Partial<AppSettings> & {
    developmentLockEnabled?: boolean;
    developmentLockTarget?: string;
  }) | undefined | null;
  const savedLocks = Array.isArray(data?.developmentLockedSections)
    ? data.developmentLockedSections.filter((key): key is DevelopmentLockKey => DEVELOPMENT_LOCK_KEYS.includes(key as DevelopmentLockKey))
    : DEFAULT_APP_SETTINGS.developmentLockedSections;
  const hiddenHomeSections = Array.isArray(data?.hiddenHomeSections)
    ? data.hiddenHomeSections.filter((key): key is HomeSectionKey => HOME_SECTION_KEYS.includes(key as HomeSectionKey))
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
    developmentLockedSections: Array.from(new Set([...savedLocks, ...migratedLegacyLock, 'forum'])),
    hiddenHomeSections,
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
