'use client';
import Link from 'next/link';
import { Eye, Play, Tv } from 'lucide-react';
import { api } from '@/lib/api';
import { SPORT_EMOJI, compact, countdown, scoreOf, timeOf } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { useNow } from '@/hooks/useNow';
import { Empty, SectionTitle, Skeleton, StatusPill } from '../ui/bits';
import { Crest } from '../ui/Crest';

export function WatchHub() {
  const now = useNow(1000);
  const live = useQuery('watch-live', () => api.live(), { interval: 4000 });
  const soon = useQuery('watch-soon', () => api.matches({ status: 'upcoming', watch: true, from: Date.now(), to: Date.now() + 24 * 3600_000, order: 'asc', limit: 12 }), { interval: 20000 });
  const streams = (live.data ?? []).filter((m) => m.watch?.hasStream).sort((a, b) => (b.watch?.viewers ?? 0) - (a.watch?.viewers ?? 0));
  const hero = streams[0];
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Watch live</h1>
      <p className="mt-1 text-sm text-muted">Demo broadcasts of simulated matches, with where-to-watch info for each.</p>
      {live.loading && !live.data && <Skeleton className="mt-5 h-72 w-full" />}
      {hero && (
        <Link href={`/match/${hero.id}?tab=watch`} className="group relative mt-5 block overflow-hidden rounded-xl border border-line shadow-card" style={{ background: `linear-gradient(120deg, ${hero.home.color}, #0b1220 50%, ${hero.away.color})` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
          <div className="relative flex min-h-[260px] flex-col justify-end gap-4 p-5 sm:min-h-[320px] sm:p-8">
            <span className="inline-flex w-fit items-center gap-2 rounded-md bg-live px-2.5 py-1 text-xs font-extrabold tracking-wide text-white"><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-white" />LIVE · {hero.clock}</span>
            <div className="flex items-center gap-4 text-white"><Crest team={hero.home} size={56} /><p className="num font-display text-4xl font-extrabold sm:text-6xl">{scoreOf(hero).h} - {scoreOf(hero).a}</p><Crest team={hero.away} size={56} /></div>
            <div className="flex flex-wrap items-center gap-3 text-white"><div><p className="font-display text-lg font-extrabold sm:text-2xl">{hero.home.name} v {hero.away.name}</p><p className="flex items-center gap-3 text-sm text-white/80">{hero.league.name}<span className="flex items-center gap-1"><Eye size={14} />{compact(hero.watch?.viewers ?? 0)} watching</span></p></div>
              <span className="btn ml-auto bg-white text-black shadow-pop transition-transform group-hover:scale-105"><Play size={16} fill="currentColor" />Watch now</span></div>
          </div>
        </Link>
      )}
      {live.data && !hero && <div className="mt-5"><Empty icon={<Tv />} title="No live broadcasts right now" body="Matches with a broadcast appear here the moment they kick off. Check what's coming up below." /></div>}

      {streams.length > 1 && <><SectionTitle className="mt-8">More live now</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{streams.slice(1).map((m) => (
          <Link key={m.id} href={`/match/${m.id}?tab=watch`} className="card group overflow-hidden transition-all hover:-translate-y-0.5">
            <div className="relative grid aspect-video place-items-center" style={{ background: `linear-gradient(135deg, ${m.home.color}, #0b1220 55%, ${m.away.color})` }}>
              <span className="absolute left-2 top-2"><StatusPill m={m} /></span><span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white">{m.watch?.quality}</span>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-black transition-transform group-hover:scale-110"><Play size={20} fill="currentColor" className="ml-0.5" /></span>
            </div>
            <div className="p-3"><p className="truncate text-sm font-bold">{SPORT_EMOJI[m.sportId]} {m.home.name} {scoreOf(m).h}-{scoreOf(m).a} {m.away.name}</p><p className="flex justify-between text-xs text-muted"><span>{m.league.short}</span><span className="flex items-center gap-1"><Eye size={12} />{compact(m.watch?.viewers ?? 0)}</span></p></div>
          </Link>))}</div></>}

      <SectionTitle className="mt-8">Coming up with a broadcast</SectionTitle>
      <div className="card divide-y divide-line">
        {soon.data?.items.map((m) => (
          <Link key={m.id} href={`/match/${m.id}?tab=watch`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
            <span className="num w-12 text-sm font-bold text-primary">{timeOf(m.kickoff)}</span><Crest team={m.home} size={24} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{m.home.name} v {m.away.name}</span><span className="hidden text-xs text-muted sm:block">{m.watch?.broadcasters[0]?.name}</span><span className="num text-xs font-bold text-faint">in {countdown(m.kickoff, now)}</span>
          </Link>))}
        {soon.data && !soon.data.items.length && <p className="p-6 text-center text-sm text-muted">No broadcasts scheduled in the next 24 hours.</p>}
        {soon.loading && !soon.data && <Skeleton className="m-4 h-16" />}
      </div>
    </div>
  );
}
