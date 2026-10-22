'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Activity, BarChart3, Clock, MonitorPlay, Radio, Swords, Tv, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { MatchDetail, MatchSummary, TeamRef } from '@/lib/engine';
import { cn, isLive } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { Empty, Skeleton, Tabs, WinProb } from '../ui/bits';
import { Crest } from '../ui/Crest';
import { MatchCard } from '../MatchCard';
import { MatchHeader } from './Header';
import { StreamPlayer } from './StreamPlayer';
import { Commentary, Highlights, Lineups, Momentum, Stats, Timeline, Tracker } from './Viz';

type Tab = 'overview' | 'timeline' | 'stats' | 'lineups' | 'h2h' | 'watch';

const Panel = ({ icon, title, right, children, className = '' }: { icon?: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={cn('card min-w-0 p-4 sm:p-5', className)}>
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-display text-[17px] font-extrabold"><span className="text-primary">{icon}</span>{title}</h2>{right}</div>
    {children}
  </section>
);

function SetsTable({ m }: { m: MatchDetail }) {
  if (!m.sets?.length) return null;
  return (
    <Panel icon={<Activity size={18} />} title="Set by set">
      <table className="w-full text-sm num"><thead><tr className="text-left text-xs text-faint"><th className="pb-2 font-semibold">Player</th>{m.sets.map((_, i) => <th key={i} className="pb-2 text-center font-semibold">Set {i + 1}</th>)}</tr></thead>
        <tbody>{([[m.home, 0], [m.away, 1]] as [TeamRef, 0 | 1][]).map(([t, k]) => (
          <tr key={t.id} className="border-t border-line"><td className="py-2.5"><span className="flex items-center gap-2 font-bold"><Crest team={t} size={22} />{t.name}</span></td>
            {m.sets!.map((s, i) => <td key={i} className={cn('py-2.5 text-center text-base font-bold', s[k] > s[1 - k] ? 'text-ink' : 'text-faint')}>{s[k]}</td>)}</tr>))}</tbody></table>
    </Panel>
  );
}

function InningsTable({ m }: { m: MatchDetail }) {
  if (!m.innings?.length) return null;
  return (
    <Panel icon={<Activity size={18} />} title="Scorecard" right={m.resultText ? <span className="text-xs font-bold text-accent">{m.resultText}</span> : undefined}>
      <div className="space-y-2">{m.innings.map((i, k) => {
        const t = i.team === 'home' ? m.home : m.away;
        return <div key={k} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-3"><Crest team={t} size={30} /><div className="flex-1"><p className="font-bold">{t.name}</p><p className="text-xs text-muted">Innings {k + 1} · {i.overs} overs</p></div><p className="num font-display text-2xl font-extrabold">{i.runs}/{i.wickets}</p></div>;
      })}</div>
    </Panel>
  );
}

function H2H({ home, away }: { home: TeamRef; away: TeamRef }) {
  const { data, loading } = useQuery(`h2h:${home.id}:${away.id}`, () => api.h2h(home.id, away.id));
  if (loading && !data) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="py-6 text-center text-sm text-muted">No head-to-head data.</p>;
  const total = data.winsA + data.winsB + data.draws || 1;
  const a = data.teamA.id === home.id;
  const hw = a ? data.winsA : data.winsB, aw = a ? data.winsB : data.winsA;
  const hg = a ? data.goalsA : data.goalsB, ag = a ? data.goalsB : data.goalsA;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 text-center">
        <div><p className="num font-display text-4xl font-extrabold text-primary">{hw}</p><p className="text-xs font-semibold text-muted">{home.short} wins</p></div>
        <div><p className="num font-display text-4xl font-extrabold text-faint">{data.draws}</p><p className="text-xs font-semibold text-muted">Draws</p></div>
        <div><p className="num font-display text-4xl font-extrabold text-accent">{aw}</p><p className="text-xs font-semibold text-muted">{away.short} wins</p></div>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3"><div className="bg-primary" style={{ width: `${(hw / total) * 100}%` }} /><div className="bg-faint/40" style={{ width: `${(data.draws / total) * 100}%` }} /><div className="bg-accent" style={{ width: `${(aw / total) * 100}%` }} /></div>
      <p className="text-center text-xs text-muted">Aggregate score {hg} - {ag} across {data.matches.length} recent meetings</p>
      <div className="space-y-2">{data.matches.slice(0, 6).map((x: MatchSummary) => <MatchCard key={x.id} m={x} />)}</div>
    </div>
  );
}

function WhereToWatch({ m }: { m: MatchDetail }) {
  if (!m.watch) return <p className="text-sm text-muted">No broadcast information for this match.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {m.watch.broadcasters.map((b) => (
        <li key={b.name + b.region} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-3 text-primary"><Tv size={18} /></span><div className="flex-1"><p className="text-sm font-bold">{b.name}</p><p className="text-xs text-muted">{b.region}</p></div><span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">{m.watch!.quality}</span></li>
      ))}
    </ul>
  );
}

export function MatchPage({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>('overview');
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab') as Tab | null; if (t) setTab(t); }, []);
  const pick = (t: Tab) => { setTab(t); const u = new URL(window.location.href); u.searchParams.set('tab', t); window.history.replaceState(null, '', u); };
  const { data: m, error, loading } = useQuery(`match:${id}`, () => api.match(id), { interval: api.mode === 'demo' ? 2000 : 4000 });

  if (loading && !m) return <div className="mx-auto max-w-5xl space-y-4 px-4 py-5 md:px-6"><Skeleton className="h-72 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !m) return <div className="mx-auto max-w-xl px-4 py-16"><Empty icon="🔍" title="Match not found" body="This match doesn't exist or the link is out of date." action={<Link href="/scores" className="btn-primary">Back to live scores</Link>} /></div>;

  const live = isLive(m);
  const football = m.sportId === 'football';
  const tabs: { id: Tab; label: string; badge?: string | number }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'timeline', label: 'Timeline', badge: m.events.filter((e) => e.type !== 'PERIOD' && e.type !== 'KICKOFF').length || undefined },
    { id: 'stats', label: 'Stats' }, ...(football ? [{ id: 'lineups' as Tab, label: 'Lineups' }] : []), { id: 'h2h', label: 'Head to head' },
    { id: 'watch', label: m.watch?.hasStream ? '● Watch' : 'Watch' },
  ];
  const key = m.events.filter((e) => !['PERIOD', 'KICKOFF', 'FULLTIME'].includes(e.type));

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 pb-6 pt-5 md:px-6">
      <MatchHeader m={m} />
      <Tabs tabs={tabs} value={tab} onChange={pick} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {m.winProb && m.status !== 'POSTPONED' && <Panel icon={<Activity size={18} />} title={m.status === 'FINISHED' ? 'Final probability' : 'Win probability'} className="lg:col-span-2"><WinProb m={m} /></Panel>}
          {m.sportId === 'tennis' && <SetsTable m={m} />}
          {m.sportId === 'cricket' && <InningsTable m={m} />}
          {football && m.momentum && m.momentum.length > 1 && <Panel icon={<Activity size={18} />} title="Match momentum" right={live ? <span className="text-[11px] font-bold text-live">LIVE PRESSURE WAVE</span> : undefined} className="lg:col-span-2"><Momentum data={m.momentum} home={m.home} away={m.away} live={live} /></Panel>}
          <Panel icon={<Clock size={18} />} title="Key incidents" right={<span className="rounded-full bg-accent/12 px-2.5 py-0.5 text-[11px] font-bold text-accent">{key.length} {key.length === 1 ? 'event' : 'events'}</span>}>
            <Timeline events={key} home={m.home} away={m.away} limit={6} emptyText={m.status === 'SCHEDULED' ? 'Events will appear here once the match kicks off.' : 'No key incidents yet.'} />
            {key.length > 6 && <button onClick={() => pick('timeline')} className="btn-ghost mt-3 w-full !py-2 text-[13px]">Full timeline</button>}
          </Panel>
          <Panel icon={<BarChart3 size={18} />} title="Match statistics"><Stats rows={m.stats.slice(0, 6)} home={m.home} away={m.away} />{m.stats.length > 6 && <button onClick={() => pick('stats')} className="btn-ghost mt-4 w-full !py-2 text-[13px]">All statistics</button>}</Panel>
          {football && live && <Panel icon={<Radio size={18} />} title="Live tracker" className="lg:col-span-2"><Tracker t={m.tracker} home={m.home} away={m.away} live={live} /></Panel>}
          {m.watch?.hasStream && <Panel icon={<MonitorPlay size={18} />} title="Where to watch" className="lg:col-span-2"><WhereToWatch m={m} /><button onClick={() => pick('watch')} className="btn-primary mt-4 w-full"><MonitorPlay size={16} />{live ? 'Watch live' : 'Open watch centre'}</button></Panel>}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Panel icon={<Clock size={18} />} title="Match timeline" className={football ? 'lg:col-span-3' : 'lg:col-span-5'}><Timeline events={m.events} home={m.home} away={m.away} emptyText="No events yet." /></Panel>
          {football && <Panel icon={<Radio size={18} />} title="Live commentary" className="lg:col-span-2">{m.commentary?.length ? <Commentary items={m.commentary} /> : <p className="py-6 text-center text-sm text-muted">Commentary starts at kick-off.</p>}</Panel>}
        </div>
      )}

      {tab === 'stats' && <Panel icon={<BarChart3 size={18} />} title="Match statistics"><Stats rows={m.stats} home={m.home} away={m.away} /></Panel>}
      {tab === 'lineups' && m.lineups && <Panel icon={<Users size={18} />} title="Tactical setup"><Lineups lineups={m.lineups} home={m.home} away={m.away} /></Panel>}
      {tab === 'h2h' && <Panel icon={<Swords size={18} />} title="Head to head"><H2H home={m.home} away={m.away} /></Panel>}

      {tab === 'watch' && (
        <div className="space-y-4">
          <StreamPlayer m={m} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel icon={<Tv size={18} />} title="Where to watch"><WhereToWatch m={m} /></Panel>
            {football ? <Panel icon={<Radio size={18} />} title="Live tracker"><Tracker t={m.tracker} home={m.home} away={m.away} live={live} /></Panel> : <Panel icon={<Clock size={18} />} title="Latest"><Timeline events={m.events} home={m.home} away={m.away} limit={5} emptyText="Nothing yet." /></Panel>}
          </div>
          {football && <Panel icon={<MonitorPlay size={18} />} title="Highlights">{<Highlights items={m.highlights ?? []} home={m.home} away={m.away} />}</Panel>}
        </div>
      )}
    </div>
  );
}
