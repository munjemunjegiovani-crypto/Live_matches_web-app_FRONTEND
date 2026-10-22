'use client';
import Link from 'next/link';
import type { League, RankingRow, StandingRow } from '@/lib/engine';
import { cn } from '@/lib/format';
import { Crest } from './ui/Crest';
import { FavButton } from './FavButton';

const zoneColor = { primary: 'bg-primary', secondary: 'bg-accent', warn: 'bg-warn', live: 'bg-live' } as const;
const Form = ({ f }: { f: ('W' | 'D' | 'L')[] }) => (
  <span className="flex gap-1">{f.slice(-5).map((r, i) => <span key={i} className={cn('grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] font-extrabold text-white', r === 'W' ? 'bg-win' : r === 'D' ? 'bg-faint' : 'bg-live')}>{r}</span>)}</span>
);

export function StandingsTable({ league, rows, limit }: { league: League; rows: StandingRow[]; limit?: number }) {
  const list = limit ? rows.slice(0, limit) : rows;
  const usesDraw = league.sportId === 'football' || league.sportId === 'rugby' || league.sportId === 'cricket';
  const zone = (pos: number) => league.zones.find((z) => pos >= z.from && pos <= z.to);
  const label = league.sportId === 'basketball' ? ['W', 'L'] : ['W', 'L'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm num">
        <thead>
          <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-faint">
            <th className="w-10 py-2 pl-3">#</th><th className="py-2">Club</th><th className="px-2 py-2 text-center">P</th><th className="px-2 py-2 text-center">{label[0]}</th>
            {usesDraw && league.sportId !== 'cricket' && <th className="px-2 py-2 text-center">D</th>}<th className="px-2 py-2 text-center">{label[1]}</th>
            {league.sportId === 'football' && <><th className="hidden px-2 py-2 text-center sm:table-cell">GF</th><th className="hidden px-2 py-2 text-center sm:table-cell">GA</th></>}
            <th className="px-2 py-2 text-center">{league.sportId === 'football' || league.sportId === 'rugby' || league.sportId === 'cricket' ? 'GD' : 'Diff'}</th>
            <th className="px-2 py-2 text-center">Pts</th><th className="hidden py-2 pr-3 md:table-cell">Form</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const z = zone(r.position);
            return (
              <tr key={r.team.id} className="border-t border-line transition-colors hover:bg-surface-2">
                <td className="relative py-2.5 pl-3 font-bold">{z && <span className={cn('absolute inset-y-1 left-0 w-1 rounded-r', zoneColor[z.color])} title={z.label} />}{r.position}</td>
                <td className="py-2.5"><Link href={`/teams/${r.team.id}`} className="flex items-center gap-2.5 font-bold hover:text-primary"><Crest team={r.team} size={26} /><span className="truncate">{r.team.name}</span></Link></td>
                <td className="px-2 text-center text-muted">{r.played}</td><td className="px-2 text-center">{r.won}</td>
                {usesDraw && league.sportId !== 'cricket' && <td className="px-2 text-center text-muted">{r.drawn}</td>}<td className="px-2 text-center">{r.lost}</td>
                {league.sportId === 'football' && <><td className="hidden px-2 text-center text-muted sm:table-cell">{r.goalsFor}</td><td className="hidden px-2 text-center text-muted sm:table-cell">{r.goalsAgainst}</td></>}
                <td className={cn('px-2 text-center', r.goalDiff > 0 ? 'text-win' : r.goalDiff < 0 ? 'text-live' : 'text-muted')}>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                <td className="px-2 text-center font-display text-[15px] font-extrabold">{r.points}</td>
                <td className="hidden py-2.5 pr-3 md:table-cell"><Form f={r.form} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {league.zones.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-3 py-3 text-[11.5px] text-muted">{league.zones.map((z) => <span key={z.label} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-sm', zoneColor[z.color])} />{z.label}</span>)}</div>
      )}
    </div>
  );
}

export function RankingsTable({ rows }: { rows: RankingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm num">
        <thead><tr className="text-left text-[11px] font-bold uppercase tracking-wider text-faint"><th className="w-12 py-2 pl-3">Rank</th><th className="py-2">Player</th><th className="px-2 py-2 text-right">Points</th><th className="hidden py-2 pr-3 pl-6 sm:table-cell">Form</th><th className="w-10" /></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.team.id} className="border-t border-line hover:bg-surface-2"><td className="py-2.5 pl-3 font-bold">{r.rank}</td>
            <td className="py-2.5"><Link href={`/teams/${r.team.id}`} className="flex items-center gap-2.5 font-bold hover:text-primary"><Crest team={r.team} size={26} />{r.team.name}</Link></td>
            <td className="px-2 text-right font-display font-extrabold">{r.points.toLocaleString()}</td><td className="hidden py-2.5 pr-3 pl-6 sm:table-cell"><Form f={r.form} /></td><td><FavButton kind="team" id={r.team.id} size={16} label="player" /></td></tr>))}</tbody>
      </table>
    </div>
  );
}
