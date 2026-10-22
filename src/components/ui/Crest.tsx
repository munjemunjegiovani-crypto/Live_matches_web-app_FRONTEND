import type { TeamRef } from '@/lib/engine';

/** Generated crest (original artwork, no real club logos): shield in team colours with the short code. */
export function Crest({ team, size = 40, className = '' }: { team: Pick<TeamRef, 'short' | 'color' | 'color2' | 'name'>; size?: number; className?: string }) {
  const id = `c${team.short}${team.color.replace('#', '')}`;
  const fs = team.short.length > 3 ? size * 0.27 : size * 0.31;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`${team.name} crest`} className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={team.color} />
          <stop offset="1" stopColor={team.color} stopOpacity=".78" />
        </linearGradient>
      </defs>
      <path d="M24 2.5 42 8.5v14.2c0 11-7.4 18.6-18 22.8C13.4 41.3 6 33.700 6 22.700V8.500z" fill={`url(#${id})`} />
      <path d="M24 2.5 42 8.5v6.2H6V8.5z" fill={team.color2} opacity=".22" />
      <path d="M24 2.5 42 8.5v14.2c0 11-7.4 18.6-18 22.8C13.4 41.3 6 33.700 6 22.700V8.500z" fill="none" stroke={team.color2} strokeOpacity=".7" strokeWidth="1.6" />
      <text x="24" y="27.5" textAnchor="middle" fontFamily="Plus Jakarta Sans Variable, sans-serif" fontWeight="800" fontSize={fs * (48 / size)} fill={team.color2} letterSpacing="-.3">{team.short}</text>
    </svg>
  );
}
