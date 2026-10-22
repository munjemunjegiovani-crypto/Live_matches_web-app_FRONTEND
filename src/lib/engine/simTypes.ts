import type { MatchEvent, MatchStatus, SportId, StatRow, Team } from './types';
import type { Fixture } from './schedule';

/** Demo speed: how many match-minutes pass per real minute. 3 means a 105-minute football match lasts 35 real minutes. */
export const engineConfig = { speed: 3 };

export interface Plan<D = any> {
  fixture: Fixture;
  home: Team;
  away: Team;
  sport: SportId;
  /** total length of the match on the simulator timeline (wall minutes) */
  totalWall: number;
  /** every event of the match, sorted by wall time */
  events: MatchEvent[];
  data: D;
}

export interface SimState {
  status: MatchStatus;
  wall: number;
  /** 0..1 of the total match length */
  progress: number;
  clock: string;
  minute: number | null;
  period: string;
  homeScore: number;
  awayScore: number;
  sets?: [number, number][];
  scoreLabel?: { home: string; away: string };
  events: MatchEvent[];
  innings?: { team: 'home' | 'away'; runs: number; wickets: number; overs: string }[];
  resultText?: string;
}

export interface SportModel<D = any> {
  build(f: Fixture, home: Team, away: Team): Plan<D>;
  state(plan: Plan<D>, wall: number): SimState;
  stats(plan: Plan<D>, state: SimState): StatRow[];
  winProb(plan: Plan<D>, state: SimState): { home: number; draw: number; away: number };
}

export const visible = (events: MatchEvent[], wall: number) => events.filter((e) => e.wall <= wall);

export function logistic(x: number) {
  return 1 / (1 + Math.exp(-x));
}

export function statusFor(wall: number, total: number): MatchStatus {
  if (wall < 0) return 'SCHEDULED';
  if (wall >= total) return 'FINISHED';
  return 'LIVE';
}
