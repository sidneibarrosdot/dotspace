import { db } from '../firebase';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AppSettings, DevelopmentLockKey, HomeSectionKey, SystemSectionKey } from '../types';

const APP_SETTINGS_COLLECTION = 'config';
const APP_SETTINGS_DOC_ID = 'appSettings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  manualInteractionsEnabled: true,
  developmentLockedSections: ['processos', 'forum'],
  hiddenHomeSections: [],
  disabledSystemSections: ['krs', 'organograma'],
  environment: 'production',
};

const DEVELOPMENT_LOCK_KEYS: DevelopmentLockKey[] = ['processos', 'treinamentos', 'agentes', 'krs', 'organograma', 'forum'];
const HOME_SECTION_KEYS: HomeSectionKey[] = ['hero', 'updates', 'featured', 'aiHub', 'calendar'];
const SYSTEM_SECTION_KEYS: SystemSectionKey[] = ['processos', 'treinamentos', 'agentes', 'krs', 'organograma', 'forum'];

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
  const disabledSystemSections = Array.isArray(data?.disabledSystemSections)
    ? data.disabledSystemSections.filter((key): key is SystemSectionKey => SYSTEM_SECTION_KEYS.includes(key as SystemSectionKey))
    : DEFAULT_APP_SETTINGS.disabledSystemSections;
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
    developmentLockedSections: Array.from(new Set([...savedLocks, ...migratedLegacyLock, 'processos', 'forum'])),
    hiddenHomeSections: hiddenHomeSections.filter((section) => section !== 'calendar'),
    disabledSystemSections,
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
