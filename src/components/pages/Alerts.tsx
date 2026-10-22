'use client';
import Link from 'next/link';
import { Bell, CheckCheck, Flag, Sparkles, Trash2, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import type { AppNotification } from '@/lib/api';
import { ago, cn } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { useNow } from '@/hooks/useNow';
import { Empty, Skeleton } from '../ui/bits';
import { useAuth } from '../Providers';
import { SignInGate } from './Favorites';

const ICON = { GOAL: Trophy, KICKOFF: Flag, FULLTIME: CheckCheck, SYSTEM: Sparkles } as const;

export function Alerts() {
  const { user, ready, refreshUnread } = useAuth();
  const now = useNow(30000);
  const { data, loading, refetch } = useQuery(`notes:${user?.id}`, () => api.notifications(), { enabled: !!user, interval: 4000 });
  if (!ready) return <div className="mx-auto max-w-2xl px-4 py-6"><Skeleton className="h-64" /></div>;
  if (!user) return <SignInGate what="receive goal and match alerts" />;
  const after = async (fn: () => Promise<unknown>) => { await fn(); await refetch(); await refreshUnread(); };
  const row = (n: AppNotification) => {
    const Icon = ICON[n.type];
    const inner = (
      <div className={cn('flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2', !n.read && 'bg-primary/5')}>
        <span className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full', n.type === 'GOAL' ? 'bg-accent/15 text-accent' : 'bg-primary/10 text-primary')}><Icon size={18} /></span>
        <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-bold">{n.title}{!n.read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="unread" />}</p><p className="text-sm text-muted">{n.body}</p><p className="mt-0.5 text-xs text-faint">{ago(n.createdAt, now)}</p></div>
        <button aria-label="Delete notification" onClick={(e) => { e.preventDefault(); void after(() => api.removeNotification(n.id)); }} className="grid h-8 w-8 place-items-center rounded-full text-faint hover:bg-surface-3 hover:text-live"><Trash2 size={15} /></button>
      </div>
    );
    return n.matchId ? <Link key={n.id} href={`/match/${n.matchId}`} onClick={() => void after(() => api.markRead(n.id))} className="block">{inner}</Link> : <div key={n.id} onClick={() => void after(() => api.markRead(n.id))}>{inner}</div>;
  };
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Alerts</h1><p className="text-sm text-muted">{data?.unread ? `${data.unread} unread` : 'You are all caught up'}</p></div>
        <button className="btn-ghost !py-2 text-[13px]" disabled={!data?.unread} onClick={() => void after(() => api.markRead())}><CheckCheck size={15} />Mark all read</button></div>
      <div className="card divide-y divide-line overflow-hidden">
        {loading && !data && <Skeleton className="m-4 h-20" />}
        {data?.items.map(row)}
      </div>
      {data && !data.items.length && <Empty icon={<Bell />} title="No alerts yet" body="Follow a team or league and goal alerts will land here in real time." action={<Link href="/leagues" className="btn-primary">Find teams to follow</Link>} />}
    </div>
  );
}
