import React, { useEffect, useMemo, useRef, useState } from 'react';
import MobileFooterNav from '../components/MobileFooterNav';
import Pagination from '../components/Pagination';
import PageFilterActions from '../components/PageFilterActions';
import SearchBar from '../components/SearchBar';
import { useLocalCardInteractions, recordLocalCardInteractionEvent } from '../hooks/useLocalCardInteractions';
import { agentesItems, AiAgent } from '../data/agentesItems';
import { FEEDBACK_COPY_ERROR, FEEDBACK_COPY_SUCCESS, FEEDBACK_TIMEOUT_ERROR, FEEDBACK_TIMEOUT_SUCCESS } from '../constants/feedbackMessages';
import {
  ArrowRight,
  Bot,
  Building2,
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
  Bug,
  BookOpen,
  UserRound,
  Sparkles,
  Terminal,
  Cpu,
  Workflow
} from 'lucide-react';
import type { User } from 'firebase/auth';
import aiHeroImage from '../assets/hero-agentes-ia.png';

type SortMode = 'recentes' | 'a-z' | 'z-a';

interface AgentesScreenProps {
  user: User | null;
  isLoggedIn: boolean;
  onNavigateToPortfolio: () => void;
  onNavigateToProcessos: () => void;
  onNavigateToTreinamentos: () => void;
  onNavigateToKRs: () => void;
  onNavigateToForum: () => void;
  onNavigateToAgentes?: () => void;
  onNavigateToOrganograma: () => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  offlineMode?: boolean;
}

const AgentesScreen: React.FC<AgentesScreenProps> = ({
  user,
  isLoggedIn,
  onNavigateToPortfolio,
  onNavigateToProcessos,
  onNavigateToTreinamentos,
  onNavigateToKRs,
  onNavigateToForum,
  onNavigateToOrganograma,
  onNavigateToAdmin,
  onLogout,
  theme,
  toggleTheme,
  offlineMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('recentes');
  const [openMenu, setOpenMenu] = useState<'ordem' | 'area' | 'categoria' | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  const filtersRef = useRef<HTMLElement | null>(null);
  const { getState, incrementViews, toggleLike, toggleFavorite, registerShare } = useLocalCardInteractions('agentes');
  const isLightMode = theme === 'light';
  const pageClass = isLightMode ? 'min-h-screen bg-gray-100 text-zinc-900 transition-colors duration-300' : 'min-h-screen bg-[#111114] text-white transition-colors duration-300';
  const sidebarClass = isLightMode
    ? 'sticky top-24 rounded-[30px] border border-zinc-200 bg-white p-6 text-zinc-900 shadow-[0_30px_80px_rgba(15,23,42,0.08)]'
    : 'sticky top-24 rounded-[30px] border border-white/10 bg-[#151517] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]';
  const heroClass = isLightMode
    ? 'relative overflow-hidden rounded-[34px] border border-zinc-200 bg-gradient-to-br from-white via-[#fbfcf7] to-[#eef4f8] px-6 py-8 text-zinc-900 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10'
    : 'relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#181a20] via-[#1b2230] to-[#111112] px-6 py-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)] sm:px-8 sm:py-10';
  const heroOverlayClass = isLightMode
    ? 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_26%)]'
    : 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_26%)]';
  const filtersClass = isLightMode
    ? 'relative z-40 space-y-4 rounded-[30px] border border-zinc-200 bg-white p-4 shadow-[0_25px_60px_rgba(15,23,42,0.08)] sm:p-5'
    : 'relative z-40 space-y-4 rounded-[30px] border border-white/10 bg-[#151517] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.2)] sm:p-5';
  const filtersButtonClass = isLightMode
    ? 'inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 lg:w-48'
    : 'inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 lg:w-48';
  const filtersMenuClass = isLightMode
    ? 'absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl'
    : 'absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b20] shadow-2xl';
  const filtersMenuItemClass = isLightMode
    ? 'w-full px-4 py-3 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50'
    : 'w-full px-4 py-3 text-left text-sm font-semibold text-white/80 hover:bg-white/6';
  const cardClass = isLightMode
    ? 'group overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1'
    : 'group overflow-hidden rounded-[28px] border border-white/10 bg-[#17171b] shadow-[0_20px_50px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-1';
  const listCardClass = isLightMode
    ? 'group overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1'
    : 'group overflow-hidden rounded-[28px] border border-white/10 bg-[#17171b] shadow-[0_20px_50px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-1';

  const areas = useMemo(
    () => Array.from(new Set(agentesItems.map((item) => item.area))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    []
  );

  const categories = useMemo(
    () => Array.from(new Set(agentesItems.map((item) => item.categoria))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    []
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const items = agentesItems.filter((item) => {
      const matchesSearch =
        !term ||
        [item.nome, item.descricao, item.area, item.categoria, item.processo, item.perfil, item.ferramenta, item.responsavel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesArea = !areaFilter || item.area === areaFilter;
      const matchesCategory = !categoryFilter || item.categoria === categoryFilter;

      const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
      const matchesFavorite = !showFavoritesOnly || localState.favorited;

      return matchesSearch && matchesArea && matchesCategory && matchesFavorite;
    });

    return items.sort((a, b) => {
      if (sortMode === 'a-z') return a.nome.localeCompare(b.nome, 'pt-BR');
      if (sortMode === 'z-a') return b.nome.localeCompare(a.nome, 'pt-BR');
      // default: pinned first, then by views/id
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [searchTerm, areaFilter, categoryFilter, sortMode, showFavoritesOnly, getState]);

  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, areaFilter, categoryFilter, sortMode, showFavoritesOnly]);

  useEffect(() => {
    const closeOpenMenu = (event: PointerEvent) => {
      if (openMenu && filtersRef.current && !filtersRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('pointerdown', closeOpenMenu);
    return () => document.removeEventListener('pointerdown', closeOpenMenu);
  }, [openMenu]);

  const handleShareItem = (item: AiAgent) => {
    const shareUrl = `${window.location.origin}/#agentes-${item.id}`;
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        setShareFeedback(FEEDBACK_COPY_SUCCESS);
        registerShare(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
        setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_SUCCESS);
      },
      () => {
        setShareFeedback(FEEDBACK_COPY_ERROR);
        setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_ERROR);
      }
    );
  };

  const handleSharePage = () => {
    navigator.clipboard.writeText(`${window.location.origin}?view=agentes`).then(
      () => {
        setShareFeedback(FEEDBACK_COPY_SUCCESS);
        setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_SUCCESS);
      },
      () => {
        setShareFeedback(FEEDBACK_COPY_ERROR);
        setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_ERROR);
      }
    );
  };

  const toggleAgentDetails = (id: string) => {
    if (expandedAgentId === id) {
      setExpandedAgentId(null);
    } else {
      setExpandedAgentId(id);
      const currentItem = agentesItems.find((item) => item.id === id);
      if (currentItem) {
        incrementViews(id, currentItem.views ?? 0, currentItem.likes ?? 0, Boolean(currentItem.pinned));
      }
    }
  };

  const getAgentOwnerLabel = (item: AiAgent) =>
    `Abrir canal no Slack para reportar bug ou sugestão sobre o agente "${item.nome}". Responsável: @${item.responsavel}.`;

  const menuItems = [
    { label: 'Home', icon: Home, active: false, action: onNavigateToPortfolio },
    { label: 'Processos', icon: LayoutGrid, active: false, action: onNavigateToProcessos },
    { label: 'Treinamentos', icon: BookOpen, active: false, action: onNavigateToTreinamentos },
    { label: "Banco de OKR's", icon: BookMarked, active: false, action: onNavigateToKRs },
    { label: 'Agentes de IA', icon: Bot, active: true, action: undefined },
    { label: 'Organograma', icon: Building2, active: false, action: onNavigateToOrganograma },
    { label: 'Fórum', icon: MessageSquareMore, active: false, action: onNavigateToForum },
  ];

  const mobileFooterItems = menuItems.map(item => ({
    label: item.label,
    icon: item.icon,
    active: item.active,
    onClick: item.action
  }));

  return (
    <div className={pageClass}>
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

          <div className="space-y-6">
            {/* Hero Section */}
            <section className={heroClass}>
              <div className="absolute inset-x-0 top-0 h-2 bg-[#3B82F6]" />
              <div className={heroOverlayClass} />
              <div className="relative z-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)] md:items-center">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                    <Sparkles className="h-3.5 w-3.5" /> Hub de Inteligência
                  </span>
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    Agentes de IA & Prompts
                  </h1>
                  <p className={`max-w-xl text-sm leading-relaxed sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    Acelere suas entregas e automatize fluxos de trabalho usando nossa biblioteca interna de assistentes cognitivos e prompts otimizados.
                  </p>
                </div>
                <div className="h-[220px] overflow-hidden rounded-[28px] sm:h-[260px]">
                  <img
                    src={aiHeroImage}
                    alt="Representação visual de inteligência artificial conectada"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </section>

            {/* Filter Section */}
            <section ref={filtersRef} className={filtersClass}>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                <SearchBar
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  placeholder="Pesquisar por nome, ferramenta, processo ou perfil..."
                  theme={theme}
                />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === 'area' ? null : 'area')}
                    className={filtersButtonClass}
                  >
                    <span className="truncate">{areaFilter || 'Todas as Áreas'}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openMenu === 'area' ? 'rotate-180' : ''}`} />
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
                        Todas as Áreas
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

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === 'categoria' ? null : 'categoria')}
                    className={filtersButtonClass}
                  >
                    <span className="truncate">{categoryFilter || 'Todas Categorias'}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openMenu === 'categoria' ? 'rotate-180' : ''}`} />
                  </button>
                  {openMenu === 'categoria' && (
                    <div className={filtersMenuClass}>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter('');
                          setOpenMenu(null);
                        }}
                        className={filtersMenuItemClass}
                      >
                        Todas Categorias
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(cat);
                            setOpenMenu(null);
                          }}
                          className={filtersMenuItemClass}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === 'ordem' ? null : 'ordem')}
                    className={filtersButtonClass}
                  >
                    <span className="truncate">Ordenar por</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openMenu === 'ordem' ? 'rotate-180' : ''}`} />
                  </button>
                  {openMenu === 'ordem' && (
                    <div className={filtersMenuClass}>
                      <button
                        type="button"
                        onClick={() => {
                          setSortMode('recentes');
                          setOpenMenu(null);
                        }}
                        className={filtersMenuItemClass}
                      >
                        Relevância / Fixados
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortMode('a-z');
                          setOpenMenu(null);
                        }}
                        className={filtersMenuItemClass}
                      >
                        Nome (A - Z)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSortMode('z-a');
                          setOpenMenu(null);
                        }}
                        className={filtersMenuItemClass}
                      >
                        Nome (Z - A)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags & Action Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200/50 pt-4 dark:border-white/5">
                <div className="flex flex-wrap items-center gap-2">
                  <PageFilterActions
                    theme={theme}
                    showFavoritesOnly={showFavoritesOnly}
                    onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    onShare={handleSharePage}
                    feedback={shareFeedback}
                  />
                  {Boolean(searchTerm || areaFilter || categoryFilter || showFavoritesOnly) && (
                    <button type="button" className="text-xs font-bold text-zinc-500 hover:text-[#88C125]" onClick={() => {
                      setSearchTerm('');
                      setAreaFilter('');
                      setCategoryFilter('');
                      setShowFavoritesOnly(false);
                    }}>
                      Limpar filtros
                    </button>
                  )}
                </div>

                {/* View switcher */}
                <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-1 dark:bg-white/6">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-xs font-bold transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-zinc-950 shadow-sm dark:bg-[#1a1b1e] dark:text-white'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-xs font-bold transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-zinc-950 shadow-sm dark:bg-[#1a1b1e] dark:text-white'
                        : 'text-zinc-500 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white'
                    }`}
                  >
                    <List className="h-4 w-4" />
                    Lista
                  </button>
                </div>
              </div>
            </section>

            {/* List / Grid Display */}
            {filteredItems.length > 0 ? (
              <>
                <section className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-4'}>
                  {paginatedItems.map((item) => {
                    const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                    const isPrompt = item.categoria === 'Prompt';
                    const iconColor = isPrompt ? '#8B5CF6' : '#10B981';

                    return (
                      <article
                        key={item.id}
                        id={`agente-card-${item.id}`}
                        className={viewMode === 'grid' ? cardClass : listCardClass}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleAgentDetails(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleAgentDetails(item.id);
                          }
                        }}
                      >
                        <div className="flex h-full flex-col">
                          {/* Top bar color indicator or simple graphic */}
                          <div 
                            className="h-2.5 w-full"
                            style={{ backgroundColor: iconColor }}
                          />

                          <div className={`flex flex-1 flex-col p-5 bg-white dark:bg-[#17171b]`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {isPrompt ? (
                                    <Terminal className="h-4 w-4" style={{ color: iconColor }} />
                                  ) : (
                                    <Cpu className="h-4 w-4" style={{ color: iconColor }} />
                                  )}
                                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>
                                    {item.categoria} &bull; {item.area}
                                  </span>
                                </div>
                                <h2 className={`mt-1.5 text-[1.1rem] font-black leading-tight ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                                  {item.nome}
                                </h2>
                              </div>
                              {item.pinned && (
                                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-blue-500">
                                  Destaque
                                </span>
                              )}
                            </div>

                            <p className={`mt-3 text-sm font-semibold ${isLightMode ? 'text-zinc-600' : 'text-white/72'}`}>{item.processo}</p>

                            {/* Metrics Buttons */}
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
                                <Heart className={`h-3.5 w-3.5 ${localState.liked ? 'fill-current text-red-500 border-red-200/50' : ''}`} /> {localState.likes}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleFavorite(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                                }}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                              >
                                <Bookmark className={`h-3.5 w-3.5 ${localState.favorited ? 'fill-current text-yellow-500 border-yellow-200/50' : ''}`} /> {localState.favorited ? 'Favoritado' : 'Favorito'}
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
                                title={getAgentOwnerLabel(item)}
                                aria-label={getAgentOwnerLabel(item)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  // Open Slack integration or generic trigger
                                  window.open('https://dot-digital-group.slack.com/archives/C0BNBD4S16D', '_blank');
                                }}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100' : 'border-orange-400/35 bg-orange-400/12 text-orange-200 hover:bg-orange-400/18'}`}
                              >
                                <Bug className="h-3.5 w-3.5" /> Feedback
                              </button>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-200/50 dark:border-white/5">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleAgentDetails(item.id);
                                }}
                                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                                  isLightMode ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
                                }`}
                              >
                                {expandedAgentId === item.id ? 'Fechar detalhes' : 'Ver detalhes'}
                                <ArrowRight className="h-4 w-4" />
                              </button>
                              {item.linkStudiON && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    window.open(item.linkStudiON, '_blank');
                                  }}
                                  className="inline-flex items-center gap-2 rounded-full bg-[#88C125] px-3.5 py-2 text-sm font-bold text-white transition-colors hover:brightness-95"
                                >
                                  Acessar StudiON
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            {/* Expandable Details Container */}
                            {expandedAgentId === item.id && (
                              <div className={`mt-5 rounded-2xl border p-4 text-xs space-y-3 ${isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>
                                <div>
                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Descrição</p>
                                  <p className={`mt-1 text-sm ${isLightMode ? 'text-zinc-700' : 'text-white/78'}`}>{item.descricao}</p>
                                </div>
                                <div>
                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Ferramenta</p>
                                  <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.ferramenta}</p>
                                </div>
                                <div>
                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Perfil recomendado</p>
                                  <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.perfil}</p>
                                </div>
                                <div>
                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Responsável técnico</p>
                                  <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.responsavel}</p>
                                </div>
                                {item.materialDrive && (
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Material complementar (Drive)</p>
                                    <p className={`mt-1 text-sm font-semibold text-blue-500 dark:text-blue-400 font-mono`}>{item.materialDrive}</p>
                                  </div>
                                )}
                                {item.status && (
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Status da implantação</p>
                                    <span className="mt-1 inline-block rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-500">
                                      {item.status}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </section>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  theme={theme}
                />
              </>
            ) : (
              <div className={isLightMode ? 'rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm' : 'rounded-[28px] border border-white/10 bg-[#16161a] px-6 py-12 text-center'}>
                <Bot className="mx-auto h-12 w-12 text-zinc-500 dark:text-white/30" />
                <h3 className="mt-4 text-lg font-bold">Nenhum agente encontrado</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-white/40">
                  Tente alterar seus filtros ou termo de busca.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Floating feedback feedback toast */}
      {shareFeedback && (
        <div className="fixed bottom-24 right-6 z-50 rounded-xl bg-[#88C125] px-4 py-3 text-sm font-semibold text-white shadow-2xl animate-fade-in-up">
          {shareFeedback}
        </div>
      )}

      <MobileFooterNav theme={theme} items={mobileFooterItems} />
    </div>
  );
};

export default AgentesScreen;
