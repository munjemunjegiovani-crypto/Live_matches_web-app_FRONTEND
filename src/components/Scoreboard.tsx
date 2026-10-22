'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronRight, Radio, Tv } from 'lucide-react';
import { api } from '@/lib/api';
import type { MatchSummary, SportId } from '@/lib/engine';
import { DAY_MS, SPORT_EMOJI, cn, countdown, isLive, startOfDay } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { useNow } from '@/hooks/useNow';
import { DateStrip } from './DateStrip';
import { MatchCard, MatchCardSkeleton } from './MatchCard';
import { Empty } from './ui/bits';

type Status = 'all' | 'live' | 'upcoming' | 'finished';
const SPORTS: { id: SportId | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'football', label: 'Football' }, { id: 'basketball', label: 'Basketball' },
  { id: 'tennis', label: 'Tennis' }, { id: 'cricket', label: 'Cricket' }, { id: 'rugby', label: 'Rugby' },
];

export function Scoreboard() {
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [sport, setSport] = useState<SportId | 'all'>('all');
  const [status, setStatus] = useState<Status>('all');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const now = useNow(1000);
  const todayStart = startOfDay(now);

  const poll = api.mode === 'demo' ? 3000 : 5000;
  const { data, loading, error, refetch } = useQuery(`board:${day}`, () => api.matches({ from: day, to: day + DAY_MS, limit: 500, order: 'asc' }), { interval: poll });
  const all = data?.items ?? [];

  const counts = useMemo(() => {
    const c: Record<string, { total: number; live: number }> = { all: { total: 0, live: 0 } };
    for (const m of all) {
      c.all.total++; if (isLive(m)) c.all.live++;
      (c[m.sportId] ??= { total: 0, live: 0 }).total++;
      if (isLive(m)) c[m.sportId].live++;
    }
    return c;
  }, [all]);

  const statusCounts = useMemo(() => {
    const base = all.filter((m) => sport === 'all' || m.sportId === sport);
    return { live: base.filter(isLive).length, upcoming: base.filter((m) => m.status === 'SCHEDULED').length, finished: base.filter((m) => m.status === 'FINISHED').length };
  }, [all, sport]);

  const filtered = useMemo(() => all.filter((m) => (sport === 'all' || m.sportId === sport) && (
    status === 'all' ? true : status === 'live' ? isLive(m) : status === 'upcoming' ? m.status === 'SCHEDULED' : m.status === 'FINISHED')), [all, sport, status]);

  const groups = useMemo(() => {
    const g = new Map<string, { league: MatchSummary['league']; items: MatchSummary[] }>();
    for (const m of filtered) (g.get(m.leagueId) ?? g.set(m.leagueId, { league: m.league, items: [] }).get(m.leagueId)!).items.push(m);
    const rank = (m: MatchSummary) => (isLive(m) ? 0 : m.status === 'SCHEDULED' ? 1 : 2);
    const arr = [...g.values()];
    for (const x of arr) x.items.sort((a, b) => rank(a) - rank(b) || a.kickoff - b.kickoff);
    const order: Record<string, number> = { football: 0, basketball: 1, cricket: 2, rugby: 3, tennis: 4 };
    return arr.sort((a, b) => Math.min(...a.items.map(rank)) - Math.min(...b.items.map(rank)) || order[a.league.sportId] - order[b.league.sportId] || b.items.filter((i) => i.featured).length - a.items.filter((i) => i.featured).length || a.league.name.localeCompare(b.league.name));
  }, [filtered]);

  const isToday = day === todayStart;
  const nextKick = isToday ? all.filter((m) => m.status === 'SCHEDULED').sort((a, b) => a.kickoff - b.kickoff)[0] : undefined;
  const featured = useMemo(() => all.filter((m) => isLive(m) && m.watch?.hasStream).sort((a, b) => (b.watch?.viewers ?? 0) - (a.watch?.viewers ?? 0))[0], [all]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-5 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Live scores</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-bold text-accent"><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />{api.mode === 'demo' ? 'Demo feed · simulated' : 'Live sync active'}</span>
            <button onClick={() => void refetch()} className="text-xs font-semibold text-primary hover:underline">Refresh</button>
          </p>
        </div>
      </div>

      <DateStrip value={day} onChange={setDay} liveToday={isToday ? counts.all.live : undefined} counts={{ [day]: counts.all.total }} />

      <div className="hide-scroll -mx-4 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Sport">
        {SPORTS.map((s) => {
          const c = counts[s.id]?.total ?? 0;
          const on = sport === s.id;
          return (
            <button key={s.id} role="tab" aria-selected={on} onClick={() => setSport(s.id)} className={cn('chip', on && 'chip-on')}>
              {s.id !== 'all' && <span aria-hidden>{SPORT_EMOJI[s.id]}</span>}{s.label}
              <span className={cn('num rounded-full px-1.5 text-[11px]', on ? 'bg-white/20' : 'bg-surface-3')}>{c}</span>
            </button>
          );
        })}
      </div>

      <div className="hide-scroll -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {([['all', 'All'], ['live', `Live (${statusCounts.live})`], ['upcoming', `Upcoming (${statusCounts.upcoming})`], ['finished', `Finished (${statusCounts.finished})`]] as [Status, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setStatus(id)} aria-pressed={status === id}
            className={cn('shrink-0 whitespace-nowrap rounded-md border px-3.5 py-2 text-[13px] font-bold transition-colors', status === id ? (id === 'live' ? 'border-live/40 bg-live/12 text-live' : 'border-primary/40 bg-primary/10 text-primary') : 'border-line bg-surface text-muted hover:text-ink')}>
            {id === 'live' && <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live align-middle" />}{label}
          </button>
        ))}
      </div>

      {featured && status !== 'finished' && (
        <Link href={`/match/${featured.id}?tab=watch`} className="group relative mt-5 flex items-center gap-4 overflow-hidden rounded-lg border border-primary/30 bg-gradient-to-r from-primary/12 via-surface to-accent/10 p-4 transition-colors hover:border-primary/60">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary"><Tv size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="label-sm flex items-center gap-1.5 text-live"><Radio size={12} />Most watched right now</p>
            <p className="truncate font-display text-base font-extrabold">{featured.home.name} {featured.scoreLabel?.home ?? featured.homeScore} - {featured.scoreLabel?.away ?? featured.awayScore} {featured.away.name}</p>
            <p className="text-xs text-muted">{featured.league.name} · {new Intl.NumberFormat().format(featured.watch?.viewers ?? 0)} watching</p>
          </div>
          <span className="btn-primary hidden !py-2 sm:inline-flex">Watch live<ChevronRight size={16} /></span>
        </Link>
      )}

      {isToday && counts.all.live === 0 && !loading && nextKick && (
        <div className="mt-5 rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          Nothing live this minute. Next kick-off: <b className="text-ink">{nextKick.home.name} v {nextKick.away.name}</b> in <b className="num text-primary">{countdown(nextKick.kickoff, now)}</b>.
        </div>
      )}

      <div className="mt-5 space-y-8">
        {loading && !data && Array.from({ length: 2 }).map((_, i) => <div key={i} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((__, j) => <MatchCardSkeleton key={j} />)}</div>)}
        {error && !data && <Empty icon="⚠️" title="Couldn't load matches" body={error.message} action={<button className="btn-primary" onClick={() => void refetch()}>Try again</button>} />}
        {data && groups.length === 0 && <Empty icon="📅" title="No matches here" body={status === 'live' ? 'Nothing is live for this filter right now. Try another sport or day.' : 'No matches match these filters. Try another sport, status or day.'} action={<button className="btn-ghost" onClick={() => { setSport('all'); setStatus('all'); }}>Clear filters</button>} />}
        {groups.map((g) => (
          <section key={g.league.id} aria-label={g.league.name} className="animate-rise">
            <Link href={`/leagues/${g.league.id}`} className="group mb-3 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3 text-lg">{SPORT_EMOJI[g.league.sportId]}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-lg font-extrabold leading-tight">{g.league.name}</h2>
                <p className="text-xs text-muted">{g.league.country} · {g.items.length} {g.items.length === 1 ? 'match' : 'matches'}{g.items.some(isLive) && <span className="ml-2 font-bold text-live">● {g.items.filter(isLive).length} live</span>}</p>
              </div>
              <ChevronRight size={18} className="text-faint transition-transform group-hover:translate-x-0.5" />
            </Link>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{(open[g.league.id] ? g.items : g.items.slice(0, 6)).map((m) => <MatchCard key={m.id} m={m} />)}</div>
            {g.items.length > 6 && (
              <button onClick={() => setOpen((o) => ({ ...o, [g.league.id]: !o[g.league.id] }))} className="btn-ghost mt-3 w-full !py-2.5 text-[13px]">
                {open[g.league.id] ? 'Show fewer' : `Show all ${g.items.length} matches`}
              </button>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
