import { Rand, clamp } from '../rng';
import type { MatchEvent, StatRow, Team } from '../types';
import type { Fixture } from '../schedule';
import type { Plan, SimState, SportModel } from '../simTypes';
import { logistic, visible } from '../simTypes';

type Side = 'home' | 'away';
interface Win { name: string; start: number; end: number; kind: 'play' | 'break' | 'half'; gameMin: number }
interface Play { wall: number; side: Side; pts: 1 | 2 | 3 }

export interface BasketData {
  kind: 'basketball';
  windows: Win[];
  plays: Play[];
  final: Record<string, number>;
}

function build(f: Fixture, home: Team, away: Team): Plan<BasketData> {
  const rnd = new Rand('bb:' + f.id);
  const windows: Win[] = [
    { name: 'Q1', start: 0, end: 30, kind: 'play', gameMin: 12 },
    { name: 'End Q1', start: 30, end: 35, kind: 'break', gameMin: 0 },
    { name: 'Q2', start: 35, end: 65, kind: 'play', gameMin: 12 },
    { name: 'HT', start: 65, end: 80, kind: 'half', gameMin: 0 },
    { name: 'Q3', start: 80, end: 110, kind: 'play', gameMin: 12 },
    { name: 'End Q3', start: 110, end: 115, kind: 'break', gameMin: 0 },
    { name: 'Q4', start: 115, end: 145, kind: 'play', gameMin: 12 },
  ];
  const plays: Play[] = [];
  const addWindow = (w: Win, ot: boolean) => {
    for (const side of ['home', 'away'] as Side[]) {
      const team = side === 'home' ? home : away;
      const n = ot ? rnd.int(3, 5) : Math.max(8, Math.round(11.5 + (team.strength - 50) / 30 + (side === 'home' ? 0.3 : 0) + rnd.gauss(0, 1.2)));
      const times = Array.from({ length: n }, () => rnd.float(w.start + 0.3, w.end - 0.2)).sort((a, b) => a - b);
      for (const t of times) {
        const p3 = 0.28 + (team.strength - 50) / 500;
        const pts = rnd.weighted([2, 3, 1] as const, [0.58, p3, 0.14]);
        plays.push({ wall: t, side, pts });
      }
    }
  };
  windows.filter((w) => w.kind === 'play').forEach((w) => addWindow(w, false));
  const sum = () => {
    let h = 0, a = 0;
    for (const p of plays) if (p.side === 'home') h += p.pts; else a += p.pts;
    return [h, a];
  };
  let ots = 0;
  while (sum()[0] === sum()[1] && ots < 3) {
    ots++;
    const prev = windows[windows.length - 1].end;
    const w: Win = { name: ots === 1 ? 'OT' : `${ots}OT`, start: prev + 2, end: prev + 14, kind: 'play', gameMin: 5 };
    windows.push(w);
    addWindow(w, true);
  }
  if (sum()[0] === sum()[1]) {
    const last = windows[windows.length - 1];
    plays.push({ wall: last.end - 0.1, side: 'home', pts: 1 });
  }
  plays.sort((a, b) => a.wall - b.wall);
  const total = windows[windows.length - 1].end;

  // events: quarter ends and scoring runs
  const events: MatchEvent[] = [];
  const scoreAt = (w: number): [number, number] => {
    let h = 0, a = 0;
    for (const p of plays) if (p.wall <= w) { if (p.side === 'home') h += p.pts; else a += p.pts; }
    return [h, a];
  };
  let runSide: Side | null = null;
  let run = 0;
  let h = 0, a = 0;
  let emitted8 = false, emitted12 = false;
  for (const p of plays) {
    if (p.side === 'home') h += p.pts; else a += p.pts;
    if (p.side === runSide) run += p.pts; else { runSide = p.side; run = p.pts; emitted8 = false; emitted12 = false; }
    const team = p.side === 'home' ? home : away;
    if ((run >= 8 && !emitted8) || (run >= 12 && !emitted12)) {
      if (run >= 12) emitted12 = true; else emitted8 = true;
      events.push({ id: '', type: 'RUN', wall: p.wall, minute: 0, label: windows.find((w) => p.wall >= w.start && p.wall <= w.end)?.name ?? '', side: p.side, teamId: team.id,
        title: `${team.short} on a ${run}-0 run`, text: `${team.name} score ${run} unanswered to make it ${h}-${a}`, score: [h, a] });
    }
  }
  for (const w of windows) {
    if (w.kind === 'play') {
      const [sh, sa] = scoreAt(w.end);
      events.push({ id: '', type: 'PERIOD', wall: w.end, minute: 0, label: w.name, title: `End of ${w.name}`, text: `${home.short} ${sh}-${sa} ${away.short}`, score: [sh, sa] });
    }
  }
  events.sort((x, y) => x.wall - y.wall);
  events.forEach((e, i) => (e.id = `${f.id}:${i}`));

  const final: Record<string, number> = {
    fgH: rnd.int(42, 52), fgA: rnd.int(42, 52), p3H: rnd.int(30, 42), p3A: rnd.int(30, 42),
    rebH: rnd.int(38, 52), rebA: rnd.int(38, 52), astH: rnd.int(19, 31), astA: rnd.int(19, 31),
    toH: rnd.int(9, 16), toA: rnd.int(9, 16), stlH: rnd.int(5, 10), stlA: rnd.int(5, 10),
    blkH: rnd.int(2, 7), blkA: rnd.int(2, 7), fbH: rnd.int(8, 18), fbA: rnd.int(8, 18),
    paintH: rnd.int(34, 54), paintA: rnd.int(34, 54),
  };
  return { fixture: f, home, away, sport: 'basketball', totalWall: total, events, data: { kind: 'basketball', windows, plays, final } };
}

function scoreAt(plan: Plan<BasketData>, wall: number) {
  let h = 0, a = 0, threesH = 0, threesA = 0, ftH = 0, ftA = 0;
  for (const p of plan.data.plays) {
    if (p.wall > wall) break;
    if (p.side === 'home') { h += p.pts; if (p.pts === 3) threesH++; if (p.pts === 1) ftH++; }
    else { a += p.pts; if (p.pts === 3) threesA++; if (p.pts === 1) ftA++; }
  }
  return { h, a, threesH, threesA, ftH, ftA };
}

function state(plan: Plan<BasketData>, wall: number): SimState {
  const total = plan.totalWall;
  const s = scoreAt(plan, wall);
  const evs = visible(plan.events, wall);
  const base = { wall, progress: clamp(wall / total, 0, 1), homeScore: s.h, awayScore: s.a, minute: null as number | null, events: evs };
  if (wall < 0) return { ...base, status: 'SCHEDULED', clock: '', period: '' };
  if (wall >= total) return { ...base, status: 'FINISHED', clock: 'FT', period: 'Final' };
  const w = plan.data.windows.find((x) => wall >= x.start && wall < x.end) ?? plan.data.windows[plan.data.windows.length - 1];
  if (w.kind === 'half') return { ...base, status: 'HALFTIME', clock: 'HT', period: 'Half-time' };
  if (w.kind === 'break') return { ...base, status: 'LIVE', clock: w.name, period: w.name };
  const remaining = w.gameMin * (1 - (wall - w.start) / (w.end - w.start));
  const mm = Math.floor(remaining);
  const ss = Math.floor((remaining - mm) * 60);
  return { ...base, status: 'LIVE', clock: `${w.name} ${mm}:${String(ss).padStart(2, '0')}`, period: w.name };
}

function stats(plan: Plan<BasketData>, st: SimState): StatRow[] {
  const f = plan.data.final;
  const p = clamp(st.progress, 0, 1);
  const k = p >= 1 ? 1 : Math.pow(p, 0.95);
  const c = (v: number) => Math.floor(v * k + 1e-9);
  const s = scoreAt(plan, st.wall);
  // biggest lead so far
  let lead = 0;
  let rh = 0, ra = 0;
  for (const pl of plan.data.plays) {
    if (pl.wall > st.wall) break;
    if (pl.side === 'home') rh += pl.pts; else ra += pl.pts;
    lead = Math.max(lead, Math.abs(rh - ra));
  }
  const pct = (v: number) => (p <= 0 ? 0 : Math.round(v + (1 - Math.min(1, p * 2)) * 2));
  return [
    { key: 'fg', label: 'Field Goal %', home: pct(f.fgH), away: pct(f.fgA), format: 'pct' },
    { key: 'p3', label: '3-Point %', home: pct(f.p3H), away: pct(f.p3A), format: 'pct' },
    { key: 'threes', label: '3-Pointers Made', home: s.threesH, away: s.threesA, format: 'int' },
    { key: 'ft', label: 'Free Throws Made', home: s.ftH, away: s.ftA, format: 'int' },
    { key: 'reb', label: 'Rebounds', home: c(f.rebH), away: c(f.rebA), format: 'int' },
    { key: 'ast', label: 'Assists', home: c(f.astH), away: c(f.astA), format: 'int' },
    { key: 'to', label: 'Turnovers', home: c(f.toH), away: c(f.toA), format: 'int' },
    { key: 'stl', label: 'Steals', home: c(f.stlH), away: c(f.stlA), format: 'int' },
    { key: 'blk', label: 'Blocks', home: c(f.blkH), away: c(f.blkA), format: 'int' },
    { key: 'fb', label: 'Fast-break Points', home: c(f.fbH), away: c(f.fbA), format: 'int' },
    { key: 'paint', label: 'Points in the Paint', home: c(f.paintH), away: c(f.paintA), format: 'int' },
    { key: 'lead', label: 'Biggest Lead', home: s.h >= s.a ? lead : 0, away: s.a > s.h ? lead : 0, format: 'int' },
  ];
}

function winProb(plan: Plan<BasketData>, st: SimState) {
  const lead = st.homeScore - st.awayScore;
  const rem = Math.max(0.03, 1 - st.progress);
  const base = (plan.home.strength - plan.away.strength) / 18 + 0.1;
  if (st.status === 'FINISHED') return { home: lead > 0 ? 100 : 0, draw: 0, away: lead > 0 ? 0 : 100 };
  const p = logistic(base * Math.sqrt(rem) + lead / (Math.sqrt(rem) * 11));
  return { home: Math.round(p * 100), draw: 0, away: 100 - Math.round(p * 100) };
}

export const basketball: SportModel<BasketData> = { build, state, stats, winProb };
