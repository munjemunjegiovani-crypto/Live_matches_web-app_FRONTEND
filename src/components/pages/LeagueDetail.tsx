'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { DAY_MS, SPORT_EMOJI, startOfDay } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { Empty, Skeleton, Tabs } from '../ui/bits';
import { Crest } from '../ui/Crest';
import { MatchCard } from '../MatchCard';
import { FavButton } from '../FavButton';
import { RankingsTable, StandingsTable } from '../Standings';

type Tab = 'table' | 'fixtures' | 'results' | 'scorers';

export function LeagueDetail({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>('table');
  const st = useQuery(`standings:${id}`, () => api.standings(id), { interval: 15000 });
  const today = startOfDay(Date.now());
  const fx = useQuery(`fx:${id}`, () => api.matches({ league: id, from: Date.now() - 3 * 3600_000, to: today + 8 * DAY_MS, order: 'asc', limit: 24 }), { enabled: tab === 'fixtures', interval: 10000 });
  const rs = useQuery(`rs:${id}`, () => api.history({ league: id, order: 'desc', limit: 24 }), { enabled: tab === 'results' });
  const sc = useQuery(`sc:${id}`, () => api.scorers(id), { enabled: tab === 'scorers' });
  if (st.error) return <div className="mx-auto max-w-xl px-4 py-16"><Empty icon="🏆" title="League not found" action={<Link href="/leagues" className="btn-primary">All leagues</Link>} /></div>;
  const league = st.data?.league;
  const football = league?.sportId === 'football';
  const tabs: { id: Tab; label: string }[] = [{ id: 'table', label: league?.kind === 'ranking' ? 'Rankings' : 'Table' }, { id: 'fixtures', label: 'Fixtures' }, { id: 'results', label: 'Results' }, ...(football ? [{ id: 'scorers' as Tab, label: 'Top scorers' }] : [])];
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <Link href="/leagues" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} />All leagues</Link>
      {!league ? <Skeleton className="h-24 w-full" /> : (
        <div className="card flex items-center gap-4 p-4 sm:p-5">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-3xl">{SPORT_EMOJI[league.sportId]}</span>
          <div className="min-w-0 flex-1"><h1 className="truncate font-display text-xl font-extrabold sm:text-2xl">{league.name}</h1><p className="text-sm text-muted">{league.country} · {league.season} · {league.round}</p><p className="mt-1 hidden text-xs text-faint sm:block">{league.description}</p></div>
          <FavButton kind="league" id={id} label="league" size={22} />
        </div>
      )}
      <Tabs className="mt-5" tabs={tabs} value={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === 'table' && <div className="card overflow-hidden">{!st.data ? <Skeleton className="h-96" /> : st.data.kind === 'ranking' ? <RankingsTable rows={st.data.rankings} /> : <StandingsTable league={st.data.league} rows={st.data.rows} />}</div>}
        {tab === 'fixtures' && <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{fx.data?.items.map((m) => <MatchCard key={m.id} m={m} />)}{fx.loading && !fx.data && <Skeleton className="h-32" />}{fx.data && !fx.data.items.length && <Empty icon="📅" title="No fixtures" body="Nothing scheduled in the next week." />}</div>}
        {tab === 'results' && <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{rs.data?.items.map((m) => <MatchCard key={m.id} m={m} />)}{rs.loading && !rs.data && <Skeleton className="h-32" />}</div>}
        {tab === 'scorers' && (
          <div className="card divide-y divide-line">{sc.data?.map((s) => (
            <Link key={s.player + s.team.id} href={`/teams/${s.team.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"><span className="num w-6 text-center font-bold text-faint">{s.rank}</span><Crest team={s.team} size={32} /><div className="min-w-0 flex-1"><p className="truncate font-bold">{s.player}</p><p className="text-xs text-muted">{s.team.name} · {s.games} games</p></div><div className="text-right"><p className="num font-display text-2xl font-extrabold leading-none">{s.goals}</p><p className="text-[10px] font-bold uppercase text-faint">goals · {s.assists} ast</p></div></Link>
          ))}{sc.loading && !sc.data && <Skeleton className="h-64" />}{sc.data && !sc.data.length && <p className="p-6 text-center text-sm text-muted">No scorers yet.</p>}</div>
        )}
      </div>
    </div>
  );
}
