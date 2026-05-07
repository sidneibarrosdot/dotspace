
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from '../components/Header';
import PortfolioCard from '../components/PortfolioCard';
import SearchBar from '../components/SearchBar';
import PortfolioModal from '../components/PortfolioModal';
import TagFilter from '../components/TagFilter';
import { Check, Copy, Plus, Share2 } from 'lucide-react';
import type { PortfolioItem } from '../types';
import DotLogo from '../components/DotLogo';
import { db } from '../firebase';
import { addDoc, collection, query, onSnapshot, doc, updateDoc, increment, getDoc, Timestamp } from 'firebase/firestore';
import { logAudit } from '../services/auditService';
import { toggleFavorite, subscribeToFavorites } from '../services/favoriteService';
import { toggleLike, subscribeToLikes } from '../services/likeService';
import { User } from 'firebase/auth';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { Favorite, Like } from '../types';

type Theme = 'light' | 'dark';

const ITEMS_TO_LOAD = 20;
const MAX_SHARED_PROJECTS = 1000;
const SHARE_FILTERS_PARAM = 'filters';
const SHARE_PROJECT_PARAM = 'projeto';
const SHARE_PROJECTS_PARAM = 'projetos';
const SHARE_ID_PARAM = 'share';
const LEGACY_SHARE_PROJECTS_PARAM = 'projects';
const SHARE_SEARCH_PARAM = 'q';

const FILTER_PARAM_BY_CATEGORY: Record<string, string> = {
  'Data': 'data',
  'Projeto': 'projeto-filtro',
  'Time': 'time',
  'Cliente': 'cliente',
  'DI': 'di',
  'DM': 'dm',
  'Assunto geral': 'assunto-geral',
  'Assunto específico': 'assunto-especifico',
  'Público-alvo': 'publico-alvo',
  'Metodologias': 'metodologias',
  'Mídias': 'midias',
  'Outros recursos': 'outros-recursos'
};

const CATEGORY_BY_FILTER_PARAM = Object.entries(FILTER_PARAM_BY_CATEGORY).reduce<Record<string, string>>((acc, [category, param]) => {
  acc[param] = category;
  return acc;
}, {});

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getProjectSlug = (item: PortfolioItem) => {
  return slugify(`${item.Projeto || 'projeto'}-${item.Cliente || ''}`);
};

const decodeShareFilters = (value: string | null) => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Record<string, string[]>>((acc, [key, values]) => {
      if (Array.isArray(values)) {
        const cleanedValues = values.map(String).filter(Boolean);
        if (cleanedValues.length > 0) acc[key] = cleanedValues;
      } else if (typeof values === 'string') {
        const cleanedValues = values.split('|').map(String).filter(Boolean);
        if (cleanedValues.length > 0) acc[key] = cleanedValues;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const parseFilterDate = (value: string) => {
  const normalized = value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const months = [
    'janeiro',
    'fevereiro',
    'marco',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
  ];

  const isoMatch = normalized.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3] || 1)
    };
  }

  const monthYearMatch = normalized.match(/^([a-z]+)\s*\/\s*(\d{4})$/);
  if (monthYearMatch) {
    const monthIndex = months.findIndex(month => month.startsWith(monthYearMatch[1]));
    return {
      year: Number(monthYearMatch[2]),
      month: monthIndex >= 0 ? monthIndex + 1 : 0,
      day: 1
    };
  }

  const numericMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$|^(\d{1,2})\/(\d{4})$/);
  if (numericMatch) {
    return {
      year: Number(numericMatch[3] || numericMatch[5]),
      month: Number(numericMatch[2] || numericMatch[4]),
      day: Number(numericMatch[1] || 1)
    };
  }

  const yearMatch = normalized.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return {
      year: Number(yearMatch[1]),
      month: 0,
      day: 1
    };
  }

  return null;
};

const formatFilterDate = (value: string) => {
  const parsed = parseFilterDate(value);
  if (!parsed) return value.trim();

  const months = [
    'janeiro',
    'fevereiro',
    'marco',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
  ];

  if (parsed.month >= 1 && parsed.month <= 12) {
    return `${months[parsed.month - 1]}/${parsed.year}`;
  }

  return String(parsed.year);
};

const encodeFilterValueForUrl = (value: string) => slugify(value);

const decodeFilterValueFromUrl = (value: string) => {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const matchesFilterValue = (itemValue: unknown, filterValue: string, fieldKey?: keyof PortfolioItem) => {
  if (fieldKey === 'Data') {
    return formatFilterDate(String(itemValue || '')) === filterValue;
  }

  if (Array.isArray(itemValue)) {
    return itemValue.some(value => slugify(String(value)) === slugify(filterValue));
  }

  return slugify(String(itemValue || '')) === slugify(filterValue);
};

const compareFilterDatesDesc = (a: string, b: string) => {
  const parsedA = parseFilterDate(a);
  const parsedB = parseFilterDate(b);

  if (parsedA && parsedB) {
    return (
      parsedB.year - parsedA.year ||
      parsedB.month - parsedA.month ||
      parsedB.day - parsedA.day
    );
  }

  if (parsedA) return -1;
  if (parsedB) return 1;
  return b.localeCompare(a, 'pt-BR');
};

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
  const [sharedProjectIds, setSharedProjectIds] = useState<string[]>([]);
  const [projectSlugToOpen, setProjectSlugToOpen] = useState('');
  const [shareIdToLoad, setShareIdToLoad] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedSearch = params.get(SHARE_SEARCH_PARAM);
    const sharedFilters = decodeShareFilters(params.get(SHARE_FILTERS_PARAM));
    const shareId = params.get(SHARE_ID_PARAM) || '';
    const projectSlug = params.get(SHARE_PROJECT_PARAM) || '';
    const projectIds = (params.get(SHARE_PROJECTS_PARAM) || params.get(LEGACY_SHARE_PROJECTS_PARAM) || '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    const readableFilters = Object.entries(CATEGORY_BY_FILTER_PARAM).reduce<Record<string, string[]>>((acc, [param, category]) => {
      const values = params.getAll(param).flatMap(value => value.split(','));
      const cleanedValues = values
        .map(value => value.trim())
        .filter(Boolean)
        .map(value => category === 'Data' ? value.replace(/-/g, '/') : decodeFilterValueFromUrl(value));

      if (cleanedValues.length > 0) {
        acc[category] = cleanedValues;
      }
      return acc;
    }, {});

    if (sharedSearch) setSearchTerm(sharedSearch);
    if (Object.keys(sharedFilters).length > 0 || Object.keys(readableFilters).length > 0) {
      setActiveFilters({ ...sharedFilters, ...readableFilters });
    }
    if (shareId) {
      setShareIdToLoad(shareId);
    } else if (projectSlug) {
      setProjectSlugToOpen(projectSlug);
      setSharedProjectIds([projectSlug]);
    } else if (projectIds.length > 0) {
      setSharedProjectIds(projectIds);
    }
  }, []);

  useEffect(() => {
    if (!searchTerm) return;
    const timeoutId = setTimeout(() => {
        // Search logging removed per user request
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!projectSlugToOpen || portfolioItems.length === 0 || selectedItem) return;

    const matchingProject = portfolioItems.find(item => getProjectSlug(item) === projectSlugToOpen || item.id === projectSlugToOpen);
    if (matchingProject) {
      setSelectedItem(matchingProject);
      setIsCreatingNewItem(false);
    }
  }, [portfolioItems, projectSlugToOpen, selectedItem]);

  useEffect(() => {
    if (!shareIdToLoad || !isLoggedIn) return;

    let cancelled = false;

    const loadShare = async () => {
      try {
        const shareSnapshot = await getDoc(doc(db, 'shares', shareIdToLoad));
        if (!shareSnapshot.exists() || cancelled) return;

        const data = shareSnapshot.data() as { type?: string; projectIds?: string[]; projectRefs?: string[]; filters?: Record<string, string[]>; searchTerm?: string };

        if (data.type === 'filters') {
          setActiveFilters(data.filters || {});
          setSearchTerm(data.searchTerm || '');
          setSharedProjectIds([]);
        } else {
          const projectRefs = Array.isArray(data.projectIds) && data.projectIds.length > 0
            ? data.projectIds
            : Array.isArray(data.projectRefs)
              ? data.projectRefs
              : [];

          setSharedProjectIds(projectRefs.map(String).filter(Boolean));
        }

        setShowFavoritesOnly(false);
      } catch (error) {
        console.error('Error loading shared selection:', error);
        setShareFeedback('Não foi possível abrir o compartilhamento');
        window.setTimeout(() => setShareFeedback(''), 3000);
      }
    };

    loadShare();

    return () => {
      cancelled = true;
    };
  }, [shareIdToLoad, isLoggedIn]);

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
    setProjectSlugToOpen('');
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
            
            if (tag === 'Data' && values.length > 0) {
                const uniqueDateValues = [...new Set(values.map(formatFilterDate).filter(Boolean))];
                options[tag] = uniqueDateValues.sort(compareFilterDatesDesc);
            } else {
              const uniqueValues: string[] = [...new Set(values.map(value => value.trim()).filter(Boolean))].sort((a, b) => b.localeCompare(a, 'pt-BR'));
              if (uniqueValues.length > 0) {
                options[tag] = uniqueValues;
              }
            }
        }
    });
    return options;
  }, [portfolioItems]);

  const handleFilterChange = (category: string, value: string | null) => {
    setSharedProjectIds([]);
    setProjectSlugToOpen('');
    setShareIdToLoad('');
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
      setSharedProjectIds([]);
      setProjectSlugToOpen('');
      setShareIdToLoad('');
      window.history.replaceState({}, '', window.location.pathname);
  };

  const handleToggleFavoritesOnly = () => {
    setSharedProjectIds([]);
    setProjectSlugToOpen('');
    setShareIdToLoad('');
    setShowFavoritesOnly(!showFavoritesOnly);
  };

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    url.search = '';

    if (sharedProjectIds.length > 0 && projectSlugToOpen) {
      const sharedProjectSlugs = sharedProjectIds.map(projectRef => {
        const matchingProject = portfolioItems.find(item => item.id === projectRef || getProjectSlug(item) === projectRef);
        return matchingProject ? getProjectSlug(matchingProject) : projectRef;
      });
      url.searchParams.set(SHARE_PROJECTS_PARAM, sharedProjectSlugs.join(','));
      return url.toString();
    }

    return url.toString();
  };

  const buildFilterShareUrl = () => {
    const trimmedSearch = searchTerm.trim();
    const filtersToShare = Object.entries(activeFilters).reduce<Record<string, string[]>>((acc, [key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        acc[key] = values.map(String).filter(Boolean);
      }
      return acc;
    }, {});

    const url = new URL(window.location.href);
    url.search = '';

    Object.entries(filtersToShare).forEach(([category, values]) => {
      const param = FILTER_PARAM_BY_CATEGORY[category] || slugify(category);
      values.forEach(value => {
        url.searchParams.append(param, category === 'Data' ? value.replace(/\s+/g, '').replace(/\//g, '-') : encodeFilterValueForUrl(value));
      });
    });

    if (trimmedSearch) {
      url.searchParams.set(SHARE_SEARCH_PARAM, trimmedSearch);
    }

    return url.toString();
  };

  const createProjectCollectionShareUrl = async (items: PortfolioItem[]) => {
    const projectIds = items.map(item => item.id).filter(Boolean);
    const projectRefs = items.map(getProjectSlug);

    if (!user?.uid) {
      throw new Error('User is required to create a shared project list');
    }

    if (projectIds.length === 0) {
      throw new Error('No projects to share');
    }

    if (projectIds.length > MAX_SHARED_PROJECTS) {
      throw new Error(`Too many projects to share: ${projectIds.length}`);
    }

    const shareRef = await addDoc(collection(db, 'shares'), {
      type: 'projects',
      projectIds,
      projectRefs,
      createdBy: user?.uid,
      createdAt: Timestamp.now(),
    });

    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set(SHARE_ID_PARAM, shareRef.id);
    return url.toString();
  };

  const getShareUrl = async () => {
    if (showFavoritesOnly) {
      const favoriteProjects = favorites
        .map(favorite => portfolioItems.find(item => item.id === favorite.projectId))
        .filter((item): item is PortfolioItem => Boolean(item));
      return createProjectCollectionShareUrl(favoriteProjects);
    }

    const hasSearchOrFilters = Boolean(searchTerm.trim()) || Object.values(activeFilters).some(values => Array.isArray(values) && values.length > 0);
    if (hasSearchOrFilters) {
      return buildFilterShareUrl();
    }

    if (sharedProjectIds.length > 0 && !projectSlugToOpen) {
      const sharedProjects = sharedProjectIds
        .map(projectRef => portfolioItems.find(item => item.id === projectRef || getProjectSlug(item) === projectRef))
        .filter((item): item is PortfolioItem => Boolean(item));
      return createProjectCollectionShareUrl(sharedProjects);
    }

    return buildShareUrl();
  };

  const buildProjectShareUrl = (item: PortfolioItem) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set(SHARE_PROJECT_PARAM, getProjectSlug(item));
    return url.toString();
  };

  const hasShareableSelection = () => {
    const hasFavoriteSelection = showFavoritesOnly && favorites.length > 0;
    const hasSharedSelection = sharedProjectIds.length > 0 && Boolean(projectSlugToOpen);
    const hasSharedCollection = sharedProjectIds.length > 0 && !projectSlugToOpen;
    const hasSearchOrFilters = Boolean(searchTerm.trim()) || Object.values(activeFilters).some(values => Array.isArray(values) && values.length > 0);
    return hasFavoriteSelection || hasSharedSelection || hasSharedCollection || hasSearchOrFilters;
  };

  const showMissingShareSelectionMessage = () => {
    setShareFeedback('Aplique uma busca, filtro ou favoritos para compartilhar.');
    window.setTimeout(() => setShareFeedback(''), 3000);
  };

  const copyTextToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error('Clipboard copy failed');
    }
  };

  const getShareErrorMessage = (error: unknown) => {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: string }).code) : '';

    if (code === 'permission-denied') {
      return 'Permissão negada ao criar o link. Confira a regra shares publicada.';
    }

    if (error instanceof Error && error.message.startsWith('Too many projects to share')) {
      return `A seleção passou de ${MAX_SHARED_PROJECTS} projetos. Reduza os favoritos para compartilhar.`;
    }

    return 'Não foi possível copiar';
  };

  const handleShareMenuToggle = () => {
    if (!hasShareableSelection()) {
      showMissingShareSelectionMessage();
      return;
    }
    setIsShareMenuOpen(open => !open);
  };

  const handleCopyShareLink = async () => {
    if (!hasShareableSelection()) {
      showMissingShareSelectionMessage();
      return;
    }

    setIsShareMenuOpen(false);
    setShareFeedback('Gerando link...');

    try {
      const shareUrl = await getShareUrl();
      await copyTextToClipboard(shareUrl);
      setShareFeedback('Link copiado');
      window.setTimeout(() => setShareFeedback(''), 2500);
    } catch (error) {
      console.error('Error copying portfolio share link:', error);
      setShareFeedback(getShareErrorMessage(error));
      window.setTimeout(() => setShareFeedback(''), 4500);
    }
  };

  const handleNativeShare = async () => {
    if (!hasShareableSelection()) {
      showMissingShareSelectionMessage();
      return;
    }

    setIsShareMenuOpen(false);
    setShareFeedback('Gerando link...');

    try {
      const shareUrl = await getShareUrl();
      if (!navigator.share) {
        await copyTextToClipboard(shareUrl);
        setShareFeedback('Link copiado');
        window.setTimeout(() => setShareFeedback(''), 2500);
        return;
      }

      await navigator.share({
        title: 'Banco de PMVs DOT',
        text: 'Veja esta seleção no Banco de PMVs DOT.',
        url: shareUrl,
      });
      setShareFeedback('');
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        setShareFeedback('');
        return;
      }
      console.error('Error sharing portfolio view:', error);
      setShareFeedback('Não foi possível compartilhar');
      window.setTimeout(() => setShareFeedback(''), 3000);
    }
  };

  const handleShareProject = async (item: PortfolioItem) => {
    const shareUrl = buildProjectShareUrl(item);
    await copyTextToClipboard(shareUrl);
  };

  // FIX: Added robust type guards and string conversions to prevent runtime errors during filtering.
  // This ensures that operations like .split() or .includes() are performed on strings,
  // and handles potentially non-string array elements from Firestore.
  const filteredItems = useMemo(() => {
    let items = portfolioItems;

    // 0. Shared project collections are independent from the current user's favorites.
    if (sharedProjectIds.length > 0) {
      items = items.filter(item => sharedProjectIds.includes(item.id) || sharedProjectIds.includes(getProjectSlug(item)));
    }

    // 0. Filter by favorites if requested
    if (showFavoritesOnly && sharedProjectIds.length === 0) {
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
                    return matchesFilterValue(itemValue, filterValue, fieldKey);
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
  }, [searchTerm, portfolioItems, activeFilters, showFavoritesOnly, favorites, sharedProjectIds]);

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
  }, [searchTerm, activeFilters, sharedProjectIds]);

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
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4 mb-8 sm:mb-12">
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
              onClick={handleToggleFavoritesOnly}
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

          <div className="relative w-full sm:w-auto" ref={shareMenuRef}>
            <button
              onClick={handleShareMenuToggle}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-md whitespace-nowrap h-[52px] w-full sm:w-auto bg-white dark:bg-zinc-800 text-zinc-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-700"
              title="Compartilhar seleção"
            >
              {shareFeedback === 'Link copiado' ? <Check className="w-5 h-5 text-accent" /> : <Share2 className="w-5 h-5" />}
              Compartilhar
            </button>
            {isShareMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800 sm:w-72">
                <button
                  onClick={handleNativeShare}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-zinc-700"
                >
                  <Share2 className="h-5 w-5 text-accent" />
                  <span>Enviar para outro app</span>
                </button>
                <button
                  onClick={handleCopyShareLink}
                  className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-700"
                >
                  <Copy className="h-5 w-5 text-accent" />
                  <span>Copiar link</span>
                </button>
              </div>
            )}
            {shareFeedback && (
              <div className="absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-lg whitespace-nowrap dark:bg-zinc-700">
                {shareFeedback}
              </div>
            )}
          </div>
        </div>

        {sharedProjectIds.length > 0 && (
          <div className="max-w-4xl mx-auto -mt-6 mb-8 flex flex-col sm:flex-row items-center justify-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-zinc-700 dark:text-gray-200">
            <span className="font-semibold">Visualizando uma seleção compartilhada com {filteredItems.length} projeto{filteredItems.length === 1 ? '' : 's'}.</span>
            <button
              onClick={handleClearAllFilters}
              className="font-bold text-accent hover:text-accent-dark"
            >
              Ver todo o portfólio
            </button>
          </div>
        )}
        
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
                      onShare={handleShareProject}
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
