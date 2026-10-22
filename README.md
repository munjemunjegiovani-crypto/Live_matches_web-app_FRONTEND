# LiveKick (web app)

Live sports scores platform: live scoreboard, match centre (momentum, pitch tracker, lineups, stats, commentary),
watch centre, leagues and standings, history search, favourites, alerts, admin console, light and dark mode.
Built with **Next.js (App Router), TypeScript and Tailwind CSS**.

> **Runs with no backend and no paid APIs.** By default the app uses a built-in deterministic match simulator
> (5 sports, 14 leagues, 236 teams) that runs in the browser. Accounts, favourites and alerts are stored in
> `localStorage`. All match data is simulated and fictional.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Demo logins on `/login`: **Demo fan** and **Admin** buttons (admin sees `/admin`).

## Use the real backend (optional)

Deploy [scorely-backend](../scorely-backend) and set:

```
NEXT_PUBLIC_API_URL=https://your-api.example.com/api
```

The same UI then talks to the REST API (JWT auth, SSE alerts, admin overrides).
The switch lives in `src/lib/api/index.ts`; `demo.ts` and `http.ts` implement one `Api` interface.

## Structure

```
src/app            routes (/, /scores, /match/[id], /watch, /leagues, /teams/[id], /history, /favorites, /alerts, /admin, /login)
src/components     UI (MatchCard, Standings, match/ Viz + StreamPlayer, Shell, Providers)
src/lib/engine     shared match simulator (identical copy of the backend engine)
src/lib/api        Api interface, demo (browser) and http (backend) implementations
```

## Deploy

Any Next.js host. On Vercel: import the repo, no environment variables needed.

## Notes

- Live video: rights holders control broadcasts. The player shows a clearly labelled demo broadcast, or an official
  `embedUrl` an admin attaches to a match.
- Crests are generated artwork, not real club logos.
