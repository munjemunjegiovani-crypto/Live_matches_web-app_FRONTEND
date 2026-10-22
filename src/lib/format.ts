import type { MatchSummary, SportId } from './engine';

export const SPORT_EMOJI: Record<SportId, string> = { football: '⚽', basketball: '🏀', tennis: '🎾', cricket: '🏏', rugby: '🏉' };
export const SPORT_NAME: Record<SportId, string> = { football: 'Football', basketball: 'Basketball', tennis: 'Tennis', cricket: 'Cricket', rugby: 'Rugby' };

export const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const DAY_MS = 86_400_000;

export const timeOf = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
export const shortDate = (ms: number) => new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' });
export const longDate = (ms: number) => new Date(ms).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
export const dateTime = (ms: number) => `${shortDate(ms)} · ${timeOf(ms)}`;

export function dayLabel(dayStart: number, now = Date.now()) {
  const diff = Math.round((dayStart - startOfDay(now)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return new Date(dayStart).toLocaleDateString([], { weekday: 'short' });
}

export function countdown(target: number, now = Date.now()) {
  const s = Math.max(0, Math.round((target - now) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

export function ago(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const isLive = (m: Pick<MatchSummary, 'status'>) => m.status === 'LIVE' || m.status === 'HALFTIME';
export const scoreOf = (m: MatchSummary) => ({ h: m.scoreLabel?.home ?? String(m.homeScore), a: m.scoreLabel?.away ?? String(m.awayScore) });
export const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
