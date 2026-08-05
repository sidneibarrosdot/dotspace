import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import MobileFooterNav from '../components/MobileFooterNav';
import Pagination from '../components/Pagination';
import PageFilterActions from '../components/PageFilterActions';
import SearchBar from '../components/SearchBar';
import { useLocalCardInteractions, recordLocalCardInteractionEvent } from '../hooks/useLocalCardInteractions';
import type { PortfolioItem } from '../types';
import { treinamentosItems } from '../data/treinamentosItems';
import { FEEDBACK_COPY_ERROR, FEEDBACK_COPY_SUCCESS, FEEDBACK_TIMEOUT_ERROR, FEEDBACK_TIMEOUT_SUCCESS } from '../constants/feedbackMessages';
import {
  ArrowRight,
  BookOpen,
  Bot,
  ChevronDown,
  LayoutGrid,
  List,
  Eye,
  ExternalLink,
  Filter,
  Home,
  Heart,
  BookMarked,
  MessageSquareMore,
  Bookmark,
  Share2,
  CalendarClock,
  Clock3,
  Bug,
  UserRound,
} from 'lucide-react';
import type { User } from 'firebase/auth';

type SortMode = 'recentes' | 'a-z' | 'z-a';
const PENDING_HOME_TARGET_KEY = 'dot-space.pending-home-target';
const TRAINING_FEEDBACK_SLACK_URL =
  import.meta.env.VITE_TRAINING_FEEDBACK_SLACK_URL || 'https://dot-digital-group.slack.com/archives/C0BNBD4S16D';

interface TreinamentosScreenProps {
  user: User | null;
  isLoggedIn: boolean;
  onNavigateToPortfolio: () => void;
  onNavigateToProcessos: () => void;
  onNavigateToAgentes: () => void;
  onNavigateToKRs: () => void;
  onNavigateToForum: () => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  offlineMode?: boolean;
}

const compareByDateDesc = (a: PortfolioItem, b: PortfolioItem) => {
  const dateA = Date.parse(a.ultimaRevisao || a.Data || '');
  const dateB = Date.parse(b.ultimaRevisao || b.Data || '');
  if (dateA !== dateB) return dateB - dateA;
  return a.Projeto.localeCompare(b.Projeto, 'pt-BR');
};

const formatShortDate = (value?: string) => {
  if (!value) return 'Sem data';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
};

const TreinamentosScreen: React.FC<TreinamentosScreenProps> = ({
  user,
  isLoggedIn,
  onNavigateToPortfolio,
  onNavigateToProcessos,
  onNavigateToAgentes,
  onNavigateToKRs,
  onNavigateToForum,
  onNavigateToAdmin,
  onLogout,
  theme,
  toggleTheme,
  offlineMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('recentes');
  const [openMenu, setOpenMenu] = useState<'ordem' | 'area' | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [expandedTrainingId, setExpandedTrainingId] = useState<string | null>(null);
  const [pendingHomeTargetId, setPendingHomeTargetId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const didRunInitialFilterResetRef = useRef(false);
  const filtersRef = useRef<HTMLElement | null>(null);
  const { interactions, getState, incrementViews, toggleLike, toggleFavorite, registerShare } = useLocalCardInteractions('treinamentos');
  const isLightMode = theme === 'light';
  const pageClass = isLightMode ? 'min-h-screen bg-gray-100 text-zinc-900 transition-colors duration-300' : 'min-h-screen bg-[#111114] text-white transition-colors duration-300';
  const sidebarClass = isLightMode
    ? 'sticky top-24 rounded-[30px] border border-zinc-200 bg-white p-6 text-zinc-900 shadow-[0_30px_80px_rgba(15,23,42,0.08)]'
    : 'sticky top-24 rounded-[30px] border border-white/10 bg-[#151517] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]';
  const heroClass = isLightMode
    ? 'relative overflow-hidden rounded-[34px] border border-zinc-200 bg-gradient-to-br from-white via-[#fbfcf7] to-[#f3efe3] px-6 py-8 text-zinc-900 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10'
    : 'relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#1d1d22] via-[#232329] to-[#111112] px-6 py-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)] sm:px-8 sm:py-10';
  const heroOverlayClass = isLightMode
    ? 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(247,142,67,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_26%)]'
    : 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(247,142,67,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_26%)]';
  const filtersClass = isLightMode
    ? 'relative z-40 space-y-4 rounded-[30px] border border-zinc-200 bg-white p-4 shadow-[0_25px_60px_rgba(15,23,42,0.08)] sm:p-5'
    : 'relative z-40 space-y-4 rounded-[30px] border border-white/10 bg-[#151517] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.2)] sm:p-5';
  const filtersButtonClass = isLightMode
    ? 'inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 xl:w-56'
    : 'inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 xl:w-56';
  const filtersMenuClass = isLightMode
    ? 'absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl'
    : 'absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b20] shadow-2xl';
  const filtersMenuItemClass = isLightMode
    ? 'w-full px-4 py-3 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50'
    : 'w-full px-4 py-3 text-left text-sm font-semibold text-white/80 hover:bg-white/6';
  const filterChipBaseClass = isLightMode
    ? 'rounded-full border px-4 py-2 text-sm font-semibold transition-colors border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
    : 'rounded-full border px-4 py-2 text-sm font-semibold transition-colors border-white/10 bg-white/6 text-white/75 hover:bg-white/10';
  const filterResetClass = isLightMode
    ? 'rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50'
    : 'rounded-full border border-white/10 bg-white/0 px-4 py-2 text-sm font-semibold text-white/65 hover:bg-white/6';
  const cardClass = isLightMode
    ? 'group overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1'
    : 'group overflow-hidden rounded-[28px] border border-white/10 bg-[#17171b] shadow-[0_20px_50px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-1';
  const listCardClass = isLightMode
    ? 'group overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1'
    : 'group overflow-hidden rounded-[28px] border border-white/10 bg-[#17171b] shadow-[0_20px_50px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-1';
  const cardTextClass = isLightMode ? 'text-zinc-600' : 'text-white/70';
  const emptyStateClass = isLightMode
    ? 'rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm'
    : 'rounded-[28px] border border-white/10 bg-[#16161a] px-6 py-12 text-center';

  const areas = useMemo(
    () => Array.from(new Set(treinamentosItems.map((item) => item.Time))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    []
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const items = treinamentosItems.filter((item) => {
      const matchesSearch =
        !term ||
        [item.Projeto, item.Cliente, item.Time, item.Assunto_geral, item.Assunto_especifico, item.Publico_alvo, item.Metodologias, item.Mídias, item.Outros_recursos]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesArea = !areaFilter || item.Time === areaFilter;

      const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
      const matchesFavorites = !showFavoritesOnly || localState.favorited;
      return matchesSearch && matchesArea && matchesFavorites;
    });

    const sorted = [...items];
    if (sortMode === 'a-z') {
      sorted.sort((a, b) => a.Projeto.localeCompare(b.Projeto, 'pt-BR'));
    } else if (sortMode === 'z-a') {
      sorted.sort((a, b) => b.Projeto.localeCompare(a.Projeto, 'pt-BR'));
    } else {
      sorted.sort(compareByDateDesc);
    }

    return sorted;
  }, [searchTerm, areaFilter, sortMode, showFavoritesOnly, getState, interactions]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage]
  );

  useEffect(() => {
    if (!openMenu) return;

    const closeOpenMenu = (event: PointerEvent) => {
      if (filtersRef.current?.contains(event.target as Node)) return;
      setOpenMenu(null);
    };

    document.addEventListener('pointerdown', closeOpenMenu);
    return () => document.removeEventListener('pointerdown', closeOpenMenu);
  }, [openMenu]);

  useEffect(() => {
    try {
      const rawTarget = window.localStorage.getItem(PENDING_HOME_TARGET_KEY);
      if (!rawTarget) return;
      const parsed = JSON.parse(rawTarget) as { kind?: string; id?: string };
      if (parsed.kind !== 'conteudo' || !parsed.id) return;

      window.localStorage.removeItem(PENDING_HOME_TARGET_KEY);
      const targetIndex = filteredItems.findIndex((item) => item.id === parsed.id);
      if (targetIndex < 0) return;

      setPendingHomeTargetId(parsed.id);
      setExpandedTrainingId(parsed.id);
      setCurrentPage(Math.floor(targetIndex / pageSize) + 1);
    } catch {
      window.localStorage.removeItem(PENDING_HOME_TARGET_KEY);
    }
  }, [filteredItems]);

  useEffect(() => {
    if (!didRunInitialFilterResetRef.current) {
      didRunInitialFilterResetRef.current = true;
      return;
    }

    setCurrentPage(1);
  }, [searchTerm, areaFilter, sortMode, showFavoritesOnly]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  useEffect(() => {
    if (!expandedTrainingId) return;
    if (!filteredItems.some((item) => item.id === expandedTrainingId)) {
      setExpandedTrainingId(null);
    }
  }, [filteredItems, expandedTrainingId]);

  useEffect(() => {
    if (!pendingHomeTargetId) return;
    const target = document.getElementById(`treinamento-card-${pendingHomeTargetId}`);
    if (!target) return;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingHomeTargetId('');
    });
  }, [currentPage, pendingHomeTargetId]);

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'treinamentos');
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) url.searchParams.set('q', trimmedSearch);
    else url.searchParams.delete('q');
    if (areaFilter) url.searchParams.set('area', areaFilter);
    else url.searchParams.delete('area');
    if (sortMode !== 'recentes') url.searchParams.set('sort', sortMode);
    else url.searchParams.delete('sort');
    if (showFavoritesOnly) url.searchParams.set('favorites', '1');
    else url.searchParams.delete('favorites');
    return url.toString();
  };

  const handleShare = async () => {
    try {
      const shareUrl = buildShareUrl();
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback(FEEDBACK_COPY_SUCCESS);
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_SUCCESS);
    } catch {
      setShareFeedback(FEEDBACK_COPY_ERROR);
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_ERROR);
    }
  };

  const openAccess = (item: PortfolioItem) => {
    recordLocalCardInteractionEvent('treinamentos', item.id, 'open');
    window.open(item.Link_PMV, '_blank', 'noopener,noreferrer');
  };

  const toggleTrainingDetails = (itemId: string) => {
    setExpandedTrainingId((current) => {
      const nextExpandedId = current === itemId ? null : itemId;
      if (nextExpandedId) {
        recordLocalCardInteractionEvent('treinamentos', itemId, 'open');
      }
      return nextExpandedId;
    });
  };

  const handleShareItem = async (item: PortfolioItem) => {
    try {
      await navigator.clipboard.writeText(item.Link_PMV);
      registerShare(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
      setShareFeedback(FEEDBACK_COPY_SUCCESS);
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_SUCCESS);
    } catch {
      setShareFeedback(FEEDBACK_COPY_ERROR);
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_ERROR);
    }
  };

  const getTrainingOwner = (item: PortfolioItem) => item.responsavel || item.Cliente || 'responsável pelo treinamento';

  const openTrainingFeedback = (item: PortfolioItem) => {
    recordLocalCardInteractionEvent('treinamentos', item.id, 'open');
    window.open(TRAINING_FEEDBACK_SLACK_URL, '_blank', 'noopener,noreferrer');
  };

  const getTrainingFeedbackLabel = (item: PortfolioItem) =>
    `Abrir canal no Slack para reportar bug, erro ou sugestão. No Slack, marque @${getTrainingOwner(item)} e descreva o ponto encontrado em "${item.Projeto}".`;

  const menuItems = [
    { label: 'Home', icon: Home, active: false, action: onNavigateToPortfolio },
    { label: 'Processos', icon: LayoutGrid, active: false, action: onNavigateToProcessos },
    { label: 'Treinamentos', icon: BookOpen, active: true, action: undefined },
    { label: "Banco de OKR's", icon: BookMarked, active: false, action: onNavigateToKRs },
    { label: 'Agentes de IA', icon: Bot, active: false, action: onNavigateToAgentes },
    { label: 'Fórum', icon: MessageSquareMore, active: false, action: onNavigateToForum },
  ];

  return (
    <div className={pageClass}>
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

      <main className="container mx-auto px-4 py-6 pb-44 sm:px-6 sm:py-8 sm:pb-8 lg:px-8">
        <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className={sidebarClass}>
              <div className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.action}
                      disabled={!item.action}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                        item.active
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

          <div className="space-y-6" data-development-lock-content>
            <section className={heroClass}>
              <div className="absolute inset-x-0 top-0 h-2 bg-[#F78E43]" />
              <div className={heroOverlayClass} />
              <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#F78E43]">Treinamentos</p>
                  <h1 className={`mt-3 max-w-4xl text-2xl font-black leading-tight sm:text-3xl lg:text-4xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                    Seu desenvolvimento começa aqui
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                    Encontre treinamentos, trilhas de aprendizagem, materiais de onboarding e conteúdos de desenvolvimento em um só lugar. Um espaço criado para apoiar o crescimento contínuo dos colaboradores.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {['Trilhas', 'Onboarding', 'Treinamentos', 'Materiais de apoio'].map((chip) => (
                      <span
                        key={chip}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${
                          isLightMode ? 'border-zinc-200 bg-white text-zinc-700 shadow-sm' : 'border-white/12 bg-white/6 text-white/78'
                        }`}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="min-h-[260px] overflow-hidden rounded-[28px]">
                  <img src="https://picsum.photos/seed/dotspace-treinamentos/900/700" alt="Treinamentos" className="h-full w-full object-cover" />
                </div>
              </div>
            </section>

            <section
              ref={filtersRef}
              className={filtersClass}
              onPointerDownCapture={(event) => {
                if ((event.target as HTMLElement).closest('[data-filter-dropdown]')) return;
                setOpenMenu(null);
              }}
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(320px,1fr)_224px_250px] xl:items-center">
                <div className="xl:pr-4">
                  <SearchBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Buscar treinamento, categoria, tema..."
                    suggestions={searchTerm ? filteredItems : []}
                    onSuggestionClick={(item) => setExpandedTrainingId(item.id)}
                    theme={theme}
                  />
                </div>

                <div className="relative" data-filter-dropdown>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === 'area' ? null : 'area')}
                    className={filtersButtonClass}
                  >
                    <span>{areaFilter || 'Categoria'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {openMenu === 'area' && (
                    <div className={filtersMenuClass}>
                      <button
                        type="button"
                        onClick={() => {
                          setAreaFilter('');
                          setOpenMenu(null);
                        }}
                        className={filtersMenuItemClass}
                      >
                        Todas as categorias
                      </button>
                      {areas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => {
                            setAreaFilter(area);
                            setOpenMenu(null);
                          }}
                          className={filtersMenuItemClass}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative" data-filter-dropdown>
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === 'ordem' ? null : 'ordem')}
                    className={filtersButtonClass}
                  >
                    <span>{sortMode === 'recentes' ? 'Recentemente atualizado' : sortMode.toUpperCase()}</span>
                    <Filter className="h-4 w-4" />
                  </button>
                  {openMenu === 'ordem' && (
                    <div className={`${filtersMenuClass} right-0 left-auto lg:w-48`}>
                      {[
                        { label: 'Recentemente atualizado', value: 'recentes' as SortMode },
                        { label: 'A-Z', value: 'a-z' as SortMode },
                        { label: 'Z-A', value: 'z-a' as SortMode },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setSortMode(item.value);
                            setOpenMenu(null);
                          }}
                          className={filtersMenuItemClass}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <PageFilterActions
                  showFavoritesOnly={showFavoritesOnly}
                  onToggleFavorites={() => setShowFavoritesOnly((current) => !current)}
                  onShare={handleShare}
                  feedback={shareFeedback}
                  theme={theme}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setAreaFilter('');
                    setSortMode('recentes');
                  }}
                  className="rounded-full bg-[#88C125] px-4 py-2 text-sm font-bold text-white transition-colors"
                >
                  Todos
                </button>
                {areas.map((area, index) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setAreaFilter((current) => (current === area ? '' : area))}
                    className={`${filterChipBaseClass} ${
                      areaFilter === area ? 'text-white' : ''
                    }`}
                    style={areaFilter === area ? { backgroundColor: ['#88C125', '#4CD07D', '#F78E43', '#EEC137'][index % 4], borderColor: ['#88C125', '#4CD07D', '#F78E43', '#EEC137'][index % 4] } : undefined}
                  >
                    {area}
                  </button>
                ))}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      viewMode === 'grid'
                        ? 'border-[#88C125] bg-[#88C125] text-white'
                        : isLightMode
                          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          : 'border-white/10 bg-white/6 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      viewMode === 'list'
                        ? 'border-[#88C125] bg-[#88C125] text-white'
                        : isLightMode
                          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          : 'border-white/10 bg-white/6 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    <List className="h-4 w-4" />
                    Lista
                  </button>
                </div>
              </div>
            </section>

            {filteredItems.length > 0 ? (
              <>
                <section className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-4'}>
                  {paginatedItems.map((item, index) => {
                    const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                    const accent = '#F78E43';

                    return (
                      <article
                        key={item.id}
                        id={`treinamento-card-${item.id}`}
                        className={viewMode === 'grid' ? cardClass : listCardClass}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleTrainingDetails(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleTrainingDetails(item.id);
                          }
                        }}
                      >
                        {viewMode === 'grid' ? (
                          <div className="flex h-full flex-col">
                            <div className="relative h-40 overflow-hidden">
                              <img
                                src={item.Imagem_capa}
                                alt={item.Projeto}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                              <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white" style={{ backgroundColor: accent }}>
                                {item.Time || item.Cliente}
                              </span>
                            </div>

                            <div className={`flex flex-1 flex-col p-5 ${isLightMode ? 'border-t border-zinc-200/70 bg-white' : 'border-t border-white/10 bg-[#17171b]'}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h2 className={`mt-1.5 text-[1.1rem] font-black leading-tight ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                                    {item.Projeto}
                                  </h2>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                </div>
                              </div>

                              <p className={`mt-3 text-sm font-semibold ${isLightMode ? 'text-zinc-600' : 'text-white/72'}`}>
                                {item.Assunto_especifico || item.Time}
                              </p>

                            <div className={`mt-4 rounded-2xl border px-4 py-3 hidden ${isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>
                                <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>
                                  Detalhes rápidos
                                </p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Público-alvo</p>
                                    <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Publico_alvo || 'Não informado'}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Metodologia</p>
                                    <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Metodologias || 'Não informada'}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Recursos</p>
                                    <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Mídias || item.Outros_recursos || 'Não informados'}</p>
                                  </div>
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Data</p>
                                    <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Data || 'Sem data'}</p>
                                  </div>
                                </div>
                              </div>

                              <div className={`mt-4 flex flex-wrap items-center gap-2 text-xs ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    incrementViews(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <Eye className="h-3.5 w-3.5" /> {localState.views}
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleLike(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <Heart className={`h-3.5 w-3.5 ${localState.liked ? 'fill-current' : ''}`} /> {localState.likes}
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleFavorite(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <Bookmark className={`h-3.5 w-3.5 ${localState.favorited ? 'fill-current' : ''}`} /> {localState.favorited ? 'Favoritado' : 'Favorito'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleShareItem(item);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                                </button>
                                <button
                                  type="button"
                                  title={getTrainingFeedbackLabel(item)}
                                  aria-label={getTrainingFeedbackLabel(item)}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTrainingFeedback(item);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100' : 'border-orange-400/35 bg-orange-400/12 text-orange-200 hover:bg-orange-400/18'}`}
                                >
                                  <Bug className="h-3.5 w-3.5" /> Reportar erro
                                </button>
                              </div>

                              <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleTrainingDetails(item.id);
                                  }}
                                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                                    isLightMode ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
                                  }`}
                                >
                                  {expandedTrainingId === item.id ? 'Fechar detalhes' : 'Ver detalhes'}
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openAccess(item);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-full bg-[#88C125] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:brightness-95"
                                >
                                  Acessar
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              </div>

                              {expandedTrainingId === item.id && (
                                <div className={`mt-5 rounded-2xl border p-4 ${isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Categoria</p>
                                      <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Cliente || 'Treinamento'}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Tema</p>
                                      <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Assunto_especifico || 'Não informado'}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Descrição</p>
                                      <p className={`mt-1 text-sm ${isLightMode ? 'text-zinc-700' : 'text-white/78'}`}>{item.Assunto_geral}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Referência do processo</p>
                                      <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Mídias || 'Não informada'}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-0 sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
                            <div className="relative min-h-[168px] overflow-hidden sm:min-h-[190px] lg:h-full lg:min-h-0">
                              <img
                                src={item.Imagem_capa}
                                alt={item.Projeto}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                              <span className="absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white sm:left-4 sm:top-4 sm:px-3 sm:text-[10px] sm:tracking-[0.25em]" style={{ backgroundColor: accent }}>
                                {item.Time || item.Cliente}
                              </span>
                            </div>

                            <div className="p-3 sm:p-4 lg:p-5">
                              <div className="flex items-start justify-between gap-2 sm:gap-4">
                                <div className="min-w-0">
                                  <h2 className={`text-[0.98rem] font-black leading-tight sm:mt-1 sm:text-[1.08rem] ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                                    {item.Projeto}
                                  </h2>
                                  <p className={`mt-1.5 text-xs font-semibold sm:mt-2 sm:text-sm ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                                    {item.Assunto_especifico || item.Time}
                                  </p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-1.5">
                                </div>
                              </div>
                              <div className={`mt-2 flex flex-wrap items-center gap-1.5 text-[11px] sm:mt-3 sm:gap-2 sm:text-xs ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>{item.Time}</span>
                              </div>
                              <div className={`mt-2 hidden flex-wrap items-center gap-2 text-xs sm:flex ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    incrementViews(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <Eye className="h-3.5 w-3.5" /> {localState.views}
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleLike(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <Heart className={`h-3.5 w-3.5 ${localState.liked ? 'fill-current' : ''}`} /> {localState.likes}
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleFavorite(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <Bookmark className={`h-3.5 w-3.5 ${localState.favorited ? 'fill-current' : ''}`} /> {localState.favorited ? 'Favoritado' : 'Favorito'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleShareItem(item);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                                </button>
                                <button
                                  type="button"
                                  title={getTrainingFeedbackLabel(item)}
                                  aria-label={getTrainingFeedbackLabel(item)}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openTrainingFeedback(item);
                                  }}
                                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100' : 'border-orange-400/35 bg-orange-400/12 text-orange-200 hover:bg-orange-400/18'}`}
                                >
                                  <Bug className="h-3.5 w-3.5" /> Reportar erro
                                </button>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4 sm:gap-3">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleTrainingDetails(item.id);
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm ${
                                    isLightMode ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
                                  }`}
                                >
                                  {expandedTrainingId === item.id ? 'Fechar detalhes' : 'Ver detalhes'}
                                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openAccess(item);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[#88C125] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:brightness-95 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm"
                                >
                                  Acessar
                                  <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                              </div>

                              {expandedTrainingId === item.id && (
                                <div className={`mt-5 rounded-2xl border p-4 ${isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Categoria</p>
                                      <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Time}</p>
                                    </div>
                                    <div>
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Tema</p>
                                      <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Assunto_especifico}</p>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Descrição</p>
                                      <p className={`mt-1 text-sm ${isLightMode ? 'text-zinc-700' : 'text-white/78'}`}>{item.Assunto_geral}</p>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Referência do processo</p>
                                      <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Mídias || 'Não informada'}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                  );
                })}
                </section>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  theme={theme}
                  label={`${filteredItems.length} resultados`}
                />
              </>
            ) : (
              <div className={emptyStateClass}>
                <p className={`text-lg font-semibold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Nenhum treinamento encontrado.</p>
                <p className={`mt-2 text-sm ${isLightMode ? 'text-zinc-500' : 'text-white/60'}`}>Ajuste os filtros ou limpe a busca para ver mais resultados.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <MobileFooterNav
        theme={theme}
        items={menuItems.map(({ label, icon, action, active }) => ({
          label,
          icon,
          onClick: action,
          active,
        }))}
      />

    </div>
  );
};

export default TreinamentosScreen;
