'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Bell, CalendarDays, Heart, LogOut, Moon, Search, Settings, ShieldCheck, Sun, Trophy, Tv, UserRound, X, Flame } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { useAuth } from './Providers';
import { Crest } from './ui/Crest';

export const LogoMark = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className="shrink-0">
    <defs><linearGradient id="lkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#14b8a6" /></linearGradient></defs>
    <circle cx="60" cy="60" r="54" fill="url(#lkg)" />
    <circle cx="60" cy="60" r="38" fill="none" stroke="#fff" strokeWidth="7" />
    <path d="M52 44 80 60 52 76z" fill="#fff" />
    <circle cx="94" cy="26" r="9" fill="#ff5a5f" stroke="#fff" strokeWidth="4" />
  </svg>
);

export const Logo = ({ size = 30 }: { size?: number }) => (
  <span className="inline-flex items-center gap-2 font-display text-[22px] font-extrabold tracking-tight">
    <LogoMark size={size + 4} />
    <span>Live<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Kick</span></span>
  </span>
);

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  const dark = m && resolvedTheme === 'dark';
  return (
    <button aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(dark ? 'light' : 'dark')} className={cn('grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-3 hover:text-ink', className)}>
      {m ? (dark ? <Sun size={20} /> : <Moon size={20} />) : <span className="h-5 w-5" />}
    </button>
  );
}

const NAV = [
  { href: '/scores', label: 'Live', icon: Flame },
  { href: '/history', label: 'Matches', icon: CalendarDays },
  { href: '/watch', label: 'Watch', icon: Tv },
  { href: '/leagues', label: 'Leagues', icon: Trophy },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/alerts', label: 'Alerts', icon: Bell },
];
const MOBILE_NAV = NAV.filter((n) => n.href !== '/watch');
const active = (p: string, href: string) => p === href || (href !== '/' && p.startsWith(href + '/'));

export function Header({ onSearch }: { onSearch: () => void }) {
  const path = usePathname();
  const { user, unread, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const live = useQuery('hdr-live', () => api.live(), { interval: 8000 });
  const n = live.data?.length ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link href="/" aria-label="LiveKick home"><Logo /></Link>
        <Link href="/scores" className="ml-1 hidden items-center gap-1.5 rounded-full bg-live/12 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-live sm:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />LIVE{n > 0 && <span className="num">· {n}</span>}
        </Link>
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.slice(0, 4).map((l) => (
            <Link key={l.href} href={l.href} className={cn('rounded-md px-3.5 py-2 text-sm font-semibold transition-colors', active(path, l.href) ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-2 hover:text-ink')}>{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onSearch} className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-sm text-faint transition-colors hover:border-faint md:flex md:w-56 lg:w-72">
            <Search size={16} /><span>Search teams, leagues…</span><kbd className="ml-auto rounded border border-line px-1.5 text-[11px]">⌘K</kbd>
          </button>
          <button onClick={onSearch} aria-label="Search" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink md:hidden"><Search size={20} /></button>
          <ThemeToggle />
          {user && (
            <Link href="/alerts" aria-label={`Alerts${unread ? `, ${unread} unread` : ''}`} className="relative hidden h-10 w-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink sm:grid">
              <Bell size={20} />
              {unread > 0 && <span className="num absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-live px-1 text-[10px] font-extrabold text-white">{unread > 9 ? '9+' : unread}</span>}
            </Link>
          )}
          {user ? (
            <div className="relative" ref={ref}>
              <button onClick={() => setMenu((v) => !v)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu" className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-display text-sm font-extrabold text-on-primary ring-2 ring-line">
                {user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 top-12 w-60 animate-slide-in overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
                  <div className="border-b border-line px-4 py-3"><p className="truncate text-sm font-bold">{user.name}</p><p className="truncate text-xs text-muted">{user.email}</p></div>
                  <Link role="menuitem" href="/favorites" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2"><Settings size={16} />Favorites & settings</Link>
                  <Link role="menuitem" href="/alerts" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2"><Bell size={16} />Alerts</Link>
                  {user.role === 'admin' && <Link role="menuitem" href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2"><ShieldCheck size={16} />Admin console</Link>}
                  <button role="menuitem" onClick={() => { logout(); setMenu(false); window.location.href = '/'; }} className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-sm text-live hover:bg-surface-2"><LogOut size={16} />Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary ml-1 !px-4 !py-2"><UserRound size={16} /><span className="hidden sm:inline">Sign in</span></Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { unread } = useAuth();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_NAV.map((l) => {
          const on = active(path, l.href);
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={on ? 'page' : undefined} className={cn('relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold', on ? 'text-primary' : 'text-faint')}>
                <span className="relative"><l.icon size={22} fill={on ? 'currentColor' : 'none'} fillOpacity={0.15} />{l.href === '/alerts' && unread > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-live ring-2 ring-bg" />}</span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface-2/60 pb-28 pt-10 lg:pb-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-md text-sm text-muted">Real-time scores, match centre and history for football, basketball, tennis, cricket and rugby. Built as a portfolio project by Munje Fritz.</p>
          <p className="mt-3 max-w-md rounded-md border border-line bg-surface px-3 py-2 text-xs text-muted"><b className="text-ink">Demo data.</b> Matches, players and results are simulated and fictional. Team names are used only for illustration. No real fixtures or betting information.</p>
        </div>
        <div>
          <p className="label-sm mb-3">Product</p>
          <ul className="space-y-2 text-sm text-muted">
            {[['/scores', 'Live scores'], ['/watch', 'Watch live'], ['/history', 'Results & history'], ['/leagues', 'Leagues & tables']].map(([h, l]) => <li key={h}><Link href={h} className="hover:text-ink">{l}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="label-sm mb-3">Account</p>
          <ul className="space-y-2 text-sm text-muted">
            {[['/login', 'Sign in'], ['/register', 'Create account'], ['/favorites', 'Favorites'], ['/#pricing', 'Pricing']].map(([h, l]) => <li key={h}><Link href={h} className="hover:text-ink">{l}</Link></li>)}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-7xl px-4 text-xs text-faint md:px-6">© {new Date().getFullYear()} LiveKick. All rights reserved.</p>
    </footer>
  );
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [deb, setDeb] = useState('');
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => setDeb(q.trim()), 160); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (open) { setQ(''); setTimeout(() => input.current?.focus(), 30); } }, [open]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) { window.addEventListener('keydown', h); document.body.style.overflow = 'hidden'; }
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);
  const res = useQuery('search:' + deb, () => api.search(deb), { enabled: open && deb.length > 0 });
  const go = (href: string) => { onClose(); router.push(href); };
  if (!open) return null;
  const r = deb ? res.data : undefined;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/55 px-4 pt-[8vh] backdrop-blur-sm" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Search">
      <div className="w-full max-w-xl animate-slide-in overflow-hidden rounded-xl border border-line bg-surface shadow-pop" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="text-faint" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams, leagues, matches…" className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-faint" aria-label="Search" />
          <button onClick={onClose} aria-label="Close search" className="text-faint hover:text-ink"><X size={18} /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!deb && <p className="px-3 py-6 text-center text-sm text-muted">Try “Arsenal”, “Champions League” or “Lakers”.</p>}
          {deb && res.loading && !r && <p className="px-3 py-6 text-center text-sm text-muted">Searching…</p>}
          {r && !r.teams.length && !r.leagues.length && !r.matches.length && <p className="px-3 py-6 text-center text-sm text-muted">No results for “{deb}”.</p>}
          {r && r.teams.length > 0 && <p className="label-sm px-3 pb-1 pt-2">Teams</p>}
          {r?.teams.map((t) => <button key={t.id} onClick={() => go(`/teams/${t.id}`)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-2"><Crest team={t} size={28} /><span className="text-sm font-semibold">{t.name}</span><span className="ml-auto text-xs text-faint">{t.country}</span></button>)}
          {r && r.leagues.length > 0 && <p className="label-sm px-3 pb-1 pt-3">Leagues</p>}
          {r?.leagues.map((l) => <button key={l.id} onClick={() => go(`/leagues/${l.id}`)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-2"><span className="grid h-7 w-7 place-items-center rounded-md bg-surface-3 text-xs font-extrabold">{l.flag.slice(0, 3)}</span><span className="text-sm font-semibold">{l.name}</span><span className="ml-auto text-xs text-faint">{l.country}</span></button>)}
          {r && r.matches.length > 0 && <p className="label-sm px-3 pb-1 pt-3">Matches</p>}
          {r?.matches.slice(0, 6).map((m) => <button key={m.id} onClick={() => go(`/match/${m.id}`)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-2"><span className="text-sm font-semibold">{m.home.short} {m.status === 'SCHEDULED' ? 'v' : `${m.homeScore}-${m.awayScore}`} {m.away.short}</span><span className="ml-auto text-xs text-faint">{m.status === 'LIVE' ? 'LIVE' : m.league.short}</span></button>)}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState(false);
  const path = usePathname();
  const showBottom = !['/', '/login', '/register'].includes(path) && !path.startsWith('/admin');
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((v) => !v); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary">Skip to content</a>
      <Header onSearch={() => setSearch(true)} />
      <main id="main" className="min-w-0 flex-1">{children}</main>
      <Footer />
      {showBottom && <BottomNav />}
      <SearchPalette open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
