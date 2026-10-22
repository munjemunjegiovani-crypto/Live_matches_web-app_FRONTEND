import type {
  H2HSummary, League, MatchDetail, MatchFilters, MatchSummary, Paged, RankingRow, Scorer, SearchResults, Sport,
  SportId, StandingRow, Team, TeamProfile,
} from '../engine';

export type Role = 'user' | 'admin';
export interface Prefs { theme: 'light' | 'dark' | 'system'; notifyGoals: boolean; notifyStart: boolean; notifyEnd: boolean }
export interface AppUser { id: string; email: string; name: string; role: Role; createdAt: number; prefs: Prefs }
export interface Favorites { teams: Team[]; leagues: League[]; matches: MatchSummary[] }
export type FavKind = 'team' | 'league' | 'match';
export interface AppNotification {
  id: string; type: 'GOAL' | 'KICKOFF' | 'FULLTIME' | 'SYSTEM'; title: string; body: string; matchId?: string; read: boolean; createdAt: number;
}
export interface JobRun { id: string; name: string; startedAt: number; durationMs: number; ok: boolean; message: string }
export interface AdminOverview { users: number; admins: number; liveMatches: number; sseClients: number; overrides: number; uptimeSec: number; leagues: number; teams: number }
export interface MatchOverridePatch { homeScore?: number; awayScore?: number; status?: 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'FINISHED' | 'POSTPONED'; embedUrl?: string | null }
export type StandingsResult =
  | { league: League; kind: 'table'; rows: StandingRow[] }
  | { league: League; kind: 'ranking'; rankings: RankingRow[] };
export interface Meta { total: number; live: number; counts: Record<string, { total: number; live: number }> }

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'error') { super(message); }
}

export interface Api {
  mode: 'demo' | 'api';
  sports(): Promise<Sport[]>;
  leagues(f?: { sport?: SportId; q?: string }): Promise<League[]>;
  league(id: string): Promise<League>;
  standings(id: string): Promise<StandingsResult>;
  scorers(id: string): Promise<Scorer[]>;
  teams(f?: { q?: string; sport?: SportId; league?: string }): Promise<Team[]>;
  team(id: string): Promise<TeamProfile>;
  matches(f?: MatchFilters): Promise<Paged<MatchSummary>>;
  live(sport?: SportId): Promise<MatchSummary[]>;
  match(id: string): Promise<MatchDetail>;
  h2h(a: string, b: string): Promise<H2HSummary>;
  history(f?: MatchFilters): Promise<Paged<MatchSummary>>;
  search(q: string): Promise<SearchResults>;
  meta(from: number, to: number): Promise<Meta>;

  register(b: { name: string; email: string; password: string }): Promise<AppUser>;
  login(b: { email: string; password: string }): Promise<AppUser>;
  logout(): void;
  me(): Promise<AppUser | null>;
  updateMe(p: { name?: string; prefs?: Partial<Prefs> }): Promise<AppUser>;

  favorites(): Promise<Favorites>;
  favoriteIds(): Promise<{ kind: FavKind; refId: string }[]>;
  addFavorite(kind: FavKind, refId: string): Promise<void>;
  removeFavorite(kind: FavKind, refId: string): Promise<void>;

  notifications(): Promise<{ items: AppNotification[]; unread: number }>;
  markRead(id?: string): Promise<void>;
  removeNotification(id: string): Promise<void>;
  /** push channel for new notifications while the app is open */
  onNotification(cb: (n: AppNotification) => void): () => void;

  admin: {
    overview(): Promise<AdminOverview>;
    users(): Promise<AppUser[]>;
    setRole(id: string, role: Role): Promise<void>;
    override(id: string, p: MatchOverridePatch): Promise<MatchDetail>;
    clearOverride(id: string): Promise<void>;
    jobs(): Promise<JobRun[]>;
    sync(): Promise<{ live: number; changes: number }>;
  };
}
