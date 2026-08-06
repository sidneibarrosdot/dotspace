import React from 'react';
import type { User } from 'firebase/auth';
import { Bot, BookMarked, BookOpen, Building2, Home, LayoutGrid, MessageSquareMore } from 'lucide-react';
import MobileFooterNav from '../components/MobileFooterNav';
import OrgChart from '../components/OrgChart';

interface OrganogramaScreenProps {
  user: User | null;
  isLoggedIn: boolean;
  onNavigateToPortfolio: () => void;
  onNavigateToProcessos: () => void;
  onNavigateToTreinamentos: () => void;
  onNavigateToKRs: () => void;
  onNavigateToAgentes: () => void;
  onNavigateToForum: () => void;
  onNavigateToAdmin: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  offlineMode?: boolean;
}

const OrganogramaScreen: React.FC<OrganogramaScreenProps> = ({
  user, isLoggedIn, onNavigateToPortfolio, onNavigateToProcessos, onNavigateToTreinamentos,
  onNavigateToKRs, onNavigateToAgentes, onNavigateToForum, onNavigateToAdmin, onLogout,
  theme, toggleTheme, offlineMode = false,
}) => {
  const light = theme === 'light';
  const items = [
    { label: 'Home', icon: Home, action: onNavigateToPortfolio },
    { label: 'Processos', icon: LayoutGrid, action: onNavigateToProcessos },
    { label: 'Treinamentos', icon: BookOpen, action: onNavigateToTreinamentos },
    { label: "Banco de OKR's", icon: BookMarked, action: onNavigateToKRs },
    { label: 'Agentes de IA', icon: Bot, action: onNavigateToAgentes },
    { label: 'Organograma', icon: Building2, active: true },
    { label: 'Fórum', icon: MessageSquareMore, action: onNavigateToForum },
  ];

  return <div className={light ? 'min-h-screen bg-gray-100 text-zinc-900' : 'min-h-screen bg-[#0d0e10] text-white'}>
    <main className="container mx-auto px-4 py-6 pb-44 sm:px-6 sm:py-8 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden xl:block"><div className={`sticky top-24 rounded-[30px] border p-6 ${light ? 'border-zinc-200 bg-white' : 'border-white/15 bg-[#191a1d]'}`}><div className="space-y-2">
          {items.map(({ label, icon: Icon, action, active }) => <button key={label} type="button" onClick={action} disabled={!action} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold ${active ? 'bg-[#88C125] text-white' : light ? 'text-zinc-700 hover:bg-zinc-50' : 'text-white/80 hover:bg-white/8'}`}><Icon className="h-4 w-4" />{label}</button>)}
        </div></div></aside>
        <div className="space-y-6"><section className={`relative overflow-hidden rounded-[34px] border p-8 ${light ? 'border-[#88C125]/25 bg-gradient-to-br from-[#f8fbea] via-[#fbfdf5] to-[#eef6dc]' : 'border-[#88C125]/25 bg-gradient-to-br from-[#20251b] via-[#1c2118] to-[#141713]'}`}><p className="inline-flex rounded-full bg-[#88C125]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-[#88C125]">Estrutura organizacional</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Conheça nossos times</h1><p className={`mt-4 max-w-2xl leading-7 ${light ? 'text-zinc-600' : 'text-white/70'}`}>Visualize coordenações, lideranças, subáreas e colaboradores. Os dados são atualizados pela planilha de governança.</p></section><OrgChart theme={theme} /></div>
      </section>
    </main>
    <MobileFooterNav theme={theme} items={items.map(item => ({ label: item.label, icon: item.icon, active: item.active, onClick: item.action }))} />
  </div>;
};

export default OrganogramaScreen;
