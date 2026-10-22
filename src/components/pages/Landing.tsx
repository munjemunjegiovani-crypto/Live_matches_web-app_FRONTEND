'use client';
import Link from 'next/link';
import { ArrowRight, BarChart3, BellRing, Check, Globe2, History, Radio, ShieldCheck, Tv, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { SPORT_EMOJI, cn, isLive, scoreOf } from '@/lib/format';
import { useQuery } from '@/hooks/useQuery';
import { MatchCard, MatchCardSkeleton } from '../MatchCard';

const FEATURES = [
  { icon: Zap, title: 'Real-time scores', body: 'Scores, clocks and events update every few seconds, with no refreshing.' },
  { icon: Radio, title: 'Match centre', body: 'Momentum wave, live pitch tracker, lineups, stats and commentary for every game.' },
  { icon: Tv, title: 'Watch live', body: 'A built-in watch centre with where-to-watch info and embeddable official streams.' },
  { icon: BellRing, title: 'Smart alerts', body: 'Follow teams, leagues or single matches and get goal and full-time alerts.' },
  { icon: History, title: 'Deep history', body: 'Search results by team, league, date or outcome, with head-to-head records.' },
  { icon: BarChart3, title: 'Tables & rankings', body: 'Live standings, top scorers and world rankings across five sports.' },
];
const PLANS = [
  { name: 'Free', price: '$0', note: 'forever', cta: 'Get started', href: '/register', items: ['All live scores & results', 'Follow teams and leagues', 'Goal & full-time alerts', 'Light and dark mode'], hl: false },
  { name: 'Pro', price: '$4.99', note: 'per month', cta: 'Preview Pro', href: '/register', items: ['Everything in Free', 'Ad-free experience', 'Unlimited alerts & saved filters', 'Advanced stats and CSV export'], hl: true },
  { name: 'Business', price: 'Custom', note: 'white-label & API', cta: 'Contact sales', href: '/register', items: ['Embeddable scoreboard widget', 'Your branding and domain', 'REST + realtime API', 'Priority support'], hl: false },
];
const FAQ = [
  ['Is the data real?', 'This is a portfolio build, so every match is simulated by a deterministic engine. Teams and players are illustrative and the results are fictional. The architecture is ready to plug in a real sports data provider.'],
  ['Does it work without a backend?', 'Yes. The web app ships with the same engine as the API and runs fully in your browser. Point it at the LiveKick API with a single environment variable to switch to server mode.'],
  ['Can I watch real match video?', 'Rights holders control broadcasts. LiveKick shows where to watch and can embed an official stream URL that an admin provides. The demo player visualises simulated games.'],
];

export function Landing() {
  const live = useQuery('land-live', () => api.live(), { interval: 3000 });
  const up = useQuery('land-up', () => api.matches({ status: 'upcoming', from: Date.now(), to: Date.now() + 12 * 3600_000, order: 'asc', limit: 6, watch: true }), { interval: 20000 });
  const ranked = (live.data ?? []).slice().sort((a, b) => Number(b.featured) - Number(a.featured) || (b.watch?.viewers ?? 0) - (a.watch?.viewers ?? 0));
  const showcase = [...ranked.slice(0, 3), ...(up.data?.items ?? [])].slice(0, 3);
  const ticker = [...ranked, ...(up.data?.items ?? [])].slice(0, 12);
  return (
    <div className="overflow-hidden">
      {/* hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: 'radial-gradient(60% 55% at 12% 0%, rgb(var(--primary)/.20), transparent 70%), radial-gradient(50% 50% at 95% 15%, rgb(var(--accent)/.18), transparent 70%)' }} />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-12 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-20 lg:pt-20">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-muted"><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live" />{live.data ? `${live.data.length} matches live right now` : 'Live now'}</span>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Every score.<br /><span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Every second.</span></h1>
            <p className="mt-5 max-w-xl text-lg text-muted">LiveKick brings live scores, match centre, standings and history for football, basketball, tennis, cricket and rugby into one fast, beautiful app.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/scores" className="btn-primary !px-6 !py-3 text-base">Open live scores<ArrowRight size={18} /></Link><Link href="/watch" className="btn-ghost !px-6 !py-3 text-base"><Tv size={18} />Watch live</Link></div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">{['Five sports', 'Dark & light mode', 'No sign-up needed'].map((t) => <span key={t} className="flex items-center gap-1.5"><Check size={15} className="text-accent" />{t}</span>)}</div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
            <div className="space-y-3 rounded-2xl border border-line bg-bg/60 p-3 shadow-pop backdrop-blur sm:p-4">
              {showcase.length ? showcase.map((m, i) => <div key={m.id} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}><MatchCard m={m} showLeague /></div>) : Array.from({ length: 3 }).map((_, i) => <MatchCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ticker */}
      {ticker.length > 0 && (
        <div className="border-y border-line bg-surface-2/60 py-3" aria-label="Live ticker">
          <div className="hide-scroll mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 md:px-6">
            {ticker.map((m) => (
              <Link key={m.id} href={`/match/${m.id}`} className="flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] hover:border-faint">
                <span>{SPORT_EMOJI[m.sportId]}</span><b>{m.home.short}</b><span className="num rounded bg-surface-3 px-1.5 font-extrabold">{m.status === 'SCHEDULED' ? 'v' : `${scoreOf(m).h}-${scoreOf(m).a}`}</span><b>{m.away.short}</b>
                {isLive(m) && <span className="num text-[11px] font-bold text-live">{m.clock}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* features */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center"><p className="label-sm text-primary">Features</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Everything a fan needs, nothing they don&apos;t</h2><p className="mt-3 text-muted">Built for speed and clarity, from the first kick-off to the final whistle.</p></div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card group p-6 transition-all hover:-translate-y-1 hover:border-faint">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary transition-transform group-hover:scale-110"><f.icon size={22} /></span>
              <h3 className="mt-4 text-lg font-extrabold">{f.title}</h3><p className="mt-1.5 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* sports + watch split */}
      <section className="border-y border-line bg-surface-2/50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="label-sm text-primary">One app, five sports</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Football to tennis, built for how each sport is played</h2>
            <p className="mt-3 text-muted">Set-by-set tennis, innings-by-innings cricket, quarter-by-quarter basketball. Every sport gets its own match model and layout.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">{Object.entries(SPORT_EMOJI).map(([k, e]) => <Link key={k} href="/scores" className="chip !px-4 !py-2 capitalize"><span className="text-lg">{e}</span>{k}</Link>)}</div>
            <ul className="mt-8 space-y-3 text-sm">{[[Globe2, '14 leagues across five continents, including Elite One'], [ShieldCheck, 'Admin tools to correct scores and attach official streams'], [BellRing, 'Realtime push through server-sent events']].map(([I, t], i) => { const Icon = I as typeof Globe2; return <li key={i} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-3 text-primary"><Icon size={17} /></span>{t as string}</li>; })}</ul>
          </div>
          <div className="card overflow-hidden p-0 shadow-pop">
            <div className="relative grid aspect-video place-items-center bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900">
              <span className="absolute left-4 top-4 flex overflow-hidden rounded-md text-xs font-extrabold text-white"><span className="bg-live px-2 py-1.5">LIVE</span><span className="bg-black/80 px-3 py-1.5">ARS 2 · 1 CHE</span><span className="bg-primary px-2 py-1.5">67&apos;</span></span>
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 text-black shadow-pop"><Tv size={26} /></span>
            </div>
            <div className="p-5"><h3 className="font-display text-lg font-extrabold">Watch centre</h3><p className="mt-1 text-sm text-muted">Pitch tracker, highlights and where-to-watch in one place. Plug in an official embed link and it plays right inside the match page.</p><Link href="/watch" className="btn-primary mt-4">Explore watch centre<ArrowRight size={16} /></Link></div>
          </div>
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 md:px-6 lg:py-24">
        <div className="mx-auto max-w-2xl text-center"><p className="label-sm text-primary">Pricing</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Free for fans. Powerful for pros.</h2><p className="mt-3 text-muted">Design preview of a monetisation model. No billing in this demo.</p></div>
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={cn('card relative flex flex-col p-6', p.hl && 'border-primary shadow-pop ring-1 ring-primary/40')}>
              {p.hl && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-on-primary">Most popular</span>}
              <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
              <p className="mt-3"><span className="font-display text-4xl font-extrabold">{p.price}</span> <span className="text-sm text-muted">{p.note}</span></p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">{p.items.map((i) => <li key={i} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-accent" />{i}</li>)}</ul>
              <Link href={p.href} className={cn('mt-8', p.hl ? 'btn-primary' : 'btn-ghost')}>{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* faq */}
      <section className="mx-auto max-w-3xl px-4 pb-16 md:px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">Questions</h2>
        <div className="mt-8 space-y-3">{FAQ.map(([q, a]) => <details key={q} className="card group p-5"><summary className="flex cursor-pointer list-none items-center justify-between font-bold">{q}<span className="text-xl text-faint transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 text-sm text-muted">{a}</p></details>)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent px-6 py-14 text-center text-on-primary sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Never miss a goal again</h2>
          <p className="mx-auto mt-3 max-w-lg opacity-90">Open the live scoreboard now, or create a free account to follow your teams.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/scores" className="btn bg-white !px-6 !py-3 text-base text-slate-900 shadow-pop hover:brightness-95">Open live scores</Link><Link href="/register" className="btn border border-white/50 !px-6 !py-3 text-base text-white hover:bg-white/10">Create free account</Link></div>
        </div>
      </section>
    </div>
  );
}
