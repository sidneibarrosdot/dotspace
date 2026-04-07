import React, { useState, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/AdminScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { auth, db } from './firebase';
import { logAudit } from './services/auditService';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';

export type View = 'portfolio' | 'login' | 'admin';
export type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('login'); // Start at login until auth is confirmed
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('portfolio-theme') as Theme;
    return savedTheme || 'dark';
  });

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light' || currentView === 'login') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    localStorage.setItem('portfolio-theme', theme);
  }, [theme, currentView]);

  const APP_VERSION = '1.0.6';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        const isAllowedEmail = currentUser?.email?.endsWith('@dotgroup.com.br');

        if (currentUser && isAllowedEmail) {
          setUser(currentUser);
          console.log(`User logged in: ${currentUser.email} (UID: ${currentUser.uid})`);
          // If logged in, the main view is the portfolio
          logAudit('LOGIN', `Usuário logou: ${currentUser.email}`, currentUser);
          setCurrentView('portfolio');
        } else {
          if (currentUser) {
            signOut(auth);
          }
          // If not logged in or unauthorized, stay on the login screen
          setUser(null);
          setCurrentView('login');
        }
        setAuthLoading(false);
      });
    return unsubscribe;
  }, []);

  const handleLoginSuccess = () => {
    // After successful login, go to the portfolio screen
    setCurrentView('portfolio');
  };

  const handleLogout = () => {
    const userEmail = user?.email;
    signOut(auth).then(() => {
      // After logout, return to the login screen
      setCurrentView('login');
    }).catch(error => console.error('Logout error:', error));
  };

  const navigateTo = (view: View) => {
    setCurrentView(view);
  };

  const renderView = () => {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-accent"></div>
        </div>
      );
    }
    
    // If not logged in, always show login screen
    if (!user) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    // If logged in, route between portfolio and admin
    switch (currentView) {
      case 'admin':
        return <AdminScreen user={user} onLogout={handleLogout} onNavigate={() => navigateTo('portfolio')} theme={theme} />;
      case 'portfolio':
      default:
        return <PortfolioScreen user={user} isLoggedIn={true} onNavigateToAdmin={() => navigateTo('admin')} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-zinc-900 text-zinc-800 dark:text-gray-100 font-sans transition-colors duration-300">
        <div className="flex-grow">
          {renderView()}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;