import * as E from '../engine';
import type { MatchFilters, MatchSummary } from '../engine';
import { ApiError } from './types';
import type { Api, AppNotification, AppUser, FavKind, JobRun, MatchOverridePatch, Prefs, Role } from './types';

/**
 * Demo mode: the same simulation engine the API uses runs right in the browser, and accounts / favourites /
 * notifications live in localStorage. The whole app works with no backend, no database and no paid API.
 */
const KEY = { users: 'scorely.demo.users', session: 'scorely.demo.session', favs: 'scorely.demo.favs', notes: 'scorely.demo.notes', embeds: 'scorely.demo.embeds', jobs: 'scorely.demo.jobs', ov: 'scorely.demo.overrides' };

interface StoredUser extends AppUser { pass: string }
const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h >>> 0); };
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const defaultPrefs: Prefs = { theme: 'system', notifyGoals: true, notifyStart: true, notifyEnd: true };
const strip = ({ pass: _p, ...u }: StoredUser): AppUser => u;
const delay = <T,>(v: T) => Promise.resolve(v);

function users(): StoredUser[] {
  let u = read<StoredUser[]>(KEY.users, []);
  if (!u.length) {
    u = [
      { id: 'u-admin', email: 'admin@livekick.dev', name: 'LiveKick Admin', role: 'admin', createdAt: Date.now() - 864e5 * 30, prefs: { ...defaultPrefs }, pass: hash('Admin1234!') },
      { id: 'u-demo', email: 'demo@livekick.dev', name: 'Demo Fan', role: 'user', createdAt: Date.now() - 864e5 * 12, prefs: { ...defaultPrefs }, pass: hash('Demo1234!') },
    ];
    write(KEY.users, u);
  }
  return u;
}
const session = () => read<string | null>(KEY.session, null);
const current = (): StoredUser | null => users().find((u) => u.id === session()) ?? null;
const needUser = () => { const u = current(); if (!u) throw new ApiError(401, 'Please sign in', 'unauthorized'); return u; };
const needAdmin = () => { const u = needUser(); if (u.role !== 'admin') throw new ApiError(403, 'Admins only', 'forbidden'); return u; };

type Fav = { userId: string; kind: FavKind; refId: string };
const favs = () => read<Fav[]>(KEY.favs, []);
const notes = () => read<(AppNotification & { userId: string })[]>(KEY.notes, []);
const jobLog = (message: string, name = 'demo:event') => {
  const j = read<JobRun[]>(KEY.jobs, []);
  j.unshift({ id: uid(), name, startedAt: Date.now(), durationMs: 0, ok: true, message });
  write(KEY.jobs, j.slice(0, 80));
};

// restore admin overrides on load
if (typeof window !== 'undefined') { try { E.loadOverrides(read(KEY.ov, {})); } catch { /* ignore */ } }

const listeners = new Set<(n: AppNotification) => void>();
let snap = new Map<string, { home: number; away: number; status: string }>();
let watcher: ReturnType<typeof setInterval> | undefined;

function push(userId: string, n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  const row = { ...n, id: uid(), createdAt: Date.now(), read: false, userId };
  write(KEY.notes, [row, ...notes()].slice(0, 200));
  if (session() === userId) listeners.forEach((l) => l(row));
}

/** Plays the part of the backend worker: watches live matches and notifies followers of the teams / leagues involved. */
function startWatcher() {
  if (watcher || typeof window === 'undefined') return;
  const tick = () => {
    const u = current();
    const now = Date.now();
    const live = E.liveMatches(undefined, now);
    const next = new Map<string, { home: number; away: number; status: string }>();
    for (const m of live) {
      next.set(m.id, { home: m.homeScore, away: m.awayScore, status: m.status });
      const prev = snap.get(m.id);
      if (!u || !prev) continue;
      const mine = favs().filter((f) => f.userId === u.id);
      const follows = mine.some((f) => (f.kind === 'team' && (f.refId === m.home.id || f.refId === m.away.id)) || (f.kind === 'league' && f.refId === m.leagueId) || (f.kind === 'match' && f.refId === m.id));
      if (!follows) continue;
      if ((prev.home !== m.homeScore || prev.away !== m.awayScore) && u.prefs.notifyGoals && (m.sportId === 'football' || m.sportId === 'rugby'))
        push(u.id, { type: 'GOAL', title: m.sportId === 'football' ? 'GOAL!' : 'Score!', body: `${m.home.name} ${m.scoreLabel?.home ?? m.homeScore} - ${m.scoreLabel?.away ?? m.awayScore} ${m.away.name}`, matchId: m.id });
    }
    if (u && snap.size) {
      for (const [id] of snap) {
        if (next.has(id)) continue;
        const d = E.getMatch(id, now);
        if (!d || d.status !== 'FINISHED' || !u.prefs.notifyEnd) continue;
        const mine = favs().filter((f) => f.userId === u.id);
        if (mine.some((f) => (f.kind === 'team' && (f.refId === d.home.id || f.refId === d.away.id)) || (f.kind === 'league' && f.refId === d.leagueId) || (f.kind === 'match' && f.refId === id)))
          push(u.id, { type: 'FULLTIME', title: `Full time: ${d.home.short} v ${d.away.short}`, body: d.resultText ?? `${d.home.name} ${d.homeScore} - ${d.awayScore} ${d.away.name}`, matchId: id });
      }
    }
    snap = next;
  };
  tick();
  watcher = setInterval(tick, 4000);
}

const need = <T,>(v: T | null | undefined, what: string): T => { if (v == null) throw new ApiError(404, `${what} not found`, 'not_found'); return v; };

export const demoApi: Api = {
  mode: 'demo',
  sports: () => delay(E.listSports()),
  leagues: (f) => delay(E.listLeagues(f ?? {})),
  league: (id) => delay(need(E.getLeague(id), 'League')),
  standings: (id) => {
    const lg = need(E.getLeague(id), 'League');
    return delay(lg.kind === 'ranking' ? { league: lg, kind: 'ranking' as const, rankings: E.rankings(id) } : { league: lg, kind: 'table' as const, rows: E.standings(id) });
  },
  scorers: (id) => delay(E.topScorers(id)),
  teams: (f) => delay(E.listTeams(f ?? {})),
  team: (id) => delay(need(E.teamProfile(id), 'Team')),
  matches: (f) => delay(E.listMatches(f ?? {})),
  live: (sport) => delay(E.liveMatches(sport)),
  match: (id) => {
    const m = need(E.getMatch(id), 'Match');
    const embed = read<Record<string, string>>(KEY.embeds, {})[id];
    if (embed && m.watch) m.watch.embedUrl = embed;
    return delay(m);
  },
  h2h: (a, b) => delay(need(E.headToHead(a, b), 'Teams')),
  history: (f) => delay(E.history(f ?? {})),
  search: (q) => delay(E.search(q)),
  meta: (from, to) => delay(E.scoreboardMeta(from, to)),

  async register({ name, email, password }) {
    const list = users();
    const e = email.trim().toLowerCase();
    if (list.some((u) => u.email === e)) throw new ApiError(409, 'An account with this email already exists', 'email_taken');
    const u: StoredUser = { id: uid(), email: e, name: name.trim(), role: 'user', createdAt: Date.now(), prefs: { ...defaultPrefs }, pass: hash(password) };
    write(KEY.users, [...list, u]);
    write(KEY.session, u.id);
    push(u.id, { type: 'SYSTEM', title: 'Welcome to LiveKick', body: 'Follow teams and leagues to get goal alerts here.' });
    startWatcher();
    return strip(u);
  },
  async login({ email, password }) {
    const u = users().find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.pass !== hash(password)) throw new ApiError(401, 'Incorrect email or password', 'bad_credentials');
    write(KEY.session, u.id);
    startWatcher();
    return strip(u);
  },
  logout() { write(KEY.session, null); },
  async me() { startWatcher(); const u = current(); return u ? strip(u) : null; },
  async updateMe(p) {
    const u = needUser();
    const list = users().map((x) => (x.id === u.id ? { ...x, ...(p.name ? { name: p.name.trim() } : {}), prefs: { ...x.prefs, ...(p.prefs ?? {}) } } : x));
    write(KEY.users, list);
    return strip(list.find((x) => x.id === u.id)!);
  },

  async favorites() {
    const u = needUser();
    const mine = favs().filter((f) => f.userId === u.id);
    return {
      teams: mine.filter((f) => f.kind === 'team').map((f) => E.getTeam(f.refId)).filter((x): x is NonNullable<typeof x> => !!x),
      leagues: mine.filter((f) => f.kind === 'league').map((f) => E.getLeague(f.refId)).filter((x): x is NonNullable<typeof x> => !!x),
      matches: mine.filter((f) => f.kind === 'match').map((f) => E.getMatch(f.refId)).filter((x): x is NonNullable<typeof x> => !!x),
    };
  },
  async favoriteIds() {
    const u = current();
    return u ? favs().filter((f) => f.userId === u.id).map(({ kind, refId }) => ({ kind, refId })) : [];
  },
  async addFavorite(kind, refId) {
    const u = needUser();
    const all = favs();
    if (!all.some((f) => f.userId === u.id && f.kind === kind && f.refId === refId)) write(KEY.favs, [...all, { userId: u.id, kind, refId }]);
  },
  async removeFavorite(kind, refId) {
    const u = needUser();
    write(KEY.favs, favs().filter((f) => !(f.userId === u.id && f.kind === kind && f.refId === refId)));
  },

  async notifications() {
    const u = needUser();
    const items = notes().filter((n) => n.userId === u.id).map(({ userId: _u, ...n }) => n);
    return { items, unread: items.filter((n) => !n.read).length };
  },
  async markRead(id) {
    const u = needUser();
    write(KEY.notes, notes().map((n) => (n.userId === u.id && (!id || n.id === id) ? { ...n, read: true } : n)));
  },
  async removeNotification(id) {
    const u = needUser();
    write(KEY.notes, notes().filter((n) => !(n.userId === u.id && n.id === id)));
  },
  onNotification(cb) { startWatcher(); listeners.add(cb); return () => { listeners.delete(cb); }; },

  admin: {
    async overview() {
      needAdmin();
      return { users: users().length, admins: users().filter((u) => u.role === 'admin').length, liveMatches: E.liveMatches().length, sseClients: 1, overrides: Object.keys(E.getOverrides()).length, uptimeSec: Math.round(performance.now() / 1000), leagues: E.LEAGUES.length, teams: E.TEAMS.length };
    },
    async users() { needAdmin(); return users().map(strip); },
    async setRole(id, role: Role) {
      const me = needAdmin();
      if (me.id === id) throw new ApiError(400, 'You cannot change your own role', 'validation');
      write(KEY.users, users().map((u) => (u.id === id ? { ...u, role } : u)));
      jobLog(`role of ${id} set to ${role}`, 'admin:role');
    },
    async override(id, p: MatchOverridePatch) {
      needAdmin();
      if (!E.getMatch(id)) throw new ApiError(404, 'Match not found', 'not_found');
      const { embedUrl, ...ov } = p;
      if (Object.keys(ov).length) { E.setOverride(id, { ...(E.getOverrides()[id] ?? {}), ...ov }); write(KEY.ov, E.getOverrides()); }
      if (embedUrl !== undefined) {
        const m = read<Record<string, string>>(KEY.embeds, {});
        if (embedUrl) m[id] = embedUrl; else delete m[id];
        write(KEY.embeds, m);
      }
      jobLog(`${id} ${JSON.stringify(p)}`, 'admin:override');
      return demoApi.match(id);
    },
    async clearOverride(id) { needAdmin(); E.setOverride(id, null); write(KEY.ov, E.getOverrides()); jobLog(`${id} override cleared`, 'admin:override'); },
    async jobs() { needAdmin(); return read<JobRun[]>(KEY.jobs, []); },
    async sync() {
      needAdmin();
      const live = E.liveMatches().length;
      jobLog(`manual sync: ${live} live, demo provider`, 'ingest:live');
      return { live, changes: 0 };
    },
  },
};
export type { MatchFilters, MatchSummary };
