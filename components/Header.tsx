import React from 'react';
import ThemeToggle from './ThemeToggle';
import DotLogo from './DotLogo';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isLoggedIn?: boolean;
  onNavigateToAdmin?: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, isLoggedIn, onNavigateToAdmin, onLogout }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-700/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <a href="#" aria-label="Portfolio Home">
                <DotLogo className="h-8" theme={theme}/>
            </a>
            <span className="text-2xl font-bold hidden sm:block">
              <span className="text-zinc-900 dark:text-white">Banco de</span>
              <span className="text-accent-contrast dark:text-accent"> PMV's</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onNavigateToAdmin} 
              className="text-sm font-bold bg-gray-200 dark:bg-zinc-700 px-4 py-2 min-h-11 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
            >
              {isLoggedIn ? 'Administrar' : 'Acesso Admin'}
            </button>
            {isLoggedIn && onLogout && (
              <button 
                onClick={onLogout} 
                className="text-sm font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 min-h-11 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
