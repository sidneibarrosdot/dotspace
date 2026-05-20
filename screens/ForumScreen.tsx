import React, { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import MobileFooterNav from '../components/MobileFooterNav';
import Pagination from '../components/Pagination';
import PageFilterActions from '../components/PageFilterActions';
import { forumItems, type ForumItem } from '../data/forumItems';
import { FEEDBACK_COPY_ERROR, FEEDBACK_COPY_SUCCESS, FEEDBACK_TIMEOUT_ERROR, FEEDBACK_TIMEOUT_SUCCESS } from '../constants/feedbackMessages';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock3,
  Eye,
  Home,
  LayoutGrid,
  BookMarked,
  MessageSquareMore,
  Filter,
  MessageCircle,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react';
import type { User } from 'firebase/auth';

type SortMode = 'recentes' | 'mais-replies' | 'mais-views';

interface ForumScreenProps {
  user: User | null;
  isLoggedIn: boolean;
  onNavigateToPortfolio: () => void;
  onNavigateToProcessos: () => void;
  onNavigateToTreinamentos: () => void;
  onNavigateToKRs: () => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  offlineMode?: boolean;
}

const compareByDateDesc = (a: ForumItem, b: ForumItem) => Date.parse(b.lastActivity) - Date.parse(a.lastActivity);

const statusTone: Record<NonNullable<ForumItem['status']>, { dark: string; light: string }> = {
  Aberto: {
    dark: 'border-[#88C125]/30 bg-[#88C125]/10 text-[#d9ffac]',
    light: 'border-[#88C125]/40 bg-[#88C125]/16 text-[#355c0e]',
  },
  'Em destaque': {
    dark: 'border-[#EEC137]/30 bg-[#EEC137]/10 text-[#fff0b8]',
    light: 'border-[#EEC137]/45 bg-[#EEC137]/16 text-[#7f5b07]',
  },
  Resolvido: {
    dark: 'border-[#4CD07D]/30 bg-[#4CD07D]/10 text-[#d6ffe7]',
    light: 'border-[#4CD07D]/40 bg-[#4CD07D]/16 text-[#166a41]',
  },
};

const ForumScreen: React.FC<ForumScreenProps> = ({
  user,
  isLoggedIn,
  onNavigateToPortfolio,
  onNavigateToProcessos,
  onNavigateToTreinamentos,
  onNavigateToKRs,
  onNavigateToAdmin,
  onLogout,
  theme,
  toggleTheme,
  offlineMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('recentes');
  const [openMenu, setOpenMenu] = useState<'categoria' | 'ordem' | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const isLightMode = theme === 'light';
  const pageClass = isLightMode ? 'min-h-screen bg-gray-100 text-zinc-900 transition-colors duration-300' : 'min-h-screen bg-[#111114] text-white transition-colors duration-300';
  const sidebarClass = isLightMode
    ? 'sticky top-24 rounded-[30px] border border-zinc-200 bg-white p-6 text-zinc-900 shadow-[0_30px_80px_rgba(15,23,42,0.08)]'
    : 'sticky top-24 rounded-[30px] border border-white/10 bg-[#151517] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]';
  const heroClass = isLightMode
    ? 'relative overflow-hidden rounded-[34px] border border-zinc-200 bg-gradient-to-br from-white via-[#f7f7f8] to-[#eef0f3] px-6 py-8 text-zinc-900 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10'
    : 'relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#1d1d22] via-[#232329] to-[#111112] px-6 py-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)] sm:px-8 sm:py-10';
  const heroOverlayClass = isLightMode
    ? 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.04),transparent_26%)]'
    : 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,193,55,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_26%)]';
  const heroStatClass = isLightMode
    ? 'min-h-[112px] rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm backdrop-blur-sm'
    : 'min-h-[112px] rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm';
  const filtersClass = isLightMode
    ? 'relative z-40 space-y-4 rounded-[30px] border border-zinc-200 bg-white p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)] sm:p-6'
    : 'relative z-40 space-y-4 rounded-[30px] border border-white/10 bg-[#151517] p-5 shadow-[0_25px_60px_rgba(0,0,0,0.2)] sm:p-6';
  const filtersButtonClass = isLightMode
    ? 'inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 xl:w-48'
    : 'inline-flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 xl:w-48';
  const filtersMenuClass = isLightMode
    ? 'absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl'
    : 'absolute left-0 top-full z-[90] mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b20] shadow-2xl';
  const filtersMenuItemClass = isLightMode
    ? 'w-full px-4 py-3 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50'
    : 'w-full px-4 py-3 text-left text-sm font-semibold text-white/80 hover:bg-white/6';
  const filterChipBaseClass = isLightMode
    ? 'rounded-full border px-4 py-2 text-sm font-semibold transition-colors border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
    : 'rounded-full border px-4 py-2 text-sm font-semibold transition-colors border-white/10 bg-white/6 text-white/75 hover:bg-white/10';
  const listItemClass = isLightMode
    ? 'group overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)] transition-transform hover:-translate-y-0.5'
    : 'group overflow-hidden rounded-[26px] border border-white/10 bg-[#17171b] shadow-[0_16px_45px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-0.5';
  const cardTextClass = isLightMode ? 'text-zinc-600' : 'text-white/70';
  const forumSidebarClass = isLightMode
    ? 'rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]'
    : 'rounded-[28px] border border-white/10 bg-[#16161a] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)]';
  const forumSidebarItemClass = isLightMode
    ? 'rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition-colors hover:bg-zinc-100'
    : 'rounded-2xl border border-white/8 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10';
  const forumSidebarChipClass = isLightMode
    ? 'rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50'
    : 'rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10';
  const categories = useMemo(() => Array.from(new Set(forumItems.map((item) => item.category))).sort((a, b) => a.localeCompare(b, 'pt-BR')), []);
  const topThreads = useMemo(() => [...forumItems].sort((a, b) => b.views - a.views).slice(0, 4), []);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = forumItems.filter((item) => {
      const matchesSearch =
        !term ||
        [item.title, item.excerpt, item.category, item.author, item.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesFavorites = !showFavoritesOnly || Boolean(item.pinned);
      return matchesSearch && matchesCategory && matchesFavorites;
    });

    const sorted = [...items];
    if (sortMode === 'mais-replies') {
      sorted.sort((a, b) => b.replies - a.replies);
    } else if (sortMode === 'mais-views') {
      sorted.sort((a, b) => b.views - a.views);
    } else {
      sorted.sort(compareByDateDesc);
    }
    return sorted;
  }, [searchTerm, categoryFilter, sortMode, showFavoritesOnly]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage]
  );

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'forum');
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) url.searchParams.set('q', trimmedSearch);
    else url.searchParams.delete('q');
    if (categoryFilter) url.searchParams.set('category', categoryFilter);
    else url.searchParams.delete('category');
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, sortMode, showFavoritesOnly]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!expandedThreadId) return;
    if (!filteredItems.some((item) => item.id === expandedThreadId)) {
      setExpandedThreadId(null);
    }
  }, [filteredItems, expandedThreadId]);

  const stats = [
    { label: 'Tópicos', value: forumItems.length, accent: '#EEC137' },
    { label: 'Categorias', value: categories.length, accent: '#F78E43' },
    { label: 'Respostas', value: forumItems.reduce((sum, item) => sum + item.replies, 0), accent: '#4CD07D' },
    { label: 'Em destaque', value: forumItems.filter((item) => item.pinned).length, accent: '#88C125' },
  ];

  const menuItems = [
    { label: 'Home', icon: Home, action: onNavigateToPortfolio },
    { label: 'Processos', icon: LayoutGrid, action: onNavigateToProcessos },
    { label: 'Treinamentos', icon: BookOpen, action: onNavigateToTreinamentos },
    { label: "Banco de KR's", icon: BookMarked, action: onNavigateToKRs },
    { label: 'Fórum', icon: MessageSquareMore, action: undefined, active: true },
  ];

  const MetaBlock: React.FC<{ label: string; value: string; accent?: string; theme: 'light' | 'dark' }> = ({
    label,
    value,
    accent,
    theme: blockTheme,
  }) => {
    const blockLight = blockTheme === 'light';
    const valueClass = accent || (blockLight ? 'text-zinc-700' : 'text-white/78');

    return (
      <div className={`rounded-2xl border p-3 ${blockLight ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-white/5'}`}>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${blockLight ? 'text-zinc-500' : 'text-white/40'}`}>{label}</p>
        <p className={`mt-2 text-sm font-semibold leading-6 ${valueClass}`}>{value}</p>
      </div>
    );
  };

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
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-300" />
              <div className={heroOverlayClass} />
              <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#EEC137]">Fórum</p>
                  <h1 className={`mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                    Um espaço vivo para discutir, resolver e compartilhar.
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                    A comunidade da DOT para perguntas rápidas, alinhamentos entre áreas e tópicos recorrentes do time.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {['Perguntas', 'Boas práticas', 'Ideias', 'Resoluções'].map((chip) => (
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
                    <div
                      key={item.label}
                      className={heroStatClass}
                    >
                      <div className="mb-3 h-1.5 w-16 rounded-full" style={{ backgroundColor: item.accent }} />
                      <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>{item.label}</p>
                      <p className={`mt-2 text-3xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={filtersClass}>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] xl:items-center">
                <div className="xl:pr-4">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <MessageCircle className={`h-5 w-5 ${isLightMode ? 'text-zinc-400' : 'text-white/45'}`} />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar tópico, categoria, autor..."
                      className={`w-full rounded-full border py-3 pl-12 pr-4 outline-none transition-colors ${
                        isLightMode
                          ? 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-[#88C125] focus:bg-white'
                          : 'border-white/10 bg-white/6 text-white placeholder:text-white/40 focus:border-[#88C125] focus:bg-white/8'
                      }`}
                    />
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === 'categoria' ? null : 'categoria')}
                    className={filtersButtonClass}
                  >
                    <span>{categoryFilter || 'Categoria'}</span>
                    <ChevronDown className="h-4 w-4" />
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
                        Todas as categorias
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(category);
                            setOpenMenu(null);
                          }}
                          className={filtersMenuItemClass}
                        >
                          {category}
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
                    <div className={`${filtersMenuClass} right-0 left-auto xl:w-48`}>
                      {[
                        { label: 'Recentes', value: 'recentes' as SortMode },
                        { label: 'Mais respostas', value: 'mais-replies' as SortMode },
                        { label: 'Mais visualizações', value: 'mais-views' as SortMode },
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
                    setCategoryFilter('');
                    setSortMode('recentes');
                  }}
                  className="rounded-full bg-[#88C125] px-4 py-2 text-sm font-bold text-white transition-colors"
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setCategoryFilter((current) => (current === category ? '' : category))}
                    className={`${filterChipBaseClass} ${categoryFilter === category ? 'text-white' : ''}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.36em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Perguntas principais</p>
                    <h2 className={`mt-2 text-2xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Últimas discussões do time</h2>
                  </div>
                  <p className={`hidden text-sm ${isLightMode ? 'text-zinc-500' : 'text-white/55'} sm:block`}>{filteredItems.length} tópicos</p>
                </div>

                <div className="space-y-4">
                  {paginatedItems.map((item) => {
                    const statusKey = item.status || 'Aberto';
                    return (
                      <article key={item.id} className={`${listItemClass} relative`}>
                        <div
                          className={`absolute left-0 top-0 h-full w-1.5 ${isLightMode ? '' : 'bg-[#cfd3d8]'}`}
                          style={isLightMode ? { backgroundColor: '#cfd3d8', opacity: 0.95 } : { opacity: 0.95 }}
                        />
                        <div className="grid gap-4 p-5 lg:grid-cols-[92px_minmax(0,1fr)_auto] lg:items-start">
                          <div className="flex gap-2 lg:flex-col">
                            <div className={`flex min-w-[42px] flex-1 items-center justify-center gap-1 rounded-2xl border px-3 py-2 text-xs font-semibold ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-600' : 'border-white/10 bg-white/5 text-white/68'}`}>
                              <Eye className="h-3.5 w-3.5" />
                              {item.views}
                            </div>
                            <div className={`flex min-w-[42px] flex-1 items-center justify-center gap-1 rounded-2xl border px-3 py-2 text-xs font-semibold ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-600' : 'border-white/10 bg-white/5 text-white/68'}`}>
                              <MessageCircle className="h-3.5 w-3.5" />
                              {item.replies}
                            </div>
                            <div className={`hidden rounded-2xl border px-3 py-2 text-[11px] font-semibold lg:flex ${statusTone[statusKey as NonNullable<ForumItem['status']>][isLightMode ? 'light' : 'dark']}`}>
                              {statusKey}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[#EEC137]">{item.category}</p>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/10 bg-white/5 text-white/55'}`}>
                                {item.author}
                              </span>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'border-zinc-200 bg-white text-zinc-500' : 'border-white/10 bg-white/6 text-white/55'}`}>
                                <Clock3 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                                {item.lastActivity}
                              </span>
                            </div>

                            <h3 className={`mt-2 text-2xl font-black leading-tight ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{item.title}</h3>
                            <p className={`mt-3 max-w-3xl text-sm leading-7 ${cardTextClass}`}>{item.excerpt}</p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {[item.category, item.author, item.status || 'Aberto'].map((tagText) => (
                                <span
                                  key={tagText}
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                    isLightMode ? 'border-zinc-200 bg-white text-zinc-600' : 'border-white/10 bg-white/5 text-white/68'
                                  }`}
                                >
                                  {tagText}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-[180px] lg:flex-col">
                            <button
                              type="button"
                              onClick={() => setExpandedThreadId((current) => (current === item.id ? null : item.id))}
                              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors ${
                                isLightMode ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
                              }`}
                            >
                              {expandedThreadId === item.id ? 'Fechar detalhes' : 'Ver detalhes'}
                              <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#88C125] px-4 py-3 text-sm font-bold text-white transition-colors hover:brightness-95"
                            >
                              Responder
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {expandedThreadId === item.id && (
                          <div className={`border-t px-5 py-5 ${isLightMode ? 'border-zinc-200 bg-zinc-50/70' : 'border-white/8 bg-black/18'}`}>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <MetaBlock label="Categoria" value={item.category} theme={theme} />
                              <MetaBlock label="Autor" value={item.author} theme={theme} />
                              <MetaBlock label="Respostas" value={String(item.replies)} theme={theme} />
                              <MetaBlock label="Visualizações" value={String(item.views)} theme={theme} />
                              <MetaBlock label="Última atividade" value={item.lastActivity} theme={theme} />
                              <div className={`rounded-2xl border p-3 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-white/5'}`}>
                                <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Status</p>
                                <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[statusKey as NonNullable<ForumItem['status']>][isLightMode ? 'light' : 'dark']}`}>
                                  {statusKey}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  theme={theme}
                  label={`${filteredItems.length} resultados`}
                />
              </div>

              <aside className="space-y-4">
                <div className={forumSidebarClass}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[#EEC137]">Perguntas populares</p>
                      <h3 className={`mt-2 text-xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Na rede DOT</h3>
                    </div>
                    <TrendingUp className={`h-5 w-5 ${isLightMode ? 'text-zinc-400' : 'text-white/50'}`} />
                  </div>

                  <div className="mt-4 space-y-3">
                    {topThreads.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setExpandedThreadId(item.id)}
                        className={`w-full text-left ${forumSidebarItemClass}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#EEC137]">{item.category}</p>
                            <p className={`mt-2 line-clamp-2 text-sm font-semibold leading-6 ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{item.title}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${isLightMode ? 'border-zinc-200 bg-white text-zinc-500' : 'border-white/10 bg-white/6 text-white/55'}`}>
                            {item.replies} resp.
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={forumSidebarClass}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[#88C125]">Tags em foco</p>
                      <h3 className={`mt-2 text-xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Temas em alta</h3>
                    </div>
                    <Tag className={`h-5 w-5 ${isLightMode ? 'text-zinc-400' : 'text-white/50'}`} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <span key={category} className={forumSidebarChipClass}>
                        {category}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={forumSidebarClass}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[#EEC137]">Atalhos</p>
                      <h3 className={`mt-2 text-xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Outras áreas</h3>
                    </div>
                    <Sparkles className={`h-5 w-5 ${isLightMode ? 'text-zinc-400' : 'text-white/50'}`} />
                  </div>

                  <div className="mt-4 space-y-2">
                    {[
                      { label: 'Processos', action: onNavigateToProcessos },
                      { label: 'Treinamentos', action: onNavigateToTreinamentos },
                      { label: "Banco de KR's", action: onNavigateToKRs },
                    ].map((shortcut) => (
                      <button
                        key={shortcut.label}
                        type="button"
                        onClick={shortcut.action}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                          isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100' : 'border-white/10 bg-white/5 text-white/82 hover:bg-white/10'
                        }`}
                      >
                        <span>{shortcut.label}</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </section>
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

export default ForumScreen;
