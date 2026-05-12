
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from '../components/Header';
import PortfolioCard from '../components/PortfolioCard';
import SearchBar from '../components/SearchBar';
import PortfolioModal from '../components/PortfolioModal';
import TagFilter from '../components/TagFilter';
import { ArrowUp, Check, ChevronDown, Copy, PencilLine, Plus, Share2, Trash2, X } from 'lucide-react';
import type { PortfolioItem } from '../types';
import DotLogo from '../components/DotLogo';
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
import { Bookmark, BookmarkCheck } from 'lucide-react';
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
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    manualInteractionsEnabled: boolean;
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

const PortfolioScreen: React.FC<PortfolioScreenProps> = ({ user, isLoggedIn, onNavigateToAdmin, onLogout, theme, toggleTheme, manualInteractionsEnabled }) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
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
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
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
  }, [isLoggedIn, user]);

  const activeFavoriteList = useMemo(() => {
    if (favoriteLists.length === 0) return null;
    const byId = favoriteLists.find(list => list.id === activeFavoriteListId);
    return byId || favoriteLists[0] || null;
  }, [favoriteLists, activeFavoriteListId]);

  const activeFavoriteProjectIds = activeFavoriteList?.projectIds || [];
  const activeFavoriteListName = activeFavoriteList?.name || 'Favoritos';

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setLikes([]);
      likeCountsRef.current = {};
      return;
    }

    const unsubscribe = subscribeToLikes(user.uid, (likesList) => {
      setLikes(likesList);
    });

    return () => unsubscribe();
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (!isLoggedIn || !user) {
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
    if (!isLoggedIn || !user || !item.id || !activeFavoriteList?.id) return;
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
    if (!isLoggedIn || !user) return;

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
    if (!isLoggedIn || !user) return;

    if (list.isDefault) {
      setFavoriteListFeedback('A lista padrão não pode ser renomeada.');
      window.setTimeout(() => setFavoriteListFeedback(''), 3000);
      return;
    }

    setFavoriteListModal({ mode: 'rename', list, value: list.name });
    setIsFavoriteMenuOpen(false);
  };

  const handleDeleteFavoriteList = async (list: FavoriteList) => {
    if (!isLoggedIn || !user) return;

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
    if (!isLoggedIn || !user || !favoriteListModal) return;

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
            <div className="relative flex w-full sm:w-auto items-center gap-2" ref={favoriteMenuRef}>
              <button
                onClick={handleToggleFavoritesOnly}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-md whitespace-nowrap h-[52px] w-full sm:w-auto ${
                  showFavoritesOnly 
                    ? 'bg-accent text-white dark:text-zinc-900' 
                    : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700'
                }`}
              >
                {showFavoritesOnly ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                {showFavoritesOnly ? 'Ver Todos' : `${activeFavoriteListName}${activeFavoriteProjectIds.length > 0 ? ` (${activeFavoriteProjectIds.length})` : ''}`}
              </button>
              <button
                onClick={() => setIsFavoriteMenuOpen(open => !open)}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-gray-200 bg-white text-zinc-700 shadow-md transition-colors hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700"
                title="Gerenciar listas de favoritos"
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${isFavoriteMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFavoriteMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800 sm:w-96">
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Listas de favoritos</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {favoriteLists.length > 0 ? (
                      favoriteLists.map((list) => (
                        <div
                          key={list.id}
                          className={`flex items-stretch gap-1 px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-700 ${
                            list.id === activeFavoriteListId ? 'bg-accent/10 text-accent' : 'text-zinc-800 dark:text-gray-200'
                          }`}
                        >
                          <button
                            onClick={() => handleSelectFavoriteList(list.id)}
                            className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm font-semibold"
                          >
                            <span className="truncate">
                              {list.name}
                              {list.isDefault ? <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Padrão</span> : null}
                            </span>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{list.projectIds.length}</span>
                          </button>
                          {!list.isDefault && (
                            <div className="flex items-center gap-1 pr-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void handleRenameFavoriteList(list);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-accent dark:text-gray-400 dark:hover:bg-zinc-900"
                                aria-label={`Renomear lista ${list.name}`}
                                title="Renomear lista"
                              >
                                <PencilLine className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void handleDeleteFavoriteList(list);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-red-500 dark:text-gray-400 dark:hover:bg-zinc-900"
                                aria-label={`Excluir lista ${list.name}`}
                                title="Excluir lista"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Nenhuma lista criada.</div>
                    )}
                  </div>
                  <div className="border-t border-gray-100 px-4 py-4 dark:border-zinc-700">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Nova lista
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="favorite-list-name"
                        name="favorite-list-name"
                        value={newFavoriteListName}
                        onChange={(e) => setNewFavoriteListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateFavoriteList();
                          }
                        }}
                        placeholder="Ex.: Cursos do agro"
                        className="h-11 flex-1 rounded-md border border-gray-200 bg-white px-3 text-sm text-zinc-800 outline-none ring-0 placeholder:text-gray-400 focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100"
                      />
                      <button
                        onClick={handleCreateFavoriteList}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-bold text-white dark:text-zinc-900"
                      >
                        <Plus className="h-4 w-4" />
                        Criar
                      </button>
                    </div>
                    {favoriteListFeedback && (
                      <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">{favoriteListFeedback}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
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
            options={filterOptions.options}
            optionCounts={filterOptions.optionCounts}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAllFilters}
        />

        {loading ? (
            <div className="grid grid-cols-2 max-[380px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-[22rem] sm:h-80 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
                ))}
            </div>
        ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 max-[380px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
                {filteredItems.slice(0, visibleCount).map((item) => (
                    <PortfolioCard 
                      key={item.id} 
                      item={item} 
                      onClick={handleCardClick} 
                      onLike={handleLike} 
                      onToggleFavorite={handleToggleFavorite}
                      onShare={handleShareProject}
                      isFavorited={activeFavoriteProjectIds.includes(item.id)}
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

      {isLoggedIn && manualInteractionsEnabled && (
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
          isLoggedIn={isLoggedIn}
          manualInteractionsEnabled={manualInteractionsEnabled}
          user={user}
          onUpdate={handleUpdateProject}
          onAdd={handleProjectAdded}
          onDelete={handleDeleteProject}
          onToggleFavorite={handleToggleFavorite}
          isFavorited={activeFavoriteProjectIds.includes(selectedItem.id)}
          onLike={handleLike}
          isLiked={likes.some(l => l.projectId === selectedItem.id)}
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
