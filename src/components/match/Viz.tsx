'use client';
import type { CommentaryItem, Highlight, Lineup, MatchDetail, MatchEvent, StatRow, TeamRef, TrackerState } from '@/lib/engine';
import { cn } from '@/lib/format';
import { Crest } from '../ui/Crest';

/* ---------- momentum wave ---------- */
export function Momentum({ data, home, away, live, minutes = 90 }: { data: number[]; home: TeamRef; away: TeamRef; live: boolean; minutes?: number }) {
  const W = 600, H = 120, mid = H / 2;
  const n = Math.max(2, data.length);
  const x = (i: number) => (i / (minutes)) * W;
  const pts = data.map((v, i) => [x(i), mid - v * (mid - 8)] as const);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = pts.length ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${mid} L0,${mid} Z` : '';
  const last = pts[pts.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label="Match momentum chart" preserveAspectRatio="none">
        <defs>
          <clipPath id="up"><rect x="0" y="0" width={W} height={mid} /></clipPath>
          <clipPath id="dn"><rect x="0" y={mid} width={W} height={mid} /></clipPath>
          <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgb(var(--primary))" stopOpacity=".7" /><stop offset="1" stopColor="rgb(var(--primary))" stopOpacity=".05" /></linearGradient>
          <linearGradient id="ga" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="rgb(var(--accent))" stopOpacity=".7" /><stop offset="1" stopColor="rgb(var(--accent))" stopOpacity=".05" /></linearGradient>
        </defs>
        <line x1="0" x2={W} y1={mid} y2={mid} stroke="rgb(var(--line))" strokeDasharray="3 4" />
        <line x1={W / 2} x2={W / 2} y1="4" y2={H - 4} stroke="rgb(var(--line))" strokeDasharray="3 4" />
        {area && <path d={area} fill="url(#gh)" clipPath="url(#up)" />}
        {area && <path d={area} fill="url(#ga)" clipPath="url(#dn)" />}
        {line && <path d={line} fill="none" stroke="rgb(var(--ink))" strokeOpacity=".55" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
        {live && last && <line x1={last[0]} x2={last[0]} y1="4" y2={H - 4} stroke="rgb(var(--live))" strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-faint"><span>0&apos;</span><span>HT 45&apos;</span><span>{live ? `${n - 1}' LIVE` : "90'"}</span></div>
      <div className="mt-2 flex justify-between text-xs font-semibold"><span className="flex items-center gap-1.5 text-primary"><span className="h-2 w-2 rounded-full bg-primary" />{home.short} attacking</span><span className="flex items-center gap-1.5 text-accent">{away.short} attacking<span className="h-2 w-2 rounded-full bg-accent" /></span></div>
    </div>
  );
}

/* ---------- events ---------- */
const ICON: Record<string, string> = { GOAL: '⚽', OWN_GOAL: '⚽', PENALTY: '⚽', YELLOW: '🟨', RED: '🟥', SUB: '🔁', VAR: '📺', TRY: '🏉', CONVERSION: '🥅', PENALTY_KICK: '🥅', SET: '🎾', WICKET: '☝️', BOUNDARY: '💥', RUN: '🏃', PERIOD: '⏱️', KICKOFF: '🏁', FULLTIME: '🏁' };
const BIG = new Set(['GOAL', 'OWN_GOAL', 'PENALTY', 'RED', 'TRY', 'WICKET', 'SET']);

export function Timeline({ events, home, away, limit, emptyText = 'No events yet.' }: { events: MatchEvent[]; home: TeamRef; away: TeamRef; limit?: number; emptyText?: string }) {
  const list = [...events].reverse().slice(0, limit);
  if (!list.length) return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  return (
    <ol className="space-y-2">
      {list.map((e) => {
        const team = e.side === 'home' ? home : e.side === 'away' ? away : null;
        const big = BIG.has(e.type);
        return (
          <li key={e.id} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2.5 animate-rise', big ? 'border-line bg-surface-2' : 'border-transparent bg-surface-2/50', e.type === 'RED' && 'border-live/40 bg-live/8')}>
            <span className={cn('num grid h-10 min-w-10 shrink-0 place-items-center rounded-full px-1 text-[12px] font-extrabold', e.type === 'RED' ? 'bg-live/20 text-live' : 'bg-surface-3 text-ink')}>{e.label}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] font-bold leading-snug"><span aria-hidden>{ICON[e.type] ?? '•'}</span><span className="truncate">{e.title}</span></p>
              <p className="truncate text-[12.5px] text-muted">{e.text}{e.assist ? ` · assist ${e.assist}` : ''}</p>
            </div>
            {team && <Crest team={team} size={24} />}
            {e.score && <span className="num rounded-md bg-surface-3 px-2 py-1 text-xs font-extrabold">{e.score[0]}-{e.score[1]}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- stats ---------- */
const fmt = (r: StatRow, v: number, text?: string) => text ?? (r.format === 'pct' ? `${Math.round(v)}%` : r.format === 'dec' ? v.toFixed(2) : String(Math.round(v)));
export function Stats({ rows, home, away }: { rows: StatRow[]; home: TeamRef; away: TeamRef }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">Stats appear once the match starts.</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-extrabold text-muted"><span className="flex items-center gap-2"><Crest team={home} size={20} />{home.short}</span><span className="flex items-center gap-2">{away.short}<Crest team={away} size={20} /></span></div>
      {rows.map((r) => {
        const tot = r.home + r.away || 1;
        const hp = r.format === 'pct' ? r.home : (r.home / tot) * 100;
        const ap = r.format === 'pct' ? r.away : (r.away / tot) * 100;
        return (
          <div key={r.key}>
            <div className="mb-1.5 flex items-center justify-between text-sm"><b className="num">{fmt(r, r.home, r.homeText)}</b><span className="text-[13px] text-muted">{r.label}</span><b className="num">{fmt(r, r.away, r.awayText)}</b></div>
            <div className="flex h-2 gap-1" role="img" aria-label={`${r.label}: ${home.short} ${fmt(r, r.home, r.homeText)}, ${away.short} ${fmt(r, r.away, r.awayText)}`}>
              <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.min(100, hp)}%` }} /></div>
              <div className="flex flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${Math.min(100, ap)}%` }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- pitch ---------- */
export function PitchLines() {
  return (
    <g fill="none" stroke="rgb(255 255 255 / .55)" strokeWidth=".45">
      <rect x="1" y="1" width="98" height="62" rx=".6" />
      <line x1="50" y1="1" x2="50" y2="63" />
      <circle cx="50" cy="32" r="8" /><circle cx="50" cy="32" r=".6" fill="rgb(255 255 255 / .6)" />
      <rect x="1" y="14" width="15" height="36" /><rect x="1" y="23" width="5" height="18" />
      <rect x="84" y="14" width="15" height="36" /><rect x="94" y="23" width="5" height="18" />
      <path d="M16 26a8 8 0 0 1 0 12" /><path d="M84 26a8 8 0 0 0 0 12" />
    </g>
  );
}
export const PITCH_BG = 'linear-gradient(90deg, #1c6b3c 0 12.5%, #1f7442 12.5% 25%, #1c6b3c 25% 37.5%, #1f7442 37.5% 50%, #1c6b3c 50% 62.5%, #1f7442 62.5% 75%, #1c6b3c 75% 87.5%, #1f7442 87.5% 100%)';

export function Pitch({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-line', className)} style={{ background: PITCH_BG, aspectRatio: '100 / 64' }}>
      <svg viewBox="0 0 100 64" className="absolute inset-0 h-full w-full" aria-hidden><PitchLines /></svg>
      {children}
    </div>
  );
}

export function Tracker({ t, home, away, live }: { t?: TrackerState; home: TeamRef; away: TeamRef; live: boolean }) {
  if (!t || !live) return <Pitch className="mx-auto max-w-2xl"><div className="absolute inset-0 grid place-items-center px-4 text-center text-sm font-semibold text-white/80">{live ? '' : 'Live tracker is available while the match is in play'}</div></Pitch>;
  const side = t.attacking === 'home' ? home : t.attacking === 'away' ? away : null;
  return (
    <div className="mx-auto max-w-2xl">
      <Pitch>
        <div className="absolute z-10 h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_0_4px_rgb(255_255_255/.25),0_0_18px_6px_rgb(255_255_255/.45)] transition-all duration-[1400ms] ease-in-out" style={{ left: `${t.x}%`, top: `${(t.y / 100) * 100}%`, transform: 'translate(-50%,-50%)' }} />
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/5 to-transparent" style={{ opacity: t.attacking === 'away' ? t.pressure / 100 : 0 }} />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/5 to-transparent" style={{ opacity: t.attacking === 'home' ? t.pressure / 100 : 0 }} />
      </Pitch>
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
        {side ? <Crest team={side} size={26} /> : <span className="grid h-6 w-6 place-items-center">⚖️</span>}
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{t.headline}</p>{!t.headline.includes(t.zone) && <p className="text-xs text-muted">{t.zone}</p>}</div>
        <div className="w-24"><div className="h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-live transition-all duration-700" style={{ width: `${t.pressure}%` }} /></div><p className="mt-1 text-right text-[10px] font-bold uppercase tracking-wider text-faint">Pressure</p></div>
      </div>
    </div>
  );
}

export function Lineups({ lineups, home, away }: { lineups: NonNullable<MatchDetail['lineups']>; home: TeamRef; away: TeamRef }) {
  const dot = (p: Lineup['starters'][number], t: TeamRef, flip: boolean) => {
    const x = flip ? 100 - p.x : p.x;
    return (
      <div key={`${t.id}${p.id}`} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x}%`, top: `${(p.y / 100) * 100}%` }}>
        <span className="grid h-6 w-6 place-items-center rounded-full border-2 text-[10px] font-extrabold shadow sm:h-7 sm:w-7 sm:text-[11px]" style={{ background: t.color, color: t.color2, borderColor: t.color2 }}>{p.number}</span>
        <span className="mt-0.5 hidden max-w-16 truncate text-[9.5px] font-semibold text-white drop-shadow sm:block">{p.name.split(' ').slice(-1)[0]}</span>
      </div>
    );
  };
  const hx = lineups.home.starters.map((p) => ({ ...p, x: Math.min(46, p.x * 0.5) }));
  const ax = lineups.away.starters.map((p) => ({ ...p, x: Math.min(46, p.x * 0.5) }));
  return (
    <div className="space-y-5">
      <div className="flex justify-between text-sm font-extrabold"><span className="flex items-center gap-2"><Crest team={home} size={22} />{home.short} <span className="font-semibold text-muted">{lineups.home.formation}</span></span><span className="flex items-center gap-2"><span className="font-semibold text-muted">{lineups.away.formation}</span> {away.short}<Crest team={away} size={22} /></span></div>
      <Pitch>{hx.map((p) => dot(p, home, false))}{ax.map((p) => dot(p, away, true))}</Pitch>
      <div className="grid gap-4 sm:grid-cols-2">
        {([[lineups.home, home], [lineups.away, away]] as const).map(([l, t]) => (
          <div key={t.id} className="card-flat p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-extrabold"><Crest team={t} size={20} />{t.name}</p>
            <p className="label-sm mb-1">Starting XI · {l.coach}</p>
            <ul className="space-y-1 text-sm">{l.starters.map((p) => <li key={p.id} className="flex gap-2"><span className="num w-6 text-right font-bold text-faint">{p.number}</span><span className="flex-1 truncate">{p.name}</span><span className="text-xs text-faint">{p.position}</span></li>)}</ul>
            <p className="label-sm mb-1 mt-3">Bench</p>
            <ul className="space-y-1 text-sm text-muted">{l.bench.map((p) => <li key={p.id} className="flex gap-2"><span className="num w-6 text-right font-bold text-faint">{p.number}</span><span className="flex-1 truncate">{p.name}</span><span className="text-xs text-faint">{p.position}</span></li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Commentary({ items }: { items: CommentaryItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-3">
      {[...items].reverse().slice(0, 25).map((c) => (
        <li key={c.id} className="flex gap-3">
          <span className="num mt-0.5 w-10 shrink-0 text-right text-[12px] font-extrabold text-primary">{c.label}</span>
          <div className="border-l-2 border-line pl-3"><p className="text-[13.5px] font-bold">{c.title}</p><p className="text-[13px] text-muted">{c.text}</p></div>
        </li>
      ))}
    </ul>
  );
}

export function Highlights({ items, home, away }: { items: Highlight[]; home: TeamRef; away: TeamRef }) {
  if (!items.length) return <p className="py-4 text-center text-sm text-muted">Highlights are added as the match unfolds.</p>;
  const kindIcon = { goal: '⚽', card: '🟥', save: '🧤', moment: '✨' } as const;
  return (
    <div className="hide-scroll -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {[...items].reverse().map((h) => (
        <div key={h.id} className="w-56 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
          <div className="relative grid aspect-video place-items-center" style={{ background: `linear-gradient(135deg, ${home.color}, ${away.color})` }}>
            <span className="text-3xl drop-shadow">{kindIcon[h.kind]}</span>
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white num">0:{String(h.durationSec).padStart(2, '0')}</span>
            <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white num">{h.minute}&apos;</span>
          </div>
          <div className="p-2.5"><p className="truncate text-[13px] font-bold">{h.title}</p><p className="truncate text-xs text-muted">{h.subtitle}</p></div>
        </div>
      ))}
    </div>
  );
}
