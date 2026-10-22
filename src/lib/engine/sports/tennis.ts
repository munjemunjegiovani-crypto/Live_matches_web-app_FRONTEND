import { Rand, clamp } from '../rng';
import type { MatchEvent, StatRow, Team } from '../types';
import type { Fixture } from '../schedule';
import type { Plan, SimState, SportModel } from '../simTypes';
import { logistic, visible } from '../simTypes';

type Side = 'home' | 'away';
interface Game { set: number; winner: Side; start: number; end: number }

export interface TennisData {
  kind: 'tennis';
  games: Game[];
  sets: [number, number][];
  winner: Side;
  final: Record<string, number>;
}

function setScore(rnd: Rand): { w: number; l: number } {
  const r = rnd.next();
  if (r < 0.12) return { w: 7, l: 5 };
  if (r < 0.22) return { w: 7, l: 6 };
  return { w: 6, l: rnd.weighted([0, 1, 2, 3, 4], [0.1, 0.2, 0.3, 0.25, 0.15]) };
}

function gameSequence(rnd: Rand, w: Side, l: Side, sc: { w: number; l: number }): Side[] {
  if (sc.w === 6) return [...rnd.shuffle([...Array(5).fill(w), ...Array(sc.l).fill(l)] as Side[]), w];
  if (sc.l === 5) return [...rnd.shuffle([...Array(5).fill(w), ...Array(5).fill(l)] as Side[]), w, w];
  const tail: Side[] = rnd.chance(0.5) ? [w, l] : [l, w];
  return [...rnd.shuffle([...Array(5).fill(w), ...Array(5).fill(l)] as Side[]), ...tail, w];
}

function build(f: Fixture, home: Team, away: Team): Plan<TennisData> {
  const rnd = new Rand('tn:' + f.id);
  const winner: Side = rnd.chance(logistic((home.strength - away.strength) / 16)) ? 'home' : 'away';
  const other: Side = winner === 'home' ? 'away' : 'home';
  const setWinners: Side[] = rnd.chance(0.58) ? [winner, winner] : rnd.chance(0.5) ? [winner, other, winner] : [other, winner, winner];
  const games: Game[] = [];
  const sets: [number, number][] = [];
  const events: MatchEvent[] = [];
  let t = 0;
  setWinners.forEach((sw, si) => {
    const sl: Side = sw === 'home' ? 'away' : 'home';
    const sc = setScore(rnd);
    const seq = gameSequence(rnd, sw, sl, sc);
    sets.push(sw === 'home' ? [sc.w, sc.l] : [sc.l, sc.w]);
    for (const g of seq) {
      const len = 5.6 * rnd.float(0.8, 1.25);
      games.push({ set: si, winner: g, start: t, end: t + len });
      t += len;
    }
    const name = (sw === 'home' ? home : away).name;
    events.push({
      id: '', type: 'SET', wall: t, minute: si + 1, label: `S${si + 1}`, side: sw, teamId: (sw === 'home' ? home : away).id,
      title: `Set ${si + 1} to ${name}`, text: `${name} wins the set ${sw === 'home' ? `${sc.w}-${sc.l}` : `${sc.l}-${sc.w}`}`,
    });
    t += 2; // set break
  });
  const total = t - 2;
  const wn = winner === 'home' ? home : away;
  events.push({ id: '', type: 'FULLTIME', wall: total, minute: 0, label: 'Match', side: winner, teamId: wn.id, title: 'Game, set and match', text: `${wn.name} wins in ${setWinners.length} sets` });
  events.sort((a, b) => a.wall - b.wall);
  // running sets-won score on set events
  let h = 0, a = 0;
  for (const e of events) {
    if (e.type === 'SET') { if (e.side === 'home') h++; else a++; e.score = [h, a]; }
  }
  events.forEach((e, i) => (e.id = `${f.id}:${i}`));
  const final: Record<string, number> = {
    acesH: rnd.int(2, 14), acesA: rnd.int(2, 14), dfH: rnd.int(0, 6), dfA: rnd.int(0, 6),
    fsH: rnd.int(55, 72), fsA: rnd.int(55, 72), bpcH: rnd.int(1, 5), bpcA: rnd.int(1, 5),
    bpoH: rnd.int(3, 9), bpoA: rnd.int(3, 9), winH: rnd.int(16, 42), winA: rnd.int(16, 42), ueH: rnd.int(12, 34), ueA: rnd.int(12, 34),
  };
  final.bpoH = Math.max(final.bpoH, final.bpcH);
  final.bpoA = Math.max(final.bpoA, final.bpcA);
  return { fixture: f, home, away, sport: 'tennis', totalWall: total, events, data: { kind: 'tennis', games, sets, winner, final } };
}

function progress(plan: Plan<TennisData>, wall: number) {
  const { games, sets } = plan.data;
  const done = games.filter((g) => g.end <= wall);
  const per: [number, number][] = sets.map(() => [0, 0]);
  for (const g of done) per[g.set][g.winner === 'home' ? 0 : 1]++;
  const lastDone = done.length ? done[done.length - 1] : null;
  const current = lastDone ? (done.length < games.length ? games[done.length].set : lastDone.set) : 0;
  let hs = 0, as = 0;
  sets.forEach((s, i) => {
    const doneGames = games.filter((g) => g.set === i).length;
    const countedGames = per[i][0] + per[i][1];
    if (countedGames === doneGames) { if (s[0] > s[1]) hs++; else as++; }
  });
  return { per, current, hs, as, done: done.length };
}

function state(plan: Plan<TennisData>, wall: number): SimState {
  const total = plan.totalWall;
  const evs = visible(plan.events, wall);
  if (wall < 0) return { status: 'SCHEDULED', wall, progress: 0, clock: '', minute: null, period: '', homeScore: 0, awayScore: 0, events: evs };
  if (wall >= total) {
    const sets = plan.data.sets;
    const hs = sets.filter((s) => s[0] > s[1]).length;
    return { status: 'FINISHED', wall, progress: 1, clock: 'FT', minute: null, period: 'Final', homeScore: hs, awayScore: sets.length - hs, sets, events: evs };
  }
  const p = progress(plan, wall);
  const sets: [number, number][] = p.per.slice(0, p.current + 1).map((x) => [x[0], x[1]]);
  return {
    status: 'LIVE', wall, progress: clamp(wall / total, 0, 1), clock: `Set ${p.current + 1}`, minute: null, period: `Set ${p.current + 1}`,
    homeScore: p.hs, awayScore: p.as, sets, events: evs,
  };
}

function stats(plan: Plan<TennisData>, st: SimState): StatRow[] {
  const f = plan.data.final;
  const k = st.progress >= 1 ? 1 : Math.pow(clamp(st.progress, 0, 1), 0.95);
  const c = (v: number) => Math.floor(v * k + 1e-9);
  const pct = (v: number) => (st.progress <= 0 ? 0 : v);
  return [
    { key: 'aces', label: 'Aces', home: c(f.acesH), away: c(f.acesA), format: 'int' },
    { key: 'df', label: 'Double Faults', home: c(f.dfH), away: c(f.dfA), format: 'int' },
    { key: 'fs', label: '1st Serve %', home: pct(f.fsH), away: pct(f.fsA), format: 'pct' },
    { key: 'bp', label: 'Break Points Won', home: c(f.bpcH), away: c(f.bpcA), format: 'int', homeText: `${c(f.bpcH)}/${Math.max(c(f.bpoH), c(f.bpcH))}`, awayText: `${c(f.bpcA)}/${Math.max(c(f.bpoA), c(f.bpcA))}` },
    { key: 'winners', label: 'Winners', home: c(f.winH), away: c(f.winA), format: 'int' },
    { key: 'ue', label: 'Unforced Errors', home: c(f.ueH), away: c(f.ueA), format: 'int' },
  ];
}

function winProb(plan: Plan<TennisData>, st: SimState) {
  if (st.status === 'FINISHED') {
    const h = plan.data.winner === 'home';
    return { home: h ? 100 : 0, draw: 0, away: h ? 0 : 100 };
  }
  const base = (plan.home.strength - plan.away.strength) / 16;
  let gamesLead = 0;
  const cur = st.sets?.[st.sets.length - 1];
  if (cur) gamesLead = cur[0] - cur[1];
  const p = logistic(base + (st.homeScore - st.awayScore) * 0.9 + gamesLead * 0.18);
  return { home: Math.round(p * 100), draw: 0, away: 100 - Math.round(p * 100) };
}

export const tennis: SportModel<TennisData> = { build, state, stats, winProb };
