import React, { useState } from 'react';
import { ChevronDown, UserRound, Users } from 'lucide-react';

type Person = { name: string; slack?: string };
type Area = { name: string; people: Person[] };
type Team = { id: string; name: string; coordination: Person; clients: string; projectLead: Person; areas: Area[] };

const seed: Team[] = [
  {
    id: 'time-modelo', name: 'Time Modelo', clients: 'Cliente Exemplo',
    coordination: { name: 'Pessoa Mock 01' }, projectLead: { name: 'Pessoa Mock 02' },
    areas: [
      { name: 'Design Instrucional', people: ['03', '04', '05', '06'].map(id => ({ name: `Pessoa Mock ${id}` })) },
      { name: 'Design Multimídia', people: ['07', '08'].map(id => ({ name: `Pessoa Mock ${id}` })) },
      { name: 'Front End', people: [{ name: 'Pessoa Mock 09' }] },
    ],
  },
  {
    id: 'time-horizonte', name: 'Time Horizonte', clients: 'Cliente Modelo A',
    coordination: { name: 'Pessoa Mock 10' }, projectLead: { name: 'Pessoa Mock 11' },
    areas: [
      { name: 'Conteúdo', people: ['12', '13', '14'].map(id => ({ name: `Pessoa Mock ${id}` })) },
      { name: 'Audiovisual', people: ['15', '16'].map(id => ({ name: `Pessoa Mock ${id}` })) },
      { name: 'Qualidade', people: [{ name: 'Pessoa Mock 17' }] },
    ],
  },
  {
    id: 'time-orbita', name: 'Time Órbita', clients: 'Cliente Modelo B',
    coordination: { name: 'Pessoa Mock 18' }, projectLead: { name: 'Pessoa Mock 19' },
    areas: [
      { name: 'Produto', people: ['20', '21'].map(id => ({ name: `Pessoa Mock ${id}` })) },
      { name: 'Dados', people: ['22', '23'].map(id => ({ name: `Pessoa Mock ${id}` })) },
      { name: 'Desenvolvimento', people: ['24', '25', '26'].map(id => ({ name: `Pessoa Mock ${id}` })) },
      { name: 'Operações', people: [{ name: 'Pessoa Mock 27' }] },
    ],
  },
  {
    id: 'time-nexo', name: 'Time Nexo', clients: 'Cliente Modelo C',
    coordination: { name: 'Pessoa Mock 28' }, projectLead: { name: 'Pessoa Mock 29' },
    areas: [
      { name: 'Projetos', people: ['30', '31'].map(id => ({ name: `Pessoa Mock ${id}` })) },
      { name: 'Experiência', people: ['32', '33', '34'].map(id => ({ name: `Pessoa Mock ${id}` })) },
    ],
  },
];

const PersonLink = ({ person }: { person: Person }) => person.slack
  ? <a href={person.slack} target="_blank" rel="noreferrer" className="font-semibold hover:text-[#88C125]">{person.name}</a>
  : <span className="font-semibold">{person.name}</span>;

const OrgChart: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
  const teams = seed;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const light = theme === 'light';

  return <section className={`rounded-[30px] border p-6 ${light ? 'border-zinc-200 bg-white' : 'border-zinc-700/70 bg-[#1b1c20]'}`}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-[#88C125]">Organograma</p><h2 className="mt-2 text-2xl font-black">Times e colaboradores</h2></div>
    </div>
    <div className="mt-6 grid gap-4">
      {teams.map(team => {
        const open = expandedId === team.id;
        const peopleCount = 2 + team.areas.reduce((sum, area) => sum + area.people.length, 0);
        return <article key={team.id} className={`overflow-hidden rounded-[28px] border transition-colors ${light ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}>
          <button type="button" onClick={() => setExpandedId(open ? null : team.id)} className="flex w-full items-center gap-4 p-5 text-left">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#88C125]/15 text-[#88C125]"><Users className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1"><span className="block text-lg font-black">{team.name}</span><span className="mt-1 block text-xs text-zinc-500">{team.areas.length} subáreas · {peopleCount} colaboradores · {team.clients || 'Cliente a definir'}</span></span>
            <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180 text-[#88C125]' : 'text-zinc-500'}`} />
          </button>
          {open && <div className={`border-t p-5 ${light ? 'border-zinc-200 bg-white' : 'border-white/10 bg-[#151619]'}`}>
            <div className="mx-auto max-w-4xl">
              <div className="relative mx-auto max-w-sm rounded-3xl border-2 border-[#88C125]/50 bg-[#88C125]/10 p-4 text-center">
                <UserRound className="mx-auto h-5 w-5 text-[#88C125]" /><p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#88C125]">Coordenação</p><PersonLink person={team.coordination} />
              </div>
              <div className="mx-auto h-8 w-px bg-[#88C125]/50" />
              <div className={`mx-auto max-w-sm rounded-2xl border p-3 text-center ${light ? 'border-zinc-200' : 'border-white/10'}`}><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Líder de Projetos</p><PersonLink person={team.projectLead} /><p className="mt-1 text-xs text-zinc-500">{team.clients || 'Cliente a definir'}</p></div>
              <div className="mx-auto h-8 w-px bg-[#88C125]/50" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{team.areas.map(area => <div key={area.name} className={`relative rounded-2xl border p-4 ${light ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'}`}><p className="text-xs font-black uppercase tracking-wider text-[#88C125]">{area.name}</p><div className="mt-3 grid gap-2 text-sm">{area.people.map(person => <PersonLink key={person.name} person={person} />)}</div></div>)}</div>
            </div>
          </div>}
        </article>;
      })}
    </div>
  </section>;
};

export default OrgChart;
