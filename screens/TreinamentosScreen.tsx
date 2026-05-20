import React, { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import MobileFooterNav from '../components/MobileFooterNav';
import Pagination from '../components/Pagination';
import PageFilterActions from '../components/PageFilterActions';
import SearchBar from '../components/SearchBar';
import { useLocalCardInteractions } from '../hooks/useLocalCardInteractions';
import type { PortfolioItem } from '../types';
import { treinamentosItems } from '../data/treinamentosItems';
import { FEEDBACK_COPY_ERROR, FEEDBACK_COPY_SUCCESS, FEEDBACK_TIMEOUT_ERROR, FEEDBACK_TIMEOUT_SUCCESS } from '../constants/feedbackMessages';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Eye,
  ExternalLink,
  Filter,
  Home,
  Heart,
  LayoutGrid,
  BookMarked,
  MessageSquareMore,
  Bookmark,
  Share2,
} from 'lucide-react';
import type { User } from 'firebase/auth';

type SortMode = 'recentes' | 'a-z' | 'z-a';

interface TreinamentosScreenProps {
  user: User | null;
  isLoggedIn: boolean;
  onNavigateToPortfolio: () => void;
  onNavigateToProcessos: () => void;
  onNavigateToKRs: () => void;
  onNavigateToForum: () => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  offlineMode?: boolean;
}

const compareByDateDesc = (a: PortfolioItem, b: PortfolioItem) => {
  const dateA = Date.parse(a.Data || '');
  const dateB = Date.parse(b.Data || '');
  if (dateA !== dateB) return dateB - dateA;
  return a.Projeto.localeCompare(b.Projeto, 'pt-BR');
};

const TreinamentosScreen: React.FC<TreinamentosScreenProps> = ({
  user,
  isLoggedIn,
  onNavigateToPortfolio,
  onNavigateToProcessos,
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
  const [currentPage, setCurrentPage] = useState(1);
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
  const heroStatClass = isLightMode ? 'min-h-[112px] rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm backdrop-blur-sm' : 'min-h-[112px] rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm';
  const filtersClass = isLightMode
    ? 'relative z-40 space-y-4 rounded-[30px] border border-zinc-200 bg-white p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)] sm:p-6'
    : 'relative z-40 space-y-4 rounded-[30px] border border-white/10 bg-[#151517] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.2)] sm:p-6';
  const filtersButtonClass = isLightMode
    ? 'inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 lg:w-48'
    : 'inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 lg:w-48';
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

  const pageSize = 4;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, areaFilter, sortMode, showFavoritesOnly]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!expandedTrainingId) return;
    if (!filteredItems.some((item) => item.id === expandedTrainingId)) {
      setExpandedTrainingId(null);
    }
  }, [filteredItems, expandedTrainingId]);

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
    window.open(item.Link_PMV, '_blank', 'noopener,noreferrer');
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

  const stats = [
    { label: 'Treinamentos', value: treinamentosItems.length, accent: '#4CD07D' },
    { label: 'Áreas', value: areas.length, accent: '#F78E43' },
    { label: 'Últimos acessos', value: filteredItems.length, accent: '#EEC137' },
    { label: 'Módulos', value: 8, accent: '#88C125' },
  ];

  const menuItems = [
    { label: 'Home', icon: Home, active: false, action: onNavigateToPortfolio },
    { label: 'Processos', icon: LayoutGrid, active: false, action: onNavigateToProcessos },
    { label: 'Treinamentos', icon: BookOpen, active: true, action: undefined },
    { label: "Banco de KR's", icon: BookMarked, active: false, action: onNavigateToKRs },
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

      <main className="container mx-auto px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-8 lg:px-8">
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
            <section className={heroClass}>
              <div className="absolute inset-x-0 top-0 h-2 bg-[#F78E43]" />
              <div className={heroOverlayClass} />
              <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#F78E43]">Treinamentos</p>
                  <h1 className={`mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                    Um hub para manter todos os colaboradores atualizados
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                    Conteúdos de aprendizagem, onboarding e cultura organizados com visual leve, cores do guia e navegação rápida.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {['Onboarding', 'Cultura', 'Habilidades', 'Favoritos'].map((chip) => (
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

                <div className="grid grid-cols-2 gap-3">
                  {stats.map((item) => (
                    <div key={item.label} className={heroStatClass}>
                      <div className="mb-3 h-1.5 w-16 rounded-full" style={{ backgroundColor: item.accent }} />
                      <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>{item.label}</p>
                      <p className={`mt-2 text-3xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={filtersClass}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
                <div className="lg:pr-4">
                  <SearchBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Buscar treinamento, área, tema..."
                    suggestions={searchTerm ? filteredItems : []}
                    onSuggestionClick={(item) => setExpandedTrainingId(item.id)}
                    theme={theme}
                  />
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === 'area' ? null : 'area')}
                    className={filtersButtonClass}
                  >
                    <span>{areaFilter || 'Área'}</span>
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
                        Todas as áreas
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
                    onClick={() => setOpenMenu(openMenu === 'ordem' ? null : 'ordem')}
                    className={filtersButtonClass}
                  >
                    <span>{sortMode === 'recentes' ? 'Ordem' : sortMode.toUpperCase()}</span>
                    <Filter className="h-4 w-4" />
                  </button>
                  {openMenu === 'ordem' && (
                    <div className={`${filtersMenuClass} right-0 left-auto lg:w-48`}>
                      {[
                        { label: 'Recentes', value: 'recentes' as SortMode },
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
              </div>
            </section>

            {filteredItems.length > 0 ? (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedItems.map((item, index) => {
                    const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));

                    return (
                      <article
                        key={item.id}
                        className={cardClass}
                      >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={item.Imagem_capa}
                          alt={item.Projeto}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                        <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white" style={{ backgroundColor: ['#88C125', '#4CD07D', '#F78E43', '#EEC137'][index % 4] }}>
                          {item.Time || item.Cliente}
                        </span>
                      </div>

                      <div className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#88C125]">
                          {item.Time}
                        </p>
                        <h2 className={`mt-2 text-xl font-black leading-tight ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{item.Projeto}</h2>
                        <p className={`mt-3 text-sm leading-7 ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>{item.Assunto_geral}</p>
                        <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>
                          <button
                            type="button"
                            onClick={() => incrementViews(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned))}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                          >
                            <Eye className="h-3.5 w-3.5" /> {localState.views}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLike(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned))}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${localState.liked ? 'fill-current' : ''}`} /> {localState.likes}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned))}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                          >
                            <Bookmark className={`h-3.5 w-3.5 ${localState.favorited ? 'fill-current' : ''}`} /> {localState.favorited ? 'Favoritado' : 'Favorito'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareItem(item)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                          >
                            <Share2 className="h-3.5 w-3.5" /> Compartilhar
                          </button>
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setExpandedTrainingId((current) => (current === item.id ? null : item.id))}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                              isLightMode ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
                            }`}
                          >
                            {expandedTrainingId === item.id ? 'Fechar detalhes' : 'Ver detalhes'}
                            <ArrowRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openAccess(item)}
                            className="inline-flex items-center gap-2 rounded-full bg-[#88C125] px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-95"
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
                                <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Data</p>
                                <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Data || 'Sem data'}</p>
                              </div>
                              <div>
                                <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Público-alvo</p>
                                <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Publico_alvo || 'Não informado'}</p>
                              </div>
                              <div>
                                <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Metodologia</p>
                                <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-800' : 'text-white/88'}`}>{item.Metodologias || 'Não informada'}</p>
                              </div>
                            </div>
                          </div>
                        )}
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
