'use client';
import Link from 'next/link';
import { ArrowLeft, Bell, Eye, MapPin, Share2, UserRound, Users } from 'lucide-react';
import type { MatchDetail } from '@/lib/engine';
import { cn, countdown, isLive, longDate, scoreOf, timeOf } from '@/lib/format';
import { useNow } from '@/hooks/useNow';
import { Crest } from '../ui/Crest';
import { StatusPill } from '../ui/bits';
import { FavButton } from '../FavButton';
import { useAuth, useToast } from '../Providers';

export function MatchHeader({ m }: { m: MatchDetail }) {
  const now = useNow(1000);
  const { isFav, toggleFav } = useAuth();
  const { toast } = useToast();
  const live = isLive(m);
  const s = scoreOf(m);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${m.home.name} v ${m.away.name}`, url });
      else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', body: 'Match link is on your clipboard.', tone: 'success' }); }
    } catch { /* cancelled */ }
  };
  const following = isFav('match', m.id);
  return (
    <section className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: `radial-gradient(60% 90% at 12% 0%, ${m.home.color}33, transparent 70%), radial-gradient(60% 90% at 88% 0%, ${m.away.color}33, transparent 70%)` }} />
      <div className="relative p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/scores" aria-label="Back to scores" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-3"><ArrowLeft size={18} /></Link>
          <Link href={`/leagues/${m.leagueId}`} className="truncate rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-bold text-muted hover:text-ink">{m.league.short} · {m.round}</Link>
          {m.corrected && <span className="rounded-full bg-warn/15 px-2 py-1 text-[11px] font-bold text-warn">Corrected</span>}
          <span className="ml-auto flex items-center gap-1"><FavButton kind="match" id={m.id} label="match" /></span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
          {([[m.home, 'Home'], [m.away, 'Away']] as const).map(([t, lab], i) => (
            <Link key={t.id} href={`/teams/${t.id}`} className={cn('group flex flex-col items-center gap-2 text-center', i === 1 && 'order-3')}>
              <Crest team={t} size={72} className="transition-transform group-hover:scale-105 sm:!h-24 sm:!w-24" />
              <span className="font-display text-base font-extrabold leading-tight sm:text-xl">{t.name}</span>
              <span className="label-sm">{lab}</span>
            </Link>
          ))}
          <div className="order-2 flex flex-col items-center gap-2">
            {m.status === 'SCHEDULED' ? (
              <>
                <p className="font-display text-4xl font-extrabold text-muted">VS</p>
                <p className="num text-sm font-bold text-primary">in {countdown(m.kickoff, now)}</p>
                <p className="num text-xs text-muted">{timeOf(m.kickoff)}</p>
              </>
            ) : (
              <>
                <StatusPill m={m} className="!text-[13px]" />
                <p className="num font-display text-[44px] font-extrabold leading-none tracking-tight sm:text-6xl">{s.h}<span className="mx-2 text-faint">:</span>{s.a}</p>
                {m.sets && m.sets.length > 0 && <p className="num text-sm font-bold text-muted">{m.sets.map((x) => `${x[0]}-${x[1]}`).join('   ')}</p>}
                {m.tags.filter((t) => t !== 'Featured').slice(0, 2).map((t) => <span key={t} className="rounded-full bg-accent/12 px-2.5 py-0.5 text-[11px] font-bold text-accent">⚡ {t}</span>)}
                {m.resultText && <p className="max-w-[16ch] text-center text-xs font-semibold text-muted">{m.resultText}</p>}
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
          <span className="flex items-center gap-1.5"><MapPin size={14} />{m.venue}</span>
          <span className="flex items-center gap-1.5"><UserRound size={14} />{m.referee}</span>
          <span className="flex items-center gap-1.5"><Users size={14} />{new Intl.NumberFormat().format(m.attendance)}</span>
          <span>{longDate(m.kickoff)} · {timeOf(m.kickoff)}</span>
          {live && m.watch?.hasStream && <span className="flex items-center gap-1.5 font-semibold text-primary"><Eye size={14} />{new Intl.NumberFormat().format(m.watch.viewers)} watching</span>}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button onClick={() => void toggleFav('match', m.id)} className={cn('btn-ghost !px-2 text-[13px]', following && '!border-accent/50 !bg-accent/10 !text-accent')}><Bell size={16} fill={following ? 'currentColor' : 'none'} />{following ? 'Following' : 'Follow'}</button>
          <button onClick={() => void toggleFav('team', m.home.id)} className="btn-ghost !px-2 text-[13px]">{isFav('team', m.home.id) ? '★' : '☆'} {m.home.short}</button>
          <button onClick={share} className="btn-ghost !px-2 text-[13px]"><Share2 size={16} />Share</button>
        </div>
      </div>
    </section>
  );
}
