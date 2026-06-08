import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ExternalLink, RefreshCcw } from 'lucide-react';

type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startLabel: string;
  endLabel?: string;
  htmlLink?: string;
  status?: string;
  startDate: Date;
};

type ViewMode = 'lista' | 'calendario';

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: 'mock-1',
    summary: 'Revisão de processos',
    description: 'Alinhamento dos fluxos críticos do hub.',
    location: 'Sala Operação',
    startLabel: 'Seg • 09:00',
    endLabel: '10:00',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 3, 9, 0),
  },
  {
    id: 'mock-2',
    summary: 'Treinamento de onboarding',
    description: 'Sessão para novos colaboradores da área.',
    location: 'Online',
    startLabel: 'Ter • 14:00',
    endLabel: '15:30',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 8, 14, 0),
  },
  {
    id: 'mock-3',
    summary: 'Ritual de KR’s',
    description: 'Leitura de metas, desvios e próximos passos.',
    location: 'Sala de gestão',
    startLabel: 'Qua • 11:00',
    endLabel: '12:00',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 14, 11, 0),
  },
  {
    id: 'mock-4',
    summary: 'Painel de IA',
    description: 'Demonstração de usos práticos na operação.',
    location: 'Auditório',
    startLabel: 'Qui • 16:00',
    endLabel: '17:00',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 21, 16, 0),
  },
  {
    id: 'mock-5',
    summary: 'Fórum de dúvidas',
    description: 'Momento aberto para perguntas e alinhamentos.',
    location: 'Comunidade',
    startLabel: 'Sex • 10:00',
    endLabel: '11:00',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 27, 10, 0),
  },
];

const formatCalendarDate = (isoValue: string, allDay = false) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;

  const day = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  if (allDay) return day;
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} • ${time}`;
};

const monthNames = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const CalendarAgenda: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'mock' | 'real'>('mock');
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const loadEvents = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/calendar/events?maxResults=8');
      if (!response.ok) {
        throw new Error('Agenda ainda não configurada.');
      }

      const payload = (await response.json()) as { items?: Array<Record<string, any>> };
      const nextEvents = (payload.items || []).map((event) => {
        const startDateValue = event.start?.dateTime || event.start?.date || '';
        const endDateValue = event.end?.dateTime || event.end?.date || '';
        const allDay = Boolean(event.start?.date && !event.start?.dateTime);
        const startDate = startDateValue ? new Date(startDateValue) : new Date();

        return {
          id: event.id,
          summary: event.summary || 'Evento sem título',
          description: event.description || '',
          location: event.location || '',
          startLabel: startDateValue ? formatCalendarDate(startDateValue, allDay) : 'Horário não informado',
          endLabel: endDateValue ? formatCalendarDate(endDateValue, allDay) : '',
          htmlLink: event.htmlLink || '',
          status: event.status || 'confirmed',
          startDate,
        };
      });

      if (nextEvents.length > 0) {
        setEvents(nextEvents);
        setSource('real');
        setLastUpdated(new Date());
        return;
      }

      throw new Error('Agenda vazia no calendário configurado.');
    } catch {
      setEvents(MOCK_EVENTS);
      setSource('mock');
      setLastUpdated(new Date());
      setError('Exibindo agenda simulada até a configuração final do Google Calendar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvents();
    const interval = window.setInterval(() => {
      void loadEvents();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setSelectedDay(new Date().getDate());
    setCurrentMonth(new Date());
  }, []);

  const accentColors = useMemo(() => ['#88C125', '#4CD07D', '#F78E43', '#EEC137'], []);

  const monthMatrix = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = Array.from({ length: startOffset }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const rows: Array<Array<number | null>> = [];
    for (let index = 0; index < cells.length; index += 7) {
      rows.push(cells.slice(index, index + 7));
    }
    return rows;
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return events
      .filter((event) => event.startDate.getFullYear() === year && event.startDate.getMonth() === month)
      .reduce<Record<number, CalendarEvent[]>>((acc, event) => {
        const day = event.startDate.getDate();
        acc[day] = acc[day] || [];
        acc[day].push(event);
        return acc;
      }, {});
  }, [events, currentMonth]);

  const selectedEvents = eventsByDay[selectedDay] || [];

  return (
    <article className="rounded-[30px] border border-zinc-200/80 bg-white p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#88C125]">Agenda</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Espelho do Google Calendar</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {source === 'mock'
              ? 'Agenda simulada para validação visual até a integração final.'
              : 'Integração sincronizada com o Google Calendar.'}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode('lista')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              viewMode === 'lista'
                ? 'bg-[#88C125] text-white'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendario')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              viewMode === 'calendario'
                ? 'bg-[#88C125] text-white'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700'
            }`}
          >
            Calendário
          </button>
        </div>

        <button
          type="button"
          onClick={() => void loadEvents()}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <RefreshCcw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {lastUpdated && (
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500">
          Última sincronização: {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-3xl border border-dashed border-[#88C125]/30 bg-[#88C125]/8 p-4 text-sm text-zinc-700 dark:border-[#88C125]/20 dark:bg-[#88C125]/10 dark:text-zinc-200">
          {error}
        </div>
      )}

      {viewMode === 'lista' ? (
        <div className="mt-5 max-h-[300px] space-y-1.5 overflow-y-auto pr-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
            ))
          ) : (
            events.map((event, index) => {
              const color = accentColors[index % accentColors.length];
              return (
                <div key={event.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/70">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                            {event.startLabel}
                          </p>
                          <h3 className="mt-0.5 text-[13px] font-bold leading-tight text-zinc-900 dark:text-white">{event.summary}</h3>
                        </div>
                        {event.htmlLink && (
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            aria-label={`Abrir evento ${event.summary}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">{event.description}</p>
                      )}
                      {event.location && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#88C125]">Calendário</p>
                <h3 className="mt-1 text-base font-black text-zinc-900 dark:text-white">
                  {monthNames[currentMonth.getMonth()]} / {currentMonth.getFullYear()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="mt-2 grid gap-1.5">
              {monthMatrix.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-7 gap-1.5">
                  {row.map((day, cellIndex) => {
                    if (!day) {
                      return <div key={cellIndex} className="aspect-square rounded-xl bg-transparent" />;
                    }

                    const eventsForDay = eventsByDay[day] || [];
                    const isSelected = day === selectedDay;
                    return (
                      <button
                        key={cellIndex}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`relative aspect-square rounded-xl border p-1.5 text-left transition-colors ${
                          isSelected
                            ? 'border-[#88C125] bg-[#88C125]/10'
                            : 'border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span className="text-[11px] font-black text-zinc-900 dark:text-white">{day}</span>
                        {eventsForDay.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {eventsForDay.slice(0, 3).map((event, eventIndex) => (
                              <span
                                key={event.id}
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: accentColors[eventIndex % accentColors.length] }}
                              />
                            ))}
                            {eventsForDay.length > 3 && (
                              <span className="text-[9px] font-bold text-zinc-400">+{eventsForDay.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[28px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-[#88C125]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500 dark:text-zinc-400">Dia selecionado</p>
            </div>
            <h4 className="mt-2 text-xl font-black text-zinc-900 dark:text-white">{selectedDay}</h4>

            <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {selectedEvents.length > 0 ? (
                selectedEvents.map((event, index) => (
                  <div key={event.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/70">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accentColors[index % accentColors.length] }} />
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{event.startLabel}</p>
                        <h5 className="mt-0.5 text-[13px] font-bold leading-tight text-zinc-900 dark:text-white">{event.summary}</h5>
                        {event.location && (
                          <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">{event.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                  Nenhum evento nesse dia. A visualização calendário ajuda a acompanhar a rotina semanal até a configuração final.
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              <p className="font-semibold text-zinc-900 dark:text-white">Modo de transição</p>
              <p className="mt-1 leading-6">
                A lista simulada continua disponível enquanto o Google Calendar real não estiver configurado no servidor.
              </p>
            </div>
          </aside>
        </div>
      )}
    </article>
  );
};

export default CalendarAgenda;
