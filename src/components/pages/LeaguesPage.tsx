'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { SportId } from '@/lib/engine';
import { SPORT_EMOJI, cn } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { Empty, Skeleton } from '../ui/bits';
import { FavButton } from '../FavButton';

export function LeaguesPage() {
  const [sport, setSport] = useState<SportId | 'all'>('all');
  const [q, setQ] = useState('');
  const { data, loading } = useQuery(`leagues:${sport}:${q}`, () => api.leagues({ sport: sport === 'all' ? undefined : sport, q: q || undefined }));
  const sports: (SportId | 'all')[] = ['all', 'football', 'basketball', 'tennis', 'cricket', 'rugby'];
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Leagues & competitions</h1>
      <p className="mt-1 text-sm text-muted">Tables, top scorers and fixtures for every competition.</p>
      <div className="relative mt-5 max-w-xl"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leagues or countries…" className="input !pl-10" aria-label="Search leagues" /></div>
      <div className="hide-scroll -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {sports.map((s) => <button key={s} onClick={() => setSport(s)} className={cn('chip capitalize', sport === s && 'chip-on')}>{s !== 'all' && SPORT_EMOJI[s]}{s}</button>)}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !data && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        {data?.map((l) => (
          <Link key={l.id} href={`/leagues/${l.id}`} className="card group flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:border-faint">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-2xl">{SPORT_EMOJI[l.sportId]}</span>
            <div className="min-w-0 flex-1"><h2 className="truncate font-display text-base font-extrabold">{l.name}</h2><p className="truncate text-xs text-muted">{l.country} · {l.season}</p><p className="mt-1 text-xs font-semibold text-primary">{l.round} · {l.teamCount} {l.kind === 'ranking' ? 'players' : 'teams'}</p></div>
            <FavButton kind="league" id={l.id} label="league" /><ChevronRight size={18} className="text-faint" />
          </Link>
        ))}
      </div>
      {data && !data.length && <div className="mt-6"><Empty icon="🏆" title="No leagues found" body="Try a different search or sport." /></div>}
    </div>
  );
}
