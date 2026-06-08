import React, { useState, useEffect, useRef } from 'react';

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const normalizeKey = (value: string) => String(value || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");

interface TagFilterProps {
  tags: string[]; // e.g., ['Time', 'Cliente']
  options: Record<string, string[]>; // e.g., { 'Time': ['Phoenix', 'Orion'], 'Cliente': [...] }
  optionCounts?: Record<string, Record<string, number>>;
  activeFilters: Record<string, string[]>; // e.g., { 'Time': ['Phoenix'], 'Cliente': [] }
  onFilterChange: (category: string, value: string | null) => void;
  onClearAll: () => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ tags, options, optionCounts, activeFilters, onFilterChange, onClearAll }) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownsRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && dropdownsRef.current[openDropdown] && !dropdownsRef.current[openDropdown]?.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);
  
  const handleOptionClick = (category: string, value: string | null) => {
    onFilterChange(category, value);
    // Don't close dropdown if selecting a specific value to allow multiple selections
    if (value === null) {
      setOpenDropdown(null);
    }
  }

  const hasActiveFilters = Object.values(activeFilters).some(v => Array.isArray(v) && v.length > 0);

  const getOptionCount = (tag: string, value: string) => {
    const counts = optionCounts?.[tag] || {};
    return counts[value] ?? counts[normalizeKey(value)] ?? 0;
  };

  return (
    <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible justify-start sm:justify-center items-center gap-2 sm:gap-3 mb-6 sm:mb-12 pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
      <span className="text-gray-600 dark:text-gray-400 font-medium mr-1 sm:mr-2 shrink-0">Filtrar por:</span>
      
      <button
        onClick={onClearAll}
        className={`shrink-0 px-3 py-1.5 text-xs sm:text-sm font-semibold border rounded-full transition-all duration-200 ease-in-out ${
          !hasActiveFilters
            ? 'bg-accent border-accent text-white dark:text-zinc-900 shadow-md shadow-accent/20'
            : 'bg-white dark:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-600 hover:border-gray-400 dark:hover:border-zinc-500'
        }`}
      >
        Todos
      </button>
      
      {tags.map((tag) => {
        const activeValues = activeFilters[tag] || [];
        const hasOptions = options[tag] && options[tag].length > 0;

        if (!hasOptions) return null; // Don't render a filter if there are no options for it

        const buttonText = activeValues.length === 0 
          ? tag 
          : activeValues.length === 1 
            ? `${tag}: ${activeValues[0]}${getOptionCount(tag, activeValues[0]) ? ` (${getOptionCount(tag, activeValues[0])})` : ''}` 
            : `${tag} (${activeValues.length})`;

        return (
          <div key={tag} className="relative" ref={el => { dropdownsRef.current[tag] = el; }}>
            <button
              onClick={() => setOpenDropdown(openDropdown === tag ? null : tag)}
            className={`shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold border rounded-full transition-all duration-200 ease-in-out ${
                activeValues.length > 0
                  ? 'bg-accent border-accent text-white dark:text-zinc-900 shadow-md shadow-accent/20'
                  : 'bg-white dark:bg-zinc-700 border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-600 hover:border-gray-400 dark:hover:border-zinc-500'
              }`}
            >
              <span className="truncate max-w-[200px]">{buttonText}</span>
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${openDropdown === tag ? 'rotate-180' : ''}`} />
            </button>

            {openDropdown === tag && (
              <>
                {/* Mobile Backdrop */}
                <div 
                  className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] sm:hidden animate-fade-in" 
                  onClick={() => setOpenDropdown(null)}
                />

                <div className="fixed bottom-0 left-0 right-0 z-[70] max-h-[85vh] rounded-t-2xl shadow-2xl bg-white dark:bg-zinc-800 ring-1 ring-black dark:ring-zinc-700 ring-opacity-5 focus:outline-none animate-fade-in sm:absolute sm:bottom-auto sm:left-auto sm:right-auto sm:mt-2 sm:w-80 sm:max-h-none sm:rounded-md sm:shadow-xl sm:origin-top-right" style={{ animationDuration: '150ms' }}>
                  <div className="py-4 sm:py-1 max-h-[calc(85vh-2rem)] sm:max-h-72 overflow-y-auto">
                    {/* Mobile Handle */}
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-600 rounded-full mx-auto mb-4 sm:hidden" />

                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); handleOptionClick(tag, null); }}
                      className={`block px-6 sm:px-4 py-3 sm:py-2 text-base sm:text-sm font-medium ${activeValues.length > 0 ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
                    >
                      {activeValues.length > 0 ? 'Limpar Filtro' : 'Todos'}
                    </a>
                    {(options[tag] || []).map((option) => {
                      const isSelected = activeValues.includes(option);
                      return (
                        <a
                          key={option}
                          href="#"
                          onClick={(e) => { e.preventDefault(); handleOptionClick(tag, option); }}
                          className={`flex items-center justify-between px-6 sm:px-4 py-3 sm:py-2 text-base sm:text-sm ${isSelected ? 'font-bold text-accent bg-accent/5' : 'text-gray-700 dark:text-gray-300'} hover:bg-gray-100 dark:hover:bg-zinc-700`}
                        >
                          <span className="whitespace-normal mr-2">{option}{getOptionCount(tag, option) ? <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">({getOptionCount(tag, option)})</span> : null}</span>
                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 sm:w-4 sm:h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {hasActiveFilters && (
        <button
          onClick={onClearAll}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 animate-fade-in"
        >
          <XIcon className="w-4 h-4" />
          Limpar Filtros
        </button>
      )}
    </div>
  );
};

export default TagFilter;
