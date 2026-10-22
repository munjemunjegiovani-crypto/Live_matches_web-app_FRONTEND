'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Bell, BellRing, Crown, Heart, Sparkles, Trophy, UserRound, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Prefs } from '@/lib/api';
import { cn } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { Empty, SectionTitle, Skeleton, Tabs } from '../ui/bits';
import { Crest } from '../ui/Crest';
import { MatchCard } from '../MatchCard';
import { FavButton } from '../FavButton';
import { useAuth, useToast } from '../Providers';

export const SignInGate = ({ what }: { what: string }) => (
  <div className="mx-auto max-w-xl px-4 py-16"><Empty icon={<UserRound />} title="Sign in to continue" body={`Create a free account to ${what}.`} action={<div className="flex gap-2"><Link href="/login" className="btn-primary">Sign in</Link><Link href="/register" className="btn-ghost">Create account</Link></div>} /></div>
);

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-primary' : 'bg-surface-3')}><span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', on ? 'left-6' : 'left-1')} /></button>;
}

export function Favorites() {
  const { user, ready, setUser } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'teams' | 'leagues'>('teams');
  const favs = useQuery(`favs:${user?.id}`, () => api.favorites(), { enabled: !!user, interval: 5000 });
  const live = useQuery('fav-live', () => api.live(), { enabled: !!user, interval: 3000 });
  const soon = useQuery('fav-soon', () => api.matches({ status: 'upcoming', from: Date.now(), to: Date.now() + 3 * 86400000, order: 'asc', limit: 200 }), { enabled: !!user, interval: 30000 });
  const suggestions = useQuery('fav-sugg', () => api.teams({ league: 'epl' }), { enabled: !!user });
  if (!ready) return <div className="mx-auto max-w-4xl space-y-4 px-4 py-6"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>;
  if (!user) return <SignInGate what="follow teams, leagues and matches and get alerts" />;

  const ids = new Set([...(favs.data?.teams.map((t) => t.id) ?? [])]);
  const lids = new Set(favs.data?.leagues.map((l) => l.id) ?? []);
  const mids = new Set(favs.data?.matches.map((m) => m.id) ?? []);
  const rel = (m: { home: { id: string }; away: { id: string }; leagueId: string; id: string }) => ids.has(m.home.id) || ids.has(m.away.id) || lids.has(m.leagueId) || mids.has(m.id);
  const happening = (live.data ?? []).filter(rel);
  const next = (soon.data?.items ?? []).filter(rel).slice(0, 4);

  const setPref = async (patch: Partial<Prefs>) => {
    try { setUser(await api.updateMe({ prefs: patch })); } catch (e) { toast({ title: 'Could not save', body: (e as Error).message, tone: 'info' }); }
  };
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const total = (favs.data?.teams.length ?? 0) + (favs.data?.leagues.length ?? 0) + (favs.data?.matches.length ?? 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <section className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gradient-to-br from-primary/25 to-accent/25 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-xl font-extrabold text-on-primary ring-4 ring-surface-3">{initials}</span>
          <div className="min-w-0 flex-1"><h1 className="truncate font-display text-xl font-extrabold">{user.name}</h1><p className="truncate text-sm text-muted">{user.email}</p><span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-0.5 text-[11px] font-bold text-accent"><Sparkles size={12} />{user.role === 'admin' ? 'Admin' : 'Free plan'}</span></div>
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-3 text-center">
          {[[favs.data?.teams.length ?? 0, 'Teams'], [favs.data?.leagues.length ?? 0, 'Leagues'], [favs.data?.matches.length ?? 0, 'Matches']].map(([n, l]) => <div key={String(l)} className="rounded-lg bg-surface-2 py-3"><p className="num font-display text-2xl font-extrabold">{n}</p><p className="label-sm">{l}</p></div>)}
        </div>
      </section>

      <SectionTitle className="mt-8" right={happening.length > 0 ? <span className="rounded-full bg-live/12 px-2.5 py-1 text-[11px] font-extrabold text-live">{happening.length} IN PLAY</span> : undefined}>My teams · happening now</SectionTitle>
      {happening.length > 0 ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{happening.map((m) => <MatchCard key={m.id} m={m} showLeague />)}</div>
        : <div className="card px-5 py-6 text-center text-sm text-muted">{total ? 'None of your teams are playing right now.' : 'Follow a team or league to see their live games here.'}</div>}
      {next.length > 0 && <><p className="label-sm mb-2 mt-5">Next up</p><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{next.map((m) => <MatchCard key={m.id} m={m} showLeague />)}</div></>}

      <SectionTitle className="mt-8">Manage favorites</SectionTitle>
      <Tabs tabs={[{ id: 'teams', label: 'Teams', badge: favs.data?.teams.length ?? 0 }, { id: 'leagues', label: 'Leagues', badge: favs.data?.leagues.length ?? 0 }]} value={tab} onChange={setTab} />
      <div className="card mt-3 divide-y divide-line">
        {tab === 'teams' && favs.data?.teams.map((t) => <div key={t.id} className="flex items-center gap-3 px-4 py-3"><Link href={`/teams/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3"><Crest team={t} size={36} /><div className="min-w-0"><p className="truncate font-bold">{t.name}</p><p className="text-xs text-muted">{t.country}</p></div></Link><FavButton kind="team" id={t.id} label="team" /></div>)}
        {tab === 'leagues' && favs.data?.leagues.map((l) => <div key={l.id} className="flex items-center gap-3 px-4 py-3"><Link href={`/leagues/${l.id}`} className="flex min-w-0 flex-1 items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3"><Trophy size={16} /></span><div className="min-w-0"><p className="truncate font-bold">{l.name}</p><p className="text-xs text-muted">{l.country}</p></div></Link><FavButton kind="league" id={l.id} label="league" /></div>)}
        {favs.data && ((tab === 'teams' && !favs.data.teams.length) || (tab === 'leagues' && !favs.data.leagues.length)) && <p className="px-4 py-8 text-center text-sm text-muted">Nothing here yet. Tap the ☆ on any {tab === 'teams' ? 'team' : 'league'}.</p>}
      </div>
      {tab === 'teams' && suggestions.data && (
        <div className="mt-4"><p className="label-sm mb-2">Suggested to follow</p>
          <div className="flex flex-wrap gap-2">{suggestions.data.filter((t) => !ids.has(t.id)).slice(0, 8).map((t) => <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1.5 pr-1 text-[13px] font-semibold"><Crest team={t} size={22} />{t.short}<FavButton kind="team" id={t.id} size={15} label="team" className="!h-7 !w-7" /></span>)}</div></div>
      )}

      <SectionTitle className="mt-8">Alert preferences</SectionTitle>
      <div className="card divide-y divide-line">
        {([['notifyGoals', 'Goals & scores', 'Instant alert whenever a followed team scores', BellRing], ['notifyStart', 'Kick-off', 'When a followed match starts', Bell], ['notifyEnd', 'Full time', 'Final result summary', Heart]] as const).map(([k, t, d, Icon]) => (
          <div key={k} className="flex items-center gap-4 px-4 py-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={18} /></span><div className="min-w-0 flex-1"><p className="font-bold">{t}</p><p className="text-xs text-muted">{d}</p></div><Toggle on={user.prefs[k]} onChange={(v) => void setPref({ [k]: v })} label={t} /></div>
        ))}
      </div>

      <section className="relative mt-8 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-surface to-accent/10 p-5">
        <p className="label-sm text-primary">Scorely Pro · coming soon</p>
        <h3 className="mt-1 flex items-center gap-2 font-display text-lg font-extrabold"><Crown size={18} className="text-warn" />Unlimited alerts, ad-free, deep stats</h3>
        <p className="mt-1 text-sm text-muted">This is a portfolio demo, so there is no billing. The Pro plan shows how a paid tier would look.</p>
        <button className="btn-primary mt-4" onClick={() => toast({ title: 'Thanks for your interest', body: 'Scorely Pro is a design preview in this demo.', tone: 'info' })}>Notify me</button>
      </section>
    </div>
  );
}
