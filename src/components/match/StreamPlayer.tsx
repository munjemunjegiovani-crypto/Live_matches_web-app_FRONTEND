'use client';
import { useEffect, useState } from 'react';
import { Maximize2, Pause, Play, Settings2, Tv, Volume2, VolumeX } from 'lucide-react';
import type { MatchDetail } from '@/lib/engine';
import { cn, countdown, scoreOf } from '@/lib/format';
import { useNow } from '@/hooks/useNow';
import { Crest } from '../ui/Crest';
import { PITCH_BG, PitchLines } from './Viz';

/**
 * Honest streaming: real broadcast video can only be embedded with the rights holder's permission.
 *  - If an official embedUrl exists (admin-provided), it is shown in a sandboxed iframe.
 *  - Otherwise a "demo broadcast" renders the simulated match with a broadcast-style overlay.
 */
export function StreamPlayer({ m }: { m: MatchDetail }) {
  const now = useNow(1000);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);
  useEffect(() => { setStarted(false); setPlaying(true); }, [m.id]);
  const live = m.status === 'LIVE' || m.status === 'HALFTIME';
  const s = scoreOf(m);

  if (m.watch?.embedUrl) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-black">
        <div className="aspect-video"><iframe src={m.watch.embedUrl} title={`${m.home.name} v ${m.away.name} official stream`} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
      </div>
    );
  }

  const ball = m.tracker;
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-black shadow-card">
      <div className="relative aspect-video select-none overflow-hidden" style={{ background: m.sportId === 'football' ? PITCH_BG : `linear-gradient(135deg, ${m.home.color}, #0b1220 55%, ${m.away.color})` }}>
        {m.sportId === 'football' && <svg viewBox="0 0 100 64" className="absolute inset-0 h-full w-full opacity-80" preserveAspectRatio="none" aria-hidden><PitchLines /></svg>}
        {m.sportId !== 'football' && <div className="absolute inset-0 grid place-items-center text-[min(18vw,120px)] opacity-25" aria-hidden>{({ basketball: '🏀', tennis: '🎾', cricket: '🏏', rugby: '🏉', football: '⚽' } as const)[m.sportId]}</div>}
        {live && playing && ball && m.sportId === 'football' && (
          <div className="absolute z-10 h-3 w-3 rounded-full bg-white shadow-[0_0_0_5px_rgb(255_255_255/.2),0_0_22px_8px_rgb(255_255_255/.4)] transition-all duration-[1400ms] ease-in-out" style={{ left: `${ball.x}%`, top: `${ball.y}%`, transform: 'translate(-50%,-50%)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />

        {/* broadcast score bug */}
        <div className="absolute left-3 top-3 z-20 flex items-stretch overflow-hidden rounded-md text-white shadow-lg sm:left-4 sm:top-4">
          <span className="flex items-center gap-1.5 bg-live px-2 text-[10px] font-extrabold tracking-wider sm:text-xs">{live ? <><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-white" />LIVE</> : m.status === 'FINISHED' ? 'REPLAY' : 'SOON'}</span>
          <span className="flex items-center gap-2 bg-black/80 px-2.5 py-1.5 text-[12px] font-extrabold num sm:text-sm">
            <Crest team={m.home} size={18} />{m.home.short}<span className="rounded bg-white/15 px-1.5">{s.h}</span><span className="rounded bg-white/15 px-1.5">{s.a}</span>{m.away.short}<Crest team={m.away} size={18} />
          </span>
          <span className="flex items-center bg-primary px-2 text-[11px] font-bold num sm:text-xs">{m.clock || '—'}</span>
        </div>
        <span className="absolute right-3 top-3 z-20 rounded bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/85 backdrop-blur sm:right-4 sm:top-4">Demo broadcast · simulated</span>

        {!started ? (
          <button onClick={() => { setStarted(true); setPlaying(true); }} className="absolute inset-0 z-30 grid place-items-center bg-black/35 backdrop-blur-[2px]" aria-label="Play demo broadcast">
            <span className="flex flex-col items-center gap-3 text-white">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-black shadow-pop transition-transform hover:scale-105"><Play size={28} fill="currentColor" className="ml-1" /></span>
              <span className="text-sm font-bold">{live ? 'Watch live' : m.status === 'FINISHED' ? 'Watch replay' : `Starts in ${countdown(m.kickoff, now)}`}</span>
            </span>
          </button>
        ) : live && ball && (
          <div className="absolute inset-x-3 bottom-14 z-20 sm:inset-x-4">
            <p className="inline-block max-w-full truncate rounded-md bg-black/75 px-3 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur">{ball.headline}</p>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-1 px-2 pb-2 text-white sm:px-3">
          <button onClick={() => { setStarted(true); setPlaying((p) => !p); }} aria-label={playing ? 'Pause' : 'Play'} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15">{playing && started ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
          <button onClick={() => setMuted((x) => !x)} aria-label={muted ? 'Unmute' : 'Mute'} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15">{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <div className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-white/25"><div className={cn('h-full rounded-full bg-live', live && 'animate-pulse')} style={{ width: live ? '100%' : m.status === 'FINISHED' ? '100%' : '0%' }} /></div>
          <span className="num mr-1 text-xs font-bold">{live ? 'LIVE' : m.status === 'FINISHED' ? 'FT' : '--'}</span>
          <span className="hidden items-center gap-1 rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-bold sm:inline-flex"><Settings2 size={12} />{m.watch?.quality ?? 'HD'}</span>
          <button aria-label="Full screen" onClick={(e) => { (e.currentTarget.closest('.aspect-video') as HTMLElement | null)?.requestFullscreen?.().catch(() => {}); }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"><Maximize2 size={17} /></button>
        </div>
      </div>
      <p className="flex items-start gap-2 bg-surface px-4 py-3 text-xs text-muted"><Tv size={14} className="mt-0.5 shrink-0" />This is a simulated visualisation of a fictional match. Real streams come from the official rights holders listed below.</p>
    </div>
  );
}
