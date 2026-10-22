import { leagueById, teamById } from './catalog';
import type { LeagueDef } from './catalog';
import { fixtureById, MIN } from './schedule';
import type { Fixture } from './schedule';
import { clamp, hashStr } from './rng';
import { refereeFor } from './names';
import { engineConfig } from './simTypes';
import type { Plan, SimState, SportModel } from './simTypes';
import { football, footballExtras, playedAt, trackerAt } from './sports/football';
import type { FootballData } from './sports/football';
import { basketball } from './sports/basketball';
import { tennis } from './sports/tennis';
import { cricket } from './sports/cricket';
import { rugby } from './sports/rugby';
import type {
  LeagueRef, MatchDetail, MatchEvent, MatchStatus, MatchSummary, Team, TeamRef, WatchInfo,
} from './types';

export { engineConfig } from './simTypes';
export type { Plan, SimState } from './simTypes';

const MODELS: Record<string, SportModel> = { football, basketball, tennis, cricket, rugby };

// ---- admin overrides (manual score / status corrections) ----
export interface MatchOverride { homeScore?: number; awayScore?: number; status?: MatchStatus }
const overrides = new Map<string, MatchOverride>();
export const setOverride = (id: string, o: MatchOverride | null) => {
  if (!o) overrides.delete(id);
  else overrides.set(id, o);
};
export const getOverrides = () => Object.fromEntries(overrides);
export const loadOverrides = (o: Record<string, MatchOverride>) => {
  overrides.clear();
  for (const [k, v] of Object.entries(o)) overrides.set(k, v);
};

// ---- plan cache ----
const planCache = new Map<string, Plan>();
export function getPlan(f: Fixture): Plan {
  const hit = planCache.get(f.id);
  if (hit) return hit;
  const home = teamById.get(f.homeId)!;
  const away = teamById.get(f.awayId)!;
  const plan = MODELS[f.sportId].build(f, home, away);
  if (planCache.size > 5000) {
    const first = planCache.keys().next().value as string;
    planCache.delete(first);
  }
  planCache.set(f.id, plan);
  return plan;
}

export function planById(id: string): Plan | null {
  const f = fixtureById(id);
  return f ? getPlan(f) : null;
}

export const wallAt = (plan: Plan, now: number) => ((now - plan.fixture.kickoff) / MIN) * engineConfig.speed;

/** Real time (ms) at which the match ends. */
export const endTime = (plan: Plan) => plan.fixture.kickoff + (plan.totalWall / engineConfig.speed) * MIN;

export function simState(plan: Plan, now: number): SimState {
  if (plan.fixture.postponed) {
    return { status: 'POSTPONED', wall: -1, progress: 0, clock: 'PP', minute: null, period: 'Postponed', homeScore: 0, awayScore: 0, events: [] };
  }
  const st = MODELS[plan.sport].state(plan, wallAt(plan, now));
  const o = overrides.get(plan.fixture.id);
  if (o) {
    if (o.homeScore !== undefined) st.homeScore = o.homeScore;
    if (o.awayScore !== undefined) st.awayScore = o.awayScore;
    if (o.status) {
      st.status = o.status;
      if (o.status === 'FINISHED') { st.clock = 'FT'; st.period = 'Full time'; }
      if (o.status === 'POSTPONED') { st.clock = 'PP'; st.period = 'Postponed'; }
    }
  }
  return st;
}

export const teamRef = (t: Team): TeamRef => ({ id: t.id, name: t.name, short: t.short, color: t.color, color2: t.color2, country: t.country });
export const leagueRef = (l: LeagueDef): LeagueRef => ({ id: l.id, name: l.name, short: l.short, sportId: l.sportId, country: l.country, flag: l.flag });

function watchFor(plan: Plan, st: SimState, now: number): WatchInfo | undefined {
  const league = leagueById.get(plan.fixture.leagueId)!;
  const h = hashStr('watch:' + plan.fixture.id);
  if (plan.fixture.postponed || h % 100 >= league.streamPct) return undefined;
  const avg = (plan.home.strength + plan.away.strength) / 200;
  const live = st.status === 'LIVE' || st.status === 'HALFTIME';
  const wobble = 1 + 0.06 * Math.sin(now / 9000 + (h % 17));
  const base = Math.pow(avg, 3) * 1_900_000 * (0.6 + (h % 100) / 160);
  return {
    hasStream: true,
    quality: plan.fixture.featured && h % 3 === 0 ? '4K' : 'HD',
    viewers: live ? Math.round((base * wobble) / 100) * 100 : 0,
    broadcasters: [league.broadcasters[h % league.broadcasters.length], ...(h % 2 === 0 ? [league.broadcasters[(h + 1) % league.broadcasters.length]] : [])],
  };
}

const lastNotable = (events: MatchEvent[]) => {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type !== 'PERIOD' && e.type !== 'KICKOFF' && e.type !== 'FULLTIME') return `${e.title} · ${e.label}`;
  }
  return undefined;
};

export function summaryOf(plan: Plan, now: number, st: SimState = simState(plan, now)): MatchSummary {
  const league = leagueById.get(plan.fixture.leagueId)!;
  const model = MODELS[plan.sport];
  const o = overrides.get(plan.fixture.id);
  return {
    id: plan.fixture.id,
    leagueId: league.id,
    league: leagueRef(league),
    sportId: plan.sport,
    home: teamRef(plan.home),
    away: teamRef(plan.away),
    kickoff: plan.fixture.kickoff,
    status: st.status,
    clock: st.clock,
    minute: st.minute,
    period: st.period,
    homeScore: st.homeScore,
    awayScore: st.awayScore,
    sets: st.sets,
    scoreLabel: st.scoreLabel,
    venue: plan.sport === 'tennis' ? 'Centre Court' : plan.home.stadium,
    round: plan.fixture.round,
    featured: plan.fixture.featured,
    winProb: st.status === 'POSTPONED' ? undefined : model.winProb(plan, st),
    lastEvent: lastNotable(st.events),
    watch: watchFor(plan, st, now),
    corrected: o ? true : undefined,
  };
}

export function detailOf(plan: Plan, now: number): MatchDetail {
  const st = simState(plan, now);
  const base = summaryOf(plan, now, st);
  const model = MODELS[plan.sport];
  const started = st.status !== 'SCHEDULED' && st.status !== 'POSTPONED';
  const live = st.status === 'LIVE' || st.status === 'HALFTIME';
  const h = hashStr('att:' + plan.fixture.id);
  const detail: MatchDetail = {
    ...base,
    referee: plan.sport === 'tennis' ? `Chair umpire ${refereeFor(plan.fixture.id).split(' ')[1]}` : refereeFor(plan.fixture.id),
    attendance: plan.sport === 'tennis' ? 8000 + (h % 7000) : Math.round((12000 + plan.home.strength * 420 + (h % 6000)) / 10) * 10,
    events: started ? st.events : [],
    stats: started ? model.stats(plan, st) : [],
    tags: [],
    innings: st.innings,
    resultText: st.resultText,
  };
  if (plan.sport === 'football') {
    const p = plan as Plan<FootballData>;
    const ex = footballExtras(p);
    detail.lineups = ex.lineups;
    if (started) {
      const played = Math.floor(playedAt(p.data, wallAt(plan, now)));
      detail.momentum = ex.momentum.slice(0, Math.max(1, Math.min(ex.momentum.length, played + 1)));
      detail.commentary = ex.commentary.filter((c) => c.wall <= st.wall);
      detail.highlights = ex.highlights.filter((x) => x.wall <= st.wall);
    }
    if (live && st.status === 'LIVE') detail.tracker = trackerAt(p, st.wall);
  }
  // descriptive tags
  const tags: string[] = [];
  if (live) {
    const recent = st.events.filter((e) => e.score && st.wall - e.wall < 14);
    if (recent.length) tags.push('High intensity');
    if (st.events.some((e) => e.type === 'RED')) tags.push('Red card');
    if (st.events.some((e) => e.type === 'VAR')) tags.push('VAR');
    if (plan.sport === 'football' && (st.minute ?? 0) >= 80 && Math.abs(st.homeScore - st.awayScore) <= 1) tags.push('Late drama');
  }
  if (plan.fixture.featured) tags.push('Featured');
  detail.tags = tags;
  return detail;
}

export const clampN = clamp;
