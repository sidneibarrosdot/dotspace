
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from '../components/Header';
import MobileFooterNav from '../components/MobileFooterNav';
import PortfolioCard from '../components/PortfolioCard';
import PortfolioModal from '../components/PortfolioModal';
import CalendarAgenda from '../components/CalendarAgenda';
import {
  FEEDBACK_COPY_ERROR,
  FEEDBACK_COPY_SUCCESS,
  FEEDBACK_TIMEOUT_ERROR,
  FEEDBACK_TIMEOUT_SUCCESS,
} from '../constants/feedbackMessages';
import {
  ArrowUp,
  BookmarkCheck,
  Check,
  ChevronDown,
  Copy,
  FolderKanban,
  LayoutGrid,
  BookMarked,
  MessageSquareMore,
  PencilLine,
  Plus,
  Play,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { PortfolioItem } from '../types';
import { processosItems } from '../data/processosItems';
import { portfolioItems as localPortfolioItems } from '../data/portfolioItems';
import { db } from '../firebase';
import { addDoc, collection, query, onSnapshot, doc, updateDoc, increment, getDoc, Timestamp } from 'firebase/firestore';
import { logAudit } from '../services/auditService';
import {
  createFavoriteList,
  deleteFavoriteList,
  ensureFavoriteListsReady,
  renameFavoriteList,
  subscribeToFavoriteLists,
  toggleProjectInFavoriteList,
} from '../services/favoriteService';
import { toggleLike, subscribeToLikes } from '../services/likeService';
import { User } from 'firebase/auth';
import { Bookmark } from 'lucide-react';
import type { FavoriteList, Like } from '../types';

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

const DATE_MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
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

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getFilterCountLookupKeys = (value: string) => {
  const trimmed = String(value || '').trim();
  return [trimmed, slugify(trimmed)].filter(Boolean);
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
    const monthIndex = DATE_MONTHS.findIndex(month => month.normalize("NFD").replace(/[\u0300-\u036f]/g, "").startsWith(monthYearMatch[1]));
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

  if (parsed.month >= 1 && parsed.month <= 12) {
    return `${DATE_MONTHS[parsed.month - 1]}/${parsed.year}`;
  }

  return String(parsed.year);
};

const getDateSortValue = (value: string) => {
  const parsed = parseFilterDate(value);
  if (parsed) {
    return (parsed.year * 10000) + (parsed.month * 100) + parsed.day;
  }

  const fallback = Date.parse(value);
  return Number.isNaN(fallback) ? 0 : fallback;
};

const comparePortfolioItemsByDateDesc = (a: PortfolioItem, b: PortfolioItem) => {
  const dateA = getDateSortValue(a.Data || '');
  const dateB = getDateSortValue(b.Data || '');
  if (dateA !== dateB) return dateB - dateA;

  const createdA = Date.parse((a as PortfolioItem & { createdAt?: string }).createdAt || '');
  const createdB = Date.parse((b as PortfolioItem & { createdAt?: string }).createdAt || '');
  if (!Number.isNaN(createdA) && !Number.isNaN(createdB) && createdA !== createdB) {
    return createdB - createdA;
  }

  return String(b.Projeto || '').localeCompare(String(a.Projeto || ''), 'pt-BR');
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
    const itemDate = parseFilterDate(String(itemValue || ''));
    const filterDate = parseFilterDate(filterValue);

    if (!itemDate || !filterDate) {
      return formatFilterDate(String(itemValue || '')) === filterValue;
    }

    if (filterDate.month <= 0) {
      return itemDate.year === filterDate.year;
    }

    return itemDate.year === filterDate.year && itemDate.month === filterDate.month;
  }

  if (Array.isArray(itemValue)) {
    return itemValue.some(value => slugify(String(value)) === slugify(filterValue));
  }

  return slugify(String(itemValue || '')) === slugify(filterValue);
};

const buildDateFilterOptions = (values: string[]) => {
  const options = new Map<string, { value: string; year: number; month: number; rank: number }>();
  const counts: Record<string, number> = {};

  values.forEach(value => {
    const parsed = parseFilterDate(value);
    if (!parsed) return;

    counts[String(parsed.year)] = (counts[String(parsed.year)] || 0) + 1;

    const yearKey = String(parsed.year);
    if (!options.has(yearKey)) {
      options.set(yearKey, {
        value: yearKey,
        year: parsed.year,
        month: 13,
        rank: 0
      });
    }

    if (parsed.month >= 1 && parsed.month <= 12) {
      const monthKey = `${DATE_MONTHS[parsed.month - 1]}/${parsed.year}`;
      counts[monthKey] = (counts[monthKey] || 0) + 1;
      if (!options.has(monthKey)) {
        options.set(monthKey, {
          value: monthKey,
          year: parsed.year,
          month: parsed.month,
          rank: 1
        });
      }
    }
  });

  return {
    options: [...options.values()]
    .sort((a, b) => b.year - a.year || a.rank - b.rank || b.month - a.month)
    .map(option => option.value),
    counts,
  };
};

interface PortfolioScreenProps {
    user: User | null;
    isLoggedIn: boolean;
    onNavigateToAdmin: () => void;
    onNavigateToProcessos: () => void;
    onNavigateToTreinamentos: () => void;
    onNavigateToKRs: () => void;
    onNavigateToForum: () => void;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    manualInteractionsEnabled: boolean;
    offlineMode?: boolean;
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

const normalizeCount = (value: unknown) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 0;
};

const PortfolioScreen: React.FC<PortfolioScreenProps> = ({ user, isLoggedIn, onNavigateToAdmin, onNavigateToProcessos, onNavigateToTreinamentos, onNavigateToKRs, onNavigateToForum, onLogout, theme, toggleTheme, manualInteractionsEnabled, offlineMode = false }) => {
  const isLightMode = theme === 'light';
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(offlineMode ? localPortfolioItems : []);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isCreatingNewItem, setIsCreatingNewItem] = useState(false);
  const [randomPhrase, setRandomPhrase] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_TO_LOAD);
  const [favoriteLists, setFavoriteLists] = useState<FavoriteList[]>([]);
  const [activeFavoriteListId, setActiveFavoriteListId] = useState('');
  const [newFavoriteListName, setNewFavoriteListName] = useState('');
  const [likes, setLikes] = useState<Like[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sharedProjectIds, setSharedProjectIds] = useState<string[]>([]);
  const [projectSlugToOpen, setProjectSlugToOpen] = useState('');
  const [shareIdToLoad, setShareIdToLoad] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isFavoriteMenuOpen, setIsFavoriteMenuOpen] = useState(false);
  const [favoriteListFeedback, setFavoriteListFeedback] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [favoriteListModal, setFavoriteListModal] = useState<{
    mode: 'rename' | 'delete';
    list: FavoriteList;
    value?: string;
  } | null>(null);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const favoriteMenuRef = useRef<HTMLDivElement | null>(null);
  const likeCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!offlineMode) return;

    setPortfolioItems(localPortfolioItems);
    setLoading(false);
    setFavoriteLists([]);
    setLikes([]);
    likeCountsRef.current = {};
    setActiveFavoriteListId('');
    setNewFavoriteListName('');
    setShowFavoritesOnly(false);
  }, [offlineMode]);

  const phrases = [
    'Um hub DOT para conectar processos, treinamentos e conhecimento em um só lugar. ✨',
    'Tudo o que o time precisa para se atualizar com rapidez, clareza e governança. 🚀',
    'Processos vivos, treinamentos organizados e links seguros para todos os colaboradores. 🔗',
    'A central de conteúdos que mantém a operação alinhada e o time em movimento. 📚',
    'Atualize, compartilhe e acesse materiais DOT sem perder contexto. 💡',
    'Conhecimento útil, curado e fácil de encontrar para o dia a dia do time. 🎯',
    'Do processo ao treinamento, o DOT Space conecta o que importa. 🌟',
    'Um espaço para consultar, aprender e executar com mais consistência. 🛠️'
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
      if (favoriteMenuRef.current && !favoriteMenuRef.current.contains(event.target as Node)) {
        setIsFavoriteMenuOpen(false);
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
    if (offlineMode || !shareIdToLoad || !isLoggedIn) return;

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
  }, [shareIdToLoad, isLoggedIn, offlineMode]);

  useEffect(() => {
    if (offlineMode) {
        setLoading(false);
        return;
    }

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
        const sortedList = [...projectList]
          .sort(comparePortfolioItemsByDateDesc)
          .map(item => ({
            ...item,
            likes: likeCountsRef.current[item.id] ?? normalizeCount(item.likes),
            views: normalizeCount(item.views),
          }));

        console.log(`Fetched ${sortedList.length} projects from Firestore`);
        setPortfolioItems(sortedList);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching portfolio items: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isLoggedIn, offlineMode]);

  useEffect(() => {
    if (offlineMode || !isLoggedIn || !user) {
      setFavoriteLists([]);
      setActiveFavoriteListId('');
      setNewFavoriteListName('');
      setFavoriteListFeedback('');
      return;
    }

    const storageKey = `bpmvs.activeFavoriteList.${user.uid}`;
    let cancelled = false;
    let unsubscribe = () => {};

    const setupFavoriteLists = async () => {
      try {
        await ensureFavoriteListsReady(user.uid);
        if (cancelled) return;

        unsubscribe = subscribeToFavoriteLists(user.uid, (lists) => {
          setFavoriteLists(lists);
          setActiveFavoriteListId(prevActiveId => {
            const savedActiveId = window.localStorage.getItem(storageKey);
            const validSavedId = savedActiveId && lists.some(list => list.id === savedActiveId) ? savedActiveId : '';
            const validPrevId = prevActiveId && lists.some(list => list.id === prevActiveId) ? prevActiveId : '';
            const nextActiveId = validSavedId || validPrevId || lists[0]?.id || '';

            if (nextActiveId) {
              window.localStorage.setItem(storageKey, nextActiveId);
            } else {
              window.localStorage.removeItem(storageKey);
            }

            return nextActiveId;
          });
        });
      } catch (error) {
        console.error('Error loading favorite lists:', error);
      }
    };

    setupFavoriteLists();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [isLoggedIn, user, offlineMode]);

  const activeFavoriteList = useMemo(() => {
    if (favoriteLists.length === 0) return null;
    const byId = favoriteLists.find(list => list.id === activeFavoriteListId);
    return byId || favoriteLists[0] || null;
  }, [favoriteLists, activeFavoriteListId]);

  const activeFavoriteProjectIds = activeFavoriteList?.projectIds || [];
  const activeFavoriteListName = activeFavoriteList?.name || 'Favoritos';

  useEffect(() => {
    if (offlineMode || !isLoggedIn || !user) {
      setLikes([]);
      likeCountsRef.current = {};
      return;
    }

    const unsubscribe = subscribeToLikes(user.uid, (likesList) => {
      setLikes(likesList);
    });

    return () => unsubscribe();
  }, [isLoggedIn, user, offlineMode]);

  useEffect(() => {
    if (offlineMode || !isLoggedIn || !user) {
      likeCountsRef.current = {};
      return;
    }

    const likesCollection = collection(db, 'likes');
    const likesQuery = query(likesCollection);

    const unsubscribe = onSnapshot(likesQuery, (snapshot) => {
      const nextCounts = snapshot.docs.reduce<Record<string, Set<string>>>((acc, likeDoc) => {
        const data = likeDoc.data() as { projectId?: string; userId?: string };
        const projectId = String(data.projectId || '').trim();
        const userId = String(data.userId || '').trim();
        if (!projectId || !userId) return acc;

        if (!acc[projectId]) {
          acc[projectId] = new Set();
        }
        acc[projectId].add(userId);
        return acc;
      }, {});

      const normalizedCounts = Object.fromEntries(
        Object.entries(nextCounts).map(([projectId, users]) => [projectId, users.size])
      ) as Record<string, number>;

      likeCountsRef.current = normalizedCounts;

      setPortfolioItems(prevItems =>
        prevItems.map(item => ({
          ...item,
          likes: normalizedCounts[item.id] ?? normalizeCount(item.likes),
        }))
      );

      setSelectedItem(prev =>
        prev
          ? { ...prev, likes: normalizedCounts[prev.id] ?? normalizeCount(prev.likes) }
          : prev
      );
    }, (error) => {
      console.error('Error fetching like counts:', error);
    });

    return () => unsubscribe();
  }, [isLoggedIn, user, offlineMode]);

  const handleCardClick = async (item: PortfolioItem) => {
    setSelectedItem(item);
    setIsCreatingNewItem(false);
    
    // Increment views locally in offline mode
    if (offlineMode && item.id) {
      setPortfolioItems(prevItems =>
        prevItems.map(currentItem =>
          currentItem.id === item.id
            ? { ...currentItem, views: normalizeCount(currentItem.views) + 1 }
            : currentItem
        )
      );
      return;
    }

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
    if (offlineMode || !isLoggedIn || !user || !item.id) return;
    try {
      await toggleLike(user.uid, item.id);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleToggleFavorite = async (item: PortfolioItem) => {
    if (offlineMode || !isLoggedIn || !user || !item.id || !activeFavoriteList?.id) return;
    try {
      const isNowFavorited = await toggleProjectInFavoriteList(user.uid, activeFavoriteList.id, item.id);

      setFavoriteLists(prevLists =>
        prevLists.map(list => {
          if (list.id !== activeFavoriteList.id) return list;

          const currentIds = Array.isArray(list.projectIds) ? list.projectIds.map(String) : [];
          const normalizedProjectId = String(item.id).trim();
          const nextProjectIds = isNowFavorited
            ? Array.from(new Set([...currentIds, normalizedProjectId]))
            : currentIds.filter(id => id !== normalizedProjectId);

          return {
            ...list,
            projectIds: nextProjectIds,
          };
        })
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleCreateFavoriteList = async () => {
    if (offlineMode || !isLoggedIn || !user) return;

    const trimmedName = newFavoriteListName.trim();
    if (!trimmedName) {
      setFavoriteListFeedback('Digite um nome para a lista.');
      window.setTimeout(() => setFavoriteListFeedback(''), 2500);
      return;
    }

    try {
      const docRef = await createFavoriteList(user.uid, trimmedName);
      setNewFavoriteListName('');
      setIsFavoriteMenuOpen(false);
      setActiveFavoriteListId(docRef.id);
      window.localStorage.setItem(`bpmvs.activeFavoriteList.${user.uid}`, docRef.id);
      setFavoriteListFeedback('Lista criada');
      window.setTimeout(() => setFavoriteListFeedback(''), 2500);
    } catch (error) {
      console.error('Error creating favorite list:', error);
      setFavoriteListFeedback('Não foi possível criar a lista');
      window.setTimeout(() => setFavoriteListFeedback(''), 3000);
    }
  };

  const handleRenameFavoriteList = async (list: FavoriteList) => {
    if (offlineMode || !isLoggedIn || !user) return;

    if (list.isDefault) {
      setFavoriteListFeedback('A lista padrão não pode ser renomeada.');
      window.setTimeout(() => setFavoriteListFeedback(''), 3000);
      return;
    }

    setFavoriteListModal({ mode: 'rename', list, value: list.name });
    setIsFavoriteMenuOpen(false);
  };

  const handleDeleteFavoriteList = async (list: FavoriteList) => {
    if (offlineMode || !isLoggedIn || !user) return;

    if (list.isDefault) {
      setFavoriteListFeedback('A lista padrão não pode ser excluída.');
      window.setTimeout(() => setFavoriteListFeedback(''), 3000);
      return;
    }

    setFavoriteListModal({ mode: 'delete', list });
    setIsFavoriteMenuOpen(false);
  };

  const handleSelectFavoriteList = (listId: string) => {
    setActiveFavoriteListId(listId);
    if (user?.uid) {
      window.localStorage.setItem(`bpmvs.activeFavoriteList.${user.uid}`, listId);
    }
    setIsFavoriteMenuOpen(false);
  };

  const handleFavoriteListModalClose = () => {
    setFavoriteListModal(null);
  };

  const handleFavoriteListModalConfirm = async () => {
    if (offlineMode || !isLoggedIn || !user || !favoriteListModal) return;

    try {
      if (favoriteListModal.mode === 'rename') {
        const nextName = (favoriteListModal.value || '').trim();
        if (!nextName) {
          setFavoriteListFeedback('Digite um nome para a lista.');
          window.setTimeout(() => setFavoriteListFeedback(''), 2500);
          return;
        }

        if (nextName === favoriteListModal.list.name.trim()) {
          handleFavoriteListModalClose();
          return;
        }

        await renameFavoriteList(user.uid, favoriteListModal.list.id, nextName);
        setFavoriteListFeedback('Lista renomeada');
      } else {
        await deleteFavoriteList(favoriteListModal.list.id);
        if (activeFavoriteListId === favoriteListModal.list.id) {
          setActiveFavoriteListId('');
          window.localStorage.removeItem(`bpmvs.activeFavoriteList.${user.uid}`);
        }
        setFavoriteListFeedback('Lista excluída');
      }

      handleFavoriteListModalClose();
      window.setTimeout(() => setFavoriteListFeedback(''), 2500);
    } catch (error) {
      console.error('Error updating favorite list:', error);
      setFavoriteListFeedback(error instanceof Error ? error.message : 'Não foi possível atualizar a lista');
      window.setTimeout(() => setFavoriteListFeedback(''), 3000);
    }
  };

  const handleOpenCreateModal = () => {
    if (!manualInteractionsEnabled) {
      setShareFeedback('Interações manuais desativadas pelo administrador.');
      window.setTimeout(() => setShareFeedback(''), 3000);
      return;
    }
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
    const optionCounts: Record<string, Record<string, number>> = {};

    const buildGenericFilterOptions = (values: string[]) => {
      const counts: Record<string, number> = {};
      const labelsByKey: Record<string, string> = {};

      values.forEach(value => {
        const trimmedValue = String(value).trim();
        if (!trimmedValue) return;

        const key = slugify(trimmedValue);
        counts[key] = (counts[key] || 0) + 1;
        if (!labelsByKey[key]) {
          labelsByKey[key] = trimmedValue;
        }
      });

      const entries = Object.entries(labelsByKey).map(([key, label]) => ({
        key,
        label,
        count: counts[key] || 0,
      }));

      return {
        options: entries
          .sort((a, b) => b.label.localeCompare(a.label, 'pt-BR'))
          .map(entry => entry.label),
        counts: entries.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.label] = entry.count;
          acc[entry.key] = entry.count;
          return acc;
        }, {}),
      };
    };

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
                const dateData = buildDateFilterOptions(values);
                options[tag] = dateData.options;
                optionCounts[tag] = dateData.counts;
            } else {
              const genericData = buildGenericFilterOptions(values);
              if (genericData.options.length > 0) {
                options[tag] = genericData.options;
                optionCounts[tag] = genericData.counts;
              }
            }
        }
    });
    return { options, optionCounts };
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
      setIsFavoriteMenuOpen(false);
      window.history.replaceState({}, '', window.location.pathname);
  };

  const handleToggleFavoritesOnly = () => {
    setSharedProjectIds([]);
    setProjectSlugToOpen('');
    setShareIdToLoad('');
    setIsFavoriteMenuOpen(false);
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

    if (offlineMode) {
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set(SHARE_PROJECTS_PARAM, projectRefs.join(','));
      return url.toString();
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
    if (offlineMode) {
      if (sharedProjectIds.length > 0) {
        const url = new URL(window.location.href);
        url.search = '';
        url.searchParams.set(SHARE_PROJECTS_PARAM, sharedProjectIds.join(','));
        return url.toString();
      }

      if (Boolean(searchTerm.trim()) || Object.values(activeFilters).some(values => Array.isArray(values) && values.length > 0)) {
        return buildFilterShareUrl();
      }
    }

    const hasFavoriteSelection = activeFavoriteProjectIds.length > 0;
    if (hasFavoriteSelection) {
      const favoriteProjects = activeFavoriteProjectIds
        .map(projectId => portfolioItems.find(item => item.id === projectId))
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
    const hasFavoriteSelection = activeFavoriteProjectIds.length > 0;
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

    return FEEDBACK_COPY_ERROR;
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
      setShareFeedback(FEEDBACK_COPY_SUCCESS);
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_SUCCESS);
    } catch (error) {
      console.error('Error copying portfolio share link:', error);
      setShareFeedback(getShareErrorMessage(error));
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_ERROR);
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
        setShareFeedback(FEEDBACK_COPY_SUCCESS);
        window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_SUCCESS);
        return;
      }

      await navigator.share({
        title: 'dot.space',
        text: 'Veja esta seleção no dot.space.',
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
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_ERROR);
    }
  };

  const handleShareProject = async (item: PortfolioItem) => {
    const shareUrl = buildProjectShareUrl(item);
    await copyTextToClipboard(shareUrl);
  };

  const featuredItem = useMemo(() => portfolioItems[0] || null, [portfolioItems]);
  const recentItems = useMemo(
    () => [...portfolioItems].sort(comparePortfolioItemsByDateDesc).slice(0, 6),
    [portfolioItems]
  );

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
      items = items.filter(item => activeFavoriteProjectIds.includes(item.id));
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
  }, [searchTerm, portfolioItems, activeFilters, showFavoritesOnly, activeFavoriteProjectIds, sharedProjectIds]);

  useEffect(() => {
    const handleScroll = () => {
      if (selectedItem) return; // Don't load more items when modal is open

      setShowBackToTop(window.scrollY > 500);

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
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        isLoggedIn={isLoggedIn}
        sessionActive={Boolean(user)}
        canManageAdmin={isLoggedIn}
        offlineMode={offlineMode}
        onNavigateToAdmin={onNavigateToAdmin}
        onLogout={onLogout}
      />
      
      <main className="container mx-auto px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-8 lg:px-8">
        <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)] mb-8">
          <aside className="hidden xl:block">
            <div
              className={`sticky top-24 rounded-[30px] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] ${
                isLightMode
                  ? 'border border-zinc-200 bg-white text-zinc-900 shadow-[0_30px_80px_rgba(15,23,42,0.08)]'
                  : 'border border-white/10 bg-[#151517] text-white'
              }`}
            >
              <div className="space-y-2">
                {[
                  { label: 'Home', icon: LayoutGrid, action: () => window.scrollTo({ top: 0, behavior: 'smooth' }), active: true },
                  { label: 'Processos', icon: FolderKanban, action: onNavigateToProcessos, active: false },
                  { label: 'Treinamentos', icon: Sparkles, action: onNavigateToTreinamentos, active: false },
                  { label: "Banco de KR's", icon: BookMarked, action: onNavigateToKRs, active: false },
                  { label: 'Fórum', icon: MessageSquareMore, action: onNavigateToForum, active: false },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = item.active;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      disabled={!item.action}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-[#88C125] text-white'
                          : isLightMode
                            ? 'bg-white/0 text-zinc-700 hover:bg-zinc-50 disabled:cursor-default disabled:hover:bg-white/0 disabled:opacity-55'
                            : 'bg-white/0 text-white/82 hover:bg-white/8 disabled:cursor-default disabled:hover:bg-white/0 disabled:opacity-55'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

            </div>
          </aside>

          <div className="space-y-6">
            <section
              className={`relative overflow-hidden rounded-[34px] px-6 py-8 shadow-[0_30px_90px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 ${
                isLightMode
                  ? 'border border-zinc-200 bg-gradient-to-br from-white via-[#fbfcf7] to-[#eef4de] text-zinc-900'
                  : 'border border-white/10 bg-gradient-to-br from-[#1d1d22] via-[#232329] to-[#111112] text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]'
              }`}
            >
              <div
                className={`absolute inset-0 ${
                  isLightMode
                    ? 'bg-[radial-gradient(circle_at_top_right,rgba(153,204,0,0.16),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(247,142,67,0.12),transparent_26%)]'
                    : 'bg-[radial-gradient(circle_at_top_right,rgba(153,204,0,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_26%)]'
                }`}
              />
              <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.38em] ${isLightMode ? 'text-[#88C125]' : 'text-[#99cc00]'}`}>
                    DOT SPACE
                  </p>
                  <h1 className={`mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                    {randomPhrase}
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                    Acesso central aos materiais, processos e treinamentos com governança rígida,
                    versionamento claro e navegação rápida.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {[
                    { label: 'Processos', value: processosItems.length, accent: 'bg-[#88C125]' },
                    { label: 'Treinamentos', value: portfolioItems.length, accent: 'bg-[#4CD07D]' },
                    { label: "Banco de KR's", value: 12, accent: 'bg-[#F78E43]' },
                    {
                      label: 'Fórum',
                      value: 5,
                      accent: 'bg-[#EEC137]'
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-3xl border p-3 backdrop-blur-sm sm:p-4 ${
                        isLightMode
                          ? 'border-zinc-200 bg-white/80 shadow-sm'
                          : 'border-white/10 bg-white/8'
                      }`}
                    >
                      <div className={`mb-2 h-1.5 w-12 rounded-full ${item.accent}`} />
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.32em] sm:text-xs ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>
                        {item.label}
                      </p>
                      <p className={`mt-1 text-2xl font-bold leading-none sm:text-[2rem] ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <article className="rounded-[30px] border border-zinc-200/80 bg-white p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#88c125]">Novidades</p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Conteúdos recentes</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Ver todos
                  </button>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-500 dark:text-zinc-400">
                  O que acabou de entrar no hub aparece primeiro aqui. A área tem mais destaque porque concentra os
                  materiais mais quentes do dia.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:max-w-[760px]">
                  {recentItems.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleCardClick(item)}
                      className="group overflow-hidden rounded-[26px] border border-zinc-200 bg-white text-left shadow-sm transition-transform hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img src={item.Imagem_capa} alt={item.Projeto} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                        <span className="absolute left-4 top-4 rounded-full bg-[#99cc00] px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-900">
                          {item.Cliente}
                        </span>
                      </div>
                      <div className="p-5">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#88c125]">{item.Time}</p>
                        <h3 className="mt-2 text-xl font-bold leading-tight text-zinc-900 dark:text-white">{item.Projeto}</h3>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.Assunto_geral}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </article>

              <article className="overflow-hidden rounded-[30px] border border-zinc-200/80 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5 dark:border-zinc-800">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#88c125]">Continuar fazendo</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Destaque da casa</h2>
                  </div>
                  <span className="rounded-full bg-[#88C125]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#88C125]">
                    Último acesso
                  </span>
                </div>
                {featuredItem ? (
                  <div className="flex flex-col">
                    <div className="relative h-[250px] bg-zinc-800 sm:h-[260px]">
                      <img
                        src={featuredItem.Imagem_capa}
                        alt={featuredItem.Projeto}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                        {featuredItem.Cliente}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 p-5">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#4CD07D] px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-white">
                            {featuredItem.Time || 'Conteúdo'}
                          </span>
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {featuredItem.Data}
                          </span>
                        </div>
                        <h3 className="mt-3 text-[1.6rem] font-black leading-tight text-zinc-900 dark:text-white">
                          {featuredItem.Projeto}
                        </h3>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          {featuredItem.Assunto_geral}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCardClick(featuredItem)}
                        className="inline-flex items-center gap-2 self-start rounded-2xl bg-[#111111] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                      >
                        <Play className="h-4 w-4" />
                        Explorar
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
              <article className="overflow-hidden rounded-[30px] border border-zinc-200/80 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                  <div className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(76,208,125,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(247,142,67,0.16),transparent_26%)]" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#88C125]">
                        <Sparkles className="h-4 w-4" />
                        IA em alta
                      </div>
                      <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-zinc-900 dark:text-white sm:text-4xl">
                        Inteligência Artificial aplicada a processos e treinamentos.
                      </h2>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
                        Um destaque para a categoria que mais está ganhando espaço na empresa. Aqui ficam conteúdos,
                        iniciativas e materiais que conectam automação, produtividade e capacitação do time.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        {['Chatbots', 'Automação', 'Conteúdo', 'Produtividade'].map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-zinc-200 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/90 dark:text-zinc-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950/60 sm:p-7 lg:border-t-0 lg:border-l">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#88C125]">O que está em foco</p>
                    <div className="mt-5 space-y-3">
                      {[
                        'IA para acelerar fluxos de aprovação e busca de conhecimento',
                        'Treinamentos internos com apoio de assistentes inteligentes',
                        'Materiais e processos preparados para uso por todos os times',
                      ].map((item) => (
                        <div key={item} className="rounded-3xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                          <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </section>

            <section className="grid gap-6">
              <CalendarAgenda />
            </section>

          </div>
        </section>
      </main>

      <MobileFooterNav
        theme={theme}
        items={[
          { label: 'Home', icon: LayoutGrid, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }), active: true },
          { label: 'Processos', icon: FolderKanban, onClick: onNavigateToProcessos },
          { label: 'Treinamentos', icon: Sparkles, onClick: onNavigateToTreinamentos },
          { label: "Banco de KR's", icon: BookMarked, onClick: onNavigateToKRs },
          { label: 'Fórum', icon: MessageSquareMore, onClick: onNavigateToForum },
        ]}
      />

      {!offlineMode && isLoggedIn && manualInteractionsEnabled && (
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

      {showBackToTop && (
        <div className="fixed bottom-28 right-8 z-50 group sm:right-8">
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-zinc-800 dark:bg-zinc-700 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
            Voltar ao topo
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-white dark:bg-zinc-800 text-zinc-700 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            aria-label="Voltar ao topo"
            title="Voltar ao topo"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      )}

      {selectedItem && (
        <PortfolioModal
          item={selectedItem}
          onClose={handleCloseModal}
          theme={theme}
          isCreating={isCreatingNewItem}
          isLoggedIn={isLoggedIn && !offlineMode}
          manualInteractionsEnabled={manualInteractionsEnabled}
          user={user}
          onUpdate={handleUpdateProject}
          onAdd={handleProjectAdded}
          onDelete={handleDeleteProject}
          onToggleFavorite={offlineMode ? undefined : handleToggleFavorite}
          isFavorited={offlineMode ? false : activeFavoriteProjectIds.includes(selectedItem.id)}
          onLike={offlineMode ? undefined : handleLike}
          isLiked={offlineMode ? false : likes.some(l => l.projectId === selectedItem.id)}
        />
      )}

      {favoriteListModal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
          onClick={handleFavoriteListModalClose}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-gray-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {favoriteListModal.mode === 'rename' ? 'Renomear lista' : 'Excluir lista'}
                </p>
                <h3 className="mt-1 text-lg font-bold">{favoriteListModal.list.name}</h3>
              </div>
              <button
                type="button"
                onClick={handleFavoriteListModalClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-gray-300 transition-colors hover:bg-zinc-800 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {favoriteListModal.mode === 'rename' ? (
              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-gray-300">Novo nome da lista</label>
                <input
                  id="favorite-list-rename"
                  name="favorite-list-rename"
                  autoFocus
                  value={favoriteListModal.value || ''}
                  onChange={(e) =>
                    setFavoriteListModal(prev => (prev ? { ...prev, value: e.target.value } : prev))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleFavoriteListModalConfirm();
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-accent"
                  placeholder="Digite o novo nome"
                />
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-gray-300">
                Excluir esta lista não remove os projetos do sistema. Eles continuam no portfólio, apenas saem desta organização.
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleFavoriteListModalClose}
                className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleFavoriteListModalConfirm()}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  favoriteListModal.mode === 'delete'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-accent text-zinc-900 hover:brightness-95'
                }`}
              >
                {favoriteListModal.mode === 'delete' ? 'Excluir' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioScreen;
