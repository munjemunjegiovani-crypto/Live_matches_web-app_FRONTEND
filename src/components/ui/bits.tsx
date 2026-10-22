import type { ReactNode } from 'react';
import type { MatchSummary } from '@/lib/engine';
import { cn } from '@/lib/format';

export const LiveDot = ({ className = '' }: { className?: string }) => (
  <span className={cn('inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live', className)} aria-hidden />
);

export function StatusPill({ m, className = '' }: { m: Pick<MatchSummary, 'status' | 'clock' | 'period'>; className?: string }) {
  if (m.status === 'LIVE') return <span className={cn('inline-flex items-center gap-1.5 rounded-md bg-live/12 px-2 py-1 text-[12px] font-bold text-live num', className)}><LiveDot />{m.clock}</span>;
  if (m.status === 'HALFTIME') return <span className={cn('inline-flex items-center gap-1.5 rounded-md bg-warn/15 px-2 py-1 text-[12px] font-bold text-warn', className)}>HT</span>;
  if (m.status === 'FINISHED') return <span className={cn('inline-flex rounded-md bg-surface-3 px-2 py-1 text-[12px] font-bold text-muted', className)}>FT</span>;
  if (m.status === 'POSTPONED') return <span className={cn('inline-flex rounded-md bg-warn/15 px-2 py-1 text-[12px] font-bold text-warn', className)}>Postponed</span>;
  return null;
}

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={cn('skeleton', className)} />;

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && <div className="grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-2xl text-muted">{icon}</div>}
      <h3 className="text-lg font-bold">{title}</h3>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function SectionTitle({ children, right, className = '' }: { children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-lg font-extrabold tracking-tight">{children}</h2>
      {right}
    </div>
  );
}

export function WinProb({ m, compactMode = false }: { m: Pick<MatchSummary, 'winProb' | 'home' | 'away' | 'sportId'>; compactMode?: boolean }) {
  if (!m.winProb) return null;
  const { home, draw, away } = m.winProb;
  return (
    <div className="flex items-center gap-3">
      <span className="label-sm shrink-0">Win %</span>
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${m.home.short} ${home}%, draw ${draw}%, ${m.away.short} ${away}%`}>
        <div className="h-full transition-all duration-700" style={{ width: `${home}%`, background: 'rgb(var(--primary))' }} />
        {draw > 0 && <div className="h-full bg-faint/50 transition-all duration-700" style={{ width: `${draw}%` }} />}
        <div className="h-full transition-all duration-700" style={{ width: `${away}%`, background: 'rgb(var(--accent))' }} />
      </div>
      {!compactMode && <span className="num shrink-0 text-xs font-bold text-muted">{home}% · {away}%</span>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className = '' }: { tabs: { id: T; label: string; badge?: string | number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('hide-scroll -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0', className)}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cn('chip', value === t.id && 'chip-on')}>
          {t.label}
          {t.badge !== undefined && <span className={cn('num rounded-full px-1.5 text-[11px]', value === t.id ? 'bg-white/20' : 'bg-surface-3')}>{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}
