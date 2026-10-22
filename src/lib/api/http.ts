import { ApiError } from './types';
import type { Api, AppNotification, AppUser } from './types';
import type { MatchFilters } from '../engine';

const TOKEN = 'scorely.token';
const tok = () => { try { return localStorage.getItem(TOKEN); } catch { return null; } };
const setTok = (t: string | null) => { try { t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN); } catch { /* ignore */ } };

export function createHttpApi(base: string): Api {
  const url = base.replace(/\/$/, '');
  async function call<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
    const t = tok();
    const res = await fetch(url + path, {
      method: init.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data?.error?.message ?? res.statusText, data?.error?.code);
    return data as T;
  }
  const qs = (o: object = {}) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '' && v !== null) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : '';
  };
  const f = (x?: MatchFilters) => qs(x);

  const api: Api = {
    mode: 'api',
    sports: async () => (await call<{ items: never[] }>('/sports')).items,
    leagues: async (x) => (await call<{ items: never[] }>('/leagues' + qs(x))).items,
    league: (id) => call(`/leagues/${id}`),
    standings: (id) => call(`/leagues/${id}/standings`),
    scorers: async (id) => (await call<{ items: never[] }>(`/leagues/${id}/scorers`)).items,
    teams: async (x) => (await call<{ items: never[] }>('/teams' + qs(x))).items,
    team: (id) => call(`/teams/${id}`),
    matches: (x) => call('/matches' + f(x)),
    live: async (sport) => (await call<{ items: never[] }>('/matches/live' + qs({ sport }))).items,
    match: (id) => call(`/matches/${id}`),
    h2h: (a, b) => call(`/head-to-head/${a}/${b}`),
    history: (x) => call('/history' + f(x)),
    search: (q) => call('/search' + qs({ q })),
    meta: (from, to) => call('/scoreboard/meta' + qs({ from, to })),

    async register(b) { const r = await call<{ token: string; user: AppUser }>('/auth/register', { method: 'POST', body: b }); setTok(r.token); return r.user; },
    async login(b) { const r = await call<{ token: string; user: AppUser }>('/auth/login', { method: 'POST', body: b }); setTok(r.token); return r.user; },
    logout() { setTok(null); },
    async me() { if (!tok()) return null; try { return await call<AppUser>('/users/me'); } catch (e) { if (e instanceof ApiError && e.status === 401) { setTok(null); return null; } throw e; } },
    updateMe: (p) => call('/users/me', { method: 'PATCH', body: p }),

    favorites: () => call('/users/me/favorites'),
    favoriteIds: async () => { if (!tok()) return []; return (await call<{ raw: { kind: never; refId: string }[] }>('/users/me/favorites')).raw; },
    addFavorite: async (kind, refId) => { await call('/users/me/favorites', { method: 'POST', body: { kind, refId } }); },
    removeFavorite: async (kind, refId) => { await call(`/users/me/favorites/${kind}/${refId}`, { method: 'DELETE' }); },

    notifications: () => call('/users/me/notifications'),
    markRead: async (id) => { await call(id ? `/users/me/notifications/${id}/read` : '/users/me/notifications/read', { method: 'POST' }); },
    removeNotification: async (id) => { await call(`/users/me/notifications/${id}`, { method: 'DELETE' }); },
    onNotification(cb) {
      const t = tok();
      if (!t || typeof EventSource === 'undefined') return () => {};
      const es = new EventSource(`${url}/stream?token=${encodeURIComponent(t)}`);
      es.addEventListener('notification', (e) => cb(JSON.parse((e as MessageEvent).data) as AppNotification));
      return () => es.close();
    },

    admin: {
      overview: () => call('/admin/overview'),
      users: async () => (await call<{ items: AppUser[] }>('/admin/users')).items,
      setRole: async (id, role) => { await call(`/admin/users/${id}`, { method: 'PATCH', body: { role } }); },
      override: (id, p) => call(`/admin/matches/${id}`, { method: 'PATCH', body: p }),
      clearOverride: async (id) => { await call(`/admin/matches/${id}/override`, { method: 'DELETE' }); },
      jobs: async () => (await call<{ items: never[] }>('/admin/jobs')).items,
      sync: () => call('/admin/sync', { method: 'POST' }),
    },
  };
  return api;
}
