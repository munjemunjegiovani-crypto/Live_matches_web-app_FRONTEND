'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Bell, CheckCircle2, Info, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { AppNotification, AppUser, FavKind } from '@/lib/api';
import { cn } from '@/lib/format';

/* ---------- toasts ---------- */
interface Toast { id: number; title: string; body?: string; tone: 'info' | 'success' | 'goal'; href?: string }
const ToastCtx = createContext<{ toast: (t: Omit<Toast, 'id'>) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

/* ---------- auth + favourites ---------- */
interface AuthState {
  user: AppUser | null;
  ready: boolean;
  unread: number;
  favs: { kind: FavKind; refId: string }[];
  login(e: string, p: string): Promise<AppUser>;
  register(n: string, e: string, p: string): Promise<AppUser>;
  logout(): void;
  refresh(): Promise<void>;
  refreshUnread(): Promise<void>;
  isFav(kind: FavKind, id: string): boolean;
  toggleFav(kind: FavKind, id: string): Promise<boolean>;
  setUser(u: AppUser): void;
}
const AuthCtx = createContext<AuthState | null>(null);
export const useAuth = () => { const c = useContext(AuthCtx); if (!c) throw new Error('AuthProvider missing'); return c; };

function Inner({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [unread, setUnread] = useState(0);
  const [favs, setFavs] = useState<{ kind: FavKind; refId: string }[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const { setTheme } = useTheme();

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq.current;
    setToasts((x) => [...x.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 5500);
  }, []);

  const loadUserData = useCallback(async (u: AppUser | null) => {
    if (!u) { setFavs([]); setUnread(0); return; }
    const [f, n] = await Promise.all([api.favoriteIds().catch(() => []), api.notifications().catch(() => ({ items: [], unread: 0 }))]);
    setFavs(f);
    setUnread(n.unread);
  }, []);

  const refresh = useCallback(async () => {
    const u = await api.me().catch(() => null);
    setUser(u);
    await loadUserData(u);
    setReady(true);
  }, [loadUserData]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (user?.prefs.theme && user.prefs.theme !== 'system') setTheme(user.prefs.theme); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    return api.onNotification((n: AppNotification) => {
      setUnread((c) => c + 1);
      toast({ title: n.title, body: n.body, tone: n.type === 'GOAL' ? 'goal' : 'info', href: n.matchId ? `/match/${n.matchId}` : undefined });
    });
  }, [user?.id, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthState>(() => ({
    user, ready, unread, favs,
    async login(e, p) { const u = await api.login({ email: e, password: p }); setUser(u); await loadUserData(u); return u; },
    async register(n, e, p) { const u = await api.register({ name: n, email: e, password: p }); setUser(u); await loadUserData(u); return u; },
    logout() { api.logout(); setUser(null); setFavs([]); setUnread(0); },
    refresh,
    async refreshUnread() { if (user) setUnread((await api.notifications().catch(() => ({ unread: 0 }))).unread); },
    isFav: (kind, id) => favs.some((f) => f.kind === kind && f.refId === id),
    async toggleFav(kind, id) {
      if (!user) { toast({ title: 'Sign in to follow', body: 'Create a free account to follow teams and get alerts.', tone: 'info', href: '/login' }); return false; }
      const on = favs.some((f) => f.kind === kind && f.refId === id);
      setFavs((x) => (on ? x.filter((f) => !(f.kind === kind && f.refId === id)) : [...x, { kind, refId: id }]));
      try {
        if (on) await api.removeFavorite(kind, id); else await api.addFavorite(kind, id);
        return !on;
      } catch (e) {
        setFavs((x) => (on ? [...x, { kind, refId: id }] : x.filter((f) => !(f.kind === kind && f.refId === id))));
        toast({ title: 'Could not update', body: (e as Error).message, tone: 'info' });
        return on;
      }
    },
    setUser,
  }), [user, ready, unread, favs, refresh, loadUserData, toast]);

  return (
    <AuthCtx.Provider value={value}>
      <ToastCtx.Provider value={{ toast }}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6" aria-live="polite">
          {toasts.map((t) => {
            const Icon = t.tone === 'goal' ? Bell : t.tone === 'success' ? CheckCircle2 : Info;
            const body = (
              <div className={cn('pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3 rounded-lg border bg-surface p-3.5 shadow-pop', t.tone === 'goal' ? 'border-accent/50' : 'border-line')}>
                <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', t.tone === 'goal' ? 'bg-accent/15 text-accent' : 'bg-primary/12 text-primary')}><Icon size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-[13px] text-muted">{t.body}</p>}
                </div>
                <button aria-label="Dismiss" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setToasts((x) => x.filter((y) => y.id !== t.id)); }} className="text-faint hover:text-ink"><X size={16} /></button>
              </div>
            );
            return t.href ? <a key={t.id} href={t.href} className="contents">{body}</a> : <div key={t.id} className="contents">{body}</div>;
          })}
        </div>
      </ToastCtx.Provider>
    </AuthCtx.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <Inner>{children}</Inner>
    </ThemeProvider>
  );
}
