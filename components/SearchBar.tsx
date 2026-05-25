import React, { useState, useRef, useEffect } from 'react';
import type { PortfolioItem } from '../types';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder: string;
  suggestions?: PortfolioItem[];
  onSuggestionClick?: (item: PortfolioItem) => void;
  theme?: 'light' | 'dark';
}

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);


const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, setSearchTerm, placeholder, suggestions = [], onSuggestionClick, theme = 'dark' }) => {
  const isLightMode = theme === 'light';
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
          <SearchIcon className={`h-5 w-5 ${isLightMode ? 'text-zinc-500' : 'text-gray-400'}`} />
        </div>
        <input
          id="portfolio-search"
          name="portfolio-search"
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
          className={`w-full rounded-full border py-3 pl-12 pr-12 transition-all duration-300 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent ${
            isLightMode
              ? 'border-zinc-300 bg-zinc-50 text-zinc-900 placeholder:text-zinc-500 shadow-sm'
              : 'border-zinc-700 bg-zinc-800 text-white placeholder:text-gray-400 shadow-sm'
          }`}
        />
        {searchTerm && (
          <button
            onClick={() => { setSearchTerm(''); setShowSuggestions(false); }}
            className={`absolute inset-y-0 right-0 flex items-center pr-4 transition-colors ${
              isLightMode ? 'text-zinc-500 hover:text-zinc-700' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className={`absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
          isLightMode ? 'border-zinc-300 bg-white' : 'border-zinc-700 bg-zinc-800'
        }`}>
          <div className="max-h-80 overflow-y-auto">
            {suggestions.slice(0, 8).map((item) => (
              <button
                key={item.id}
                onClick={() => handleSuggestionClick(item)}
                className={`flex w-full items-center gap-4 border-b px-5 py-3 text-left transition-colors last:border-0 ${
                  isLightMode
                    ? 'border-zinc-200 hover:bg-zinc-100'
                    : 'border-zinc-700/50 hover:bg-zinc-700/50'
                }`}
              >
                <div className={`h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg ${
                  isLightMode ? 'bg-zinc-100' : 'bg-zinc-700'
                }`}>
                  {item.Imagem_capa && !imageErrors[item.id] ? (
                    <img 
                      src={item.Imagem_capa} 
                      alt={item.Projeto} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={() => handleImageError(item.id)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-accent text-lg font-black text-white">
                      {item.Projeto.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`truncate text-sm font-bold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{item.Projeto}</h4>
                  <p className={`truncate text-xs ${isLightMode ? 'text-zinc-500' : 'text-gray-400'}`}>
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
            <div className={`border-t px-5 py-2 text-center ${isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-700/50 bg-zinc-800/50'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-zinc-500' : 'text-gray-400'}`}>Pressione Enter para ver todos os {suggestions.length} resultados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
