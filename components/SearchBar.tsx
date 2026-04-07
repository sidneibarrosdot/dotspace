import React, { useState, useRef, useEffect } from 'react';
import type { PortfolioItem } from '../types';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder: string;
  suggestions?: PortfolioItem[];
  onSuggestionClick?: (item: PortfolioItem) => void;
}

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);


const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, setSearchTerm, placeholder, suggestions = [], onSuggestionClick }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (item: PortfolioItem) => {
    if (onSuggestionClick) {
      onSuggestionClick(item);
    }
    setShowSuggestions(false);
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
          className="w-full pl-12 pr-12 py-3 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-full text-zinc-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none transition-all duration-300 shadow-sm"
        />
        {searchTerm && (
          <button
            onClick={() => { setSearchTerm(''); setShowSuggestions(false); }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-80 overflow-y-auto">
            {suggestions.slice(0, 8).map((item) => (
              <button
                key={item.id}
                onClick={() => handleSuggestionClick(item)}
                className="w-full px-5 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-700/50 flex items-center gap-4 transition-colors border-b border-gray-100 dark:border-zinc-700/50 last:border-0"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-700 flex-shrink-0 overflow-hidden">
                  {item.Imagem_capa && !imageErrors[item.id] ? (
                    <img 
                      src={item.Imagem_capa} 
                      alt={item.Projeto} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={() => handleImageError(item.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent text-white font-black text-lg">
                      {item.Projeto.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">{item.Projeto}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.Cliente} • {item.Time}
                    {(item.DI || item.DM) && (
                      <span className="opacity-70 ml-1">
                        • {item.DI && `DI: ${item.DI}`}{item.DI && item.DM && ' | '}{item.DM && `DM: ${item.DM}`}
                      </span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
          {suggestions.length > 8 && (
            <div className="px-5 py-2 bg-gray-50 dark:bg-zinc-800/50 text-center border-t border-gray-100 dark:border-zinc-700/50">
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Pressione Enter para ver todos os {suggestions.length} resultados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
