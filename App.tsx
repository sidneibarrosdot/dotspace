import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wrench } from 'lucide-react';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/AdminScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import ProcessosScreen from './screens/ProcessosScreen';
import TreinamentosScreen from './screens/TreinamentosScreen';
import AgentesScreen from './screens/AgentesScreen';
import KRsScreen from './screens/KRsScreen';
import ForumScreen from './screens/ForumScreen';
import OrganogramaScreen from './screens/OrganogramaScreen';
import ErrorBoundary from './components/ErrorBoundary';
import PostLoginLoader from './components/PostLoginLoader';
import Header from './components/Header';
import { auth, firebaseReady } from './firebase';
import { logAudit } from './services/auditService';
import { scrollToAppTop } from './utils/scrollHost';
import { DEFAULT_APP_SETTINGS, subscribeToAppSettings, updateAppSettings } from './services/appSettingsService';
import type { AppSettings, DevelopmentLockKey, HomeSectionKey } from './types';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

export type View = 'portfolio' | 'processos' | 'treinamentos' | 'agentes' | 'organograma' | 'krs' | 'forum' | 'login' | 'admin';
export type Theme = 'light' | 'dark';

const LOCAL_SESSION_KEY = 'dot-space.local-session';
const LOCAL_APP_SETTINGS_KEY = 'dot-space.app-settings';
const ADMIN_ACCESS_KEY = 'dot-space.admin-access-granted';
const THEME_PREFERENCE_KEY = 'dot-space.theme-preference-v2';
const ADMIN_ACCESS_PASSWORD = import.meta.env.VITE_ADMIN_ACCESS_PASSWORD?.trim() || 'dotspace-admin';
const GCP_LOGIN_ENABLED = false;
const DEVELOPMENT_VIEW_KEYS: Partial<Record<View, DevelopmentLockKey>> = {
  processos: 'processos',
  treinamentos: 'treinamentos',
  krs: 'krs',
  forum: 'forum',
};

const loadLocalAppSettings = (): AppSettings => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_APP_SETTINGS_KEY) || '{}') as Partial<AppSettings>;
    const validLocks = Array.isArray(saved.developmentLockedSections)
      ? saved.developmentLockedSections.filter((key): key is DevelopmentLockKey =>
          ['processos', 'treinamentos', 'krs', 'forum'].includes(key as DevelopmentLockKey),
        )
      : [];
    const hiddenHomeSections = Array.isArray(saved.hiddenHomeSections)
      ? saved.hiddenHomeSections.filter((key): key is HomeSectionKey =>
          ['hero', 'updates', 'featured', 'aiHub', 'calendar'].includes(key as HomeSectionKey),
        )
      : [];

    return {
      ...DEFAULT_APP_SETTINGS,
      ...saved,
      developmentLockedSections: Array.from(new Set([...validLocks, 'processos', 'forum'])),
      hiddenHomeSections: hiddenHomeSections.filter((section) => section !== 'calendar'),
      environment: 'production',
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
};

const createLocalUser = (email: string, displayName: string): User =>
  ({
    uid: `local-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'user'}`,
    email,
    displayName,
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    providerId: 'local',
  } as unknown as User);

const loadLocalSession = (): User | null => {
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; displayName?: string } | null;
    if (!parsed?.email || !parsed?.displayName) return null;
    return createLocalUser(parsed.email, parsed.displayName);
  } catch {
    return null;
  }
};

const loadAdminAccessGranted = (): boolean => {
  try {
    return window.localStorage.getItem(ADMIN_ACCESS_KEY) === 'true';
  } catch {
    return false;
  }
};

const AdminAccessGate: React.FC<{
  theme: Theme;
  onBack: () => void;
  onUnlock: (password: string) => void;
  error: string | null;
}> = ({ theme, onBack, onUnlock, error }) => {
  const [password, setPassword] = useState('');

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0d0e10]' : 'bg-gray-100'}`}>
      <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl dark:border-zinc-700/50 dark:bg-zinc-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Acesso restrito</p>
              <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">Painel Administrativo</h1>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700/40"
            >
              Voltar
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Informe a senha para liberar o acesso ao painel administrativo.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onUnlock(password);
            }}
          >
            <div>
              <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha de acesso
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Digite a senha"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-accent-dark"
            >
              Entrar no painel
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Dica: se você estiver configurando localmente, a senha padrão é mantida apenas para desenvolvimento.
          </p>
        </section>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(() => {
    try {
      const saved = window.localStorage.getItem('dot-space.current-view') as View | null;
      if (saved && ['portfolio', 'processos', 'treinamentos', 'krs', 'forum', 'admin'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'login';
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_PREFERENCE_KEY) as Theme;
    return savedTheme || 'dark';
  });
  const [appSettings, setAppSettings] = useState<AppSettings>(() =>
    firebaseReady ? DEFAULT_APP_SETTINGS : loadLocalAppSettings(),
  );
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const [postLoginExiting, setPostLoginExiting] = useState(false);
  const [adminAccessGranted, setAdminAccessGranted] = useState<boolean>(() => loadAdminAccessGranted());
  const [adminAccessError, setAdminAccessError] = useState<string | null>(null);
  const loginTransitionPlayedRef = useRef(false);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const startPostLoginTransition = (nextUser: User) => {
    loginTransitionPlayedRef.current = true;
    setPostLoginLoading(true);
    setPostLoginExiting(false);
    window.setTimeout(() => {
      setPostLoginExiting(true);
      window.setTimeout(() => {
        setUser(nextUser);
        let targetView: View = 'portfolio';
        try {
          const savedView = window.localStorage.getItem('dot-space.current-view') as View | null;
          if (savedView && savedView !== 'login') {
            targetView = savedView;
          }
        } catch {}
        setCurrentView(targetView);
        setPostLoginLoading(false);
        setPostLoginExiting(false);
      }, 700);
    }, 2200);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_PREFERENCE_KEY, theme);
  }, [theme, currentView]);

  useEffect(() => {
    try {
      if (currentView && currentView !== 'login') {
        window.localStorage.setItem('dot-space.current-view', currentView);
      }
    } catch {}
  }, [currentView]);

  useEffect(() => {
    if (!firebaseReady) {
      const savedUser = loadLocalSession();
      if (savedUser) {
        setUser(savedUser);
        try {
          const savedView = window.localStorage.getItem('dot-space.current-view') as View | null;
          if (savedView && savedView !== 'login') {
            setCurrentView(savedView);
          } else {
            setCurrentView('portfolio');
          }
        } catch {
          setCurrentView('portfolio');
        }
      } else {
        setUser(null);
        setCurrentView('login');
      }
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const isAllowedEmail = currentUser?.email?.endsWith('@dotgroup.com.br');

      if (currentUser && isAllowedEmail) {
        if (!loginTransitionPlayedRef.current) {
          startPostLoginTransition(currentUser);
          logAudit('LOGIN', `Usuário logou: ${currentUser.email}`, currentUser);
        } else {
          setUser(currentUser);
          try {
            const savedView = window.localStorage.getItem('dot-space.current-view') as View | null;
            if (savedView && savedView !== 'login') {
              setCurrentView(savedView);
            } else {
              setCurrentView('portfolio');
            }
          } catch {
            setCurrentView('portfolio');
          }
        }
      } else {
        if (currentUser) {
          signOut(auth);
        }
        setUser(null);
        setCurrentView('login');
      }

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseReady || !user) {
      setAppSettings(firebaseReady ? DEFAULT_APP_SETTINGS : loadLocalAppSettings());
      return;
    }

    const unsubscribe = subscribeToAppSettings((settings) => {
      setAppSettings(settings);
    });

    return unsubscribe;
  }, [user]);

  const handleUpdateAppSettings = async (patch: Partial<AppSettings>) => {
    if (!firebaseReady) {
      setAppSettings((prev) => {
        const nextSettings = {
          ...prev,
          ...patch,
          environment: 'production' as const,
        };
        window.localStorage.setItem(LOCAL_APP_SETTINGS_KEY, JSON.stringify(nextSettings));
        return nextSettings;
      });
      return;
    }

    const previousSettings = appSettings;
    setAppSettings((prev) => ({
      ...prev,
      ...patch,
      environment: 'production',
    }));

    try {
      await updateAppSettings({ ...patch, environment: 'production' }, user?.email || null);
    } catch (error) {
      setAppSettings(previousSettings);
      throw error;
    }
  };

  const handleToggleDevelopmentLock = async (section: DevelopmentLockKey, locked: boolean) => {
    const nextSections = locked
      ? Array.from(new Set([...appSettings.developmentLockedSections, section]))
      : appSettings.developmentLockedSections.filter((item) => item !== section);

    await handleUpdateAppSettings({ developmentLockedSections: nextSections });
  };

  const handleToggleHomeSection = async (section: HomeSectionKey, visible: boolean) => {
    const hiddenHomeSections = visible
      ? appSettings.hiddenHomeSections.filter((item) => item !== section)
      : Array.from(new Set([...appSettings.hiddenHomeSections, section]));

    await handleUpdateAppSettings({ hiddenHomeSections });
  };

  const handleLocalLogin = (email: string, displayName: string) => {
    const nextUser = createLocalUser(email, displayName);
    window.localStorage.setItem(
      LOCAL_SESSION_KEY,
      JSON.stringify({ email: nextUser.email, displayName: nextUser.displayName, uid: nextUser.uid })
    );
    startPostLoginTransition(nextUser);
  };

  const handleLogout = () => {
    if (!firebaseReady) {
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
      window.localStorage.removeItem(ADMIN_ACCESS_KEY);
      window.localStorage.removeItem('dot-space.current-view');
      loginTransitionPlayedRef.current = false;
      setUser(null);
      setAdminAccessGranted(false);
      setAdminAccessError(null);
      setCurrentView('login');
      return;
    }

    signOut(auth)
      .then(() => {
        loginTransitionPlayedRef.current = false;
        window.localStorage.removeItem(ADMIN_ACCESS_KEY);
        window.localStorage.removeItem('dot-space.current-view');
        setAdminAccessGranted(false);
        setAdminAccessError(null);
        setCurrentView('login');
      })
      .catch((error) => console.error('Logout error:', error));
  };

  const navigateTo = (view: View) => {
    scrollToAppTop();
    setCurrentView(view);
  };

  useEffect(() => {
    scrollToAppTop();
  }, [currentView]);

  const renderView = () => {
    if (authLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-accent" />
        </div>
      );
    }

    if (postLoginLoading) {
      return <PostLoginLoader theme={theme} exiting={postLoginExiting} />;
    }

    if (!user) {
      return (
        <LoginScreen
          onLocalLogin={handleLocalLogin}
          offlineMode={!firebaseReady}
          gcpLoginEnabled={GCP_LOGIN_ENABLED}
        />
      );
    }

    const commonProps = {
      onNavigateToPortfolio: () => navigateTo('portfolio' as View),
      onNavigateToProcessos: () => navigateTo('processos' as View),
      onNavigateToTreinamentos: () => navigateTo('treinamentos' as View),
      onNavigateToAgentes: () => navigateTo('agentes' as View),
      onNavigateToOrganograma: () => navigateTo('organograma' as View),
      onNavigateToKRs: () => navigateTo('krs' as View),
      onNavigateToForum: () => navigateTo('forum' as View),
      onNavigateToAdmin: () => navigateTo('admin' as View),
      onLogout: handleLogout,
      theme,
      toggleTheme,
      isLoggedIn: true,
      user,
    };

    if (!firebaseReady) {
      switch (currentView) {
        case 'admin':
          if (!adminAccessGranted) {
            return (
              <AdminAccessGate
                theme={theme}
                onBack={() => navigateTo('portfolio')}
                error={adminAccessError}
                onUnlock={(password) => {
                  if (password.trim() === ADMIN_ACCESS_PASSWORD) {
                    try {
                      window.localStorage.setItem(ADMIN_ACCESS_KEY, 'true');
                    } catch {
                      // ignore local storage errors in simulation mode
                    }
                    setAdminAccessGranted(true);
                    setAdminAccessError(null);
                    return;
                  }

                  setAdminAccessError('Senha inválida. Tente novamente.');
                }}
              />
            );
          }
          return (
            <AdminScreen
              user={user}
              onLogout={handleLogout}
              onNavigate={() => navigateTo('portfolio')}
              theme={theme}
              manualInteractionsEnabled={appSettings.manualInteractionsEnabled}
              onToggleManualInteractions={(enabled) => handleUpdateAppSettings({ manualInteractionsEnabled: enabled })}
              developmentLockedSections={appSettings.developmentLockedSections}
              onToggleDevelopmentLock={handleToggleDevelopmentLock}
              hiddenHomeSections={appSettings.hiddenHomeSections}
              onToggleHomeSection={handleToggleHomeSection}
              offlineMode
            />
          );
        case 'processos':
          return <ProcessosScreen {...commonProps} offlineMode />;
        case 'treinamentos':
          return <TreinamentosScreen {...commonProps} offlineMode />;
        case 'agentes':
          return <AgentesScreen {...commonProps} offlineMode />;
        case 'organograma':
          return <OrganogramaScreen {...commonProps} offlineMode />;
        case 'krs':
          return <KRsScreen {...commonProps} offlineMode />;
        case 'forum':
          return (
            <ForumScreen
              {...commonProps}
              offlineMode
            />
          );
        case 'portfolio':
        default:
          return <PortfolioScreen {...commonProps} manualInteractionsEnabled={false} hiddenHomeSections={appSettings.hiddenHomeSections} offlineMode />;
      }
    }

    switch (currentView) {
      case 'admin':
        if (!adminAccessGranted) {
          return (
            <AdminAccessGate
              theme={theme}
              onBack={() => navigateTo('portfolio')}
              error={adminAccessError}
              onUnlock={(password) => {
                if (password.trim() === ADMIN_ACCESS_PASSWORD) {
                  try {
                    window.localStorage.setItem(ADMIN_ACCESS_KEY, 'true');
                  } catch {
                    // ignore local storage errors in simulation mode
                  }
                  setAdminAccessGranted(true);
                  setAdminAccessError(null);
                  return;
                }

                setAdminAccessError('Senha inválida. Tente novamente.');
              }}
            />
          );
        }
        return (
          <AdminScreen
            user={user}
            onLogout={handleLogout}
            onNavigate={() => navigateTo('portfolio')}
            theme={theme}
            manualInteractionsEnabled={appSettings.manualInteractionsEnabled}
            onToggleManualInteractions={(enabled) => handleUpdateAppSettings({ manualInteractionsEnabled: enabled })}
            developmentLockedSections={appSettings.developmentLockedSections}
            onToggleDevelopmentLock={handleToggleDevelopmentLock}
            hiddenHomeSections={appSettings.hiddenHomeSections}
            onToggleHomeSection={handleToggleHomeSection}
          />
        );
      case 'processos':
        return <ProcessosScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'treinamentos':
        return <TreinamentosScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'agentes':
        return <AgentesScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'organograma':
        return <OrganogramaScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'krs':
        return <KRsScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'forum':
        return (
          <ForumScreen
            {...commonProps}
            offlineMode={!firebaseReady}
          />
        );
      case 'portfolio':
      default:
        return <PortfolioScreen {...commonProps} manualInteractionsEnabled={appSettings.manualInteractionsEnabled} hiddenHomeSections={appSettings.hiddenHomeSections} />;
    }
  };

  const currentDevelopmentSection = DEVELOPMENT_VIEW_KEYS[currentView];
  const showDevelopmentNotice = Boolean(
    currentDevelopmentSection
      && appSettings.developmentLockedSections.includes(currentDevelopmentSection),
  );

  return (
    <ErrorBoundary>
      <>
        <div className={`ui-motion flex min-h-screen flex-col font-sans transition-colors duration-300 ${
          theme === 'dark' ? 'bg-[#0d0e10] text-gray-100' : 'bg-gray-100 text-zinc-800'
        } ${
          showDevelopmentNotice ? 'development-lock-active' : ''
        }`}>
          {user && !authLoading && !postLoginLoading && currentView !== 'admin' && (
            <Header
              theme={theme}
              toggleTheme={toggleTheme}
              isLoggedIn
              sessionActive
              canManageAdmin
              offlineMode={!firebaseReady}
              onNavigateToAdmin={() => navigateTo('admin')}
              onLogout={handleLogout}
            />
          )}
          <div className="flex-grow">{renderView()}</div>
        </div>
        {showDevelopmentNotice && typeof document !== 'undefined' && createPortal(
          <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="pointer-events-auto w-full max-w-sm rounded-[30px] border border-zinc-200 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#88C125]/10 text-[#88C125] dark:bg-[#88C125]/20">
                <Wrench className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">Em Desenvolvimento</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Esta seção está sendo preparada e estará disponível em breve.
              </p>
            </div>
          </div>,
          document.body,
        )}
      </>
    </ErrorBoundary>
  );
};

export default App;
