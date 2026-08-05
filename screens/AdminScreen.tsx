
import React, { useState, useEffect } from 'react';
import DotLogo from '../components/DotLogo';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, writeBatch, doc, onSnapshot } from 'firebase/firestore';
import { User } from 'firebase/auth';
import type { DevelopmentLockKey, HomeSectionKey, PortfolioItem } from '../types';
import { portfolioItems as localPortfolioItems } from '../data/portfolioItems';
import { processosItems } from '../data/processosItems';
import { treinamentosItems } from '../data/treinamentosItems';
import { krsItems } from '../data/krsItems';
import { forumItems } from '../data/forumItems';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ? '[redacted]' : undefined,
      email: '[redacted]',
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify({
    error: errInfo.error,
    operationType: errInfo.operationType,
    path: errInfo.path,
  }));
  throw new Error(JSON.stringify({
    error: errInfo.error,
    operationType: errInfo.operationType,
    path: errInfo.path,
  }));
};

// PapaParse and XLSX are loaded from a CDN script in index.html
declare const Papa: any;
declare const XLSX: any;

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    PieChart,
    Pie
} from 'recharts';

interface AdminScreenProps {
  user: User;
  onLogout: () => void;
  onNavigate: () => void;
  theme: 'light' | 'dark';
  manualInteractionsEnabled: boolean;
  onToggleManualInteractions: (enabled: boolean) => Promise<void> | void;
  developmentLockedSections: DevelopmentLockKey[];
  onToggleDevelopmentLock: (section: DevelopmentLockKey, locked: boolean) => Promise<void> | void;
  hiddenHomeSections: HomeSectionKey[];
  onToggleHomeSection: (section: HomeSectionKey, visible: boolean) => Promise<void> | void;
  offlineMode?: boolean;
}

const DEVELOPMENT_LOCK_OPTIONS: Array<{
  key: DevelopmentLockKey;
  label: string;
  description: string;
}> = [
  { key: 'processos', label: 'Processos', description: 'Fluxos, documentos e cards de processos.' },
  { key: 'treinamentos', label: 'Treinamentos', description: 'Conteúdos e trilhas de aprendizagem.' },
  { key: 'krs', label: "Banco de OKR's", description: 'Objetivos, resultados-chave e acompanhamento.' },
  { key: 'forum', label: 'Fórum', description: 'Discussões, respostas e alinhamentos do time.' },
];

const HOME_SECTION_OPTIONS: Array<{
  key: HomeSectionKey;
  label: string;
  description: string;
}> = [
  { key: 'hero', label: 'Apresentação', description: 'Título principal e indicadores da Home.' },
  { key: 'updates', label: 'Últimas atualizações', description: 'Conteúdos publicados ou revisados recentemente.' },
  { key: 'featured', label: 'Destaque da casa', description: 'Card do conteúdo acessado em destaque.' },
  { key: 'aiHub', label: 'Hub de Inteligência Artificial', description: 'Bloco de IA em alta e conteúdos em foco.' },
  { key: 'calendar', label: 'Calendário', description: 'Agenda de treinamentos e eventos.' },
];

interface UploadLog {
    id: string;
    timestamp: {
        seconds: number;
        nanoseconds: number;
    } | null;
    fileName: string;
    userEmail?: string;
    details?: string;
}

interface PortfolioStats {
    totalProjects: number;
    lastUpdated: string | null;
    activeUsers: number;
}

interface AdminAlert {
  id: string;
  title: string;
  detail: string;
  level: 'critico' | 'atencao' | 'ok';
}

interface AdminPermissionRule {
  module: string;
  colaborador: boolean;
  editor: boolean;
  gestor: boolean;
  admin: boolean;
}

type PermissionRole = 'colaborador' | 'editor' | 'gestor' | 'admin';

const PERMISSION_MATRIX_STORAGE_KEY = 'dotspace:admin-permission-matrix';
const SHEET_SYNC_EMAIL = 'sheets-sync@example.com';
const SHEET_SYNC_FILENAME = 'SYNC PLANILHA';

const BASE_PERMISSION_MATRIX: AdminPermissionRule[] = [
  { module: 'Processos', colaborador: true, editor: true, gestor: true, admin: true },
  { module: 'Treinamentos', colaborador: true, editor: true, gestor: true, admin: true },
  { module: "Banco de OKR's", colaborador: true, editor: true, gestor: true, admin: true },
  { module: 'Fórum', colaborador: true, editor: true, gestor: true, admin: true },
  { module: 'Painel administrativo', colaborador: false, editor: false, gestor: true, admin: true },
  { module: 'Configurações globais', colaborador: false, editor: false, gestor: false, admin: true },
];

const readPermissionMatrix = (): AdminPermissionRule[] => {
  if (typeof window === 'undefined') {
    return BASE_PERMISSION_MATRIX;
  }

  try {
    const raw = window.localStorage.getItem(PERMISSION_MATRIX_STORAGE_KEY);
    if (!raw) return BASE_PERMISSION_MATRIX;

    const parsed = JSON.parse(raw) as AdminPermissionRule[];
    if (!Array.isArray(parsed)) return BASE_PERMISSION_MATRIX;

    return BASE_PERMISSION_MATRIX.map((baseRule) => {
      const storedRule = parsed.find((rule) => rule?.module === baseRule.module);
      if (!storedRule) return baseRule;
      return {
        module: baseRule.module,
        colaborador: typeof storedRule.colaborador === 'boolean' ? storedRule.colaborador : baseRule.colaborador,
        editor: typeof storedRule.editor === 'boolean' ? storedRule.editor : baseRule.editor,
        gestor: typeof storedRule.gestor === 'boolean' ? storedRule.gestor : baseRule.gestor,
        admin: typeof storedRule.admin === 'boolean' ? storedRule.admin : baseRule.admin,
      };
    });
  } catch {
    return BASE_PERMISSION_MATRIX;
  }
};

const PT_BR_MONTHS = [
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

const parseProjectPeriod = (value: unknown): { year: number; month: number; key: string; label: string } | null => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim().toLowerCase();
    if (!raw) return null;

    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        if (month >= 1 && month <= 12) {
            return {
                year,
                month,
                key: `${year}-${String(month).padStart(2, '0')}`,
                label: `${PT_BR_MONTHS[month - 1]}/${year}`
            };
        }
    }

    const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$|^(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const month = Number(slashMatch[2] || slashMatch[4]);
        const year = Number(slashMatch[3] || slashMatch[5]);
        if (month >= 1 && month <= 12) {
            return {
                year,
                month,
                key: `${year}-${String(month).padStart(2, '0')}`,
                label: `${PT_BR_MONTHS[month - 1]}/${year}`
            };
        }
    }

    const monthNameMatch = raw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .match(/^([a-z]+)\/?(\d{4})$/);
    if (monthNameMatch) {
        const monthIndex = PT_BR_MONTHS.findIndex(month => month.startsWith(monthNameMatch[1]));
        const year = Number(monthNameMatch[2]);
        if (monthIndex >= 0) {
            const month = monthIndex + 1;
            return {
                year,
                month,
                key: `${year}-${String(month).padStart(2, '0')}`,
                label: `${PT_BR_MONTHS[monthIndex]}/${year}`
            };
        }
    }

    return null;
};

const buildPeriodSeries = (dates: string[]) => {
  const periodCounts = dates.reduce<Record<string, number>>((acc, value) => {
    const period = parseProjectPeriod(value);
    if (!period) return acc;
    acc[period.key] = (acc[period.key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(periodCounts)
    .map(([name, value]) => {
      const [year, month] = name.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'short' });
      return { name: `${monthName}/${year.slice(2)}`, value, originalDate: name };
    })
    .sort((a, b) => a.originalDate.localeCompare(b.originalDate));
};

const ADMIN_PAGE_BREAKDOWN = [
  { name: 'Processos', value: processosItems.length },
  { name: 'Treinamentos', value: treinamentosItems.length },
  { name: "Banco de OKR's", value: krsItems.length },
  { name: 'Fórum', value: forumItems.length },
];

const ADMIN_PERIOD_SERIES = buildPeriodSeries([
  ...processosItems.map((item) => item.Data),
  ...treinamentosItems.map((item) => item.Data),
  ...krsItems.map((item) => item.ultimaAtualizacao || item.Data),
  ...forumItems.map((item) => item.lastActivity),
]);

const getGoogleSlidesPreviewUrl = (url: string): string | null => {
    if (typeof url !== 'string' || !url.includes('docs.google.com/presentation/d/')) {
        return null;
    }

    // Extract the base URL without parameters
    const baseUrl = url.split('?')[0];

    // If it's already a published/embed link, convert to pubembed format
    if (baseUrl.endsWith('/pub') || baseUrl.endsWith('/embed') || baseUrl.endsWith('/pubembed')) {
        const cleanBase = baseUrl.replace(/\/(pub|embed|pubembed)$/, '');
        return `${cleanBase}/pubembed?start=false&loop=false&delayms=3000`;
    }

    // Match the base URL including the presentation ID, handling both /d/ID and /d/e/ID
    const presentationMatch = url.match(/docs\.google\.com\/presentation\/d\/(?:e\/)?([a-zA-Z0-9-_]+)/);
    if (!presentationMatch || !presentationMatch[1]) {
        return null;
    }
    const presentationId = presentationMatch[1];
    const isE = url.includes('/d/e/');

    // Use the pubembed endpoint as requested
    return `https://docs.google.com/presentation/d/${isE ? 'e/' : ''}${presentationId}/pubembed?start=false&loop=false&delayms=3000`;
};

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);


const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
);

const AdminScreen: React.FC<AdminScreenProps> = ({
  user,
  onLogout,
  onNavigate,
  theme,
  manualInteractionsEnabled,
  onToggleManualInteractions,
  developmentLockedSections,
  onToggleDevelopmentLock,
  hiddenHomeSections,
  onToggleHomeSection,
  offlineMode = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [stats, setStats] = useState<PortfolioStats>({ totalProjects: 0, lastUpdated: null, activeUsers: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [periodChartData, setPeriodChartData] = useState<any[]>([]);
  const [chartFilter, setChartFilter] = useState<'client' | 'team' | 'methodology' | 'media'>('client');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [qualityAudit, setQualityAudit] = useState<{ id: string, name: string, issues: string[] }[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  const [permissionMatrix, setPermissionMatrix] = useState<AdminPermissionRule[]>(() => readPermissionMatrix());

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => setChartsReady(true));
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const uniqueUsers = new Set(uploadLogs.map((log) => log.userEmail || log.fileName).filter(Boolean)).size;
    setStats((prev) => ({ ...prev, activeUsers: uniqueUsers }));
  }, [uploadLogs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PERMISSION_MATRIX_STORAGE_KEY, JSON.stringify(permissionMatrix));
    } catch {
      // ignore storage errors in local simulation mode
    }
  }, [permissionMatrix]);

  useEffect(() => {
    if (!offlineMode) return;

    const totalProjects = localPortfolioItems.length;
    const lastUpdated = localPortfolioItems
      .map(item => item.Data)
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)))[0] || null;

    setStats({
      totalProjects,
      lastUpdated: lastUpdated ? String(lastUpdated) : null,
      activeUsers: 1,
    });
    setStatsLoading(false);
    setUploadLogs([]);
    setQualityAudit(localPortfolioItems.slice(0, 5).map((item) => ({
      id: item.id,
      name: item.Projeto,
      issues: [],
    })));

    const clientCounts = localPortfolioItems.reduce<Record<string, number>>((acc, item) => {
      const key = item.Cliente || 'Sem Cliente';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    setChartData(
      Object.entries(clientCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    );

    const periodCounts = localPortfolioItems.reduce<Record<string, number>>((acc, item) => {
      const period = parseProjectPeriod(item.Data);
      if (period) {
        acc[period.key] = (acc[period.key] || 0) + 1;
      }
      return acc;
    }, {});
    setPeriodChartData(
      Object.entries(periodCounts)
        .map(([name, value]) => {
          const [year, month] = name.split('-');
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'short' });
          return { name: `${monthName}/${year.slice(2)}`, value, originalDate: name };
        })
        .sort((a, b) => a.originalDate.localeCompare(b.originalDate))
    );

    setChartsReady(true);
  }, [offlineMode]);

  const fetchStats = () => {
    setStatsLoading(true);
    const path = 'projects';
    const projectsCollection = collection(db, path);

    try {
        const unsubscribe = onSnapshot(projectsCollection, (projectSnapshot) => {
            try {
                const allProjects = projectSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PortfolioItem));
                let projects = [...allProjects];

                console.log(`Stats: Found ${allProjects.length} projects in total`);

                // Apply period filter
                if (startDate) {
                    projects = projects.filter(p => p.Data && p.Data >= startDate);
                }
                if (endDate) {
                    projects = projects.filter(p => p.Data && p.Data <= endDate);
                }

                const totalProjects = allProjects.length;

                let lastUpdatedStr: string | null = null;
                if (allProjects.length > 0) {
                    const latestPeriod = allProjects
                        .map(p => parseProjectPeriod(p.Data))
                        .filter((period): period is NonNullable<typeof period> => Boolean(period))
                        .sort((a, b) => b.key.localeCompare(a.key))[0];

                    if (latestPeriod) {
                        lastUpdatedStr = latestPeriod.label;
                    }
                }

                setStats(prev => ({
                    ...prev,
                    totalProjects,
                    lastUpdated: lastUpdatedStr || 'Nenhuma data'
                }));

                // Process main chart data
                const counts = projects.reduce<Record<string, number>>((acc, p) => {
                    if (chartFilter === 'client') {
                        const key = p.Cliente || 'Sem Cliente';
                        acc[key] = (acc[key] || 0) + 1;
                    } else if (chartFilter === 'team') {
                        const key = p.Time || 'Sem Time';
                        acc[key] = (acc[key] || 0) + 1;
                    } else if (chartFilter === 'methodology') {
                        const methods = typeof p.Metodologias === 'string'
                            ? p.Metodologias.split(/[;,]/).map(s => s.trim()).filter(Boolean)
                            : (Array.isArray(p.Metodologias) ? p.Metodologias : []);
                        methods.forEach(m => {
                            acc[m] = (acc[m] || 0) + 1;
                        });
                    } else if (chartFilter === 'media') {
                        const media = typeof p.Mídias === 'string'
                            ? p.Mídias.split(/[;,]/).map(s => s.trim()).filter(Boolean)
                            : (Array.isArray(p.Mídias) ? p.Mídias : []);
                        media.forEach(m => {
                            acc[m] = (acc[m] || 0) + 1;
                        });
                    }
                    return acc;
                }, {});

                const data = Object.entries(counts)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10); // Top 10

                setChartData(data);

                // Process period chart data
                const monthCounts = projects.reduce<Record<string, number>>((acc, p) => {
                    const period = parseProjectPeriod(p.Data);
                    if (period) {
                        acc[period.key] = (acc[period.key] || 0) + 1;
                    }
                    return acc;
                }, {});

                const periodData = Object.entries(monthCounts)
                    .map(([name, value]) => {
                        const [year, month] = name.split('-');
                        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'short' });
                        return {
                            name: `${monthName}/${year.slice(2)}`,
                            value,
                            originalDate: name
                        };
                    })
                    .sort((a, b) => a.originalDate.localeCompare(b.originalDate));

                setPeriodChartData(periodData);

                // Quality Audit
                const audit = projects.map(p => {
                    const issues: string[] = [];
                    if (!p.Imagem_capa || p.Imagem_capa.includes('picsum.photos')) issues.push('Sem imagem real');
                    if (!p.Link_PMV) issues.push('Sem link do PMV');
                    if (!p.Assunto_geral || p.Assunto_geral.length < 20) issues.push('Descrição curta');
                    if (!p.tags || p.tags.length === 0) issues.push('Sem tags');
                    return { id: p.id, name: p.Projeto, issues };
                }).filter(a => a.issues.length > 0).slice(0, 10);
                setQualityAudit(audit);
                setStatsLoading(false);
            } catch (error) {
                console.error("Error processing stats snapshot:", error);
                setStatsLoading(false);
            }
        }, (error) => {
            console.error("Error in stats snapshot:", error);
            setStatsLoading(false);
            handleFirestoreError(error, OperationType.LIST, 'projects');
        });

        return unsubscribe;
    } catch (error) {
        console.error("Error setting up stats listener:", error);
        handleFirestoreError(error, OperationType.LIST, 'projects');
        setStatsLoading(false);
    }
  };

  const fetchLogs = async () => {
    const path = 'uploadLogs';
    try {
      const logsCollection = collection(db, path);
      const q = query(logsCollection, orderBy('timestamp', 'desc'));

      const snapshot = await getDocs(q);
      const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UploadLog));
      setUploadLogs(logList);
      setLogsError(null);

      // Setup real-time listener after initial fetch
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UploadLog));
        setUploadLogs(logList);
        setLogsError(null);
      }, (error) => {
        console.error("Error in upload logs snapshot:", error);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error fetching upload logs:", error);
      setLogsError("Erro de permissão ao carregar logs de upload.");
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: OperationType.LIST,
        path
      };
      console.error('Firestore Fetch Error: ', JSON.stringify(errInfo));
    }
  };

  useEffect(() => {
    if (offlineMode) {
      return;
    }
    let unsubscribeUpload: any;
    let unsubscribeStats: any;

    const setupListeners = async () => {
      unsubscribeUpload = await fetchLogs();
      unsubscribeStats = await fetchStats();
    };

    setupListeners();

    return () => {
        if (unsubscribeUpload) unsubscribeUpload();
        if (unsubscribeStats) unsubscribeStats();
    };
  }, [chartFilter, startDate, endDate, offlineMode]);

  const downloadAllData = async () => {
    if (offlineMode) {
      const csvContent = localPortfolioItems.map(item => JSON.stringify(item)).join('\n');
      const blob = new Blob([csvContent], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `dados_local_${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const path = 'projects';
    try {
        const projectsCollection = collection(db, path);
        const snapshot = await getDocs(projectsCollection);
        const projects = snapshot.docs.map(doc => doc.data());

        if (projects.length === 0) {
            alert('Nenhum dado para baixar.');
            return;
        }

        const headers = Object.keys(projects[0]);
        const csvContent = [
            headers.join(','),
            ...projects.map(p => headers.map(h => {
                const val = (p as any)[h];
                return Array.isArray(val) ? `"${val.join(';')}"` : `"${val || ''}"`;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `todos_os_dados_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Error downloading all data:", error);
        handleFirestoreError(error, OperationType.LIST, path);
    }
  };

  const downloadChartData = async (data: any[], title: string) => {
    if (offlineMode) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_local.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = ['Nome', 'Quantidade'];
    const csvContent = [
        headers.join(','),
        ...data.map(row => `${row.name},${row.value}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const downloadTemplate = () => {
    const headers = [
      'Imagem_capa',
      'Projeto',
      'Cliente',
      'Time',
      'Data',
      'Assunto_geral',
      'Assunto_especifico',
      'Público_alvo',
      'Metodologias',
      'Mídias',
      'Outros_recursos',
      'DI',
      'DM',
      'Link_PMV'
    ];

    const sampleData = [
      'https://picsum.photos/seed/pmv1/800/600',
      'Exemplo de Projeto PMV',
      'Cliente Exemplo',
      'Squad Alpha',
      '2024-03-19',
      'Educação Corporativa',
      'Liderança e Gestão',
      'Gestores de RH',
      'Ágil; Gamificação',
      'Web; Mobile',
      'SCORM; API',
      'João Silva',
      'Maria Oliveira',
      'https://docs.google.com/presentation/d/example'
    ];

    const csvContent = [
      headers.join(','),
      sampleData.map(val => `"${val}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_pmv.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus('idle');
      setMessage('');
    }
  };

  const normalizeKey = (key: string) => {
    return key.toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, ''); // Remove special characters
  };

  const updateDatabase = async (newProjects: any[]) => {
    if (!selectedFile) return;

    setMessage('Processando projetos...');
    try {
        const columnMapping: { [key: string]: keyof Omit<PortfolioItem, 'id' | 'tags'> } = {
          'imagem_capa': 'Imagem_capa',
          'capa': 'Imagem_capa',
          'thumbnail': 'Imagem_capa',
          'projeto': 'Projeto',
          'nome_do_projeto': 'Projeto',
          'nome': 'Projeto',
          'cliente': 'Cliente',
          'empresa': 'Cliente',
          'time': 'Time',
          'equipe': 'Time',
          'data': 'Data',
          'ano': 'Data',
          'assunto_geral': 'Assunto_geral',
          'assunto': 'Assunto_geral',
          'tema': 'Assunto_geral',
          'assunto_especifico': 'Assunto_especifico',
          'subtema': 'Assunto_especifico',
          'publico_alvo': 'Publico_alvo',
          'publico': 'Publico_alvo',
          'metodologias': 'Metodologias',
          'metodologia': 'Metodologias',
          'midias': 'Mídias',
          'midia': 'Mídias',
          'recursos': 'Outros_recursos',
          'outros_recursos': 'Outros_recursos',
          'di': 'DI',
          'design_instrucional': 'DI',
          'dm': 'DM',
          'design_multimidia': 'DM',
          'link_pmv': 'Link_PMV',
          'pmv': 'Link_PMV',
          'link': 'Link_PMV',
        };

        const projectsToUpload: Partial<Omit<PortfolioItem, 'id'>>[] = [];

        newProjects.forEach((row: any) => {
            // Normalize row keys
            const normalizedRow: { [key: string]: any } = {};
            for (const key in row) {
                if (Object.prototype.hasOwnProperty.call(row, key)) {
                    normalizedRow[normalizeKey(key)] = row[key];
                }
            }

            const projectData: Partial<Omit<PortfolioItem, 'id'>> = { tags: [] };
            let fieldsWithDataCount = 0;

            for (const fileHeader in columnMapping) {
                const modelKey = columnMapping[fileHeader];
                const value = normalizedRow[fileHeader];

                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    fieldsWithDataCount++;
                    if (modelKey === 'Data' && value instanceof Date) {
                        projectData.Data = value.toISOString().split('T')[0];
                    } else {
                        (projectData as any)[modelKey] = String(value).trim();
                    }
                }
            }

            // Skip rows that are missing essential information (Project Name and Client)
            // OR have too little information (less than 3 fields with data)
            if (!projectData.Projeto || !projectData.Cliente || fieldsWithDataCount < 3) return;

            // If the cover image is missing or is a google slides link, try to generate a preview from the PMV link.
            if (projectData.Link_PMV && (!projectData.Imagem_capa || String(projectData.Imagem_capa).trim() === '' || String(projectData.Imagem_capa).includes('docs.google.com/presentation/d/'))) {
                const previewUrl = getGoogleSlidesPreviewUrl(projectData.Link_PMV);
                if (previewUrl) {
                    projectData.Imagem_capa = previewUrl;
                }
            }

            projectsToUpload.push(projectData);
        });

        if (projectsToUpload.length === 0) {
            setUploadStatus('error');
            const headersFound = newProjects.length > 0 ? Object.keys(newProjects[0]).join(', ') : 'nenhum';
            setMessage(`Nenhum projeto válido encontrado. Verifique se as colunas da planilha coincidem com o esperado (Projeto, Cliente, etc). Colunas lidas: ${headersFound}`);
            return;
        }

        setMessage('Deletando portfólio antigo...');
        const projectsCollectionRef = collection(db, 'projects');
        const existingProjectsSnapshot = await getDocs(projectsCollectionRef);

        const batch = writeBatch(db);

        existingProjectsSnapshot.forEach(document => {
            batch.delete(document.ref);
        });

        setMessage(`Carregando ${projectsToUpload.length} novos projetos...`);
        projectsToUpload.forEach(projectData => {
            const newProjectRef = doc(collection(db, 'projects'));
            batch.set(newProjectRef, projectData);
        });

        await batch.commit();

        await addDoc(collection(db, 'uploadLogs'), {
            fileName: selectedFile.name,
            userEmail: user.email,
            details: `Substituiu portfólio via arquivo: ${selectedFile.name}`,
            timestamp: serverTimestamp(),
        });

        await fetchLogs();
        await fetchStats();

        setUploadStatus('success');
        const successMessage = `Portfólio atualizado com sucesso! ${projectsToUpload.length} projetos foram carregados de "${selectedFile.name}".`;
        setMessage(successMessage);
        setSelectedFile(null);
    } catch (error: any) {
        console.error("Database update error: ", error);
        setUploadStatus('error');
        if (error.code === 'permission-denied') {
            setMessage('Erro de permissão. Verifique se as regras de segurança do Firestore permitem escrita.');
            handleFirestoreError(error, OperationType.WRITE, 'projects');
        } else {
            setMessage('Ocorreu um erro ao atualizar a base de dados. Tente novamente.');
        }
    } finally {
        // Ensure processing state is cleared if not already handled
        setUploadStatus(prev => prev === 'processing' ? 'idle' : prev);
    }
  };

  const handleProcessFile = () => {
    if (offlineMode) {
      setUploadStatus('success');
      setMessage('Ação registrada. Conecte o banco para concluir escrita definitiva.');
      return;
    }

    if (!selectedFile) {
      setUploadStatus('error');
      setMessage('Por favor, selecione um arquivo primeiro.');
      return;
    }

    setUploadStatus('processing');
    setMessage('Processando arquivo...');

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results: { data: any[] }) => {
                updateDatabase(results.data);
            },
            error: (err: any) => {
                console.error("CSV parsing error:", err);
                setUploadStatus('error');
                setMessage('Ocorreu um erro ao ler o arquivo CSV. Verifique se o formato está correto.');
            }
        });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const reader = new FileReader();
        reader.onload = (event: ProgressEvent<FileReader>) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                let allData: any[] = [];

                // Process all sheets in the workbook
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);
                    if (Array.isArray(json) && json.length > 0) {
                        allData = [...allData, ...json];
                    }
                });

                if (allData.length === 0) {
                    setUploadStatus('error');
                    setMessage('Nenhum dado encontrado nas abas do arquivo Excel.');
                    return;
                }

                updateDatabase(allData);
            } catch (err) {
                console.error("Excel parsing error:", err);
                setUploadStatus('error');
                setMessage('Ocorreu um erro ao ler o arquivo Excel. Verifique se não está corrompido.');
            }
        };
        reader.onerror = () => {
            setUploadStatus('error');
            setMessage('Não foi possível ler o arquivo selecionado.');
        };
        reader.readAsArrayBuffer(selectedFile);
    } else {
        setUploadStatus('error');
        setMessage('Formato de arquivo não suportado. Por favor, use CSV, XLSX ou XLS.');
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Data indisponível';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('pt-BR');
  };

  const formatIsoTimestamp = (timestamp: string) => {
    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed)) return 'Data indisponível';
    return new Date(parsed).toLocaleString('pt-BR');
  };

  const renderStat = (label: string, value: string | number | null) => (
    <div className="min-w-0 p-4 bg-gray-50 dark:bg-zinc-700/50 rounded-lg">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold leading-tight text-zinc-900 dark:text-white break-words">{value}</p>
    </div>
  );

  const latestSheetSyncLog = uploadLogs.find((log) =>
    log.userEmail === SHEET_SYNC_EMAIL || log.fileName === SHEET_SYNC_FILENAME
  );
  const getUploadDisplayTitle = (log: UploadLog) => {
    if (log.userEmail === SHEET_SYNC_EMAIL || log.fileName === SHEET_SYNC_FILENAME) {
      return `Sincronização Inteligente: ${log.details || 'Atualização concluída.'}`;
    }

    return log.fileName;
  };
  const getUploadTypeLabel = (log: UploadLog) => (
    log.userEmail === SHEET_SYNC_EMAIL || log.fileName === SHEET_SYNC_FILENAME
      ? 'Sincronização'
      : 'Importação'
  );

  const downloadSheetChangeLogs = async () => {
    const headers = ['Arquivo', 'Tipo', 'Usuário', 'Data/Hora', 'Detalhe'];
    const csvContent = [
      headers.join(','),
      ...uploadLogs.map((log) => {
        const fileName = getUploadDisplayTitle(log).replace(/"/g, '""');
        const typeLabel = getUploadTypeLabel(log).replace(/"/g, '""');
        const userLabel = (log.userEmail || 'Sistema').replace(/"/g, '""');
        const details = (log.details || '').replace(/"/g, '""');
        return `"${fileName}","${typeLabel}","${userLabel}","${formatTimestamp(log.timestamp)}","${details}"`;
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alteracoes_planilha_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const adminLogoClassName = 'shrink-0';
  const monitoredAreas = ADMIN_PAGE_BREAKDOWN.map((item) => ({
    area: item.name,
    total: item.value,
    review: Math.max(1, Math.ceil(item.value * 0.4)),
    audit: Math.max(1, Math.ceil(item.value * 0.6)),
  }));
  const permissionRoles: Array<{ key: PermissionRole; label: string }> = [
    { key: 'colaborador', label: 'Colaborador' },
    { key: 'editor', label: 'Editor' },
    { key: 'gestor', label: 'Gestor' },
    { key: 'admin', label: 'Admin' },
  ];

  const togglePermission = (module: string, role: PermissionRole) => {
    setPermissionMatrix((current) =>
      current.map((rule) =>
        rule.module === module ? { ...rule, [role]: !rule[role] } : rule,
      ),
    );
  };

  const renderDevelopmentLockControls = () => (
    <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-900/50 dark:bg-zinc-800">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
          Disponibilidade
        </p>
        <h2 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">Bloqueio de Desenvolvimento</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          Use os toggles para ativar o aviso de desenvolvimento em cada seção.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {DEVELOPMENT_LOCK_OPTIONS.map((option) => {
          const isLocked = developmentLockedSections.includes(option.key);

          return (
            <button
              key={option.key}
              type="button"
              role="switch"
              aria-checked={isLocked}
              aria-label={`Bloqueio de desenvolvimento: ${option.label}`}
              onClick={async () => {
                setIsSavingSettings(true);
                try {
                  await onToggleDevelopmentLock(option.key, !isLocked);
                  setMessage(isLocked
                    ? `${option.label} liberado.`
                    : `${option.label} marcado como Em Desenvolvimento.`);
                  setUploadStatus('success');
                } catch (error) {
                  console.error('Error updating development lock setting:', error);
                  setMessage(`Não foi possível atualizar ${option.label}.`);
                  setUploadStatus('error');
                } finally {
                  setIsSavingSettings(false);
                }
              }}
              disabled={isSavingSettings}
              className={`group flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus:ring-offset-zinc-800 ${
                isLocked
                  ? 'border-amber-400/60 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/20'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-zinc-600 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="min-w-0">
                <p className="font-bold text-zinc-900 dark:text-white">{option.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{option.description}</p>
              </div>
              <span
                aria-hidden="true"
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  isLocked ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isLocked ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const renderHomeVisibilityControls = () => (
    <section className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm dark:border-sky-900/50 dark:bg-zinc-800">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
          Campos da Home
        </p>
        <h2 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">Exibição de conteúdo</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          Escolha quais blocos ficam visíveis para os colaboradores na página inicial.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {HOME_SECTION_OPTIONS.map((option) => {
          const isVisible = !hiddenHomeSections.includes(option.key);

          return (
            <button
              key={option.key}
              type="button"
              role="switch"
              aria-checked={isVisible}
              aria-label={`Exibir na Home: ${option.label}`}
              onClick={async () => {
                setIsSavingSettings(true);
                try {
                  await onToggleHomeSection(option.key, !isVisible);
                  setMessage(`${option.label} ${isVisible ? 'ocultado' : 'exibido'} na Home.`);
                  setUploadStatus('success');
                } catch (error) {
                  console.error('Error updating home section visibility:', error);
                  setMessage(`Não foi possível atualizar ${option.label}.`);
                  setUploadStatus('error');
                } finally {
                  setIsSavingSettings(false);
                }
              }}
              disabled={isSavingSettings}
              className={`group flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:focus:ring-offset-zinc-800 ${
                isVisible
                  ? 'border-sky-300 bg-sky-50 dark:border-sky-700/60 dark:bg-sky-950/20'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-zinc-600 dark:hover:bg-zinc-900'
              }`}
            >
              <div className="min-w-0">
                <p className="font-bold text-zinc-900 dark:text-white">{option.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{option.description}</p>
              </div>
              <span
                aria-hidden="true"
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  isVisible ? 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    isVisible ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  return (
      offlineMode ? (
        <div className="min-h-screen bg-gray-100 dark:bg-zinc-900">
          <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-700/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex min-h-20 items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-4">
                  <DotLogo className={adminLogoClassName} theme={theme} variant="login" />
                  <span className="hidden text-xl font-bold md:inline lg:text-2xl">
                    <span className="text-zinc-900 dark:text-white">Painel do </span>
                    <span className="text-accent">Administrador</span>
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                    Sessão ativa
                  </span>
                  <button onClick={onLogout} className="text-sm font-bold bg-gray-200 dark:bg-zinc-700 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors">Logout</button>
                  <button
                    onClick={onNavigate}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-gray-400"
                    title="Voltar para o Portfólio"
                    aria-label="Voltar para o Portfólio"
                  >
                    <ArrowLeftIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-900 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">Administração central</p>
                <h1 className="mt-2 text-2xl font-bold">Gestão de conteúdo, auditoria e governança</h1>
                <p className="mt-2 text-sm leading-relaxed">
                  Controle operacional completo para monitorar conteúdo, revisar interações dos cards e acompanhar a integridade das áreas do sistema.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {renderStat('Alterações registradas', uploadLogs.length)}
                {renderStat('Itens em revisão', monitoredAreas.reduce((acc, item) => acc + item.review, 0))}
              </div>

              {renderDevelopmentLockControls()}
              {renderHomeVisibilityControls()}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Conteúdo por página</h2>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">Atualizado</span>
                  </div>
                  <div className="h-64 overflow-x-auto">
                    {!chartsReady ? (
                      <div className="flex h-full items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500 dark:bg-zinc-700/30 dark:text-gray-400">
                        Carregando gráfico...
                      </div>
                    ) : (
                      <BarChart width={720} height={256} data={ADMIN_PAGE_BREAKDOWN}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#3f3f46' : '#e5e7eb'} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: theme === 'dark' ? '#a1a1aa' : '#71717a' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: theme === 'dark' ? '#a1a1aa' : '#71717a' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                            borderColor: theme === 'dark' ? '#3f3f46' : '#e5e7eb',
                            color: theme === 'dark' ? '#ffffff' : '#000000'
                          }}
                          itemStyle={{ color: '#99cc00' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {ADMIN_PAGE_BREAKDOWN.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#99cc00' : '#86b300'} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-lg border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Atualizações por mês</h2>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">Atualizado</span>
                  </div>
                  <div className="h-64 overflow-x-auto">
                    {!chartsReady ? (
                      <div className="flex h-full items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500 dark:bg-zinc-700/30 dark:text-gray-400">
                        Carregando gráfico...
                      </div>
                    ) : (
                      <BarChart width={720} height={256} data={ADMIN_PERIOD_SERIES}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#3f3f46' : '#e5e7eb'} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: theme === 'dark' ? '#a1a1aa' : '#71717a' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: theme === 'dark' ? '#a1a1aa' : '#71717a' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                            borderColor: theme === 'dark' ? '#3f3f46' : '#e5e7eb',
                            color: theme === 'dark' ? '#ffffff' : '#000000'
                          }}
                          itemStyle={{ color: '#99cc00' }}
                        />
                        <Bar dataKey="value" fill="#99cc00" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </div>
                </div>
              </div>

              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Alterações da planilha</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Registros das alterações importadas e sincronizações vindas da planilha.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={downloadSheetChangeLogs}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-600 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700/40"
                      >
                        Exportar CSV
                      </button>
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                        {uploadLogs.length} alterações
                      </span>
                    </div>
                  </div>
                  {latestSheetSyncLog && (
                    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                        Última sincronização
                      </p>
                      <p className="mt-1 text-zinc-900 dark:text-white font-semibold">
                        {latestSheetSyncLog.details || latestSheetSyncLog.fileName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(latestSheetSyncLog.timestamp)}
                      </p>
                    </div>
                  )}
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-[0.16em] text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                          <th className="pb-2 pr-4">Arquivo</th>
                          <th className="pb-2 pr-4">Tipo</th>
                          <th className="pb-2 pr-4">Usuário</th>
                          <th className="pb-2">Data/Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadLogs.length > 0 ? (
                          uploadLogs.slice(0, 8).map((log) => (
                            <tr key={log.id} className="border-b border-gray-100 dark:border-zinc-700/60">
                              <td className="py-3 pr-4 font-semibold text-zinc-900 dark:text-white">
                                <p className="break-words">{getUploadDisplayTitle(log)}</p>
                                {log.details && (
                                  <p className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400 break-words">
                                    {log.details}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 pr-4">
                                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                                  {getUploadTypeLabel(log)}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{log.userEmail || 'Sistema'}</td>
                              <td className="py-3 text-gray-500 dark:text-gray-400">{formatTimestamp(log.timestamp)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                              Nenhuma alteração de planilha registrada ainda.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800 xl:col-span-2">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Monitoramento por área</h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                    {monitoredAreas.map((item) => (
                      <div key={item.area} className="rounded-2xl border border-gray-200 p-4 dark:border-zinc-700/70">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 dark:text-white">{item.area}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.total} itens</p>
                          </div>
                          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                            Atualizado
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-gray-100 px-3 py-2 text-gray-700 dark:bg-zinc-700/60 dark:text-gray-200">
                            <span className="block text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Revisão</span>
                            <span className="mt-1 block text-sm font-semibold">{item.review}</span>
                          </div>
                          <div className="rounded-xl bg-gray-100 px-3 py-2 text-gray-700 dark:bg-zinc-700/60 dark:text-gray-200">
                            <span className="block text-[10px] uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Auditoria</span>
                            <span className="mt-1 block text-sm font-semibold">{item.audit}</span>
                          </div>
                        </div>
                        <div className="mt-4 h-2 w-full rounded-full bg-gray-100 dark:bg-zinc-700/60">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-accent via-emerald-400 to-lime-400"
                            style={{ width: `${Math.max(20, Math.min(100, Math.round((item.review + item.audit) / Math.max(item.total, 1) * 100)))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-1">
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-700/50 dark:bg-zinc-800">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Matriz de permissões</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Clique nas células para alternar permissões por perfil. As mudanças ficam salvas localmente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPermissionMatrix(readPermissionMatrix())}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-600 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700/40"
                    >
                      Restaurar padrão
                    </button>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-[0.16em] text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                          <th className="pb-2 pr-4">Módulo</th>
                          {permissionRoles.map((role) => (
                            <th key={role.key} className="pb-2 pr-4">{role.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {permissionMatrix.map((rule) => (
                          <tr key={rule.module} className="border-b border-gray-100 dark:border-zinc-700/60">
                            <td className="py-3 pr-4 font-semibold text-zinc-900 dark:text-white">{rule.module}</td>
                            {permissionRoles.map((role) => {
                              const allowed = rule[role.key];
                              return (
                                <td key={`${rule.module}-${role.key}`} className="py-3 pr-4">
                                  <button
                                    type="button"
                                    onClick={() => togglePermission(rule.module, role.key)}
                                    aria-pressed={allowed}
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                                      allowed
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-700/50 dark:text-zinc-300 dark:hover:bg-zinc-700/80'
                                    }`}
                                  >
                                    {allowed ? 'Permitido' : 'Bloqueado'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="min-h-screen">
        <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-700/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex min-h-20 items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-4">
                        <DotLogo className={adminLogoClassName} theme={theme} variant="login" />
                        <span className="hidden text-xl font-bold md:inline lg:text-2xl">
                            <span className="text-zinc-900 dark:text-white">Painel do </span>
                            <span className="text-accent">Administrador</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Logado como:</span>
                          <span className="text-sm font-medium text-zinc-800 dark:text-gray-200">{user.email}</span>
                        </div>
                        <button onClick={onLogout} className="text-sm font-bold bg-gray-200 dark:bg-zinc-700 px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors">Logout</button>
                        <button
                            onClick={onNavigate}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-gray-400"
                            title="Voltar para o Portfólio"
                            aria-label="Voltar para o Portfólio"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <main className="container mx-auto px-4 py-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 sm:gap-8 max-w-7xl mx-auto items-stretch">
            {/* Column 1: Management and History */}
            <div className="space-y-4 sm:space-y-8 flex h-full flex-col">
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-gray-200 dark:border-zinc-700/50">
                <h1 className="text-xl sm:text-2xl font-bold mb-4 text-zinc-900 dark:text-white">Estatísticas do Portfólio</h1>
                {statsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
                      <div className="h-20 bg-gray-200 dark:bg-zinc-700 rounded-lg"></div>
                      <div className="h-20 bg-gray-200 dark:bg-zinc-700 rounded-lg"></div>
                      <div className="h-20 bg-gray-200 dark:bg-zinc-700 rounded-lg"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {renderStat('Projetos Ativos', stats.totalProjects)}
                      {renderStat('PMV mais Recente', stats.lastUpdated)}
                      {renderStat('Usuários Ativos', stats.activeUsers)}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-gray-200 dark:border-zinc-700/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Interações Manuais</h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-xl">
                      Ative ou desative a criação, edição e exclusão direta no sistema.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSavingSettings(true);
                      try {
                        await onToggleManualInteractions(!manualInteractionsEnabled);
                        setMessage(manualInteractionsEnabled ? 'Interações manuais desativadas.' : 'Interações manuais ativadas.');
                        setUploadStatus('success');
                      } catch (error) {
                        console.error('Error updating manual interactions setting:', error);
                        setMessage('Não foi possível atualizar a configuração.');
                        setUploadStatus('error');
                      } finally {
                        setIsSavingSettings(false);
                      }
                    }}
                    disabled={isSavingSettings}
                    className={`inline-flex min-w-[140px] items-center justify-center rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      manualInteractionsEnabled
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}
                  >
                    {isSavingSettings ? 'Salvando...' : (manualInteractionsEnabled ? 'Ativadas' : 'Desativadas')}
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs sm:text-sm">
                  {[
                    { label: 'Criar', active: manualInteractionsEnabled },
                    { label: 'Editar', active: manualInteractionsEnabled },
                    { label: 'Excluir', active: manualInteractionsEnabled },
                  ].map((chip) => (
                    <div
                      key={chip.label}
                      className={`rounded-lg px-3 py-2 text-center font-semibold ${
                        chip.active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                      }`}
                    >
                      {chip.label}
                    </div>
                  ))}
                </div>
              </div>

              {renderDevelopmentLockControls()}
              {renderHomeVisibilityControls()}

              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-green-500/30 dark:border-green-500/50 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Sincronização Automática Ativa</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  O banco de dados está conectado e sendo atualizado em tempo real através da planilha oficial no Google Sheets. Qualquer alteração feita na planilha será refletida aqui automaticamente.
                </p>
                <a
                  href="https://docs.google.com/spreadsheets/d/1LEGUYM0OmxQ3sT1U0YZzZP9kVA7aWIX-HVHDco-PIXk/edit?gid=1693495370#gid=1693495370"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Acessar Planilha de Origem
                </a>
              </div>

              {manualInteractionsEnabled && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-gray-200 dark:border-zinc-700/50">
                  <h1 className="text-xl sm:text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Atualização Manual (Backup)</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Em caso de falha na sincronização, faça o upload de um arquivo para <span className="font-bold">substituir completamente</span> todos os projetos.</p>

                  <div className="mb-6">
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 text-sm font-bold text-accent hover:text-accent-dark transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Baixar Modelo de Planilha
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Selecione o arquivo
                      </label>
                      <label htmlFor="file-upload" className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-zinc-600 border-dashed rounded-md cursor-pointer hover:border-accent hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition-all group">
                        <div className="space-y-1 text-center">
                          <UploadIcon className="mx-auto h-12 w-12 text-gray-400 group-hover:text-accent transition-colors" />
                          <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <span className="relative rounded-md font-medium text-accent group-hover:text-accent-dark focus-within:outline-none">
                              Carregar um arquivo
                            </span>
                            <p className="pl-1">ou arraste e solte</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            CSV, XLSX, XLS
                          </p>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                        </div>
                      </label>
                      {selectedFile && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Arquivo selecionado: {selectedFile.name}</p>}
                    </div>

                    <button
                      onClick={handleProcessFile}
                      disabled={!selectedFile || uploadStatus === 'processing'}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white dark:text-zinc-900 bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors disabled:bg-gray-400 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed"
                    >
                      {uploadStatus === 'processing' ? 'Processando...' : 'Substituir Portfólio'}
                    </button>

                    {message && (
                      <div className={`text-sm text-center p-3 rounded-md ${
                        uploadStatus === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' :
                        uploadStatus === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' :
                        'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                      }`}>
                        {message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-gray-200 dark:border-zinc-700/50 h-[28rem] sm:h-[34rem] overflow-hidden flex flex-col">
                <div className="flex flex-col space-y-4 flex-1 min-h-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Histórico de Uploads</h2>
                    {latestSheetSyncLog && (
                      <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm">
                        <p className="font-semibold text-green-700 dark:text-green-300">Última sync da planilha</p>
                        <p className="mt-1 text-zinc-800 dark:text-gray-200 font-medium">
                          {latestSheetSyncLog.details || latestSheetSyncLog.fileName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(latestSheetSyncLog.timestamp)}
                        </p>
                      </div>
                    )}
                    <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                        {uploadLogs.length > 0 ? (
                          uploadLogs.map((log) => (
                            <div key={log.id} className="flex items-start justify-between gap-3 p-3 mb-2 bg-gray-50 dark:bg-zinc-700/50 rounded-md">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-sm text-zinc-800 dark:text-gray-200">{getUploadDisplayTitle(log)}</p>
                                  {(log.userEmail === SHEET_SYNC_EMAIL || log.fileName === SHEET_SYNC_FILENAME) && (
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                      Sync Planilha
                                    </span>
                                  )}
                                </div>
                                {log.userEmail && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{log.userEmail}</p>
                                )}
                                {log.details && !(log.userEmail === SHEET_SYNC_EMAIL || log.fileName === SHEET_SYNC_FILENAME) && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-snug break-words">
                                    <span className="font-semibold text-accent">Detalhe:</span> {log.details}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimestamp(log.timestamp)}</p>
                              </div>
                              <span className="text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-1 rounded-full shrink-0">
                                Sucesso
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma atualização registrada.</p>
                        )}
                    </div>
                </div>
              </div>

            </div>

            {/* Column 2: Charts and Audit */}
            <div className="space-y-4 sm:space-y-8 flex h-full flex-col">
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-gray-200 dark:border-zinc-700/50">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Filtros de Período</h1>
                    <button
                        onClick={downloadAllData}
                        className="flex items-center gap-2 text-xs font-bold bg-accent/10 text-accent px-3 py-1.5 rounded-md hover:bg-accent/20 transition-colors"
                        title="Download de todos os dados"
                    >
                        <UploadIcon className="w-4 h-4 transform rotate-180" />
                        Download Todos os Dados
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data Inicial</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full text-sm bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md p-2 focus:ring-accent focus:border-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data Final</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full text-sm bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md p-2 focus:ring-accent focus:border-accent"
                        />
                    </div>
                </div>
                {(startDate || endDate) && (
                    <button
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                        className="mt-4 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                    >
                        Limpar Filtros de Data
                    </button>
                )}
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-gray-200 dark:border-zinc-700/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Distribuição de Projetos</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => downloadChartData(chartData, 'Distribuicao_Projetos')}
                            className="flex items-center gap-2 text-xs font-bold bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                            title="Download"
                        >
                            <UploadIcon className="w-4 h-4 transform rotate-180" />
                            Download Dados
                        </button>
                        <select
                            value={chartFilter}
                            onChange={(e) => setChartFilter(e.target.value as any)}
                            className="text-sm bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md p-1 focus:ring-accent focus:border-accent"
                        >
                            <option value="client">Por Cliente</option>
                            <option value="team">Por Time</option>
                            <option value="methodology">Por Metodologia</option>
                            <option value="media">Por Mídia</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto pb-2">
                    <div className="h-64 min-w-[720px] w-full">
                      {!chartsReady ? (
                        <div className="flex h-full items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500 dark:bg-zinc-700/30 dark:text-gray-400">
                          Carregando gráfico...
                        </div>
                      ) : (
                      <BarChart width={720} height={256} data={chartData} margin={{ bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#3f3f46' : '#e5e7eb'} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: theme === 'dark' ? '#a1a1aa' : '#71717a' }}
                                axisLine={false}
                                tickLine={false}
                                angle={-45}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: theme === 'dark' ? '#a1a1aa' : '#71717a' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                                    borderColor: theme === 'dark' ? '#3f3f46' : '#e5e7eb',
                                    color: theme === 'dark' ? '#ffffff' : '#000000'
                                }}
                                itemStyle={{ color: '#99cc00' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#99cc00' : '#86b300'} />
                                ))}
                            </Bar>
                        </BarChart>
                      )}
                    </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-gray-200 dark:border-zinc-700/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Projetos por Período</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => downloadChartData(periodChartData, 'Projetos_por_Periodo')}
                            className="flex items-center gap-2 text-xs font-bold bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                            title="Download"
                        >
                            <UploadIcon className="w-4 h-4 transform rotate-180" />
                            Download Dados
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Filtrado</span>
                    </div>
                </div>
                <div className="overflow-x-auto pb-2">
                    <div className="h-64 min-w-[720px] w-full">
                      {!chartsReady ? (
                        <div className="flex h-full items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500 dark:bg-zinc-700/30 dark:text-gray-400">
                          Carregando gráfico...
                        </div>
                      ) : (
                      <BarChart width={720} height={256} data={periodChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#3f3f46' : '#e5e7eb'} />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10, fill: theme === 'dark' ? '#a1a1aa' : '#71717a' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: theme === 'dark' ? '#a1a1aa' : '#71717a' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                                    borderColor: theme === 'dark' ? '#3f3f46' : '#e5e7eb',
                                    color: theme === 'dark' ? '#ffffff' : '#000000'
                                }}
                                itemStyle={{ color: '#99cc00' }}
                            />
                            <Bar dataKey="value" fill="#99cc00" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </div>
                </div>
              </div>

              <div id="audit-logs-section" className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-4 sm:p-8 border border-gray-200 dark:border-zinc-700/50 hover:border-accent/30 transition-all duration-300 min-h-[28rem] sm:min-h-[34rem] overflow-hidden flex flex-col">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Histórico recente da planilha</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Importações e sincronizações registradas a partir dos arquivos enviados.</p>
                    </div>
                    <button
                        onClick={downloadSheetChangeLogs}
                        className="flex items-center gap-2 text-xs font-bold bg-accent/10 text-accent px-3 py-1.5 rounded-md hover:bg-accent/20 transition-colors"
                        title="Download alterações da planilha"
                    >
                        <UploadIcon className="w-4 h-4 transform rotate-180" />
                        Download
                    </button>
                </div>

                <div className="space-y-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2">
                    {uploadLogs.length > 0 ? (
                      uploadLogs.slice(0, 12).map((log) => (
                        <div key={log.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-700/60 dark:bg-zinc-700/20">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white break-words">{getUploadDisplayTitle(log)}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                                {getUploadTypeLabel(log)}
                              </p>
                              {log.userEmail && (
                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 break-words">
                                  <span className="font-semibold text-accent">Usuário:</span> {log.userEmail}
                                </p>
                              )}
                              {log.details && (
                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 break-words">
                                  <span className="font-semibold text-accent">Detalhe:</span> {log.details}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-zinc-700/60 dark:bg-zinc-700/20">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Nenhuma alteração de planilha registrada ainda.
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      )
  );
};

export default AdminScreen;
