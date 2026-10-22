import { LEAGUES, SPORTS, TEAMS, leagueById, teamById } from './catalog';
import type { LeagueDef } from './catalog';
import { DAY, MIN, dayNum, fixturesInRange } from './schedule';
import type { Fixture } from './schedule';
import { hashStr, mod } from './rng';
import { squadFor } from './names';
import { detailOf, engineConfig, getPlan, leagueRef, planById, simState, summaryOf, teamRef } from './sim';
import type {
  H2HSummary, League, MatchDetail, MatchFilters, MatchSummary, Paged, RankingRow, Scorer, SearchResults, SportId,
  StandingRow, Team, TeamProfile,
} from './types';

const clampInt = (n: unknown, lo: number, hi: number, d: number) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
};

export const liveLookback = () => Math.ceil(210 / engineConfig.speed) * MIN + 5 * MIN;
const startOfDay = (ms: number) => dayNum(ms) * DAY;

function paginate<T>(all: T[], page?: number, limit?: number, defLimit = 50): Paged<T> {
  const lim = clampInt(limit, 1, 500, defLimit);
  const pages = Math.max(1, Math.ceil(all.length / lim));
  const pg = clampInt(page, 1, pages, 1);
  return { items: all.slice((pg - 1) * lim, pg * lim), total: all.length, page: pg, limit: lim, pages };
}

// ---------- sports & leagues ----------
export const listSports = () => SPORTS;

function seasonLabel(def: LeagueDef, now: number): string {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const yearOnly = ['j1', 'ipl', 'bbl', 'six-nations', 'atp', 'wta'];
  if (yearOnly.includes(def.id)) return String(y);
  return d.getUTCMonth() >= 6 ? `${y}/${String((y + 1) % 100).padStart(2, '0')}` : `${y - 1}/${String(y % 100).padStart(2, '0')}`;
}

function roundLabel(def: LeagueDef, now: number): string {
  const sch = def.schedule;
  if (sch.kind === 'weekly') {
    const w = Math.floor((dayNum(now) - 4) / 7);
    const r = mod(w * sch.parts.length, sch.rounds) + 1;
    return def.id === 'ucl' ? `League phase · up to MD ${r}` : `Form table · up to MD ${r}`;
  }
  if (def.sportId === 'tennis') return 'Tour season';
  return 'Regular season';
}

export function leagueInfo(def: LeagueDef, now = Date.now()): League {
  const { teamIds, schedule, streamPct, broadcasters, ...rest } = def;
  void teamIds; void schedule; void streamPct; void broadcasters;
  return { ...rest, season: seasonLabel(def, now), round: roundLabel(def, now) };
}

export function listLeagues(f: { sport?: SportId; country?: string; q?: string } = {}, now = Date.now()): League[] {
  const q = f.q?.trim().toLowerCase();
  return LEAGUES.filter((l) => (!f.sport || l.sportId === f.sport) && (!f.country || l.country.toLowerCase() === f.country.toLowerCase()) &&
    (!q || l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q) || l.short.toLowerCase().includes(q))).map((l) => leagueInfo(l, now));
}

export function getLeague(id: string, now = Date.now()): League | null {
  const def = leagueById.get(id);
  return def ? leagueInfo(def, now) : null;
}

// ---------- teams ----------
export function listTeams(f: { q?: string; sport?: SportId; league?: string } = {}): Team[] {
  const q = f.q?.trim().toLowerCase();
  return TEAMS.filter((t) => (!f.sport || t.sportId === f.sport) && (!f.league || t.leagueIds.includes(f.league)) &&
    (!q || t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q)));
}
export const getTeam = (id: string): Team | null => teamById.get(id) ?? null;

function fixturesForTeam(teamId: string, from: number, to: number): Fixture[] {
  const team = teamById.get(teamId);
  if (!team) return [];
  return fixturesInRange(from, to, team.leagueIds).filter((f) => f.homeId === teamId || f.awayId === teamId);
}

type Res = 'W' | 'D' | 'L';
const resultFor = (home: boolean, hs: number, as: number): Res => (hs === as ? 'D' : (hs > as) === home ? 'W' : 'L');

function lookbackDays(sport: SportId, def?: LeagueDef): number {
  if (sport === 'tennis') return 5;
  if (sport === 'basketball') return 30;
  if (sport === 'cricket') return 45;
  return def?.id === 'ucl' ? 8 * 7 : 10 * 7;
}

export function teamForm(teamId: string, now = Date.now(), n = 5): Res[] {
  const team = teamById.get(teamId);
  if (!team) return [];
  const days = Math.max(...team.leagueIds.map((l) => lookbackDays(team.sportId, leagueById.get(l))));
  const fx = fixturesForTeam(teamId, now - days * DAY, now).filter((f) => !f.postponed);
  const out: Res[] = [];
  for (const f of fx) {
    const st = simState(getPlan(f), now);
    if (st.status === 'FINISHED') out.push(resultFor(f.homeId === teamId, st.homeScore, st.awayScore));
  }
  return out.slice(-n);
}

export function teamProfile(teamId: string, now = Date.now()): TeamProfile | null {
  const team = teamById.get(teamId);
  if (!team) return null;
  const days = Math.max(...team.leagueIds.map((l) => lookbackDays(team.sportId, leagueById.get(l))));
  const past = fixturesForTeam(teamId, now - days * DAY, now + 12 * DAY).filter((f) => !f.postponed || f.kickoff > now);
  const summaries = past.map((f) => summaryOf(getPlan(f), now));
  const finished = summaries.filter((s) => s.status === 'FINISHED');
  const results = finished.slice(-8).reverse();
  const next = summaries.filter((s) => s.status !== 'FINISHED').slice(0, 5);
  const form = finished.slice(-5).map((s) => resultFor(s.home.id === teamId, s.homeScore, s.awayScore));
  const sum = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
  for (const s of finished.slice(-10)) {
    const home = s.home.id === teamId;
    const gf = home ? s.homeScore : s.awayScore;
    const ga = home ? s.awayScore : s.homeScore;
    sum.played++; sum.goalsFor += gf; sum.goalsAgainst += ga;
    const r = resultFor(home, s.homeScore, s.awayScore);
    if (r === 'W') sum.won++; else if (r === 'D') sum.drawn++; else sum.lost++;
  }
  const tableLeague = team.leagueIds.map((l) => leagueById.get(l)!).find((l) => l.kind === 'table');
  let position: TeamProfile['position'];
  if (tableLeague) {
    const row = standings(tableLeague.id, now).find((r) => r.team.id === teamId);
    if (row) position = { leagueId: tableLeague.id, leagueName: tableLeague.name, position: row.position, points: row.points };
  }
  return { team, leagues: team.leagueIds.map((l) => leagueRef(leagueById.get(l)!)), form, next, results, squad: squadFor(teamId), summary: sum, position };
}

// ---------- matches ----------
function leagueScope(f: { sport?: SportId; league?: string; team?: string }): string[] | undefined {
  let ids: string[] | undefined;
  if (f.league) ids = [f.league];
  if (f.sport) {
    const s = LEAGUES.filter((l) => l.sportId === f.sport).map((l) => l.id);
    ids = ids ? ids.filter((i) => s.includes(i)) : s;
  }
  if (f.team) {
    const t = teamById.get(f.team);
    const s = t ? t.leagueIds : [];
    ids = ids ? ids.filter((i) => s.includes(i)) : s;
  }
  return ids;
}

function narrow(fixtures: Fixture[], f: MatchFilters): Fixture[] {
  let out = fixtures;
  if (f.team) out = out.filter((x) => x.homeId === f.team || x.awayId === f.team);
  const q = f.q?.trim().toLowerCase();
  if (q) {
    out = out.filter((x) => {
      const h = teamById.get(x.homeId)!;
      const a = teamById.get(x.awayId)!;
      return [h.name, a.name, h.short, a.short, leagueById.get(x.leagueId)!.name].some((s) => s.toLowerCase().includes(q));
    });
  }
  return out;
}

const isLive = (s: MatchSummary) => s.status === 'LIVE' || s.status === 'HALFTIME';

export function listMatches(f: MatchFilters = {}, now = Date.now()): Paged<MatchSummary> {
  let from = f.from ?? startOfDay(now);
  let to = f.to ?? from + DAY;
  if (f.status === 'live' && f.from === undefined && f.to === undefined) {
    from = now - liveLookback();
    to = now + 1;
  }
  if (to - from > 14 * DAY) to = from + 14 * DAY;
  const fixtures = narrow(fixturesInRange(from, to, leagueScope(f)), f);
  let list = fixtures.map((x) => summaryOf(getPlan(x), now));
  switch (f.status) {
    case 'live': list = list.filter(isLive); break;
    case 'upcoming': list = list.filter((s) => s.status === 'SCHEDULED' || s.status === 'POSTPONED'); break;
    case 'finished': list = list.filter((s) => s.status === 'FINISHED'); break;
  }
  if (f.watch) list = list.filter((s) => s.watch?.hasStream);
  if (f.result) list = list.filter((s) => s.status === 'FINISHED' && (s.homeScore > s.awayScore ? 'home' : s.homeScore < s.awayScore ? 'away' : 'draw') === f.result);
  const rank = (s: MatchSummary) => (isLive(s) ? 0 : s.status === 'SCHEDULED' ? 1 : 2);
  if (f.order === 'desc') list.sort((a, b) => b.kickoff - a.kickoff);
  else list.sort((a, b) => (f.status ? 0 : rank(a) - rank(b)) || a.kickoff - b.kickoff);
  return paginate(list, f.page, f.limit, 200);
}

export function liveMatches(sport?: SportId, now = Date.now()): MatchSummary[] {
  return listMatches({ status: 'live', sport, limit: 500, order: 'asc' }, now).items.sort((a, b) => Number(b.featured) - Number(a.featured) || a.kickoff - b.kickoff);
}

export function getMatch(id: string, now = Date.now()): MatchDetail | null {
  const plan = planById(id);
  return plan ? detailOf(plan, now) : null;
}

export function scoreboardMeta(from: number, to: number, now = Date.now()) {
  const fixtures = fixturesInRange(from, to);
  const counts: Record<string, { total: number; live: number }> = {};
  for (const s of SPORTS) counts[s.id] = { total: 0, live: 0 };
  let live = 0;
  for (const x of fixtures) {
    if (x.postponed) { counts[x.sportId].total++; continue; }
    const st = simState(getPlan(x), now);
    counts[x.sportId].total++;
    if (st.status === 'LIVE' || st.status === 'HALFTIME') { counts[x.sportId].live++; live++; }
  }
  return { total: fixtures.length, live, counts };
}

// ---------- history ----------
export function history(f: MatchFilters = {}, now = Date.now()): Paged<MatchSummary> {
  const to = Math.min(f.to ?? now, now);
  const scoped = !!(f.team || f.league);
  const maxSpan = (scoped ? 150 : 30) * DAY;
  let from = f.from ?? to - 14 * DAY;
  if (to - from > maxSpan) from = to - maxSpan;
  const lookback = liveLookback();
  let fixtures = narrow(fixturesInRange(from, to, leagueScope(f)), f).filter((x) => !x.postponed);
  fixtures = fixtures.filter((x) => x.kickoff < now - lookback || simState(getPlan(x), now).status === 'FINISHED');
  if (f.result) {
    fixtures = fixtures.filter((x) => {
      const s = simState(getPlan(x), now);
      return (s.homeScore > s.awayScore ? 'home' : s.homeScore < s.awayScore ? 'away' : 'draw') === f.result;
    });
  }
  fixtures.sort((a, b) => (f.order === 'asc' ? a.kickoff - b.kickoff : b.kickoff - a.kickoff));
  const pg = paginate(fixtures, f.page, f.limit, 25);
  return { ...pg, items: pg.items.map((x) => summaryOf(getPlan(x), now)) };
}

// ---------- standings, rankings, scorers ----------
const WINDOW_WEEKS: Record<string, number> = { ucl: 6, 'six-nations': 5 };
const WINDOW_DAYS: Record<string, number> = { nba: 45, ipl: 30, bbl: 30 };

function windowFixtures(def: LeagueDef, now: number): Fixture[] {
  const days = def.schedule.kind === 'weekly' ? (WINDOW_WEEKS[def.id] ?? 6) * 7 : def.schedule.kind === 'daily' ? (WINDOW_DAYS[def.id] ?? 30) : 5;
  return fixturesInRange(now - days * DAY, now, [def.id]).filter((f) => !f.postponed);
}

const POINTS: Record<string, [number, number, number]> = { football: [3, 1, 0], rugby: [4, 2, 0], basketball: [1, 0, 0], cricket: [2, 1, 0], tennis: [0, 0, 0] };

export function standings(leagueId: string, now = Date.now()): StandingRow[] {
  const def = leagueById.get(leagueId);
  if (!def || def.kind === 'ranking') return [];
  const rows = new Map<string, StandingRow>();
  for (const id of def.teamIds) {
    rows.set(id, { position: 0, team: teamRef(teamById.get(id)!), played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0, form: [] });
  }
  const [pw, pd] = POINTS[def.sportId];
  for (const f of windowFixtures(def, now)) {
    const st = simState(getPlan(f), now);
    if (st.status !== 'FINISHED') continue;
    const h = rows.get(f.homeId)!;
    const a = rows.get(f.awayId)!;
    h.played++; a.played++;
    h.goalsFor += st.homeScore; h.goalsAgainst += st.awayScore;
    a.goalsFor += st.awayScore; a.goalsAgainst += st.homeScore;
    if (st.homeScore > st.awayScore) { h.won++; a.lost++; h.points += pw; h.form.push('W'); a.form.push('L'); }
    else if (st.homeScore < st.awayScore) { a.won++; h.lost++; a.points += pw; a.form.push('W'); h.form.push('L'); }
    else { h.drawn++; a.drawn++; h.points += pd; a.points += pd; h.form.push('D'); a.form.push('D'); }
  }
  const list = [...rows.values()];
  for (const r of list) { r.goalDiff = r.goalsFor - r.goalsAgainst; r.form = r.form.slice(-5); }
  const basketball = def.sportId === 'basketball';
  list.sort((x, y) =>
    basketball
      ? y.won - x.won || y.goalDiff - x.goalDiff || x.team.name.localeCompare(y.team.name)
      : y.points - x.points || y.goalDiff - x.goalDiff || y.goalsFor - x.goalsFor || x.team.name.localeCompare(y.team.name));
  list.forEach((r, i) => (r.position = i + 1));
  return list;
}

export function rankings(leagueId: string, now = Date.now()): RankingRow[] {
  const def = leagueById.get(leagueId);
  if (!def || def.kind !== 'ranking') return [];
  const forms = new Map<string, Res[]>();
  for (const f of windowFixtures(def, now)) {
    const st = simState(getPlan(f), now);
    if (st.status !== 'FINISHED') continue;
    (forms.get(f.homeId) ?? forms.set(f.homeId, []).get(f.homeId)!).push(resultFor(true, st.homeScore, st.awayScore));
    (forms.get(f.awayId) ?? forms.set(f.awayId, []).get(f.awayId)!).push(resultFor(false, st.homeScore, st.awayScore));
  }
  const teams = def.teamIds.map((id) => teamById.get(id)!).sort((a, b) => b.strength - a.strength || a.name.localeCompare(b.name));
  return teams
    .map((t) => ({ t, points: Math.round(t.strength * 115 + (hashStr(t.id) % 90)) }))
    .sort((a, b) => b.points - a.points || a.t.name.localeCompare(b.t.name))
    .map(({ t, points }, i) => ({ rank: i + 1, team: teamRef(t), points, country: 'World', form: (forms.get(t.id) ?? []).slice(-5) }));
}

export function topScorers(leagueId: string, now = Date.now(), limit = 10): Scorer[] {
  const def = leagueById.get(leagueId);
  if (!def || def.sportId !== 'football') return [];
  const goals = new Map<string, { player: string; teamId: string; goals: number; assists: number }>();
  const games = new Map<string, number>();
  for (const f of windowFixtures(def, now)) {
    const plan = getPlan(f);
    const st = simState(plan, now);
    if (st.status !== 'FINISHED') continue;
    games.set(f.homeId, (games.get(f.homeId) ?? 0) + 1);
    games.set(f.awayId, (games.get(f.awayId) ?? 0) + 1);
    for (const e of st.events) {
      if ((e.type === 'GOAL' || e.type === 'PENALTY') && e.player && e.teamId) {
        const k = `${e.teamId}:${e.player}`;
        const r = goals.get(k) ?? { player: e.player, teamId: e.teamId, goals: 0, assists: 0 };
        r.goals++;
        goals.set(k, r);
        if (e.assist) {
          const ak = `${e.teamId}:${e.assist}`;
          const ar = goals.get(ak) ?? { player: e.assist, teamId: e.teamId, goals: 0, assists: 0 };
          ar.assists++;
          goals.set(ak, ar);
        }
      }
    }
  }
  return [...goals.values()]
    .filter((g) => g.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.localeCompare(b.player))
    .slice(0, limit)
    .map((g, i) => ({ rank: i + 1, player: g.player, team: teamRef(teamById.get(g.teamId)!), goals: g.goals, assists: g.assists, games: games.get(g.teamId) ?? 0 }));
}

// ---------- head to head ----------
const h2hCache = new Map<string, { at: number; value: H2HSummary }>();
export function headToHead(aId: string, bId: string, now = Date.now()): H2HSummary | null {
  const a = teamById.get(aId);
  const b = teamById.get(bId);
  if (!a || !b || a.sportId !== b.sportId || aId === bId) return null;
  const key = `${aId}|${bId}`;
  const hit = h2hCache.get(key);
  if (hit && now - hit.at < 5 * 60_000) return hit.value;
  const shared = a.leagueIds.filter((l) => b.leagueIds.includes(l));
  const found: Fixture[] = [];
  for (const lid of shared) {
    const def = leagueById.get(lid)!;
    const days = def.schedule.kind === 'weekly' ? 3 * 365 : 365;
    for (const f of fixturesInRange(now - days * DAY, now, [lid])) {
      if (!f.postponed && ((f.homeId === aId && f.awayId === bId) || (f.homeId === bId && f.awayId === aId))) found.push(f);
    }
  }
  found.sort((x, y) => y.kickoff - x.kickoff);
  const out: H2HSummary = { teamA: teamRef(a), teamB: teamRef(b), winsA: 0, winsB: 0, draws: 0, goalsA: 0, goalsB: 0, matches: [] };
  for (const f of found) {
    const plan = getPlan(f);
    const st = simState(plan, now);
    if (st.status !== 'FINISHED') continue;
    const aHome = f.homeId === aId;
    const ga = aHome ? st.homeScore : st.awayScore;
    const gb = aHome ? st.awayScore : st.homeScore;
    out.goalsA += ga; out.goalsB += gb;
    if (ga > gb) out.winsA++; else if (gb > ga) out.winsB++; else out.draws++;
    if (out.matches.length < 12) out.matches.push(summaryOf(plan, now, st));
  }
  h2hCache.set(key, { at: now, value: out });
  return out;
}

// ---------- search ----------
export function search(qRaw: string, now = Date.now()): SearchResults {
  const q = qRaw.trim().toLowerCase();
  if (q.length < 2) return { teams: [], leagues: [], matches: [] };
  const score = (name: string, short: string) => {
    const n = name.toLowerCase();
    if (n === q || short.toLowerCase() === q) return 0;
    if (n.startsWith(q) || short.toLowerCase().startsWith(q)) return 1;
    if (n.split(' ').some((w) => w.startsWith(q))) return 2;
    return n.includes(q) || short.toLowerCase().includes(q) ? 3 : 9;
  };
  const teams = TEAMS.map((t) => ({ t, s: score(t.name, t.short) })).filter((x) => x.s < 9).sort((a, b) => a.s - b.s || a.t.name.localeCompare(b.t.name)).slice(0, 8).map((x) => teamRef(x.t));
  const leagues = LEAGUES.map((l) => ({ l, s: score(l.name, l.short) })).filter((x) => x.s < 9).sort((a, b) => a.s - b.s).slice(0, 5).map((x) => leagueRef(x.l));
  const from = startOfDay(now) - DAY;
  const matches = listMatches({ from, to: from + 3 * DAY, q, limit: 8, status: 'all' }, now).items;
  return { teams, leagues, matches };
}
