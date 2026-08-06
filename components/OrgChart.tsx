import React, { useState } from 'react';
import { ChevronDown, UserRound, Users } from 'lucide-react';

type Person = { name: string; slack?: string };
type Area = { name: string; people: Person[] };
type Team = { id: string; name: string; coordination: Person; clients: string; projectLead: Person; areas: Area[] };

const seed: Team[] = [{
  id: 'natiruts-innovation', name: 'Natiruts Innovation', clients: 'Senar FIC (Senar Nacional)',
  coordination: { name: 'Paula Faraco', slack: 'https://dot-digital-group.slack.com/team/UUQ3DEAGH' },
  projectLead: { name: 'Lucas Millan', slack: 'https://dot-digital-group.slack.com/team/U07H3LSN4RY' },
  areas: [
    { name: 'DIs', people: [
      ['Luciane Rodrigues', 'U0261JA2W9X'], ['Pupella Cardoso', 'U01H2GQP05C'], ['Andréia Drula', 'U01QTUHQNGK'], ['Nathália Gago', 'U08RRHKMDA8'],
    ].map(([name, id]) => ({ name, slack: `https://dot-digital-group.slack.com/team/${id}` })) },
    { name: 'DMs', people: [['Tiago Zanchin', 'U03JKUBNR43'], ['Gabriel Jacober', 'U01K6GRG24D']].map(([name, id]) => ({ name, slack: `https://dot-digital-group.slack.com/team/${id}` })) },
    { name: 'Front', people: [{ name: 'Nathy Santos', slack: 'https://dot-digital-group.slack.com/team/U016N9G72TH' }] },
  ],
}];

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
      <span className="rounded-full border border-[#88C125]/30 bg-[#88C125]/10 px-4 py-2 text-xs font-bold text-[#88C125]">Sincronizado por planilha</span>
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
