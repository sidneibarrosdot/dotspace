import React from 'react';
import ThemeToggle from './ThemeToggle';
import DotLogo from './DotLogo';
import { Settings2 } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isLoggedIn?: boolean;
  sessionActive?: boolean;
  canManageAdmin?: boolean;
  offlineMode?: boolean;
  onNavigateToAdmin?: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, isLoggedIn, sessionActive, canManageAdmin, offlineMode, onNavigateToAdmin, onLogout }) => {
  const showAdminButton = true;
  const adminEnabled = Boolean(canManageAdmin ?? isLoggedIn);
  const showLogoutButton = sessionActive ?? isLoggedIn;
  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.replaceState(null, '', '#');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-700/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-2 sm:min-h-20">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <a href="#" aria-label="dot.space Home" className="inline-flex shrink-0 py-2" onClick={handleLogoClick}>
              <DotLogo
                theme={theme}
                variant="login"
                className="shrink-0 [--brand-planet:clamp(46px,7vw,68px)]"
              />
            </a>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {showAdminButton && (
              <button 
                onClick={adminEnabled ? onNavigateToAdmin : undefined} 
                disabled={!adminEnabled}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gray-200 text-zinc-900 transition-colors hover:bg-gray-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-11"
                title={adminEnabled ? 'Painel Administrativo' : 'Painel Administrativo disponível após login'}
                aria-label={adminEnabled ? 'Painel Administrativo' : 'Painel Administrativo disponível após login'}
              >
                <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            {showLogoutButton && onLogout && (
              <button 
                onClick={onLogout} 
                className="text-xs sm:text-sm font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 sm:px-4 py-1.5 sm:py-2 min-h-9 sm:min-h-11 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                Sair
              </button>
            )}
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
