
import React, { useState, useMemo, useEffect } from 'react';
import Header from '../components/Header';
import PortfolioCard from '../components/PortfolioCard';
import SearchBar from '../components/SearchBar';
import PortfolioModal from '../components/PortfolioModal';
import TagFilter from '../components/TagFilter';
import { Plus } from 'lucide-react';
import type { PortfolioItem } from '../types';
import DotLogo from '../components/DotLogo';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { logAudit } from '../services/auditService';
import { toggleFavorite, subscribeToFavorites } from '../services/favoriteService';
import { toggleLike, subscribeToLikes } from '../services/likeService';
import { User } from 'firebase/auth';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { Favorite, Like } from '../types';

type Theme = 'light' | 'dark';

const ITEMS_TO_LOAD = 20;

interface PortfolioScreenProps {
    user: User | null;
    isLoggedIn: boolean;
    onNavigateToAdmin: () => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const BLANK_PROJECT: PortfolioItem = {
    id: '',
    Projeto: '',
    Cliente: '',
    Time: '',
    Data: new Date().toISOString().split('T')[0],
    Assunto_geral: '',
    Assunto_especifico: '',
    Publico_alvo: '',
    Metodologias: '',
    Mídias: '',
    Outros_recursos: '',
    DI: '',
    DM: '',
    Link_PMV: '',
    Imagem_capa: '',
    tags: [],
};

const PortfolioScreen: React.FC<PortfolioScreenProps> = ({ user, isLoggedIn, onNavigateToAdmin, onLogout, theme, toggleTheme }) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isCreatingNewItem, setIsCreatingNewItem] = useState(false);
  const [randomPhrase, setRandomPhrase] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_TO_LOAD);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const phrases = [
    'Explore as melhores soluções em EdTech do DOT Digital Group. 🚀',
    'Inovação e tecnologia aplicadas à educação corporativa e acadêmica. 🎓',
    'Transformando o aprendizado através de experiências digitais memoráveis. ✨',
    'Conheça o portfólio de PMVs que estão revolucionando o mercado educacional. 💡',
    'Design, tecnologia e educação: a tríade que move as soluções da DOT. 🛠️',
    'Navegue por um universo de propostas visuais e metodológicas para seu projeto educacional. 🎨',
    'Soluções educacionais sob medida para potencializar o conhecimento. 📈',
    'Onde a criatividade encontra a metodologia para criar o futuro da educação. 🌟'
  ];

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * phrases.length);
    setRandomPhrase(phrases[randomIndex]);
  }, []);

  useEffect(() => {
    if (!searchTerm) return;
    const timeoutId = setTimeout(() => {
        // Search logging removed per user request
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!isLoggedIn) {
        setLoading(false);
        return;
    }

    setLoading(true);
    const projectsCollection = collection(db, 'projects');
    const q = query(projectsCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const projectList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as PortfolioItem));
        
        // Sort in memory to be more resilient to missing date fields
        const sortedList = [...projectList].sort((a, b) => {
            const dateA = a.Data || '';
            const dateB = b.Data || '';
            return dateB.localeCompare(dateA);
        });

        console.log(`Fetched ${sortedList.length} projects from Firestore`);
        setPortfolioItems(sortedList);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching portfolio items: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setFavorites([]);
      return;
    }

    const unsubscribe = subscribeToFavorites(user.uid, (favs) => {
      setFavorites(favs);
    });

    return () => unsubscribe();
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setLikes([]);
      return;
    }

    const unsubscribe = subscribeToLikes(user.uid, (likesList) => {
      setLikes(likesList);
    });

    return () => unsubscribe();
  }, [isLoggedIn, user]);

  const handleCardClick = async (item: PortfolioItem) => {
    setSelectedItem(item);
    setIsCreatingNewItem(false);
    
    // Increment views
    if (item.id) {
      try {
        const docRef = doc(db, 'projects', item.id);
        await updateDoc(docRef, {
          views: increment(1)
        });
      } catch (error) {
        console.error("Error updating views:", error);
      }
    }
  };

  const handleLike = async (item: PortfolioItem) => {
    if (!isLoggedIn || !user || !item.id) return;
    try {
      await toggleLike(user.uid, item.id);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleToggleFavorite = async (item: PortfolioItem) => {
    if (!isLoggedIn || !user || !item.id) return;
    try {
      await toggleFavorite(user.uid, item.id);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedItem(BLANK_PROJECT);
    setIsCreatingNewItem(true);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsCreatingNewItem(false);
  };
  
  const handleUpdateProject = (updatedProject: PortfolioItem) => {
    setPortfolioItems(prevItems => 
        prevItems.map(item => item.id === updatedProject.id ? updatedProject : item)
    );
  };
  
  const handleProjectAdded = (newProject: PortfolioItem) => {
    // Add the new project to the start of the list to maintain sort order
    setPortfolioItems(prevItems => [newProject, ...prevItems]);
  };

  const handleDeleteProject = (projectId: string) => {
      setPortfolioItems(prevItems => prevItems.filter(item => item.id !== projectId));
  };


  const filterTags = [
    'Data', 'Projeto', 'Time', 'Cliente', 'DI', 'DM', 'Assunto geral',
    'Assunto específico', 'Público-alvo', 'Metodologias', 'Mídias', 'Outros recursos'
  ];

  const tagToFieldMap: { [key: string]: keyof PortfolioItem } = {
    'Time': 'Time',
    'Cliente': 'Cliente',
    'Data': 'Data',
    'Projeto': 'Projeto',
    'DI': 'DI',
    'DM': 'DM',
    'Assunto geral': 'Assunto_geral',
    'Assunto específico': 'Assunto_especifico',
    'Público-alvo': 'Publico_alvo',
    'Metodologias': 'Metodologias',
    'Mídias': 'Mídias',
    'Outros recursos': 'Outros_recursos',
  };

  // FIX: Added explicit string types and improved value processing to ensure 'values' is correctly inferred as string[]
  // and uniqueValues elements are recognized as strings for methods like .split().
  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};
    filterTags.forEach(tag => {
        const field = tagToFieldMap[tag];
        if (field) {
            const values: string[] = portfolioItems.flatMap((item: PortfolioItem): string[] => {
                const value = item[field];
                if (!value) {
                    return [];
                }
                if (Array.isArray(value)) {
                    // Ensure all elements in the array are converted to strings
                    return value.map(v => String(v)).filter(Boolean);
                }
                // Convert single values to string and wrap in an array
                const strVal = String(value);
                return strVal ? [strVal] : [];
            });
            
            const uniqueValues: string[] = [...new Set(values)].sort();

            if (tag === 'Data' && uniqueValues.length > 0) {
                options[tag] = uniqueValues.map((dateStr: string) => {
                    const parts = dateStr.split('-');
                    if (parts.length === 3) {
                        const [year, month, day] = parts;
                        return `${day}/${month}/${year}`;
                    }
                    return dateStr;
                });
            } else if (uniqueValues.length > 0) {
              options[tag] = uniqueValues;
            }
        }
    });
    return options;
  }, [portfolioItems]);

  const handleFilterChange = (category: string, value: string | null) => {
    setActiveFilters(prev => {
      const currentValues = prev[category] || [];
      if (value === null) {
        const { [category]: _, ...rest } = prev;
        return rest;
      }
      
      if (currentValues.includes(value)) {
        const newValues = currentValues.filter(v => v !== value);
        if (newValues.length === 0) {
          const { [category]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [category]: newValues };
      } else {
        return { ...prev, [category]: [...currentValues, value] };
      }
    });
  };

  const handleClearAllFilters = () => {
      setActiveFilters({});
      setSearchTerm('');
  };

  // FIX: Added robust type guards and string conversions to prevent runtime errors during filtering.
  // This ensures that operations like .split() or .includes() are performed on strings,
  // and handles potentially non-string array elements from Firestore.
  const filteredItems = useMemo(() => {
    let items = portfolioItems;

    // 0. Filter by favorites if requested
    if (showFavoritesOnly) {
      const favoriteProjectIds = favorites.map(f => f.projectId);
      items = items.filter(item => favoriteProjectIds.includes(item.id));
    }

    // 1. Apply active dropdown filters
    const activeFilterKeys = Object.keys(activeFilters).filter(key => activeFilters[key] && activeFilters[key].length > 0);
    if (activeFilterKeys.length > 0) {
        items = items.filter(item => {
            return activeFilterKeys.every(filterKey => {
                const filterValues = activeFilters[filterKey];
                const fieldKey = tagToFieldMap[filterKey];
                if (!fieldKey || !filterValues || filterValues.length === 0) return true;

                const itemValue = item[fieldKey];

                // Check if any of the filter values match the item's value (OR logic within category)
                return filterValues.some(filterValue => {
                    if (fieldKey === 'Data' && typeof itemValue === 'string') {
                        const parts = itemValue.split('-');
                        if (parts.length === 3) {
                            const [year, month, day] = parts;
                            const formattedDate = `${day}/${month}/${year}`;
                            return formattedDate === filterValue;
                        }
                    }
                    
                    if (Array.isArray(itemValue)) {
                        return itemValue.map(String).includes(filterValue);
                    }
                    return String(itemValue) === filterValue;
                });
            });
        });
    }

    // 2. Apply global search term on the already filtered list
    const term = searchTerm.toLowerCase();
    if (!term) {
        return items;
    }

    return items.filter(
      (item) =>
        (item.Projeto || '').toLowerCase().includes(term) ||
        (item.Cliente || '').toLowerCase().includes(term) ||
        (item.Time || '').toLowerCase().includes(term) ||
        (item.DI || '').toLowerCase().includes(term) ||
        (item.DM || '').toLowerCase().includes(term) ||
        (item.Assunto_geral || '').toLowerCase().includes(term) ||
        (item.Assunto_especifico || '').toLowerCase().includes(term) ||
        (item.Publico_alvo || '').toLowerCase().includes(term) ||
        (item.tags && Array.isArray(item.tags) && item.tags.some(tag => String(tag || '').toLowerCase().includes(term))) ||
        (item.Metodologias || '').toLowerCase().includes(term) ||
        (item.Mídias || '').toLowerCase().includes(term) ||
        (item.Outros_recursos || '').toLowerCase().includes(term)
    );
  }, [searchTerm, portfolioItems, activeFilters, showFavoritesOnly, favorites]);

  useEffect(() => {
    const handleScroll = () => {
      if (selectedItem) return; // Don't load more items when modal is open

      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
      
      if (nearBottom && visibleCount < filteredItems.length) {
        setVisibleCount(prevCount => prevCount + ITEMS_TO_LOAD);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredItems.length, selectedItem]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setVisibleCount(ITEMS_TO_LOAD);
  }, [searchTerm, activeFilters]);

  return (
    <div className={`bg-gray-100 dark:bg-zinc-900 min-h-screen transition-colors duration-300`}>
      <Header theme={theme} toggleTheme={toggleTheme} isLoggedIn={isLoggedIn} onNavigateToAdmin={onNavigateToAdmin} onLogout={onLogout} />
      
      <div className="text-center py-12 sm:py-20 bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-4xl text-zinc-800 dark:text-gray-100 font-semibold lg:w-3/5 mx-auto leading-tight">
                {randomPhrase}
            </h2>
          </div>
      </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 mb-8 sm:mb-12">
          <div className="flex-grow w-full">
            <SearchBar 
              searchTerm={searchTerm} 
              setSearchTerm={setSearchTerm} 
              placeholder="Buscar por projeto, cliente, tecnologia..." 
              suggestions={searchTerm ? filteredItems : []}
              onSuggestionClick={handleCardClick}
            />
          </div>
          
          {isLoggedIn && (
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-md whitespace-nowrap h-[52px] w-full sm:w-auto ${
                showFavoritesOnly 
                  ? 'bg-accent text-white dark:text-zinc-900' 
                  : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700'
              }`}
            >
              {showFavoritesOnly ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              {showFavoritesOnly ? 'Ver Todos' : 'Meus Favoritos'}
            </button>
          )}
        </div>
        
        <TagFilter 
            tags={filterTags}
            options={filterOptions}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAllFilters}
        />

        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-80 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
                ))}
            </div>
        ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                {filteredItems.slice(0, visibleCount).map((item) => (
                    <PortfolioCard 
                      key={item.id} 
                      item={item} 
                      onClick={handleCardClick} 
                      onLike={handleLike} 
                      onToggleFavorite={handleToggleFavorite}
                      isFavorited={favorites.some(f => f.projectId === item.id)}
                      isLiked={likes.some(l => l.projectId === item.id)}
                      theme={theme} 
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-zinc-800 dark:text-gray-200">Nenhum projeto encontrado</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Tente ajustar seus filtros ou o termo de busca.</p>
                <button
                    onClick={handleClearAllFilters}
                    className="mt-6 px-6 py-2 bg-accent hover:bg-accent-dark text-white dark:text-zinc-900 rounded-full font-bold transition-all duration-300 shadow-md hover:shadow-lg"
                >
                    Limpar Todos os Filtros
                </button>
            </div>
        )}
      </main>

      {isLoggedIn && (
        <div className="fixed bottom-8 right-8 group z-50">
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-zinc-800 dark:bg-zinc-700 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
            Adicionar manualmente uma PMV
          </div>
          <button
              onClick={handleOpenCreateModal}
              className="bg-accent hover:bg-accent-dark text-white dark:text-zinc-900 rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 p-0"
              aria-label="Adicionar novo projeto"
          >
              <Plus className="w-8 h-8 pointer-events-none" />
          </button>
        </div>
      )}

      {selectedItem && (
        <PortfolioModal
          item={selectedItem}
          onClose={handleCloseModal}
          theme={theme}
          isCreating={isCreatingNewItem}
          isLoggedIn={isLoggedIn}
          user={user}
          onUpdate={handleUpdateProject}
          onAdd={handleProjectAdded}
          onDelete={handleDeleteProject}
          onToggleFavorite={handleToggleFavorite}
          isFavorited={favorites.some(f => f.projectId === selectedItem.id)}
          onLike={handleLike}
          isLiked={likes.some(l => l.projectId === selectedItem.id)}
        />
      )}
    </div>
  );
};

export default PortfolioScreen;
