'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { MatchSummary, SportId } from '@/lib/engine';
import { DAY_MS, SPORT_EMOJI, cn, dateTime, scoreOf } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { Empty, Skeleton } from '../ui/bits';
import { Crest } from '../ui/Crest';
import { StatusPill } from '../ui/bits';

type Mode = 'finished' | 'upcoming' | 'all';
const RANGES = [{ id: 7, label: '7 days' }, { id: 30, label: '30 days' }, { id: 90, label: '90 days' }, { id: 0, label: 'All time' }];

function Row({ m }: { m: MatchSummary }) {
  const s = scoreOf(m);
  const done = m.status === 'FINISHED';
  const hw = done && m.homeScore > m.awayScore, aw = done && m.awayScore > m.homeScore;
  return (
    <Link href={`/match/${m.id}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1.5 px-3 py-3 transition-colors hover:bg-surface-2 sm:grid-cols-[110px_1fr_auto_1fr_90px] sm:gap-4 sm:px-4">
      <span className="col-span-3 flex items-center justify-between text-[11px] font-semibold text-faint sm:col-span-1 sm:block sm:text-xs sm:text-muted"><span className="sm:block sm:text-sm sm:text-ink">{dateTime(m.kickoff).split(' · ')[0]}</span><span>{m.league.short}</span></span>
      <span className={cn('flex min-w-0 items-center justify-end gap-2 text-right', hw ? 'font-extrabold' : 'font-semibold text-muted')}><span className="line-clamp-2 break-words text-sm leading-tight">{m.home.name}</span><Crest team={m.home} size={24} className="hidden min-[400px]:block" /></span>
      <span className="num min-w-[60px] rounded-md bg-surface-3 px-2 py-1 text-center font-display text-[15px] font-extrabold">{m.status === 'SCHEDULED' ? dateTime(m.kickoff).split(' · ')[1] : m.status === 'POSTPONED' ? 'PP' : `${s.h} - ${s.a}`}</span>
      <span className={cn('flex min-w-0 items-center gap-2', aw ? 'font-extrabold' : 'font-semibold text-muted')}><Crest team={m.away} size={24} className="hidden min-[400px]:block" /><span className="line-clamp-2 break-words text-sm leading-tight">{m.away.name}</span></span>
      <span className="hidden justify-end sm:flex">{m.status === 'FINISHED' ? <span className="text-xs font-semibold text-faint">Full time</span> : <StatusPill m={m} />}</span>
    </Link>
  );
}

export function HistoryPage() {
  const [mode, setMode] = useState<Mode>('finished');
  const [sport, setSport] = useState<SportId | 'all'>('all');
  const [league, setLeague] = useState('');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [range, setRange] = useState(30);
  const [result, setResult] = useState<'' | 'home' | 'draw' | 'away'>('');
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => setPage(1), [mode, sport, league, range, result]);
  useEffect(() => { setLeague(''); }, [sport]);

  const leagues = useQuery(`hl:${sport}`, () => api.leagues({ sport: sport === 'all' ? undefined : sport }));
  const now = Date.now();
  const key = [mode, sport, league, dq, range, result, page].join('|');
  const { data, loading } = useQuery(`hist:${key}`, () => {
    const base = { sport: sport === 'all' ? undefined : sport, league: league || undefined, q: dq || undefined, page, limit: 20 };
    if (mode === 'upcoming') return api.matches({ ...base, status: 'upcoming', from: Date.now(), to: Date.now() + 14 * DAY_MS, order: 'asc' });
    return api.history({ ...base, ...(range ? { from: Date.now() - range * DAY_MS } : {}), ...(result ? { result } : {}), order: 'desc' });
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Matches & history</h1>
      <p className="mt-1 text-sm text-muted">Search every result and upcoming fixture across all competitions.</p>

      <div className="card mt-5 space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {([['finished', 'Results'], ['upcoming', 'Upcoming']] as [Mode, string][]).map(([id, l]) => <button key={id} onClick={() => setMode(id)} className={cn('chip', mode === id && 'chip-on')}>{l}</button>)}
          <span className="mx-1 hidden w-px bg-line sm:block" />
          {(['all', 'football', 'basketball', 'tennis', 'cricket', 'rugby'] as const).map((s) => <button key={s} onClick={() => setSport(s)} className={cn('chip capitalize', sport === s && 'chip-on')}>{s !== 'all' && SPORT_EMOJI[s]}{s}</button>)}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team or player…" className="input !pl-9" aria-label="Search team" /></div>
          <select value={league} onChange={(e) => setLeague(e.target.value)} className="input" aria-label="League"><option value="">All leagues</option>{leagues.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          {mode === 'finished' && <select value={range} onChange={(e) => setRange(Number(e.target.value))} className="input" aria-label="Period">{RANGES.map((r) => <option key={r.id} value={r.id}>{r.id ? `Last ${r.label}` : r.label}</option>)}</select>}
          {mode === 'finished' && <select value={result} onChange={(e) => setResult(e.target.value as typeof result)} className="input" aria-label="Result"><option value="">Any result</option><option value="home">Home wins</option><option value="draw">Draws</option><option value="away">Away wins</option></select>}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted"><span>{data ? <><b className="num text-ink">{data.total.toLocaleString()}</b> {data.total === 1 ? 'match' : 'matches'}</> : ' '}</span>{data && data.pages > 1 && <span className="num">Page {data.page} of {data.pages}</span>}</div>

      <div className="card mt-2 divide-y divide-line overflow-hidden">
        {loading && !data && Array.from({ length: 8 }).map((_, i) => <div key={i} className="p-3"><Skeleton className="h-8 w-full" /></div>)}
        {data?.items.map((m) => <Row key={m.id} m={m} />)}
      </div>
      {data && !data.items.length && <div className="mt-4"><Empty icon="🔎" title="No matches found" body="Try widening the period or clearing a filter." action={<button className="btn-ghost" onClick={() => { setQ(''); setLeague(''); setResult(''); setSport('all'); setRange(0); }}>Reset filters</button>} /></div>}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button className="btn-ghost !px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft size={16} />Prev</button>
          <span className="num px-3 text-sm font-semibold">{data.page} / {data.pages}</span>
          <button className="btn-ghost !px-3" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">Next<ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
