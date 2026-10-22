'use client';
import { useState } from 'react';
import { Activity, Radio, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { MatchSummary } from '@/lib/engine';
import { ago, cn, scoreOf } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { Empty, Skeleton, Tabs } from '../ui/bits';
import { Crest } from '../ui/Crest';
import { useAuth, useToast } from '../Providers';
import { SignInGate } from './Favorites';

type Tab = 'overview' | 'matches' | 'users' | 'jobs';

function MatchEditor({ m, onDone }: { m: MatchSummary; onDone: () => void }) {
  const { toast } = useToast();
  const [h, setH] = useState(String(m.homeScore));
  const [a, setA] = useState(String(m.awayScore));
  const [status, setStatus] = useState(m.status);
  const [embed, setEmbed] = useState(m.watch?.embedUrl ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.admin.override(m.id, { homeScore: Number(h), awayScore: Number(a), status, embedUrl: embed.trim() ? embed.trim() : null });
      toast({ title: 'Match updated', body: `${m.home.short} v ${m.away.short} saved. Viewers see it immediately.`, tone: 'success' });
      onDone();
    } catch (e) { toast({ title: 'Update failed', body: (e as Error).message, tone: 'info' }); } finally { setBusy(false); }
  };
  const clear = async () => { await api.admin.clearOverride(m.id); toast({ title: 'Override removed', tone: 'success' }); onDone(); };
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-4 sm:grid-cols-4">
      <label className="text-xs font-semibold text-muted">{m.home.short} score<input className="input mt-1" type="number" min={0} value={h} onChange={(e) => setH(e.target.value)} /></label>
      <label className="text-xs font-semibold text-muted">{m.away.short} score<input className="input mt-1" type="number" min={0} value={a} onChange={(e) => setA(e.target.value)} /></label>
      <label className="col-span-2 text-xs font-semibold text-muted">Status<select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>{['SCHEDULED', 'LIVE', 'HALFTIME', 'FINISHED', 'POSTPONED'].map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="col-span-2 text-xs font-semibold text-muted sm:col-span-4">Official stream embed URL (https, optional)<input className="input mt-1" placeholder="https://www.youtube.com/embed/…" value={embed} onChange={(e) => setEmbed(e.target.value)} /></label>
      <div className="col-span-2 flex gap-2 sm:col-span-4"><button className="btn-primary" onClick={() => void save()} disabled={busy}>Save changes</button>{m.corrected && <button className="btn-ghost" onClick={() => void clear()}>Remove override</button>}</div>
    </div>
  );
}

export function Admin() {
  const { user, ready } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const isAdmin = user?.role === 'admin';
  const ov = useQuery('adm-ov', () => api.admin.overview(), { enabled: isAdmin, interval: 5000 });
  const live = useQuery('adm-live', () => api.matches({ status: 'live', limit: 100 }), { enabled: isAdmin && tab === 'matches', interval: 4000 });
  const found = useQuery('adm-find:' + q, () => api.matches({ q, limit: 12, from: Date.now() - 86400000, to: Date.now() + 4 * 86400000, order: 'asc' }), { enabled: isAdmin && tab === 'matches' && q.length > 1 });
  const users = useQuery('adm-users', () => api.admin.users(), { enabled: isAdmin && tab === 'users' });
  const jobs = useQuery('adm-jobs', () => api.admin.jobs(), { enabled: isAdmin && tab === 'jobs', interval: 5000 });
  if (!ready) return <div className="mx-auto max-w-5xl p-6"><Skeleton className="h-64" /></div>;
  if (!user) return <SignInGate what="open the admin console" />;
  if (!isAdmin) return <div className="mx-auto max-w-xl px-4 py-16"><Empty icon={<ShieldCheck />} title="Admins only" body="Your account doesn't have access to this area." /></div>;
  const list = q.length > 1 ? found.data?.items : live.data?.items;
  const o = ov.data;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight md:text-3xl"><ShieldCheck className="text-primary" />Admin console</h1>
      <p className="mt-1 text-sm text-muted">Correct scores, attach official streams, manage users and watch the ingestion jobs.</p>
      <Tabs className="mt-5" tabs={[{ id: 'overview', label: 'Overview' }, { id: 'matches', label: 'Matches' }, { id: 'users', label: 'Users' }, { id: 'jobs', label: 'Jobs' }]} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[[Radio, 'Live matches', o?.liveMatches], [Users, 'Users', o?.users], [Activity, 'Overrides', o?.overrides], [ShieldCheck, 'Admins', o?.admins]].map(([Icon, l, v]) => {
              const I = Icon as typeof Radio;
              return <div key={String(l)} className="card p-4"><I size={18} className="text-primary" /><p className="num mt-3 font-display text-3xl font-extrabold">{v === undefined ? '–' : String(v)}</p><p className="label-sm">{String(l)}</p></div>;
            })}
          </div>
          <div className="card flex flex-wrap items-center gap-4 p-4"><div className="min-w-0 flex-1"><p className="font-bold">Provider sync</p><p className="text-sm text-muted">{api.mode === 'demo' ? 'Demo mode: matches come from the built-in simulator running in your browser.' : 'Connected to the LiveKick API. Trigger an ingestion cycle on the server.'}</p><p className="mt-1 text-xs text-faint">{o?.leagues} leagues · {o?.teams} teams · {api.mode === 'api' ? `${o?.sseClients ?? 0} realtime clients` : 'local data'}</p></div>
            <button className="btn-primary" onClick={async () => { try { const r = await api.admin.sync(); toast({ title: 'Sync complete', body: `${r.live} live, ${r.changes} change(s).`, tone: 'success' }); } catch (e) { toast({ title: 'Sync failed', body: (e as Error).message, tone: 'info' }); } }}><RefreshCw size={16} />Run sync now</button></div>
        </div>
      )}

      {tab === 'matches' && (
        <div className="mt-4">
          <input className="input max-w-md" placeholder="Search a team to correct a match (e.g. Arsenal)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a match" />
          <p className="label-sm mb-2 mt-4">{q.length > 1 ? 'Search results' : 'Live now'}</p>
          <div className="space-y-2">
            {list?.map((m) => (
              <div key={m.id} className="card p-3">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(open === m.id ? null : m.id)}>
                  <Crest team={m.home} size={28} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{m.home.short} <span className="num mx-1 rounded bg-surface-3 px-2 py-0.5">{scoreOf(m).h}-{scoreOf(m).a}</span> {m.away.short}<span className="ml-2 text-xs font-medium text-muted">{m.league.short}</span></span>
                  {m.corrected && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-bold text-warn">corrected</span>}
                  <span className={cn('rounded-md px-2 py-1 text-[11px] font-bold', m.status === 'LIVE' ? 'bg-live/12 text-live' : 'bg-surface-3 text-muted')}>{m.status}</span>
                </button>
                {open === m.id && <MatchEditor m={m} onDone={() => { void live.refetch(); void found.refetch(); }} />}
              </div>
            ))}
            {list && !list.length && <p className="card p-6 text-center text-sm text-muted">No matches found.</p>}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card mt-4 divide-y divide-line overflow-hidden">
          {users.data?.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-extrabold text-on-primary">{u.name[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate font-bold">{u.name}{u.id === user.id && <span className="ml-2 text-xs text-faint">(you)</span>}</p><p className="truncate text-xs text-muted">{u.email} · joined {ago(u.createdAt)}</p></div>
              <select aria-label={`Role for ${u.name}`} disabled={u.id === user.id} value={u.role} onChange={async (e) => { try { await api.admin.setRole(u.id, e.target.value as 'user' | 'admin'); await users.refetch(); toast({ title: 'Role updated', tone: 'success' }); } catch (er) { toast({ title: 'Failed', body: (er as Error).message, tone: 'info' }); } }} className="input !w-28 !py-1.5 text-[13px]"><option value="user">User</option><option value="admin">Admin</option></select></div>
          ))}
          {users.loading && !users.data && <Skeleton className="m-4 h-24" />}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="card mt-4 divide-y divide-line overflow-hidden">
          {jobs.data?.map((j) => <div key={j.id} className="flex items-start gap-3 px-4 py-3"><span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', j.ok ? 'bg-win' : 'bg-live')} /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{j.name} <span className="font-normal text-faint">· {j.durationMs}ms</span></p><p className="truncate text-xs text-muted">{j.message}</p></div><span className="text-xs text-faint">{ago(j.startedAt)}</span></div>)}
          {jobs.data && !jobs.data.length && <p className="p-6 text-center text-sm text-muted">No job runs yet.</p>}
          {jobs.loading && !jobs.data && <Skeleton className="m-4 h-24" />}
        </div>
      )}
    </div>
  );
}
