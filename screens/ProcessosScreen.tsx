import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import MobileFooterNav from '../components/MobileFooterNav';
import Pagination from '../components/Pagination';
import PageFilterActions from '../components/PageFilterActions';
import SearchBar from '../components/SearchBar';
import NeutralThumb from '../components/NeutralThumb';
import { useLocalCardInteractions } from '../hooks/useLocalCardInteractions';
import { processosItems } from '../data/processosItems';
import { FEEDBACK_COPY_ERROR, FEEDBACK_COPY_SUCCESS, FEEDBACK_TIMEOUT_ERROR, FEEDBACK_TIMEOUT_SUCCESS } from '../constants/feedbackMessages';
import type { PortfolioItem } from '../types';
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
  ShieldCheck,
  Sparkles,
  Target,
  Link2,
  FileText,
  Bookmark,
  Share2,
} from 'lucide-react';
import type { User } from 'firebase/auth';

type SortMode = 'recentes' | 'a-z' | 'z-a';

interface ProcessosScreenProps {
  user: User | null;
  isLoggedIn: boolean;
  onNavigateToPortfolio: () => void;
  onNavigateToTreinamentos: () => void;
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

const cardAccents = ['#88C125', '#4CD07D', '#F78E43', '#EEC137'];

const integridadeTone: Record<string, { dark: string; light: string }> = {
  Atualizado: {
    dark: 'border-[#4CD07D]/30 bg-[#4CD07D]/10 text-[#c8ffe0]',
    light: 'border-[#4CD07D]/40 bg-[#4CD07D]/16 text-[#166a41]',
  },
  'Em revisão': {
    dark: 'border-[#F78E43]/30 bg-[#F78E43]/10 text-[#ffe0c7]',
    light: 'border-[#F78E43]/45 bg-[#F78E43]/16 text-[#8a3f06]',
  },
  'Sob revisão': {
    dark: 'border-[#F78E43]/30 bg-[#F78E43]/10 text-[#ffe0c7]',
    light: 'border-[#F78E43]/45 bg-[#F78E43]/16 text-[#8a3f06]',
  },
  Pendente: {
    dark: 'border-white/10 bg-white/6 text-white/72',
    light: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  },
};

const getProcessLinks = (item: PortfolioItem) => {
  if (item.links?.length) return item.links;

  return [
    { label: 'Abrir documento', href: item.Link_PMV, hint: 'Versão principal' },
    { label: 'Fluxo seguro', href: `${item.Link_PMV}/fluxo`, hint: 'Acesso controlado' },
    { label: 'Histórico', href: `${item.Link_PMV}/historico`, hint: 'Auditoria' },
  ];
};

const MetaBlock: React.FC<{ label: string; value: string; accent?: string; theme: 'light' | 'dark' }> = ({
  label,
  value,
  accent,
  theme,
}) => {
  const isLightMode = theme === 'light';
  const valueClass = accent || (isLightMode ? 'text-zinc-700' : 'text-white/78');

  return (
    <div className={`rounded-2xl border p-3 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-white/5'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>{label}</p>
      <p className={`mt-2 text-sm font-semibold leading-6 ${valueClass}`}>{value}</p>
    </div>
  );
};

const ProcessLink: React.FC<{
  label: string;
  href: string;
  hint?: string;
  onOpen: (href: string) => void;
  theme: 'light' | 'dark';
}> = ({ label, href, hint, onOpen, theme }) => {
  const isLightMode = theme === 'light';

  return (
    <button
      type="button"
      onClick={() => onOpen(href)}
      className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-left text-xs font-semibold transition-colors ${
        isLightMode
          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
          : 'border-white/10 bg-white/5 text-white/82 hover:bg-white/10'
      }`}
    >
      <Link2 className="h-3.5 w-3.5 shrink-0 text-[#88C125]" />
      <span className="flex flex-col">
        <span>{label}</span>
        {hint && (
          <span className={`text-[10px] font-medium uppercase tracking-[0.22em] ${isLightMode ? 'text-zinc-400' : 'text-white/40'}`}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
};

const ChangelogEntry: React.FC<{
  version: string;
  date: string;
  title: string;
  note: string;
  theme: 'light' | 'dark';
}> = ({ version, date, title, note, theme }) => {
  const isLightMode = theme === 'light';

  return (
    <div className={`rounded-2xl border p-4 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-white/5'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>{date}</p>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-600' : 'border-white/10 bg-white/6 text-white/70'}`}>
          {version}
        </span>
      </div>
      <p className={`mt-2 text-sm font-semibold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{title}</p>
      <p className={`mt-2 text-sm leading-6 ${isLightMode ? 'text-zinc-600' : 'text-white/68'}`}>{note}</p>
    </div>
  );
};

const ProcessosScreen: React.FC<ProcessosScreenProps> = ({
  user,
  isLoggedIn,
  onNavigateToPortfolio,
  onNavigateToTreinamentos,
  onNavigateToKRs,
  onNavigateToForum,
  onNavigateToAdmin,
  onLogout,
  theme,
  toggleTheme,
  offlineMode = false,
}) => {
  const isLightMode = theme === 'light';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('recentes');
  const [openMenu, setOpenMenu] = useState<'categoria' | 'ordem' | 'area' | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [expandedProcessId, setExpandedProcessId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const { interactions, getState, incrementViews, toggleLike, toggleFavorite, registerShare } = useLocalCardInteractions('processos');

  const pageClass = isLightMode ? 'min-h-screen bg-gray-100 text-zinc-900 transition-colors duration-300' : 'min-h-screen bg-[#111114] text-white transition-colors duration-300';
  const sidebarClass = isLightMode
    ? 'sticky top-24 rounded-[30px] border border-zinc-200 bg-white p-6 text-zinc-900 shadow-[0_30px_80px_rgba(15,23,42,0.08)]'
    : 'sticky top-24 rounded-[30px] border border-white/10 bg-[#151517] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]';
  const heroClass = isLightMode
    ? 'relative overflow-hidden rounded-[34px] border border-zinc-200 bg-gradient-to-br from-white via-[#fbfcf7] to-[#eef4de] px-6 py-8 text-zinc-900 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10'
    : 'relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#1d1d22] via-[#232329] to-[#111112] px-6 py-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)] sm:px-8 sm:py-10';
  const heroOverlayClass = isLightMode
    ? 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(136,193,37,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.04),transparent_26%)]'
    : 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(136,193,37,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_26%)]';
  const heroStatClass = isLightMode ? 'min-h-[112px] rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm backdrop-blur-sm' : 'min-h-[112px] rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm';
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
  const filterResetClass = isLightMode
    ? 'rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50'
    : 'rounded-full border border-white/10 bg-white/0 px-4 py-2 text-sm font-semibold text-white/65 hover:bg-white/6';
  const cardClass = isLightMode
    ? 'overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]'
    : 'overflow-hidden rounded-[30px] border border-white/10 bg-[#17171b] shadow-[0_18px_55px_rgba(0,0,0,0.22)]';
  const cardBodyClass = isLightMode ? 'border-t border-zinc-200 bg-white px-4 py-4 md:px-6' : 'border-t border-white/8 bg-black/20 px-4 py-4 md:px-6';
  const detailPanelClass = isLightMode
    ? 'rounded-[30px] border border-zinc-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]'
    : 'rounded-[30px] border border-white/10 bg-[#15151a] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]';
  const emptyStateClass = isLightMode
    ? 'rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm'
    : 'rounded-[28px] border border-white/10 bg-[#16161a] px-6 py-12 text-center';

  const categories = useMemo(
    () => Array.from(new Set(processosItems.map((item) => item.Cliente))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    []
  );
  const areas = useMemo(
    () => Array.from(new Set(processosItems.map((item) => item.Time))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    []
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const items = processosItems.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.Projeto,
          item.Cliente,
          item.Time,
          item.Assunto_geral,
          item.Assunto_especifico,
          item.Publico_alvo,
          item.Metodologias,
          item.Mídias,
          item.Outros_recursos,
          item.versao,
          item.integridade,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesCategory = !categoryFilter || item.Cliente === categoryFilter;
      const matchesArea = !areaFilter || item.Time === areaFilter;

      const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
      const matchesFavorites = !showFavoritesOnly || localState.favorited;

      return matchesSearch && matchesCategory && matchesArea && matchesFavorites;
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
  }, [searchTerm, categoryFilter, areaFilter, sortMode, showFavoritesOnly, getState, interactions]);

  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredItems, currentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, areaFilter, sortMode, showFavoritesOnly]);

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'processos');
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) url.searchParams.set('q', trimmedSearch);
    else url.searchParams.delete('q');
    if (categoryFilter) url.searchParams.set('category', categoryFilter);
    else url.searchParams.delete('category');
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

  useEffect(() => {
    if (!expandedProcessId) return;
    if (!filteredItems.some((item) => item.id === expandedProcessId)) {
      setExpandedProcessId('');
    }
  }, [filteredItems, expandedProcessId]);

  useEffect(() => {
    if (pendingScrollRestoreRef.current === null) return;
    const targetScroll = pendingScrollRestoreRef.current;
    pendingScrollRestoreRef.current = null;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: targetScroll, behavior: 'auto' });
    });
  }, [expandedProcessId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getChangelogEntries = (process: PortfolioItem) => [
    {
      version: process?.versao || 'v1.0.0',
      date: process?.ultimaRevisao || process?.Data || 'Hoje',
      title: 'Última curadoria publicada',
      note: 'Conteúdo revisado para refletir a versão mais recente, com links e acesso direto organizados.',
    },
    {
      version: 'v1.0.0',
      date: '2025-10-01',
      title: 'Estrutura inicial definida',
      note: 'Processo consolidado com metadados, fluxo e pontos de acesso para consulta rápida.',
    },
    {
      version: 'v0.9.0',
      date: '2025-09-14',
      title: 'Ajuste de governança',
      note: 'Revisão de regras, responsáveis e padronização de documentação interna.',
    },
  ];

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

  const openDirectLink = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const summaryStats = [
    { label: 'Processos', value: processosItems.length },
    { label: 'Categorias', value: categories.length },
    { label: 'Áreas', value: areas.length },
    {
      label: 'Última revisão',
      value: filteredItems[0]?.ultimaRevisao
        ? new Date(`${filteredItems[0].ultimaRevisao}T00:00:00`).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
          })
        : 'Hoje',
    },
  ];

  const menuItems = [
    { label: 'Home', icon: Home, active: false, action: onNavigateToPortfolio },
    { label: 'Processos', icon: LayoutGrid, active: true, action: undefined },
    { label: 'Treinamentos', icon: BookOpen, active: false, action: onNavigateToTreinamentos },
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
              <div className="absolute inset-x-0 top-0 h-2 bg-[#88C125]" />
              <div className={heroOverlayClass} />
              <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#88C125]">Processos</p>
                  <h1 className={`mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                    Uma biblioteca viva de processos, com links seguros e versionamento claro.
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                    A DOT SPACE concentra documentos, rotinas e fluxos críticos em um único lugar. Cada card funciona como
                    uma ficha operacional com contexto, revisão e acesso direto.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {['Processos', 'Treinamentos', 'Links seguros', 'Favoritos'].map((chip) => (
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
                  {summaryStats.map((item, index) => (
                    <div key={item.label} className={heroStatClass}>
                      <div
                        className="mb-3 h-1.5 w-16 rounded-full"
                        style={{ backgroundColor: cardAccents[index % cardAccents.length] }}
                      />
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
                  <SearchBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Buscar processo, área, categoria..."
                    suggestions={searchTerm ? filteredItems : []}
                    onSuggestionClick={(item) => setExpandedProcessId(item.id)}
                    theme={theme}
                  />
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
                    <div className={`${filtersMenuClass} left-auto right-0 xl:w-48`}>
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
                    setCategoryFilter('');
                    setAreaFilter('');
                    setSortMode('recentes');
                  }}
                  className="rounded-full bg-[#88C125] px-4 py-2 text-sm font-bold text-white transition-colors"
                >
                  Todos
                </button>
                {areas.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setAreaFilter((current) => (current === area ? '' : area))}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      areaFilter === area
                        ? 'border-[#88C125] bg-[#88C125]/15 text-[#88C125]'
                        : isLightMode
                          ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                          : 'border-white/10 bg-white/6 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    {area}
                  </button>
                ))}
                {(categoryFilter || areaFilter || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('');
                      setAreaFilter('');
                    }}
                    className={filterResetClass}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </section>

            {filteredItems.length > 0 ? (
              <>
                <section className="space-y-4" style={{ overflowAnchor: 'none' }}>
                {paginatedItems.map((item) => {
                    const links = getProcessLinks(item);
                    const integrityClass = (integridadeTone[item.integridade || 'Atualizado'] || integridadeTone.Pendente)[isLightMode ? 'light' : 'dark'];
                    const isExpanded = expandedProcessId === item.id;
                    const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                    const changelogEntries = getChangelogEntries(item);
                    const hasCoverImage = Boolean(item.Imagem_capa);

                    return (
                      <article
                        key={item.id}
                        className={cardClass}
                        style={{ overflowAnchor: 'none' }}
                      >
                        <div className="grid gap-4 p-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                          <div className={`relative h-40 w-full shrink-0 overflow-hidden rounded-[24px] border sm:h-44 md:h-[180px] ${isLightMode ? 'border-zinc-200 bg-zinc-100' : 'border-white/10 bg-[#111114]'}`}>
                            {hasCoverImage ? (
                              <>
                                <img
                                  src={item.Imagem_capa}
                                  alt={item.Projeto}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                              </>
                            ) : (
                              <NeutralThumb theme={theme} />
                            )}
                            <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
                              <span className="rounded-full bg-[#88C125] px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white">
                                {item.Cliente}
                              </span>
                              <span className="rounded-full border border-white/12 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
                                {item.versao || 'v1.0.0'}
                              </span>
                            </div>
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-between md:min-h-[180px] md:py-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[#88C125]">{item.Time}</p>
                                <h2 className={`mt-2 text-[1.45rem] font-black leading-tight line-clamp-2 ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{item.Projeto}</h2>
                              </div>
                              <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${integrityClass}`}>
                                <ShieldCheck className="mr-1 inline-block h-3.5 w-3.5" />
                                {item.integridade || 'Pendente'}
                              </span>
                            </div>

                            <p className={`mt-3 max-w-3xl text-sm leading-6 line-clamp-2 ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>{item.Assunto_geral}</p>
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

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedProcessId((current) => {
                                    const nextExpandedId = current === item.id ? '' : item.id;
                                    if (nextExpandedId) {
                                      pendingScrollRestoreRef.current = window.scrollY;
                                    }
                                    return nextExpandedId;
                                  });
                                }}
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors ${
                                  isLightMode
                                    ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
                                    : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
                                }`}
                              >
                                {isExpanded ? 'Fechar detalhes' : 'Ver detalhes'}
                                <ArrowRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openAccess(item)}
                                className="inline-flex items-center gap-2 rounded-full bg-[#88C125] px-4 py-3 text-sm font-bold text-white transition-colors hover:brightness-95"
                              >
                                Abrir fluxo
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className={cardBodyClass}>
                            <div className="space-y-4">
                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <MetaBlock label="Metodologia" value={item.Metodologias} theme={theme} />
                                <MetaBlock label="Mídias" value={item.Mídias} theme={theme} />
                                <MetaBlock label="Categoria" value={item.Cliente} theme={theme} />
                                <MetaBlock label="Área proprietária" value={item.Time} theme={theme} />
                              </div>

                              <div className={`rounded-[24px] border p-4 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-white/5'}`}>
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Acesso direto</p>
                                    <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>Links rápidos para consulta e atualização.</p>
                                  </div>
                                  <FileText className="h-5 w-5 shrink-0 text-[#88C125]" />
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {links.map((link) => (
                                    <ProcessLink
                                      key={link.label}
                                      label={link.label}
                                      href={link.href}
                                      hint={link.hint}
                                      onOpen={openDirectLink}
                                      theme={theme}
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className={`rounded-[24px] border p-4 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-white/5'}`}>
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-[#88C125]" />
                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Pontos-chave</p>
                                </div>
                                <p className={`mt-3 text-sm leading-7 ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>{item.Assunto_especifico}</p>
                                <p className={`mt-3 text-sm leading-7 ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>{item.Outros_recursos}</p>
                              </div>

                              <div className={`rounded-[24px] border p-4 ${isLightMode ? 'border-zinc-200 bg-zinc-50 shadow-sm' : 'border-white/8 bg-black/20'}`}>
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Changelog</p>
                                    <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>Atualizações e revisões recorrentes do processo.</p>
                                  </div>
                                  <Sparkles className="h-5 w-5 shrink-0 text-[#88C125]" />
                                </div>
                                <div className="mt-4 space-y-3">
                                  {changelogEntries.map((entry) => (
                                    <ChangelogEntry
                                      key={`${entry.version}-${entry.date}`}
                                      version={entry.version}
                                      date={entry.date}
                                      title={entry.title}
                                      note={entry.note}
                                      theme={theme}
                                    />
                                  ))}
                                </div>
                              </div>
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
                <p className={`text-lg font-semibold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Nenhum processo encontrado.</p>
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

export default ProcessosScreen;
