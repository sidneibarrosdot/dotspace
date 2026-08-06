import React, { useEffect, useMemo, useRef, useState } from 'react';
import MobileFooterNav from '../components/MobileFooterNav';
import Pagination from '../components/Pagination';
import PageFilterActions from '../components/PageFilterActions';
import { forumItems as forumSeedItems, type ForumItem } from '../data/forumItems';
import { buildCommentTree, forumDiscussionSeed, type ForumCommentNode, type ForumCommentRecord } from '../data/forumDiscussion';
import { processosItems } from '../data/processosItems';
import { treinamentosItems } from '../data/treinamentosItems';
import { krsItems } from '../data/krsItems';
import { recordLocalCardInteractionEvent } from '../hooks/useLocalCardInteractions';
import { FEEDBACK_COPY_ERROR, FEEDBACK_COPY_SUCCESS, FEEDBACK_TIMEOUT_ERROR, FEEDBACK_TIMEOUT_SUCCESS } from '../constants/feedbackMessages';
import { scrollToAppTop } from '../utils/scrollHost';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Building2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Eye,
  Home,
  LayoutGrid,
  BookMarked,
  MessageSquareMore,
  Filter,
  MessageCircle,
  Tag,
} from 'lucide-react';
import type { User } from 'firebase/auth';

type SortMode = 'recentes' | 'mais-replies' | 'mais-views';
type SubjectType = 'Processo' | 'Treinamento' | 'KR';

interface ForumThread extends ForumItem {
  subjectType?: SubjectType;
  subjectLabel?: string;
  subjectHref?: string;
  createdBy?: string;
  createdAt?: string;
  source?: 'seed' | 'manual';
}

interface DiscussionDraft {
  title: string;
  excerpt: string;
  category: string;
  subjectType: SubjectType | '';
  subjectId: string;
}

interface ForumScreenProps {
  user: User | null;
  isLoggedIn: boolean;
  onNavigateToPortfolio: () => void;
  onNavigateToProcessos: () => void;
  onNavigateToTreinamentos: () => void;
  onNavigateToKRs: () => void;
  onNavigateToAgentes: () => void;
  onNavigateToOrganograma: () => void;
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

const DISCUSSIONS_STORAGE_KEY = 'dot-space.forum.discussions.v1';
const COMMENTS_STORAGE_KEY = 'dot-space.forum.comments.v1';

const createInitialDiscussions = (): ForumThread[] => {
  try {
    const raw = window.localStorage.getItem(DISCUSSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ForumThread[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    // ignore storage issues
  }

  return forumSeedItems.map((item) => ({
    ...item,
    source: 'seed',
  }));
};

const createInitialComments = (): Record<string, ForumCommentRecord[]> => {
  try {
    const raw = window.localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, ForumCommentRecord[]>;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore storage issues
  }

  return forumDiscussionSeed;
};

const buildSubjectOptions = () => ({
  Processo: processosItems.map((item) => ({ id: item.id, label: item.Projeto, href: item.Link_PMV })),
  Treinamento: treinamentosItems.map((item) => ({ id: item.id, label: item.Projeto, href: item.Link_PMV })),
  KR: krsItems.map((item) => ({ id: item.id, label: item.Projeto, href: item.Link_PMV })),
});

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();


const ForumScreen: React.FC<ForumScreenProps> = ({
  user,
  isLoggedIn,
  onNavigateToPortfolio,
  onNavigateToProcessos,
  onNavigateToTreinamentos,
  onNavigateToKRs,
  onNavigateToAgentes,
  onNavigateToOrganograma,
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
  const [discussionItems, setDiscussionItems] = useState<ForumThread[]>(createInitialDiscussions);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; author: string } | null>(null);
  const [commentsByThread, setCommentsByThread] = useState<Record<string, ForumCommentRecord[]>>(createInitialComments);
  const [currentPage, setCurrentPage] = useState(1);
  const replyComposerRef = useRef<HTMLDivElement | null>(null);
  const filtersRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<DiscussionDraft>({
    title: '',
    excerpt: '',
    category: 'Governança',
    subjectType: '',
    subjectId: '',
  });
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
  const listItemClass = isLightMode
    ? 'group overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)] transition-transform hover:-translate-y-0.5'
    : 'group overflow-hidden rounded-[26px] border border-white/10 bg-[#17171b] shadow-[0_16px_45px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-0.5';
  const cardTextClass = isLightMode ? 'text-zinc-600' : 'text-white/70';
  const composerClass = isLightMode
    ? 'rounded-[30px] border border-zinc-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)]'
    : 'rounded-[30px] border border-white/10 bg-[#16161a] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)]';
  const subjectOptions = useMemo(() => buildSubjectOptions(), []);
  const categories = useMemo(() => Array.from(new Set(discussionItems.map((item) => item.category))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [discussionItems]);
  const selectedThread = useMemo(
    () => discussionItems.find((item) => item.id === selectedThreadId) ?? null,
    [discussionItems, selectedThreadId]
  );
  const selectedThreadCreator = selectedThread ? selectedThread.createdBy || selectedThread.author : null;
  const canCloseSelectedThread = Boolean(selectedThread && selectedThreadCreator && user?.displayName === selectedThreadCreator);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = discussionItems.filter((item) => {
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
  }, [discussionItems, searchTerm, categoryFilter, sortMode, showFavoritesOnly]);

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
    if (!selectedThreadId) return;
    if (!discussionItems.some((item) => item.id === selectedThreadId)) {
      setSelectedThreadId(null);
    }
  }, [discussionItems, selectedThreadId]);

  useEffect(() => {
    setReplyingTo(null);
  }, [selectedThreadId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DISCUSSIONS_STORAGE_KEY, JSON.stringify(discussionItems));
    } catch {
      // ignore storage issues
    }
  }, [discussionItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(commentsByThread));
    } catch {
      // ignore storage issues
    }
  }, [commentsByThread]);

  const openThreadDetails = (threadId: string) => {
    recordLocalCardInteractionEvent('forum', threadId, 'open');
    setSelectedThreadId(threadId);
    setReplyingTo(null);
    setReplyDraft('');
    scrollToAppTop();
  };

  const closeThreadDetails = () => {
    setSelectedThreadId(null);
    setReplyingTo(null);
    setReplyDraft('');
    scrollToAppTop();
  };

  const activeDiscussionComments = useMemo(
    () => (selectedThreadId ? buildCommentTree(commentsByThread[selectedThreadId] ?? []) : []),
    [commentsByThread, selectedThreadId]
  );

  const handlePostReply = () => {
    if (!selectedThreadId) return;
    const text = replyDraft.trim();
    if (!text) return;
    recordLocalCardInteractionEvent('forum', selectedThreadId, 'reply');
    const newComment: ForumCommentRecord = {
      id: `c-${Date.now()}`,
      author: user?.displayName || 'Você',
      role: 'Participante',
      text,
      createdAt: new Date().toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      likes: 0,
      mine: true,
      parentId: replyingTo?.commentId ?? null,
    };

    setCommentsByThread((current) => ({
      ...current,
      [selectedThreadId]: [...(current[selectedThreadId] ?? []), newComment],
    }));
    setReplyDraft('');
    setReplyingTo(null);
  };

  const toggleCommentLike = (threadId: string, commentId: string) => {
    recordLocalCardInteractionEvent('forum', threadId, 'like');
    setCommentsByThread((current) => ({
      ...current,
      [threadId]: (current[threadId] ?? []).map((comment) =>
        comment.id === commentId ? { ...comment, likes: comment.likes + 1 } : comment
      ),
    }));
  };

  const handleCreateDiscussion = () => {
    const title = draft.title.trim();
    const excerpt = draft.excerpt.trim();
    if (!title || !excerpt || !draft.category) return;

    const subjectList = draft.subjectType ? subjectOptions[draft.subjectType] : [];
    const selectedSubject = subjectList?.find((item) => item.id === draft.subjectId);
    const id = `forum-${slugify(title)}-${Date.now()}`;
    const now = new Date();
    const createdAt = now.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const lastActivity = now.toISOString().slice(0, 10);

    const newThread: ForumThread = {
      id,
      title,
      excerpt,
      category: draft.category,
      author: user?.displayName || 'Você',
      replies: 0,
      views: 0,
      lastActivity,
      status: 'Aberto',
      pinned: false,
      subjectType: draft.subjectType || undefined,
      subjectLabel: selectedSubject?.label,
      subjectHref: selectedSubject?.href,
      createdBy: user?.displayName || 'Você',
      createdAt,
      source: 'manual',
    };

    recordLocalCardInteractionEvent('forum', id, 'create');
    setDiscussionItems((current) => [newThread, ...current]);
    setCommentsByThread((current) => ({ ...current, [id]: [] }));
    setDraft({
      title: '',
      excerpt: '',
      category: draft.category,
      subjectType: '',
      subjectId: '',
    });
    setSelectedThreadId(id);
    setReplyDraft('');
    setReplyingTo(null);
    window.requestAnimationFrame(() => {
      scrollToAppTop();
    });
  };

  const handleCloseSelectedThread = () => {
    if (!selectedThread || !canCloseSelectedThread) return;

    const now = new Date().toISOString().slice(0, 10);
    setDiscussionItems((current) =>
      current.map((item) => (item.id === selectedThread.id ? { ...item, status: 'Resolvido', lastActivity: now } : item))
    );
  };

  const renderCommentTree = (threadId: string, nodes: ForumCommentNode[], depth = 0) => (
    <div className="space-y-3">
      {nodes.map((comment) => {
        const maxVisibleDepth = 1;
        const nestedCount = comment.children.length;
        return (
          <div
            key={comment.id}
            className={`rounded-[24px] border p-4 ${comment.mine ? (isLightMode ? 'border-[#88C125]/40 bg-[#88C125]/8' : 'border-[#88C125]/30 bg-[#88C125]/10') : isLightMode ? 'border-zinc-200 bg-white' : 'border-white/8 bg-white/5'} ${depth > 0 ? 'ml-6' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-bold ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{comment.author}</p>
                <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.26em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>{comment.role}</p>
              </div>
              <span className={`text-xs ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>{comment.createdAt}</span>
            </div>
            {comment.parentId && (
              <p className={`mt-3 rounded-2xl border px-3 py-2 text-xs italic ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/8 bg-white/5 text-white/50'}`}>
                Resposta dentro desta conversa
              </p>
            )}
            <p className={`mt-3 text-sm leading-7 ${isLightMode ? 'text-zinc-700' : 'text-white/75'}`}>{comment.text}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCommentLike(threadId, comment.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}
              >
                Curtir · {comment.likes}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyingTo({ commentId: comment.id, author: comment.author });
                  setSelectedThreadId(threadId);
                  window.requestAnimationFrame(() => {
                    replyComposerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}
              >
                Responder
              </button>
            </div>
            {nestedCount > 0 && (
              <div className="mt-4 border-l border-dashed border-zinc-300/50 pl-4 dark:border-white/10">
                {depth >= maxVisibleDepth ? (
                  <div className={`rounded-2xl border px-3 py-2 text-xs ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/8 bg-white/5 text-white/55'}`}>
                    {nestedCount} respostas
                  </div>
                ) : (
                  renderCommentTree(threadId, comment.children, depth + 1)
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const stats = [
    { label: 'Tópicos', value: discussionItems.length, accent: '#EEC137' },
    { label: 'Categorias', value: categories.length, accent: '#F78E43' },
    { label: 'Respostas', value: discussionItems.reduce((sum, item) => sum + item.replies, 0), accent: '#4CD07D' },
    { label: 'Vinculados', value: discussionItems.filter((item) => Boolean(item.subjectLabel)).length, accent: '#88C125' },
  ];

  const menuItems = [
    { label: 'Home', icon: Home, action: onNavigateToPortfolio },
    { label: 'Processos', icon: LayoutGrid, action: onNavigateToProcessos },
    { label: 'Treinamentos', icon: BookOpen, action: onNavigateToTreinamentos },
    { label: "Banco de OKR's", icon: BookMarked, action: onNavigateToKRs },
    { label: 'Agentes de IA', icon: Bot, action: onNavigateToAgentes },
    { label: 'Organograma', icon: Building2, action: onNavigateToOrganograma },
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

  if (selectedThread) {
    const statusKey = selectedThread.status || 'Aberto';

    return (
      <div className={pageClass}>
        <main className="container mx-auto px-4 py-6 pb-44 sm:px-6 sm:py-8 sm:pb-8 lg:px-8">
          <section className={heroClass}>
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-300" />
            <div className={heroOverlayClass} />
            <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-4xl">
                <button
                  type="button"
                  onClick={closeThreadDetails}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                    isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white/82 hover:bg-white/10'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar para a lista
                </button>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.38em] text-[#88C125]">Discussão</p>
                <h1 className={`mt-3 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                  {selectedThread.title}
                </h1>
                <p className={`mt-4 max-w-3xl text-sm leading-7 sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                  {selectedThread.excerpt}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {[selectedThread.category, selectedThread.author, statusKey].map((tagText) => (
                    <span
                      key={tagText}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        isLightMode ? 'border-zinc-200 bg-white text-zinc-600' : 'border-white/10 bg-white/5 text-white/68'
                      }`}
                    >
                      {tagText}
                    </span>
                  ))}
                {selectedThread.subjectLabel && (
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      isLightMode ? 'border-[#88C125]/40 bg-[#88C125]/12 text-[#355c0e]' : 'border-[#88C125]/30 bg-[#88C125]/10 text-[#d9ffac]'
                    }`}
                  >
                    {selectedThread.subjectType || 'Assunto-chave'} · {selectedThread.subjectLabel}
                  </span>
                )}
                {selectedThread.subjectHref && (
                  <button
                    type="button"
                    onClick={() => window.open(selectedThread.subjectHref, '_blank', 'noopener,noreferrer')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    Abrir vínculo
                  </button>
                )}
              </div>
              </div>

                <div className="grid min-w-[280px] grid-cols-2 gap-3">
                <div className={heroStatClass}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>Respostas</p>
                  <p className={`mt-2 text-3xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{selectedThread.replies}</p>
                </div>
                <div className={heroStatClass}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>Visualizações</p>
                  <p className={`mt-2 text-3xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{selectedThread.views}</p>
                </div>
                <div className={heroStatClass}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>Última atividade</p>
                  <p className={`mt-2 text-lg font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{selectedThread.lastActivity}</p>
                </div>
                <div className={`rounded-3xl border p-4 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/10 bg-white/8'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>Status</p>
                  <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[statusKey as NonNullable<ForumItem['status']>][isLightMode ? 'light' : 'dark']}`}>
                    {statusKey}
                  </div>
                  {statusKey !== 'Resolvido' && canCloseSelectedThread && (
                    <button
                      type="button"
                      onClick={handleCloseSelectedThread}
                      className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      Fechar discussão
                    </button>
                  )}
                  {statusKey !== 'Resolvido' && !canCloseSelectedThread && (
                    <p className={`mt-3 text-xs leading-5 ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>
                      Somente o criador pode fechar esta discussão.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 space-y-6">
            <div className={`${listItemClass} relative`}>
              <div
                className={`absolute left-0 top-0 h-full w-1.5 ${isLightMode ? '' : 'bg-[#cfd3d8]'}`}
                style={isLightMode ? { backgroundColor: '#cfd3d8', opacity: 0.95 } : { opacity: 0.95 }}
              />
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[#88C125]">{selectedThread.category}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/10 bg-white/5 text-white/55'}`}>
                    {selectedThread.author}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'border-zinc-200 bg-white text-zinc-500' : 'border-white/10 bg-white/6 text-white/55'}`}>
                    <Clock3 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                    {selectedThread.lastActivity}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetaBlock label="Categoria" value={selectedThread.category} theme={theme} />
                  <MetaBlock label="Autor" value={selectedThread.author} theme={theme} />
                  <MetaBlock label="Status" value={statusKey} theme={theme} />
                </div>
              </div>
            </div>

            <div className={`rounded-[28px] border p-5 ${isLightMode ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/8 bg-white/5'}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.36em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Comentários</p>
                  <h2 className={`mt-2 text-xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Conversa em árvore</h2>
                </div>
                <MessageCircle className={`h-5 w-5 ${isLightMode ? 'text-zinc-400' : 'text-white/50'}`} />
              </div>

              <div className="mt-5">
                {activeDiscussionComments.length ? (
                  renderCommentTree(selectedThread.id, activeDiscussionComments)
                ) : (
                  <div className={`rounded-2xl border px-4 py-6 text-sm ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/10 bg-white/5 text-white/55'}`}>
                    Ainda não há comentários nessa discussão.
                  </div>
                )}
              </div>
            </div>

            <div ref={replyComposerRef} className={`rounded-[28px] border p-5 ${isLightMode ? 'border-zinc-200 bg-zinc-50/80' : 'border-white/8 bg-black/15'}`}>
              <div className="space-y-4">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.36em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Interagir</p>
                  <h3 className={`mt-2 text-xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Escreva sua contribuição</h3>
                </div>

                {replyingTo && (
                  <div className={`rounded-2xl border p-3 text-sm ${isLightMode ? 'border-[#88C125]/30 bg-[#88C125]/8 text-zinc-700' : 'border-[#88C125]/25 bg-[#88C125]/10 text-white/80'}`}>
                    Respondendo a <strong>{replyingTo.author}</strong>
                  </div>
                )}

                <textarea
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  placeholder="Escreva uma nova resposta ou uma contribuição para a conversa..."
                  className={`min-h-[220px] w-full rounded-[24px] border p-4 text-sm outline-none transition-colors ${
                    isLightMode
                      ? 'border-zinc-200 bg-white text-zinc-800 placeholder:text-zinc-400 focus:border-[#88C125]'
                      : 'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:border-[#88C125]'
                  }`}
                />

                <div className="flex flex-wrap gap-2">
                  {['Concordo', 'Precisa de ajuste', 'Tenho uma sugestão'].map((quickReply) => (
                    <button
                      key={quickReply}
                      type="button"
                      onClick={() => setReplyDraft((current) => (current ? `${current}\n${quickReply}` : quickReply))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      {quickReply}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePostReply}
                    className="rounded-full bg-[#88C125] px-4 py-3 text-sm font-bold text-white transition-colors hover:brightness-95"
                  >
                    Publicar resposta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyDraft('');
                      setReplyingTo(null);
                    }}
                    className={`rounded-full border px-4 py-3 text-sm font-semibold ${
                      isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    Limpar
                  </button>
                </div>
              </div>
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
  }

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

          <div className="relative space-y-6" data-development-lock-content>
            <section className={heroClass}>
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-zinc-300 via-zinc-200 to-zinc-300" />
              <div className={heroOverlayClass} />
              <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div>
                  <p className="inline-flex rounded-full bg-[#88C125]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-[#88C125]">Fórum</p>
                <h1 className={`mt-3 max-w-4xl text-2xl font-black leading-tight sm:text-3xl lg:text-4xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                    Um espaço vivo para discutir, resolver e compartilhar.
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                    Um espaço aberto para perguntas, alinhamentos, ideias e resoluções que precisam ficar organizadas e fáceis de acompanhar.
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
                      <div className="mb-3 h-1.5 w-16 rounded-full bg-zinc-300/70 dark:bg-white/20" />
                      <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/50'}`}>{item.label}</p>
                      <p className={`mt-2 text-3xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={composerClass}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.38em] text-[#88C125]">Nova discussão</p>
                  <h2 className={`mt-3 text-xl font-black sm:text-2xl ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>
                    Abra uma nova discussão e conecte o contexto que fizer sentido
                  </h2>
                  <p className={`mt-3 text-sm leading-7 ${isLightMode ? 'text-zinc-600' : 'text-white/70'}`}>
                    Aqui você publica conversas novas e pode conectar a um assunto relacionado para facilitar o contexto.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Título</span>
                      <input
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Ex.: Como integrar onboarding ao KR de treinamento?"
                        className={`w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition-colors ${
                          isLightMode
                            ? 'border-zinc-200 bg-zinc-50 text-zinc-800 placeholder:text-zinc-400 focus:border-[#88C125] focus:bg-white'
                            : 'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:border-[#88C125]'
                        }`}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Categoria</span>
                      <input
                        value={draft.category}
                        onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                        placeholder="Ex.: Processos internos"
                        className={`w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition-colors ${
                          isLightMode
                            ? 'border-zinc-200 bg-zinc-50 text-zinc-800 placeholder:text-zinc-400 focus:border-[#88C125] focus:bg-white'
                            : 'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:border-[#88C125]'
                        }`}
                      />
                    </label>
                  </div>

                  <label className="space-y-2 block">
                    <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Resumo</span>
                    <textarea
                      value={draft.excerpt}
                      onChange={(event) => setDraft((current) => ({ ...current, excerpt: event.target.value }))}
                      placeholder="Descreva a discussão, contexto e o que você quer resolver..."
                      className={`min-h-[128px] w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition-colors ${
                        isLightMode
                          ? 'border-zinc-200 bg-zinc-50 text-zinc-800 placeholder:text-zinc-400 focus:border-[#88C125] focus:bg-white'
                          : 'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:border-[#88C125]'
                      }`}
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Vínculo opcional</span>
                      <select
                        value={draft.subjectType}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, subjectType: event.target.value as DiscussionDraft['subjectType'], subjectId: '' }))
                        }
                        className={`w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition-colors ${
                          isLightMode
                            ? 'border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-[#88C125] focus:bg-white'
                            : 'border-white/10 bg-white/5 text-white focus:border-[#88C125]'
                        }`}
                      >
                        <option value="">Nenhum</option>
                        <option value="Processo">Processo</option>
                        <option value="Treinamento">Treinamento</option>
                        <option value="KR">KR</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Item relacionado</span>
                      <select
                        value={draft.subjectId}
                        onChange={(event) => setDraft((current) => ({ ...current, subjectId: event.target.value }))}
                        disabled={!draft.subjectType}
                        className={`w-full rounded-[22px] border px-4 py-3 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                          isLightMode
                            ? 'border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-[#88C125] focus:bg-white'
                            : 'border-white/10 bg-white/5 text-white focus:border-[#88C125]'
                        }`}
                      >
                        <option value="">Selecione</option>
                        {draft.subjectType &&
                          subjectOptions[draft.subjectType].map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>

                  <div className={`rounded-[24px] border p-4 ${isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${isLightMode ? 'text-zinc-500' : 'text-white/40'}`}>Prévia do vínculo</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {draft.subjectType ? (
                        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isLightMode ? 'border-[#88C125]/40 bg-[#88C125]/10 text-[#355c0e]' : 'border-[#88C125]/30 bg-[#88C125]/10 text-[#d9ffac]'}`}>
                          {draft.subjectType}
                        </span>
                      ) : (
                        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isLightMode ? 'border-zinc-200 bg-white text-zinc-500' : 'border-white/10 bg-white/5 text-white/55'}`}>
                          Sem vínculo definido
                        </span>
                      )}
                      {draft.subjectType && draft.subjectId && subjectOptions[draft.subjectType].find((item) => item.id === draft.subjectId) ? (
                        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isLightMode ? 'border-zinc-200 bg-white text-zinc-700' : 'border-white/10 bg-white/5 text-white/75'}`}>
                          {subjectOptions[draft.subjectType].find((item) => item.id === draft.subjectId)?.label}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCreateDiscussion}
                        className="rounded-full bg-[#88C125] px-4 py-3 text-sm font-bold text-white transition-colors hover:brightness-95"
                      >
                        Publicar discussão
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            title: '',
                            excerpt: '',
                            category: 'Governança',
                            subjectType: '',
                            subjectId: '',
                          })
                        }
                        className={`rounded-full border px-4 py-3 text-sm font-semibold ${
                          isLightMode ? 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
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
                      placeholder="Buscar tópico, autor ou palavra-chave..."
                      className={`w-full rounded-full border py-3 pl-12 pr-4 outline-none transition-colors ${
                        isLightMode
                          ? 'border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:border-[#88C125] focus:bg-white'
                          : 'border-white/10 bg-white/6 text-white placeholder:text-white/40 focus:border-[#88C125] focus:bg-white/8'
                      }`}
                    />
                  </div>
                </div>

                <div className="relative" data-filter-dropdown>
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
                <span className={`text-sm ${isLightMode ? 'text-zinc-500' : 'text-white/55'}`}>
                  Use a lista de categoria acima para refinar os tópicos.
                </span>
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.36em] ${isLightMode ? 'text-zinc-500' : 'text-white/45'}`}>Perguntas principais</p>
                    <h2 className={`mt-2 text-xl font-black ${isLightMode ? 'text-zinc-900' : 'text-white'}`}>Últimas discussões do time</h2>
                  </div>
                  <p className={`hidden text-sm ${isLightMode ? 'text-zinc-500' : 'text-white/55'} sm:block`}>{filteredItems.length} tópicos</p>
                </div>

                <div className="space-y-4">
                  {paginatedItems.map((item) => {
                    const statusKey = item.status || 'Aberto';
                    return (
                      <article key={item.id} id={`forum-thread-${item.id}`} className={`${listItemClass} relative`}>
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
                              <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[#88C125]">{item.category}</p>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-white/10 bg-white/5 text-white/55'}`}>
                                {item.author}
                              </span>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${isLightMode ? 'border-zinc-200 bg-white text-zinc-500' : 'border-white/10 bg-white/6 text-white/55'}`}>
                                <Clock3 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                                {item.lastActivity}
                              </span>
                            </div>

                            <h3
                              className={`mt-2 text-xl font-black leading-tight break-words [hyphens:auto] [text-wrap:balance] line-clamp-2 sm:text-2xl ${
                                isLightMode ? 'text-zinc-900' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </h3>
                            <p className={`mt-3 max-w-3xl text-sm leading-7 ${cardTextClass}`}>{item.excerpt}</p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.subjectLabel && (
                                <span
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                    isLightMode ? 'border-[#88C125]/40 bg-[#88C125]/12 text-[#355c0e]' : 'border-[#88C125]/30 bg-[#88C125]/10 text-[#d9ffac]'
                                  }`}
                                >
                                  {item.subjectType || 'Assunto-chave'} · {item.subjectLabel}
                                </span>
                              )}
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
                              onClick={() => openThreadDetails(item.id)}
                              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors ${
                                isLightMode ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50' : 'border-white/10 bg-white/6 text-white hover:bg-white/10'
                              }`}
                            >
                              Ver detalhes
                              <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openThreadDetails(item.id);
                              }}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#88C125] px-4 py-3 text-sm font-bold text-white transition-colors hover:brightness-95"
                            >
                              Responder
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
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
