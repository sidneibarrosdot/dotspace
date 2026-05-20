import React, { useEffect, useRef, useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/AdminScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import ProcessosScreen from './screens/ProcessosScreen';
import TreinamentosScreen from './screens/TreinamentosScreen';
import KRsScreen from './screens/KRsScreen';
import ForumScreen from './screens/ForumScreen';
import ErrorBoundary from './components/ErrorBoundary';
import PostLoginLoader from './components/PostLoginLoader';
import { auth, firebaseReady } from './firebase';
import { logAudit } from './services/auditService';
import { DEFAULT_APP_SETTINGS, subscribeToAppSettings, updateAppSettings } from './services/appSettingsService';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

export type View = 'portfolio' | 'processos' | 'treinamentos' | 'krs' | 'forum' | 'login' | 'admin';
export type Theme = 'light' | 'dark';

const LOCAL_SESSION_KEY = 'dot-space.local-session';
const GCP_LOGIN_ENABLED = false;

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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('login');
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('portfolio-theme') as Theme;
    return savedTheme || 'dark';
  });
  const [appSettings, setAppSettings] = useState(DEFAULT_APP_SETTINGS);
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const [postLoginExiting, setPostLoginExiting] = useState(false);
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
        setCurrentView('portfolio');
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
    localStorage.setItem('portfolio-theme', theme);
  }, [theme, currentView]);

  useEffect(() => {
    if (!firebaseReady) {
      const savedUser = loadLocalSession();
      if (savedUser) {
        setUser(savedUser);
        setCurrentView('portfolio');
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
          setCurrentView('portfolio');
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
      setAppSettings(DEFAULT_APP_SETTINGS);
      return;
    }

    const unsubscribe = subscribeToAppSettings((settings) => {
      setAppSettings(settings);
    });

    return unsubscribe;
  }, [user]);

  const handleUpdateAppSettings = async (enabled: boolean) => {
    if (!firebaseReady) {
      setAppSettings((prev) => ({
        ...prev,
        manualInteractionsEnabled: enabled,
        environment: 'production',
      }));
      return;
    }

    const previousSettings = appSettings;
    setAppSettings((prev) => ({
      ...prev,
      manualInteractionsEnabled: enabled,
      environment: 'production',
    }));

    try {
      await updateAppSettings(
        {
          manualInteractionsEnabled: enabled,
          environment: 'production',
        },
        user?.email || null
      );
    } catch (error) {
      setAppSettings(previousSettings);
      throw error;
    }
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
      loginTransitionPlayedRef.current = false;
      setUser(null);
      setCurrentView('login');
      return;
    }

    signOut(auth)
      .then(() => {
        loginTransitionPlayedRef.current = false;
        setCurrentView('login');
      })
      .catch((error) => console.error('Logout error:', error));
  };

  const navigateTo = (view: View) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentView(view);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          return (
            <AdminScreen
              user={user}
              onLogout={handleLogout}
              onNavigate={() => navigateTo('portfolio')}
              theme={theme}
              manualInteractionsEnabled={false}
              onToggleManualInteractions={handleUpdateAppSettings}
              offlineMode
            />
          );
        case 'processos':
          return <ProcessosScreen {...commonProps} offlineMode />;
        case 'treinamentos':
          return <TreinamentosScreen {...commonProps} offlineMode />;
        case 'krs':
          return <KRsScreen {...commonProps} offlineMode />;
        case 'forum':
          return <ForumScreen {...commonProps} offlineMode />;
        case 'portfolio':
        default:
          return <PortfolioScreen {...commonProps} manualInteractionsEnabled={false} offlineMode />;
      }
    }

    switch (currentView) {
      case 'admin':
        return (
          <AdminScreen
            user={user}
            onLogout={handleLogout}
            onNavigate={() => navigateTo('portfolio')}
            theme={theme}
            manualInteractionsEnabled={appSettings.manualInteractionsEnabled}
            onToggleManualInteractions={handleUpdateAppSettings}
          />
        );
      case 'processos':
        return <ProcessosScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'treinamentos':
        return <TreinamentosScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'krs':
        return <KRsScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'forum':
        return <ForumScreen {...commonProps} offlineMode={!firebaseReady} />;
      case 'portfolio':
      default:
        return <PortfolioScreen {...commonProps} manualInteractionsEnabled={appSettings.manualInteractionsEnabled} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="ui-motion flex min-h-screen flex-col bg-gray-100 font-sans text-zinc-800 transition-colors duration-300 dark:bg-zinc-900 dark:text-gray-100">
        <div className="flex-grow">{renderView()}</div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
