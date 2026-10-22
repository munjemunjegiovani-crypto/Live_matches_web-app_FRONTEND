// Shared domain types. This file is copied verbatim into the frontend (src/lib/engine/types.ts),
// so the REST API and the frontend demo mode always speak the same language.

export type SportId = 'football' | 'basketball' | 'tennis' | 'cricket' | 'rugby';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'FINISHED' | 'POSTPONED';

export interface Sport {
  id: SportId;
  name: string;
  emoji: string;
}

export interface TeamRef {
  id: string;
  name: string;
  short: string;
  color: string;
  color2: string;
  country?: string;
}

export interface LeagueRef {
  id: string;
  name: string;
  short: string;
  sportId: SportId;
  country: string;
  flag: string;
}

export interface StandingZone {
  from: number;
  to: number;
  label: string;
  color: 'primary' | 'secondary' | 'warn' | 'live';
}

export interface League extends LeagueRef {
  season: string;
  kind: 'table' | 'ranking';
  teamCount: number;
  description: string;
  round: string;
  zones: StandingZone[];
}

export interface Team extends TeamRef {
  sportId: SportId;
  leagueIds: string[];
  strength: number; // 0-100, drives the simulator
  stadium: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  number: number;
  position: 'GK' | 'DF' | 'MF' | 'FW';
}

export type EventType =
  | 'GOAL'
  | 'OWN_GOAL'
  | 'PENALTY'
  | 'YELLOW'
  | 'RED'
  | 'SUB'
  | 'VAR'
  | 'PERIOD'
  | 'TRY'
  | 'CONVERSION'
  | 'PENALTY_KICK'
  | 'SET'
  | 'WICKET'
  | 'BOUNDARY'
  | 'RUN'
  | 'KICKOFF'
  | 'FULLTIME';

export interface MatchEvent {
  id: string;
  type: EventType;
  /** wall-clock minutes since kickoff on the simulator timeline (internal) */
  wall: number;
  /** numeric match minute (1-90+) used for ordering */
  minute: number;
  /** display label such as "45+2'" */
  label: string;
  side?: 'home' | 'away';
  teamId?: string;
  player?: string;
  assist?: string;
  playerOut?: string;
  title: string;
  text: string;
  /** running score after this event, when it changes the score */
  score?: [number, number];
}

export interface WatchInfo {
  hasStream: boolean;
  quality: 'HD' | '4K';
  viewers: number;
  broadcasters: { name: string; region: string }[];
  /** An official embed URL (e.g. a league's YouTube channel). When empty the UI shows the demo player. */
  embedUrl?: string;
}

export interface MatchSummary {
  id: string;
  leagueId: string;
  league: LeagueRef;
  sportId: SportId;
  home: TeamRef;
  away: TeamRef;
  /** epoch ms */
  kickoff: number;
  status: MatchStatus;
  /** short clock label shown on cards: 78', HT, FT, Q3 3:42, Set 2 */
  clock: string;
  minute: number | null;
  period: string;
  homeScore: number;
  awayScore: number;
  /** Tennis: [homeGames, awayGames] per set (current set last) */
  sets?: [number, number][];
  /** Cricket: "168/6" style labels */
  scoreLabel?: { home: string; away: string };
  venue: string;
  round: string;
  featured: boolean;
  winProb?: { home: number; draw: number; away: number };
  lastEvent?: string;
  watch?: WatchInfo;
  /** true when an admin corrected the score/status manually */
  corrected?: boolean;
}

export interface StatRow {
  key: string;
  label: string;
  home: number;
  away: number;
  /** how to render the number */
  format: 'int' | 'pct' | 'dec';
  /** optional free text (e.g. "3/7") that replaces the number */
  homeText?: string;
  awayText?: string;
}

export interface LineupPlayer {
  id: string;
  name: string;
  number: number;
  position: Player['position'];
  /** pitch coordinates 0-100 (x along the length, home attacks left→right) */
  x: number;
  y: number;
}

export interface Lineup {
  teamId: string;
  formation: string;
  starters: LineupPlayer[];
  bench: { id: string; name: string; number: number; position: Player['position'] }[];
  coach: string;
}

export interface CommentaryItem {
  id: string;
  /** wall-clock minute on the simulator timeline (internal ordering) */
  wall: number;
  minute: number;
  label: string;
  kind: 'chance' | 'tactical' | 'goal' | 'card' | 'sub' | 'info';
  title: string;
  text: string;
}

export interface Highlight {
  id: string;
  wall: number;
  minute: number;
  title: string;
  subtitle: string;
  durationSec: number;
  kind: 'goal' | 'card' | 'save' | 'moment';
}

export interface TrackerState {
  /** ball position on a 0-100 pitch (home attacks left→right) */
  x: number;
  y: number;
  attacking: 'home' | 'away' | 'none';
  /** 0-100 */
  pressure: number;
  zone: string;
  headline: string;
}

export interface MatchDetail extends MatchSummary {
  referee: string;
  attendance: number;
  events: MatchEvent[];
  stats: StatRow[];
  lineups?: { home: Lineup; away: Lineup };
  /** football only: -1 (away pressure) … +1 (home pressure) per minute up to now */
  momentum?: number[];
  commentary?: CommentaryItem[];
  highlights?: Highlight[];
  tracker?: TrackerState;
  /** short descriptive tags like "High intensity" */
  tags: string[];
  /** Cricket: innings detail */
  innings?: { team: 'home' | 'away'; runs: number; wickets: number; overs: string }[];
  resultText?: string;
}

export interface StandingRow {
  position: number;
  team: TeamRef;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface RankingRow {
  rank: number;
  team: TeamRef;
  points: number;
  country: string;
  form: ('W' | 'D' | 'L')[];
}

export interface Scorer {
  rank: number;
  player: string;
  team: TeamRef;
  goals: number;
  assists: number;
  games: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MatchFilters {
  sport?: SportId;
  league?: string;
  team?: string;
  status?: 'live' | 'upcoming' | 'finished' | 'all';
  from?: number;
  to?: number;
  q?: string;
  watch?: boolean;
  page?: number;
  limit?: number;
  order?: 'asc' | 'desc';
  result?: 'home' | 'draw' | 'away';
}

export interface H2HSummary {
  teamA: TeamRef;
  teamB: TeamRef;
  winsA: number;
  winsB: number;
  draws: number;
  goalsA: number;
  goalsB: number;
  matches: MatchSummary[];
}

export interface TeamProfile {
  team: Team;
  leagues: LeagueRef[];
  form: ('W' | 'D' | 'L')[];
  next: MatchSummary[];
  results: MatchSummary[];
  squad: Player[];
  summary: { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number };
  position?: { leagueId: string; leagueName: string; position: number; points: number };
}

export interface SearchResults {
  teams: TeamRef[];
  leagues: LeagueRef[];
  matches: MatchSummary[];
}
