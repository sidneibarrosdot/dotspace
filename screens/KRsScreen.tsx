import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import MobileFooterNav from '../components/MobileFooterNav';
import NeutralThumb from '../components/NeutralThumb';
import Pagination from '../components/Pagination';
import PageFilterActions from '../components/PageFilterActions';
import SearchBar from '../components/SearchBar';
import { useLocalCardInteractions, recordLocalCardInteractionEvent } from '../hooks/useLocalCardInteractions';
import type { KRsItem } from '../data/krsItems';
import { krsItems } from '../data/krsItems';
import { KR_META_AREA_OPTIONS, KR_PERIOD_OPTIONS, KR_STATUS_OPTIONS, KR_SYNERGY_OPTIONS, KR_FUNCAO_OPTIONS, KR_TIME_OPTIONS } from '../data/krsConfig';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Bot,
  ChevronDown,
  Eye,
  ExternalLink,
  FileText,
  Filter,
  Home,
  Heart,
  LayoutGrid,
  MessageSquareMore,
  ShieldCheck,
  Bookmark,
  Share2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { User } from 'firebase/auth';
import { FEEDBACK_COPY_ERROR, FEEDBACK_COPY_SUCCESS, FEEDBACK_TIMEOUT_ERROR, FEEDBACK_TIMEOUT_SUCCESS } from '../constants/feedbackMessages';

type SortMode = 'recentes' | 'a-z' | 'z-a';
const PENDING_HOME_TARGET_KEY = 'dot-space.pending-home-target';

interface KRsScreenProps {
  user: User | null;
  isLoggedIn: boolean;
  onNavigateToPortfolio: () => void;
  onNavigateToProcessos: () => void;
  onNavigateToTreinamentos: () => void;
  onNavigateToAgentes: () => void;
  onNavigateToForum: () => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  offlineMode?: boolean;
}

const cardAccent = '#EEC137';
const krConfig = {
  metaAreas: KR_META_AREA_OPTIONS,
  statuses: KR_STATUS_OPTIONS,
  sinergias: KR_SYNERGY_OPTIONS,
  periodos: KR_PERIOD_OPTIONS,
  funcoes: KR_FUNCAO_OPTIONS,
  times: KR_TIME_OPTIONS,
} as const;

const statusTone: Record<string, { dark: string; light: string }> = {
  'No prazo': {
    dark: 'border-[#4CD07D]/30 bg-[#4CD07D]/10 text-[#c8ffe0]',
    light: 'border-[#4CD07D]/40 bg-[#4CD07D]/16 text-[#166a41]',
  },
  'Em Risco': {
    dark: 'border-[#F2A43A]/30 bg-[#F2A43A]/10 text-[#ffe6bf]',
    light: 'border-[#F2A43A]/45 bg-[#F2A43A]/16 text-[#8b4d06]',
  },
  'Em andamento': {
    dark: 'border-[#4CD07D]/30 bg-[#4CD07D]/10 text-[#c8ffe0]',
    light: 'border-[#4CD07D]/40 bg-[#4CD07D]/16 text-[#166a41]',
  },
  'Sob revisão': {
    dark: 'border-[#F78E43]/30 bg-[#F78E43]/10 text-[#ffe0c7]',
    light: 'border-[#F78E43]/45 bg-[#F78E43]/16 text-[#8a3f06]',
  },
  'Em atenção': {
    dark: 'border-[#EEC137]/30 bg-[#EEC137]/10 text-[#fff0c7]',
    light: 'border-[#EEC137]/45 bg-[#EEC137]/18 text-[#7f5b07]',
  },
  Concluído: {
    dark: 'border-[#4CD07D]/30 bg-[#4CD07D]/10 text-[#c8ffe0]',
    light: 'border-[#4CD07D]/40 bg-[#4CD07D]/16 text-[#166a41]',
  },
  'A iniciar': {
    dark: 'border-white/10 bg-white/6 text-white/72',
    light: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  },
  Atrasado: {
    dark: 'border-[#F78E43]/30 bg-[#F78E43]/10 text-[#ffe0c7]',
    light: 'border-[#F78E43]/45 bg-[#F78E43]/16 text-[#8a3f06]',
  },
  Pendente: {
    dark: 'border-white/10 bg-white/6 text-white/72',
    light: 'border-zinc-300 bg-zinc-100 text-zinc-700',
  },
};

const getString = (...values: Array<string | undefined | null>) =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || '';

const lower = (value: string) => value.toLowerCase();

const displayValue = (value: string, fallback = '—') => (value.trim().length ? value : fallback);

const parseNumericValue = (value: string) => {
  const normalized = value.replace(/\s/g, '').replace('%', '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const getKrMetaArea = (item: KRsItem) => getString(item.metaArea, item.Cliente, item.indicador);
const getKrKeyResult = (item: KRsItem) => getString(item.keyResult, item.Projeto, item.Assunto_especifico);
const getKrObjective = (item: KRsItem) => getString(item.objetivo, item.Assunto_geral, item.Outros_recursos);
const getKrResponsavel = (item: KRsItem) => getString(item.responsavelKR, item.responsavel, item.Time);
const getKrFuncao = (item: KRsItem) => getString(item.funcao, item.DI, item.DM);
const getKrTeam = (item: KRsItem) => getString(item.timeSquad, item.Time, item.Publico_alvo);
const getKrPeriod = (item: KRsItem) => getString(item.periodo, item.ciclo, item.Data, item.ultimaRevisao);
const getKrStatus = (item: KRsItem) => getString(item.status, item.statusKR, item.integridade, item.Metodologias);
const getKrSinergy = (item: KRsItem) => getString(item.sinergia, item.Publico_alvo);
const getKrPartner = (item: KRsItem) => getString(item.frenteParceira);
const getKrPlan = (item: KRsItem) => getString(item.planoAcao, item.Outros_recursos);
const getKrNotes = (item: KRsItem) => getString(item.observacoes, item.observacoesResumo);
const getKrBase = (item: KRsItem) => getString(item.valorBase);
const getKrGoal = (item: KRsItem) => getString(item.valorAlvo, item.meta);
const getKrCurrent = (item: KRsItem) => getString(item.valorAtual, item.resultado);
const getKrEvolution = (item: KRsItem) => getString(item.evolucao);
const getKrUpdatedAt = (item: KRsItem) => getString(item.ultimaAtualizacao, item.ultimaRevisao);
const getKrEntries = (item: KRsItem) =>
  item.inventoryEntries?.length
    ? item.inventoryEntries
    : [
        {
          id: item.id,
          sourceIndex: item.sourceIndex,
          metaArea: getKrMetaArea(item),
          keyResult: getKrKeyResult(item),
          responsavelKR: getKrResponsavel(item),
          funcao: getKrFuncao(item),
          timeSquad: getKrTeam(item),
          periodo: getKrPeriod(item),
          valorBase: getKrBase(item),
          valorAlvo: getKrGoal(item),
          valorAtual: getKrCurrent(item),
          evolucao: getKrEvolution(item),
          status: getKrStatus(item),
          sinergia: getKrSinergy(item),
          frenteParceira: getKrPartner(item),
          planoAcao: getKrPlan(item),
          ultimaAtualizacao: getKrUpdatedAt(item),
          observacoes: getKrNotes(item),
          objetivo: getKrObjective(item),
          sourceSheetRow: item.sourceSheetRow,
          pinned: Boolean(item.pinned),
        },
      ];

const compareRecent = (a: KRsItem, b: KRsItem) => {
  const dateA = Date.parse(getKrUpdatedAt(a));
  const dateB = Date.parse(getKrUpdatedAt(b));

  if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) {
    return dateB - dateA;
  }

  if (a.sourceIndex !== b.sourceIndex) {
    return a.sourceIndex - b.sourceIndex;
  }

  return getKrKeyResult(a).localeCompare(getKrKeyResult(b), 'pt-BR');
};

const getCompletionPercent = (item: KRsItem) => {
  const status = getKrStatus(item);
  const statusMap: Record<string, number> = {
    Concluído: 100,
    'No prazo': 82,
    'Em andamento': 62,
    'Sob revisão': 42,
    'Em atenção': 28,
    'A iniciar': 18,
  };

  const current = parseNumericValue(getKrCurrent(item));
  const goal = parseNumericValue(getKrGoal(item));

  if (current !== null && goal !== null && goal > 0) {
    return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
  }

  if (current !== null && goal === null && current <= 100) {
    return Math.max(0, Math.min(100, Math.round(current)));
  }

  return statusMap[status] ?? 35;
};

const accentByMetaArea = (value: string) => {
  const key = lower(value);
  if (key.includes('lead time')) return '#EEC137';
  if (key.includes('redução de custo')) return '#F78E43';
  if (key.includes('aumento de receita')) return '#4CD07D';
  if (key.includes('satisfação')) return '#88C125';
  return '#EEC137';
};

const MetaBlock: React.FC<{
  label: string;
  value: string;
  accent?: string;
  theme: 'light' | 'dark';
}> = ({ label, value, accent, theme: blockTheme }) => {
  const isLightMode = blockTheme === 'light';

  return (
    <div className={`rounded-2xl border p-3 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-white/5'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>{label}</p>
      <p className={`mt-2 text-sm font-semibold leading-6 ${accent || (isLightMode ? 'text-zinc-700' : 'text-white/78')}`}>{value}</p>
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  theme: 'light' | 'dark';
  accent: string;
  subdued?: boolean;
}> = ({ label, value, theme: blockTheme, accent, subdued = false }) => {
  const isLightMode = blockTheme === 'light';
  const isEmpty = !value || value === '—';

  return (
    <div
      className={`rounded-2xl border px-4 py-4 shadow-sm ${
        isLightMode
          ? subdued
            ? 'border-zinc-200 bg-zinc-50'
            : 'border-zinc-200 bg-gradient-to-br from-white via-[#fbfbf8] to-[#f6f7ef]'
          : subdued
            ? 'border-white/8 bg-white/5'
            : 'border-white/10 bg-gradient-to-br from-white/8 via-white/6 to-white/3'
      }`}
    >
      <div className={`mb-3 h-1.5 w-12 rounded-full bg-zinc-300/70 dark:bg-white/20 ${subdued ? 'opacity-60' : ''}`} />
      <p className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>{label}</p>
      <p
        className={`mt-2 leading-none ${
          isEmpty
            ? `text-lg font-semibold ${isLightMode ? 'text-zinc-400' : 'text-white/45'}`
            : `text-2xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`
        }`}
      >
        {value}
      </p>
    </div>
  );
};

const InfoChip: React.FC<{
  label: string;
  value: string;
  theme: 'light' | 'dark';
}> = ({ label, value, theme: chipTheme }) => {
  const isLightMode = chipTheme === 'light';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        isLightMode ? 'border-zinc-200 bg-white text-zinc-700 shadow-sm' : 'border-white/10 bg-white/6 text-white/80'
      }`}
    >
      <span className={`uppercase tracking-[0.22em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>{label}</span>
      <span className="truncate max-w-[12rem]">{value}</span>
    </span>
  );
};

const KRsScreen: React.FC<KRsScreenProps> = ({
  user,
  isLoggedIn,
  onNavigateToPortfolio,
  onNavigateToProcessos,
  onNavigateToTreinamentos,
  onNavigateToAgentes,
  onNavigateToForum,
  onNavigateToAdmin,
  onLogout,
  theme,
  toggleTheme,
  offlineMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('recentes');
  const [openMenu, setOpenMenu] = useState<'categoria' | 'ordem' | 'area' | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [expandedKrId, setExpandedKrId] = useState<string | null>(null);
  const [pendingHomeTargetId, setPendingHomeTargetId] = useState<string>('');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { interactions, getState, incrementViews, toggleLike, toggleFavorite, registerShare } = useLocalCardInteractions('krs');
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const didRunInitialFilterResetRef = useRef(false);
  const filtersRef = useRef<HTMLElement | null>(null);
  const isLightMode = theme === 'light';

  const pageClass = isLightMode
    ? 'min-h-screen bg-gray-100 text-zinc-900 transition-colors duration-300'
    : 'min-h-screen bg-[#111114] text-white transition-colors duration-300';
  const sidebarClass = isLightMode
    ? 'sticky top-24 rounded-[30px] border border-zinc-200 bg-white p-6 text-zinc-900 shadow-[0_30px_80px_rgba(15,23,42,0.08)]'
    : 'sticky top-24 rounded-[30px] border border-white/10 bg-[#151517] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]';
  const heroClass = isLightMode
    ? 'relative overflow-hidden rounded-[34px] border border-zinc-200 bg-gradient-to-br from-white via-[#fbfcf7] to-[#f3efe3] px-6 py-8 text-zinc-900 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10'
    : 'relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#1d1d22] via-[#232329] to-[#111112] px-6 py-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.24)] sm:px-8 sm:py-10';
  const heroOverlayClass = isLightMode
    ? 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,193,55,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_26%)]'
    : 'absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,193,55,0.12),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_26%)]';
  const heroStatClass = isLightMode
    ? 'min-h-[108px] rounded-3xl border border-zinc-200 bg-white p-3.5 shadow-sm backdrop-blur-sm'
    : 'min-h-[108px] rounded-3xl border border-white/10 bg-white/8 p-3.5 backdrop-blur-sm';
  const filtersClass = isLightMode
    ? 'relative z-40 space-y-4 rounded-[30px] border border-zinc-200 bg-white p-4 shadow-[0_25px_60px_rgba(15,23,42,0.08)] sm:p-5'
    : 'relative z-40 space-y-4 rounded-[30px] border border-white/10 bg-[#151517] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.2)] sm:p-5';
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
    ? 'group overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1'
    : 'group overflow-hidden rounded-[30px] border border-white/10 bg-[#17171b] shadow-[0_18px_55px_rgba(0,0,0,0.22)] transition-transform hover:-translate-y-1';
  const cardTextClass = isLightMode ? 'text-zinc-600' : 'text-white/70';
  const emptyStateClass = isLightMode
    ? 'rounded-[28px] border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm'
    : 'rounded-[28px] border border-white/10 bg-[#16161a] px-6 py-12 text-center';
  const cardBodyClass = isLightMode
    ? 'border-t border-zinc-200 bg-zinc-50/70 px-4 py-4 sm:px-5 sm:py-5'
    : 'border-t border-white/8 bg-black/20 px-4 py-4 sm:px-5 sm:py-5';

  const allSourceEntries = useMemo(() => krsItems.flatMap((item) => getKrEntries(item)), []);

  const categories = useMemo(
    () =>
      Array.from(new Set([...krConfig.metaAreas, ...allSourceEntries.map((entry) => entry.metaArea).filter(Boolean)])).sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      ),
    [allSourceEntries]
  );

  const areas = useMemo(
    () =>
      Array.from(new Set([...krConfig.times, ...allSourceEntries.map((entry) => entry.timeSquad).filter(Boolean)])).sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      ),
    [allSourceEntries]
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = krsItems.filter((item) => {
      const entries = getKrEntries(item);
      const searchableValues = [
        item.id,
        getKrMetaArea(item),
        getKrObjective(item),
        getKrKeyResult(item),
        getKrResponsavel(item),
        getKrFuncao(item),
        getKrTeam(item),
        getKrPeriod(item),
        getKrStatus(item),
        getKrSinergy(item),
        getKrPartner(item),
        getKrPlan(item),
        getKrNotes(item),
        getKrBase(item),
        getKrGoal(item),
        getKrCurrent(item),
        getKrEvolution(item),
        ...entries.flatMap((entry) => [
          entry.id,
          entry.metaArea,
          entry.objetivo,
          entry.keyResult,
          entry.responsavelKR,
          entry.funcao,
          entry.timeSquad,
          entry.periodo,
          entry.valorBase,
          entry.valorAlvo,
          entry.valorAtual,
          entry.evolucao,
          entry.status,
          entry.sinergia,
          entry.frenteParceira,
          entry.planoAcao,
          entry.ultimaAtualizacao,
          entry.observacoes,
          entry.objetivo,
        ]),
      ];

      const matchesSearch = !term || searchableValues.some((value) => value.toLowerCase().includes(term));
      const matchesCategory = !categoryFilter || entries.some((entry) => entry.metaArea === categoryFilter) || getKrMetaArea(item) === categoryFilter;
      const matchesArea = !areaFilter || entries.some((entry) => entry.timeSquad === areaFilter) || getKrTeam(item) === areaFilter;
      const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
      const matchesFavorites = !showFavoritesOnly || localState.favorited;

      return matchesSearch && matchesCategory && matchesArea && matchesFavorites;
    });

    const sorted = [...items];
    if (sortMode === 'a-z') {
      sorted.sort((a, b) => getKrKeyResult(a).localeCompare(getKrKeyResult(b), 'pt-BR'));
    } else if (sortMode === 'z-a') {
      sorted.sort((a, b) => getKrKeyResult(b).localeCompare(getKrKeyResult(a), 'pt-BR'));
    } else {
      sorted.sort((a, b) => compareRecent(a, b));
    }

    return sorted;
  }, [searchTerm, categoryFilter, areaFilter, sortMode, showFavoritesOnly, getState, interactions]);

  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredItems, currentPage]);

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
      if (parsed.kind !== 'krs' || !parsed.id) return;

      window.localStorage.removeItem(PENDING_HOME_TARGET_KEY);
      const targetIndex = filteredItems.findIndex((item) => item.id === parsed.id);
      if (targetIndex < 0) return;

      setPendingHomeTargetId(parsed.id);
      setExpandedKrId(parsed.id);
      setCurrentPage(Math.floor(targetIndex / pageSize) + 1);
    } catch {
      window.localStorage.removeItem(PENDING_HOME_TARGET_KEY);
    }
  }, [filteredItems]);

  const buildShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'krs');
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
    if (!didRunInitialFilterResetRef.current) {
      didRunInitialFilterResetRef.current = true;
      return;
    }

    setCurrentPage(1);
  }, [searchTerm, categoryFilter, areaFilter, sortMode, showFavoritesOnly]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!expandedKrId) return;
    if (!filteredItems.some((item) => item.id === expandedKrId)) {
      setExpandedKrId(null);
    }
  }, [filteredItems, expandedKrId]);

  useEffect(() => {
    if (!pendingHomeTargetId) return;
    const target = cardRefs.current[pendingHomeTargetId];
    if (!target) return;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingHomeTargetId('');
    });
  }, [currentPage, pendingHomeTargetId]);

  const openItemDetails = (item: KRsItem) => {
    setExpandedKrId(item.id);
    recordLocalCardInteractionEvent('krs', item.id, 'open');
    window.requestAnimationFrame(() => {
      cardRefs.current[item.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleEntryDetails = (itemId: string, entryId: string) => {
    const nextId = `${itemId}:${entryId}`;
    setExpandedEntryId((current) => (current === nextId ? null : nextId));
  };

  const openAccess = (item: KRsItem) => {
    const channel = String(item.timeSquad || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/time-/g, "squad-");

    const slackUrl = `https://slack.com/app_redirect?channel=${channel || 'geral'}`;
    recordLocalCardInteractionEvent('krs', item.id, 'slack_interest');
    window.open(slackUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareItem = async (item: KRsItem) => {
    try {
      await navigator.clipboard.writeText(item.Link_PMV || buildShareUrl());
      registerShare(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
      setShareFeedback(FEEDBACK_COPY_SUCCESS);
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_SUCCESS);
    } catch {
      setShareFeedback(FEEDBACK_COPY_ERROR);
      window.setTimeout(() => setShareFeedback(''), FEEDBACK_TIMEOUT_ERROR);
    }
  };

  const summaryStats = [
    { label: 'OKRs únicos', value: krsItems.length },
    { label: 'Entradas', value: allSourceEntries.length },
    { label: 'Meta áreas', value: categories.length },
    { label: 'Times/Squads', value: areas.length },
  ];

  const krByCycle = useMemo(() => {
    const grouped = filteredItems.reduce<Record<string, number>>((acc, item) => {
      const cycle = getKrPeriod(item) || 'Sem período';
      acc[cycle] = (acc[cycle] || 0) + 1;
      return acc;
    }, {});

    const ordered = krConfig.periodos
      .filter((period) => grouped[period] !== undefined)
      .map((period) => ({ cycle: period, total: grouped[period] }));
    const extras = Object.entries(grouped)
      .filter(([cycle]) => !krConfig.periodos.includes(cycle as (typeof krConfig.periodos)[number]))
      .map(([cycle, total]) => ({ cycle, total }));

    return [...ordered, ...extras].sort((a, b) => {
        const indexA = krConfig.periodos.indexOf(a.cycle as (typeof krConfig.periodos)[number]);
        const indexB = krConfig.periodos.indexOf(b.cycle as (typeof krConfig.periodos)[number]);
        if (indexA !== -1 && indexB !== -1 && indexA !== indexB) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return b.total - a.total;
      });
  }, [filteredItems]);

  const krByMetaArea = useMemo(() => {
    const grouped = filteredItems.reduce<Record<string, number>>((acc, item) => {
      const metaArea = getKrMetaArea(item) || 'Sem meta';
      acc[metaArea] = (acc[metaArea] || 0) + 1;
      return acc;
    }, {});

    const ordered = krConfig.metaAreas
      .filter((metaArea) => grouped[metaArea] !== undefined)
      .map((metaArea) => ({ name: metaArea, value: grouped[metaArea] }));
    const extras = Object.entries(grouped)
      .filter(([metaArea]) => !krConfig.metaAreas.includes(metaArea as (typeof krConfig.metaAreas)[number]))
      .map(([metaArea, value]) => ({ name: metaArea, value }));

    return [...ordered, ...extras].sort((a, b) => b.value - a.value);
  }, [filteredItems]);

  const krByStatus = useMemo(() => {
    const grouped = filteredItems.reduce<Record<string, number>>((acc, item) => {
      const status = getKrStatus(item) || 'Sem status';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const ordered = krConfig.statuses
      .filter((status) => grouped[status] !== undefined)
      .map((status) => ({ name: status, value: grouped[status] }));
    const extras = Object.entries(grouped)
      .filter(([status]) => !krConfig.statuses.includes(status as (typeof krConfig.statuses)[number]))
      .map(([name, value]) => ({ name, value }));

    return [...ordered, ...extras].sort((a, b) => b.value - a.value);
  }, [filteredItems]);

  const maxCycleCount = Math.max(1, ...krByCycle.map((item) => item.total));
  const maxMetaCount = Math.max(1, ...krByMetaArea.map((item) => item.value));
  const leadingCycle = krByCycle.reduce<(typeof krByCycle)[number] | null>((leader, item) => (!leader || item.total > leader.total ? item : leader), null);
  const leadingMeta = krByMetaArea[0] ?? null;
  const leadingStatus = krByStatus[0] ?? null;
  const completedCount = useMemo(
    () =>
      filteredItems.filter((item) => {
        const status = lower(getKrStatus(item));
        const progress = getCompletionPercent(item);
        return status.includes('conclu') || progress >= 100;
      }).length,
    [filteredItems]
  );
  const completedPercent = filteredItems.length ? Math.round((completedCount / filteredItems.length) * 100) : 0;
  const chartPalette = ['#88C125', '#4CD07D', '#F78E43', '#EEC137', '#7C8AA5', '#A855F7'] as const;
  const chartCardClass = `flex h-fit flex-col rounded-3xl border p-5 xl:min-h-[22rem] ${
    isLightMode ? 'border-zinc-200 bg-white' : 'border-white/10 bg-white/5'
  }`;
  const chartTitleClass = `text-xs font-semibold uppercase tracking-[0.3em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`;
  const chartCountClass = `text-xs font-semibold ${isLightMode ? 'text-zinc-500' : 'text-white/60'}`;
  const chartInsightClass = `mt-2 text-xs font-medium leading-5 ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`;

  const menuItems = [
    { label: 'Home', icon: Home, active: false, action: onNavigateToPortfolio },
    { label: 'Processos', icon: LayoutGrid, active: false, action: onNavigateToProcessos },
    { label: 'Treinamentos', icon: BookOpen, active: false, action: onNavigateToTreinamentos },
    { label: "Banco de OKR's", icon: BookMarked, active: true, action: undefined },
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
              <div className="absolute inset-x-0 top-0 h-2 bg-[#EEC137]" />
              <div className={heroOverlayClass} />
              <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#EEC137]">Banco de OKR's</p>
                   <h1 className={`mt-3 max-w-4xl text-2xl font-black leading-tight sm:text-3xl lg:text-4xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                    Acompanhe o que move nossos resultados
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                    Uma visão consolidada dos objetivos e resultados-chave da organização. Acompanhe metas, responsáveis, evolução dos indicadores e alinhamento estratégico em um único ambiente.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {['Objetivos', 'Indicadores', 'Metas', 'Ciclos'].map((chip) => (
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
                  <img src="https://picsum.photos/seed/dotspace-okrs/900/700" alt="Banco de OKR's" className="h-full w-full object-cover" />
                </div>
              </div>
            </section>

            <section className={filtersClass}>
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.12fr)_minmax(0,1fr)]">
                <article className={chartCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={chartTitleClass}>Quantidade por período</p>
                    <span className={chartCountClass}>{filteredItems.length} OKR's</span>
                  </div>
                  {leadingCycle && <p className={chartInsightClass}>{leadingCycle.cycle} concentra {leadingCycle.total} OKR's no recorte atual.</p>}
                  <div className="mt-4 flex flex-col gap-3">
                    {krByCycle.map((item, index) => {
                      const width = Math.max(12, Math.round((item.total / maxCycleCount) * 100));
                      return (
                        <div key={item.cycle}>
                          <div className="mb-0.5 flex items-center justify-between gap-3 text-xs">
                            <span className={`font-medium ${isLightMode ? 'text-zinc-700' : 'text-white/80'}`}>{item.cycle}</span>
                            <span className={isLightMode ? 'text-zinc-500' : 'text-white/55'}>{item.total}</span>
                          </div>
                          <div className={`h-3.5 overflow-hidden rounded-full ${isLightMode ? 'bg-zinc-100' : 'bg-white/10'}`}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${width}%`,
                                backgroundColor: chartPalette[index % chartPalette.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className={chartCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={chartTitleClass}>Quantidade por meta</p>
                    <span className={chartCountClass}>{filteredItems.length} OKR's</span>
                  </div>
                  {leadingMeta && <p className={chartInsightClass}>{leadingMeta.name} lidera com {leadingMeta.value} OKR's.</p>}
                  <div className="mt-4 flex flex-col gap-4">
                    {krByMetaArea.length ? (
                      <div className="flex flex-col gap-3">
                        {krByMetaArea.map((entry, index) => {
                          const width = Math.max(10, Math.round((entry.value / maxMetaCount) * 100));
                          const color = chartPalette[index % chartPalette.length];
                          return (
                            <div key={entry.name} className="space-y-2">
                              <div className="flex items-start justify-between gap-3 text-xs">
                                <span className={`min-w-0 flex-1 font-medium leading-tight ${isLightMode ? 'text-zinc-700' : 'text-white/80'}`}>{entry.name}</span>
                                <span className={`shrink-0 font-semibold tabular-nums ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>
                                  {entry.value}
                                </span>
                              </div>
                              <div className={`h-3 overflow-hidden rounded-full ${isLightMode ? 'bg-zinc-100' : 'bg-white/10'}`}>
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${width}%`,
                                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`grid h-full place-items-center rounded-2xl border ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/10 bg-black/20 text-white/55'}`}>
                        Sem dados para esse filtro
                      </div>
                    )}
                  </div>
                </article>

                <article className={chartCardClass}>
                  <div className="flex items-center justify-between gap-3">
                    <p className={chartTitleClass}>Distribuição por status</p>
                    <span className={chartCountClass}>{filteredItems.length} OKR's</span>
                  </div>
                  {leadingStatus && <p className={chartInsightClass}>{leadingStatus.name} aparece em {leadingStatus.value} OKR's.</p>}
                  <div className="mt-4 flex flex-col items-center justify-start gap-3">
                    {krByStatus.length ? (
                      <>
                        <div className="relative h-44 w-full max-w-[14.5rem] xl:h-48 xl:max-w-[15.5rem]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip
                                formatter={(value, name) => [`${value} OKR's`, name]}
                                contentStyle={{
                                  borderRadius: 16,
                                  border: `1px solid ${isLightMode ? '#e4e4e7' : 'rgba(255,255,255,0.12)'}`,
                                  background: isLightMode ? '#ffffff' : '#18181b',
                                  color: isLightMode ? '#18181b' : '#ffffff',
                                  boxShadow: '0 18px 45px rgba(0,0,0,0.18)',
                                  fontWeight: 700,
                                }}
                                itemStyle={{ color: isLightMode ? '#18181b' : '#ffffff' }}
                                labelStyle={{ display: 'none' }}
                              />
                              <Pie
                                data={krByStatus}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius="86%"
                                paddingAngle={2}
                                stroke={isLightMode ? '#ffffff' : '#18181b'}
                                strokeWidth={3}
                              >
                                {krByStatus.map((entry, index) => (
                                  <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full">
                          <div className={`mb-3 flex items-center justify-between rounded-2xl border px-4 py-3 ${isLightMode ? 'border-zinc-200 bg-zinc-50/70' : 'border-white/10 bg-white/[0.03]'}`}>
                            <div>
                              <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Concluídos</p>
                            </div>
                            <span className={`text-2xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{completedPercent}%</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {krByStatus.map((entry, index) => (
                              <div
                                key={entry.name}
                                className={`flex items-center justify-between gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${isLightMode ? 'border-zinc-200 text-zinc-700' : 'border-white/10 text-white/80'}`}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: chartPalette[index % chartPalette.length] }}
                                  />
                                  <span className="truncate">{entry.name}</span>
                                </span>
                                <span className={isLightMode ? 'text-zinc-500' : 'text-white/55'}>{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className={`grid h-full place-items-center rounded-2xl border ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/10 bg-black/20 text-white/55'}`}>
                        Sem dados para esse filtro
                      </div>
                    )}
                  </div>
                </article>
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
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] xl:items-center">
                <div className="xl:pr-4">
                  <SearchBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Buscar OKR, área, objetivo..."
                    suggestions={searchTerm ? filteredItems : []}
                    onSuggestionClick={(item) => setExpandedKrId(item.id)}
                    theme={theme}
                  />
                </div>

                <div className="relative" data-filter-dropdown>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(openMenu === 'categoria' ? null : 'categoria')}
                      className={filtersButtonClass}
                    >
                    <span>{categoryFilter || 'Meta área'}</span>
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
                        Todas as meta áreas
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

                <div className="relative" data-filter-dropdown>
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
                    className={`${filterChipBaseClass} ${areaFilter === area ? 'text-white' : ''}`}
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
                <section className="grid gap-4">
                  <div className="grid gap-4">
                    {paginatedItems.map((item) => {
                      const isExpanded = expandedKrId === item.id;
                      const localState = getState(item.id, item.views ?? 0, item.likes ?? 0, Boolean(item.pinned));
                      const status = getKrStatus(item) || 'Pendente';
                      const tone = (statusTone[status] || statusTone.Pendente)[isLightMode ? 'light' : 'dark'];
                      const accent = accentByMetaArea(getKrMetaArea(item));
                      const progress = getCompletionPercent(item);
                      const hasCoverImage = Boolean(item.Imagem_capa);
                      const cardId = `okr-card-${item.id}`;
                      const entryGroups = getKrEntries(item);

                      return (
                          <article
                            key={item.id}
                            id={cardId}
                            ref={(el) => {
                              cardRefs.current[item.id] = el;
                            }}
                          className={`${cardClass} relative`}
                        >
                          <div
                            className="absolute inset-y-0 left-0 z-10 w-2 rounded-r-full bg-gradient-to-b from-[#F4D86A] via-[#EEC137] to-[#EEC137]/30"
                            aria-hidden="true"
                          />
                          <div
                            className="grid cursor-pointer gap-4 p-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-start"
                            onClick={(event) => {
                              const target = event.target as HTMLElement;
                              if (target.closest('button, a, input, select, textarea, [role="button"]')) return;
                              if (isExpanded) {
                                setExpandedKrId(null);
                              } else {
                                openItemDetails(item);
                              }
                            }}
                          >
                            <div className={`relative h-44 w-full shrink-0 overflow-hidden rounded-[24px] border md:h-[180px] ${isLightMode ? 'border-zinc-200 bg-zinc-100' : 'border-white/10 bg-[#111114]'}`}>
                              {hasCoverImage ? (
                                <>
                                  <img
                                    src={item.Imagem_capa}
                                    alt={getKrKeyResult(item)}
                                    className={`h-full w-full object-cover ${isLightMode ? 'grayscale-[0.95] brightness-[1.02] contrast-75 opacity-70' : ''}`}
                                  />
                                  {isLightMode ? (
                                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-100/65 via-zinc-200/45 to-zinc-300/25 mix-blend-multiply" />
                                  ) : (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                  )}
                                </>
                              ) : (
                                <NeutralThumb theme={theme} />
                              )}

                              <div className="absolute left-3 right-3 top-3 flex items-center justify-end gap-2">
                                <span className={`rounded-full border px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.14em] ${
                                  isLightMode ? 'border-zinc-300 bg-zinc-100 text-zinc-700' : 'border-white/25 bg-black/65 text-white/90'
                                }`}>
                                  {displayValue(getKrPeriod(item), 'Sem período')}
                                </span>
                              </div>
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col justify-between md:py-1">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                                <div className="min-w-0">
                                  <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
                                    {displayValue(getKrMetaArea(item), 'Meta área')}
                                  </p>
                                  <h2
                                    className={`mt-2 text-[1.15rem] font-black leading-tight break-words [hyphens:auto] [text-wrap:balance] line-clamp-3 sm:text-[1.35rem] sm:line-clamp-2 lg:text-[1.45rem] ${
                                      isLightMode ? 'text-zinc-900' : 'text-white'
                                    }`}
                                  >
                                    {displayValue(getKrKeyResult(item), 'Key Result')}
                                  </h2>
                                  {item.groupCount && item.groupCount > 1 && (
                                    <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>
                                      {item.groupCount} entradas consolidadas por título
                                    </p>
                                  )}
                                </div>
                                <div className="shrink-0 flex flex-nowrap items-center gap-2 md:justify-end">
                                  <div className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${tone}`}>
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    {status}
                                  </div>
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold ${
                                      isLightMode
                                        ? 'border-[#88C125]/45 bg-[#88C125]/22 text-[#245b08] shadow-[0_4px_14px_rgba(136,193,37,0.15)]'
                                        : 'border-[#88C125]/55 bg-[#88C125]/20 text-[#e1ff9e] shadow-[0_4px_14px_rgba(136,193,37,0.18)]'
                                    } h-9`}
                                  >
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    <span className="text-[10px] uppercase tracking-[0.18em]">Evolução</span>
                                    <span className="text-sm font-black">{displayValue(getKrEvolution(item), `${progress}%`)}</span>
                                  </span>
                                </div>
                              </div>

                              <p className={`mt-3 max-w-3xl text-sm leading-6 line-clamp-2 ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                                {displayValue(getKrObjective(item), 'OKR sem objetivo definido no momento.')}
                              </p>

                              <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>
                                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>
                                  <Users className="h-3.5 w-3.5" />
                                  {displayValue(getKrTeam(item), 'Time/Squad')}
                                </span>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
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
                                    if (isExpanded) {
                                      setExpandedKrId(null);
                                      return;
                                    }
                                    openItemDetails(item);
                                  }}
                                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors ${
                                    isLightMode ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
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
                                  Participar do KR
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className={cardBodyClass}>
                              <div className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                  <MetricCard label="Valor base" value={displayValue(getKrBase(item))} theme={theme} accent="#EEC137" />
                                  <MetricCard label="Valor alvo" value={displayValue(getKrGoal(item))} theme={theme} accent="#88C125" />
                                  <MetricCard label="Valor atual" value={displayValue(getKrCurrent(item))} theme={theme} accent="#4CD07D" />
                                  <MetricCard label="Evolução" value={displayValue(getKrEvolution(item), `${progress}%`)} theme={theme} accent="#F78E43" />
                                </div>

                                <div className={`rounded-[24px] border p-4 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-black/20'}`}>
                                  <div className="flex items-center justify-between gap-4">
                                    <div>
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Resumo da linha</p>
                                      <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>Metadados principais para identificar a entrada.</p>
                                    </div>
                                    <FileText className="h-5 w-5 shrink-0 text-[#EEC137]" />
                                  </div>

                                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    <InfoChip label="ID" value={displayValue(item.id, '—')} theme={theme} />
                                    <InfoChip label="Meta" value={displayValue(getKrMetaArea(item), '—')} theme={theme} />
                                    <InfoChip label="Time" value={displayValue(getKrTeam(item), '—')} theme={theme} />
                                    <InfoChip label="Período" value={displayValue(getKrPeriod(item), '—')} theme={theme} />
                                    <InfoChip label="Status" value={displayValue(getKrStatus(item), 'Pendente')} theme={theme} />
                                    <InfoChip label="Atualização" value={displayValue(getKrUpdatedAt(item), '—')} theme={theme} />
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                      <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Responsáveis deste OKR</p>
                                      <p className={`mt-1 text-sm font-semibold ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>Abra cada responsável para ver números, plano e observações.</p>
                                    </div>
                                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${isLightMode ? 'border-zinc-200 bg-white text-zinc-600' : 'border-white/10 bg-white/6 text-white/70'}`}>
                                      {entryGroups.length} linhas
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                  {entryGroups.map((entry, entryIndex) => (
                                    (() => {
                                      const entryId = `${entry.id || entryIndex}`;
                                      const entryKey = `${item.id}:${entryId}`;
                                      const entryOpen = expandedEntryId === entryKey;
                                      return (
                                        <div
                                          key={`${item.id}-${entryId}`}
                                          className={`overflow-hidden rounded-[22px] border ${isLightMode ? 'border-zinc-200 bg-white' : 'border-white/8 bg-white/5'} ${entryOpen ? 'ring-1 ring-[#88C125]/20' : ''}`}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => toggleEntryDetails(item.id, entryId)}
                                            className={`flex w-full items-start justify-between gap-3 border-l-4 p-4 text-left transition-colors ${
                                              isLightMode ? 'border-l-[#88C125]/70 hover:bg-zinc-50' : 'border-l-[#88C125]/80 hover:bg-white/5'
                                            }`}
                                          >
                                            <div className="min-w-0">
                                              <p className={`text-sm font-bold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                                                {displayValue(entry.responsavelKR, 'Sem responsável')}
                                              </p>
                                              <p className={`mt-1 text-sm leading-6 ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                                                {displayValue(entry.funcao, 'Função não definida')}
                                              </p>
                                              <p className={`mt-1 text-xs leading-5 ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>
                                                {displayValue(entry.objetivo, 'Objetivo não definido')}
                                              </p>
                                              <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>
                                                {displayValue(entry.id, 'Sem ID')}
                                              </p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-2">
                                              <div className="flex flex-wrap items-center justify-end gap-2">
                                                <span
                                                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                                    (entry.status || '').toLowerCase().includes('conclu')
                                                      ? isLightMode
                                                        ? 'border-[#4CD07D]/40 bg-[#4CD07D]/12 text-[#166a41]'
                                                        : 'border-[#4CD07D]/30 bg-[#4CD07D]/10 text-[#c8ffe0]'
                                                      : (entry.status || '').toLowerCase().includes('risco')
                                                        ? isLightMode
                                                          ? 'border-[#F2A43A]/45 bg-[#F2A43A]/16 text-[#8b4d06]'
                                                          : 'border-[#F2A43A]/30 bg-[#F2A43A]/10 text-[#ffe6bf]'
                                                        : isLightMode
                                                          ? 'border-zinc-200 bg-zinc-100 text-zinc-700'
                                                          : 'border-white/10 bg-white/6 text-white/70'
                                                  }`}
                                                >
                                                  {displayValue(entry.status, 'Pendente')}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${isLightMode ? 'border-[#88C125]/45 bg-[#88C125]/14 text-[#245b08]' : 'border-[#88C125]/35 bg-[#88C125]/10 text-[#e1ff9e]'}`}>
                                                  <span className="uppercase tracking-[0.18em] text-[10px] opacity-80">Evolução</span>
                                                  <span>{displayValue(entry.evolucao, '—')}</span>
                                                </span>
                                              </div>
                                              <span className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>
                                                {entryOpen ? 'Fechar' : 'Abrir'}
                                              </span>
                                              <ChevronDown className={`h-4 w-4 transition-transform ${entryOpen ? 'rotate-180' : ''} ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`} />
                                            </div>
                                          </button>

                                          {entryOpen && (
                                            <div className={`border-t px-4 py-4 ${isLightMode ? 'border-zinc-200 bg-zinc-50/70' : 'border-white/8 bg-black/15'}`}>
                                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                <MetricCard label="Valor base" value={displayValue(entry.valorBase, '—')} theme={theme} accent="#EEC137" subdued />
                                                <MetricCard label="Valor alvo" value={displayValue(entry.valorAlvo, '—')} theme={theme} accent="#88C125" subdued />
                                                <MetricCard label="Valor atual" value={displayValue(entry.valorAtual, '—')} theme={theme} accent="#4CD07D" subdued />
                                              </div>

                                              <div className="mt-3 flex flex-wrap gap-2">
                                                <InfoChip label="Última atualização" value={displayValue(entry.ultimaAtualizacao, '—')} theme={theme} />
                                                <InfoChip label="Sinergia" value={displayValue(entry.sinergia, 'Não informado')} theme={theme} />
                                                <InfoChip label="Frente parceira" value={displayValue(entry.frenteParceira, 'Sem frente associada')} theme={theme} />
                                              </div>

                                              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                                                <div className={`rounded-2xl border p-3 ${isLightMode ? 'border-zinc-200 bg-white' : 'border-white/8 bg-white/5'}`}>
                                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Plano de ação</p>
                                                  <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${isLightMode ? 'text-zinc-700' : 'text-white/76'}`}>{displayValue(entry.planoAcao, 'Sem plano de ação registrado.')}</p>
                                                </div>
                                                <div className={`rounded-2xl border p-3 ${isLightMode ? 'border-zinc-200 bg-white' : 'border-white/8 bg-white/5'}`}>
                                                  <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Observações</p>
                                                  <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${isLightMode ? 'text-zinc-700' : 'text-white/76'}`}>{displayValue(entry.observacoes, 'Sem observações.')}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()
                                  ))}
                                  </div>
                                </div>
                              </div>
                          </div>
                        )}

                        </article>
                      );
                    })}
                  </div>
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
                <p className={`text-lg font-semibold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Nenhum OKR encontrado.</p>
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

const UserRoundIcon = () => <Users className="h-3.5 w-3.5" />;

export default KRsScreen;
