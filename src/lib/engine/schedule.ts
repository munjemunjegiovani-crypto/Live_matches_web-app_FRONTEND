import { LEAGUES, leagueById, teamById } from './catalog';
import type { LeagueDef } from './catalog';
import { Rand, hashStr, mod } from './rng';
import type { SportId } from './types';

export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export interface Fixture {
  id: string;
  leagueId: string;
  sportId: SportId;
  homeId: string;
  awayId: string;
  kickoff: number;
  round: string;
  roundNo: number;
  featured: boolean;
  postponed: boolean;
}

export const dayNum = (ms: number) => Math.floor(ms / DAY);
// Weeks start on Monday. 1970-01-05 (day 4) was a Monday.
const weekOfDay = (d: number) => Math.floor((d - 4) / 7);
const weekStartDay = (w: number) => 4 + 7 * w;

const FEATURED_MIN: Record<string, number> = {
  epl: 74, laliga: 74, seriea: 72, bundesliga: 74, ligue1: 70, ucl: 0, 'elite-one': 999, j1: 999,
  nba: 66, ipl: 62, bbl: 60, 'six-nations': 70, atp: 85, wta: 85,
};

const rrCache = new Map<string, [string, string][]>();
/** Circle-method round robin. `round` is 0..n-2. Works for an even number of teams. */
function roundRobin(league: LeagueDef, round: number): [string, string][] {
  const key = `${league.id}:${round}`;
  const hit = rrCache.get(key);
  if (hit) return hit;
  const teams = league.teamIds;
  const n = teams.length;
  const m = n - 1;
  const others = teams.slice(1);
  const rot = (k: number) => others[mod(k + round, m)];
  const pairs: [string, string][] = [];
  pairs.push(round % 2 === 0 ? [teams[0], rot(0)] : [rot(0), teams[0]]);
  for (let i = 1; i < n / 2; i++) pairs.push([rot(i), rot(m - i)]);
  rrCache.set(key, pairs);
  return pairs;
}

function finish(
  league: LeagueDef,
  id: string,
  homeId: string,
  awayId: string,
  kickoff: number,
  round: string,
  roundNo: number,
): Fixture {
  const h = teamById.get(homeId)!;
  const a = teamById.get(awayId)!;
  const avg = (h.strength + a.strength) / 2;
  return {
    id,
    leagueId: league.id,
    sportId: league.sportId,
    homeId,
    awayId,
    kickoff,
    round,
    roundNo,
    featured: avg >= (FEATURED_MIN[league.id] ?? 80),
    postponed: league.sportId !== 'tennis' && hashStr('pp:' + id) % 80 === 0,
  };
}

function weeklyFixture(league: LeagueDef, w: number, s: number): Fixture | null {
  const sch = league.schedule;
  if (sch.kind !== 'weekly') return null;
  const n = league.teamIds.length;
  const per = n / 2;
  const P = sch.parts.length;
  const part = Math.floor(s / per);
  const idx = s % per;
  const r = mod(w * P + part, sch.rounds);
  const rr = r % (n - 1);
  const swap = r >= n - 1;
  const pairs = roundRobin(league, rr);
  // shuffle which fixture lands in which kickoff slot so one club does not always play first
  const order = new Rand(`slots:${league.id}:${w}:${part}`).shuffle(pairs.map((_, i) => i));
  let [h, a] = pairs[order[idx]];
  if (swap) [h, a] = [a, h];
  const [dow, hh, mm] = sch.parts[part][idx];
  const kickoff = (weekStartDay(w) + dow) * DAY + (hh * 60 + mm) * MIN;
  const label = league.id === 'ucl' ? `League phase · MD ${r + 1}` : `Matchday ${r + 1}`;
  return finish(league, `${league.id}.${w}.${s}`, h, a, kickoff, label, r + 1);
}

function dailyFixture(league: LeagueDef, d: number, s: number): Fixture | null {
  const sch = league.schedule;
  if (sch.kind !== 'daily') return null;
  const n = league.teamIds.length;
  const dowMon0 = mod(d - 4, 7);
  const times = sch.times(dowMon0);
  if (s >= times.length) return null;
  const pairs = roundRobin(league, mod(d, n - 1));
  const half = n / 2;
  const offset = mod(d * 3, half);
  let [h, a] = pairs[(offset + s) % half];
  if ((d + s) % 2 === 1) [h, a] = [a, h];
  const [hh, mm] = times[s];
  const kickoff = d * DAY + (hh * 60 + mm) * MIN;
  const label = league.sportId === 'cricket' ? `Match ${mod(d, 56) + 1}` : 'Regular season';
  return finish(league, `${league.id}.${d}.${s}`, h, a, kickoff, label, mod(d, 70) + 1);
}

const TENNIS_ROUNDS = ['Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal', 'Final'];
function streamFixture(league: LeagueDef, k: number): Fixture | null {
  const sch = league.schedule;
  if (sch.kind !== 'stream') return null;
  const players = league.teamIds;
  const block = Math.floor(k / 12);
  const pos = mod(k, 12);
  const order = new Rand(`tennis:${league.id}:${block}`).shuffle(players);
  const [h, a] = [order[2 * pos], order[2 * pos + 1]];
  const kickoff = k * HOUR + sch.offsetMin * MIN;
  const tour = league.id === 'atp' ? 'Masters 1000' : 'WTA 1000';
  const rn = mod(block, 5);
  return finish(league, `${league.id}.${k}`, h, a, kickoff, `${tour} · ${TENNIS_ROUNDS[rn]}`, rn + 1);
}

export function fixtureById(id: string): Fixture | null {
  const parts = id.split('.');
  const league = leagueById.get(parts[0]);
  if (!league) return null;
  const nums = parts.slice(1).map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  try {
    if (league.schedule.kind === 'weekly') {
      if (nums.length !== 2 || nums[1] < 0 || nums[1] >= league.schedule.parts.length * (league.teamIds.length / 2)) return null;
      return weeklyFixture(league, nums[0], nums[1]);
    }
    if (league.schedule.kind === 'daily') {
      if (nums.length !== 2) return null;
      return dailyFixture(league, nums[0], nums[1]);
    }
    if (nums.length !== 1) return null;
    return streamFixture(league, nums[0]);
  } catch {
    return null;
  }
}

/** All fixtures with kickoff in [from, to). */
export function fixturesInRange(from: number, to: number, leagueIds?: string[]): Fixture[] {
  const out: Fixture[] = [];
  const leagues = leagueIds ? LEAGUES.filter((l) => leagueIds.includes(l.id)) : LEAGUES;
  for (const league of leagues) {
    const sch = league.schedule;
    if (sch.kind === 'weekly') {
      const w0 = weekOfDay(dayNum(from));
      const w1 = weekOfDay(dayNum(to - 1));
      for (let w = w0; w <= w1; w++) {
        for (let s = 0; s < sch.parts.length * (league.teamIds.length / 2); s++) {
          const f = weeklyFixture(league, w, s);
          if (f && f.kickoff >= from && f.kickoff < to) out.push(f);
        }
      }
    } else if (sch.kind === 'daily') {
      for (let d = dayNum(from); d <= dayNum(to - 1); d++) {
        for (let s = 0; s < sch.times(mod(d - 4, 7)).length; s++) {
          const f = dailyFixture(league, d, s);
          if (f && f.kickoff >= from && f.kickoff < to) out.push(f);
        }
      }
    } else {
      const k0 = Math.floor((from - sch.offsetMin * MIN) / HOUR);
      const k1 = Math.floor((to - 1 - sch.offsetMin * MIN) / HOUR);
      for (let k = k0; k <= k1; k++) {
        const f = streamFixture(league, k);
        if (f && f.kickoff >= from && f.kickoff < to) out.push(f);
      }
    }
  }
  out.sort((a, b) => a.kickoff - b.kickoff || a.id.localeCompare(b.id));
  return out;
}

/** Approximate span of time (ms) a league's match can keep a fixture "live", used to widen live lookups. */
export const MAX_LIVE_SPAN_MS = 4 * HOUR;
