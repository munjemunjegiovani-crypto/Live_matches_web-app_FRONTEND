'use client';
import Link from 'next/link';
import { ArrowLeft, Building2, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery } from '@/hooks/useQuery';
import { Empty, SectionTitle, Skeleton } from '../ui/bits';
import { Crest } from '../ui/Crest';
import { MatchCard } from '../MatchCard';
import { FavButton } from '../FavButton';
import { cn } from '@/lib/format';

export function TeamPage({ id }: { id: string }) {
  const { data, error, loading } = useQuery(`team:${id}`, () => api.team(id), { interval: 10000 });
  if (loading && !data) return <div className="mx-auto max-w-5xl space-y-4 px-4 py-6"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>;
  if (error || !data) return <div className="mx-auto max-w-xl px-4 py-16"><Empty icon="🛡️" title="Team not found" action={<Link href="/leagues" className="btn-primary">Browse leagues</Link>} /></div>;
  const { team: t, summary: s } = data;
  const player = t.sportId === 'tennis';
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <Link href="/leagues" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} />Back</Link>
      <section className="card relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: `radial-gradient(60% 120% at 0% 0%, ${t.color}40, transparent 70%)` }} />
        <div className="relative flex flex-wrap items-center gap-5">
          <Crest team={t} size={96} />
          <div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-extrabold sm:text-3xl">{t.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">{t.country && <span className="flex items-center gap-1.5"><MapPin size={14} />{t.country}</span>}{!player && <span className="flex items-center gap-1.5"><Building2 size={14} />{t.stadium}</span>}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">{data.leagues.map((l) => <Link key={l.id} href={`/leagues/${l.id}`} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-bold text-muted hover:text-ink">{l.name}</Link>)}
              {data.position && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">#{data.position.position} · {data.position.points} pts</span>}</div></div>
          <FavButton kind="team" id={t.id} size={26} label="team" className="!h-12 !w-12 border border-line" />
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[['Played', s.played], ['Won', s.won], ['Drawn', s.drawn], ['Lost', s.lost], [player ? 'Sets' : 'Goals', `${s.goalsFor}-${s.goalsAgainst}`]].map(([k, v]) => <div key={String(k)} className="rounded-lg bg-surface-2 px-4 py-3"><p className="label-sm">{k}</p><p className="num font-display text-2xl font-extrabold">{v}</p></div>)}
        </div>
        {data.form.length > 0 && <div className="relative mt-4 flex items-center gap-2"><span className="label-sm">Form</span>{data.form.map((r, i) => <span key={i} className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold text-white', r === 'W' ? 'bg-win' : r === 'D' ? 'bg-faint' : 'bg-live')}>{r}</span>)}</div>}
      </section>
      {data.next.length > 0 && <><SectionTitle className="mt-8">Next matches</SectionTitle><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{data.next.map((m) => <MatchCard key={m.id} m={m} />)}</div></>}
      {data.results.length > 0 && <><SectionTitle className="mt-8">Recent results</SectionTitle><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{data.results.map((m) => <MatchCard key={m.id} m={m} />)}</div></>}
      {data.squad.length > 0 && <><SectionTitle className="mt-8">Squad</SectionTitle>
        <div className="card grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">{data.squad.map((p) => <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 sm:border-b sm:border-line"><span className="num grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-xs font-extrabold">{p.number}</span><span className="flex-1 truncate text-sm font-semibold">{p.name}</span><span className="rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-bold text-muted">{p.position}</span></div>)}</div></>}
    </div>
  );
}
