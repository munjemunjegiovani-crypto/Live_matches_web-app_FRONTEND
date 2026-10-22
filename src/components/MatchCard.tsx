'use client';
import Link from 'next/link';
import { Eye, Tv } from 'lucide-react';
import type { MatchSummary } from '@/lib/engine';
import { cn, countdown, isLive, scoreOf, timeOf } from '@/lib/format';
import { useNow } from '@/hooks/useNow';
import { Crest } from './ui/Crest';
import { StatusPill, WinProb } from './ui/bits';
import { FavButton } from './FavButton';

function SetsLine({ m }: { m: MatchSummary }) {
  if (!m.sets?.length) return null;
  return <p className="num mt-1 text-center text-[12px] font-semibold text-muted">{m.sets.map((s) => `${s[0]}-${s[1]}`).join('  ')}</p>;
}

export function MatchCard({ m, className = '', showLeague = false }: { m: MatchSummary; className?: string; showLeague?: boolean }) {
  const live = isLive(m);
  const s = scoreOf(m);
  const now = useNow(1000);
  const upcoming = m.status === 'SCHEDULED';
  const ended = m.status === 'FINISHED';
  const homeWon = ended && m.homeScore > m.awayScore;
  const awayWon = ended && m.awayScore > m.homeScore;
  const team = (t: MatchSummary['home'], won: boolean, align: 'l' | 'r') => (
    <div className={cn('flex min-w-0 flex-1 items-center gap-3', align === 'r' && 'flex-row-reverse text-right')}>
      <Crest team={t} size={44} />
      <span className={cn('min-w-0 line-clamp-2 break-words font-display text-[15px] leading-tight', won ? 'font-extrabold' : 'font-bold', ended && !won && m.homeScore !== m.awayScore && 'text-muted')}>{t.name}</span>
    </div>
  );
  return (
    <Link href={`/match/${m.id}`} className={cn('card group relative block overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:border-faint', live && 'border-live/30', className)}>
      {live && <span className="absolute inset-y-0 left-0 w-1 bg-live" aria-hidden />}
      <div className="flex items-center gap-2">
        {live || m.status === 'FINISHED' || m.status === 'POSTPONED' ? <StatusPill m={m} /> : (
          <span className="rounded-md bg-primary/10 px-2 py-1 text-[12px] font-bold text-primary num">{timeOf(m.kickoff)}</span>
        )}
        {showLeague && <span className="truncate text-[12px] font-semibold text-muted">{m.league.short}</span>}
        <span className="truncate text-[12px] text-faint">{m.round.replace('League phase · ', '')}</span>
        <span className="ml-auto flex items-center gap-1 text-faint">
          {m.watch?.hasStream && (live ? <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary"><Tv size={12} />LIVE VIDEO</span> : <Tv size={14} aria-label="Stream available" />)}
          <FavButton kind="match" id={m.id} size={17} label="match" className="-mr-1.5 -my-1" />
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {team(m.home, homeWon, 'l')}
        <div className="shrink-0 px-1 text-center">
          {upcoming || m.status === 'POSTPONED' ? (
            <div className="num w-16 text-center">
              <p className="font-display text-sm font-extrabold text-muted">VS</p>
              {upcoming && <p className="text-[11px] font-semibold text-primary">in {countdown(m.kickoff, now)}</p>}
            </div>
          ) : (
            <div className="num font-display text-[28px] font-extrabold leading-none tracking-tight sm:text-[32px]">
              <span className={cn(ended && awayWon && 'text-muted')}>{s.h}</span>
              <span className="mx-1.5 text-faint">-</span>
              <span className={cn(ended && homeWon && 'text-muted')}>{s.a}</span>
            </div>
          )}
          <SetsLine m={m} />
        </div>
        {team(m.away, awayWon, 'r')}
      </div>

      {(m.lastEvent && live) && <p className="mt-3 truncate rounded-md bg-surface-2 px-3 py-2 text-[12.5px] font-medium text-muted"><span className="mr-1.5 text-accent">●</span>{m.lastEvent}</p>}
      {m.winProb && (live || upcoming) && <div className="mt-3"><WinProb m={m} compactMode /></div>}
      {ended && m.lastEvent === undefined && null}
      {live && m.watch?.hasStream && <p className="mt-2 flex items-center gap-1 text-[11.5px] text-faint"><Eye size={12} />{new Intl.NumberFormat().format(m.watch.viewers)} watching</p>}
    </Link>
  );
}

export function MatchCardSkeleton() {
  return <div className="card space-y-3 p-4"><div className="skeleton h-5 w-24" /><div className="skeleton h-12 w-full" /><div className="skeleton h-2 w-full" /></div>;
}
