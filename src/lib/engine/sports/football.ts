import { Rand, clamp, round2 } from '../rng';
import { coachFor, shortName, squadFor } from '../names';
import type {
  CommentaryItem, Highlight, Lineup, LineupPlayer, MatchEvent, Player, StatRow, Team, TrackerState,
} from '../types';
import type { Fixture } from '../schedule';
import type { Plan, SimState, SportModel } from '../simTypes';
import { visible } from '../simTypes';

type Side = 'home' | 'away';

interface Sub { side: Side; out: Player; in: Player; wall: number }

export interface FootballData {
  kind: 'football';
  s1: number; // first-half stoppage minutes
  s2: number; // second-half stoppage minutes
  H: number; // wall time at which the second half starts
  lamH: number;
  lamA: number;
  formation: { home: string; away: string };
  xi: Record<Side, Player[]>;
  bench: Record<Side, Player[]>;
  subs: Sub[];
  final: {
    possH: number; shotsH: number; shotsA: number; sotH: number; sotA: number; xgH: number; xgA: number;
    cornersH: number; cornersA: number; foulsH: number; foulsA: number; dangH: number; dangA: number;
  };
}

const FORMATIONS: { name: string; rows: number[] }[] = [
  { name: '4-3-3', rows: [4, 3, 3] },
  { name: '4-2-3-1', rows: [4, 2, 3, 1] },
  { name: '4-4-2', rows: [4, 4, 2] },
  { name: '3-5-2', rows: [3, 5, 2] },
  { name: '4-1-4-1', rows: [4, 1, 4, 1] },
  { name: '4-3-1-2', rows: [4, 3, 1, 2] },
];

const GOAL_STYLES = [
  'a low finish into the corner', 'a curling effort into the top corner', 'a first-time strike from the edge of the box',
  'a header from the corner', 'a calm side-foot finish', 'a driven shot across the keeper', 'a tap-in at the far post',
  'a clever dink over the goalkeeper',
];

function pickLineup(rnd: Rand, team: Team, strengthDiff: number) {
  const squad = squadFor(team.id);
  const gk = squad.filter((p) => p.position === 'GK');
  const df = rnd.shuffle(squad.filter((p) => p.position === 'DF'));
  const mf = rnd.shuffle(squad.filter((p) => p.position === 'MF'));
  const fw = rnd.shuffle(squad.filter((p) => p.position === 'FW'));
  const f = rnd.pick(strengthDiff > 8 ? FORMATIONS.slice(0, 3) : FORMATIONS);
  const dfN = f.rows[0];
  const fwN = f.rows[f.rows.length - 1];
  const mfN = f.rows.slice(1, -1).reduce((a, b) => a + b, 0);
  const xi = [gk[0], ...df.slice(0, dfN), ...mf.slice(0, mfN), ...fw.slice(0, fwN)];
  const benchPool = [...df.slice(dfN), ...mf.slice(mfN), ...fw.slice(fwN)];
  const bench = [gk[1], ...rnd.shuffle(benchPool).slice(0, 6)];
  return { formation: f, xi, bench };
}

function drawTime(rnd: Rand, s1: number, s2: number, H: number) {
  if (rnd.chance(0.45)) {
    if (rnd.chance(0.07)) {
      const e = rnd.int(1, s1);
      return { wall: 45 + (e - 1) + rnd.float(0.05, 0.95), minute: 45, extra: e };
    }
    const m = rnd.int(1, 45);
    return { wall: m - 1 + rnd.float(0.05, 0.95), minute: m, extra: 0 };
  }
  if (rnd.chance(0.1)) {
    const e = rnd.int(1, s2);
    return { wall: H + 45 + (e - 1) + rnd.float(0.05, 0.95), minute: 90, extra: e };
  }
  const m = rnd.int(46, 90);
  return { wall: H + (m - 46) + rnd.float(0.05, 0.95), minute: m, extra: 0 };
}
const labelOf = (t: { minute: number; extra: number }) => (t.extra ? `${t.minute}+${t.extra}'` : `${t.minute}'`);

const POS_W_SCORE: Record<Player['position'], number> = { GK: 0, DF: 1, MF: 2.6, FW: 5.5 };
const POS_W_ASSIST: Record<Player['position'], number> = { GK: 0, DF: 1, MF: 3, FW: 2 };
const POS_W_CARD: Record<Player['position'], number> = { GK: 0.3, DF: 3, MF: 3, FW: 1.4 };

function onPitch(d: FootballData, side: Side, wall: number): Player[] {
  const offIds = new Set(d.subs.filter((s) => s.side === side && s.wall <= wall).map((s) => s.out.id));
  const ins = d.subs.filter((s) => s.side === side && s.wall <= wall).map((s) => s.in);
  return d.xi[side].filter((p) => !offIds.has(p.id)).concat(ins);
}

function build(f: Fixture, home: Team, away: Team): Plan<FootballData> {
  const rnd = new Rand('fb:' + f.id);
  const diff = home.strength - away.strength;
  const lamH = clamp(1.45 * (1 + diff / 110), 0.35, 3.4);
  const lamA = clamp(1.05 * (1 - diff / 110), 0.25, 3.0);
  const goalsH = Math.min(7, rnd.poisson(lamH));
  const goalsA = Math.min(7, rnd.poisson(lamA));
  const s1 = rnd.int(1, 4);
  const s2 = rnd.int(2, 7);
  const H = 45 + s1 + 15;
  const total = H + 45 + s2;

  const lh = pickLineup(rnd, home, diff);
  const la = pickLineup(rnd, away, -diff);
  const data: FootballData = {
    kind: 'football', s1, s2, H, lamH, lamA,
    formation: { home: lh.formation.name, away: la.formation.name },
    xi: { home: lh.xi, away: la.xi },
    bench: { home: lh.bench, away: la.bench },
    subs: [],
    final: {} as FootballData['final'],
  };

  // substitutions first, so scorers can be picked from whoever is on the pitch
  for (const side of ['home', 'away'] as Side[]) {
    const n = rnd.int(3, 5);
    const outs = rnd.shuffle(data.xi[side].filter((p) => p.position !== 'GK')).slice(0, n);
    const ins = rnd.shuffle(data.bench[side].filter((p) => p.position !== 'GK')).slice(0, n);
    for (let i = 0; i < Math.min(outs.length, ins.length); i++) {
      const m = rnd.int(56, 84);
      data.subs.push({ side, out: outs[i], in: ins[i], wall: H + (m - 46) + rnd.float(0.05, 0.95) });
    }
  }
  data.subs.sort((a, b) => a.wall - b.wall);

  const events: MatchEvent[] = [];
  const mk = (e: Omit<MatchEvent, 'id'>) => events.push({ ...e, id: '' });
  const teamOf = (s: Side) => (s === 'home' ? home : away);

  // goals
  for (const side of ['home', 'away'] as Side[]) {
    const count = side === 'home' ? goalsH : goalsA;
    const opp: Side = side === 'home' ? 'away' : 'home';
    for (let i = 0; i < count; i++) {
      const t = drawTime(rnd, s1, s2, H);
      const kind = rnd.chance(0.09) ? 'PENALTY' : rnd.chance(0.035) ? 'OWN_GOAL' : 'GOAL';
      const team = teamOf(side);
      if (kind === 'OWN_GOAL') {
        const pool = onPitch(data, opp, t.wall).filter((p) => p.position === 'DF' || p.position === 'GK');
        const p = rnd.pick(pool.length ? pool : onPitch(data, opp, t.wall));
        mk({ type: 'OWN_GOAL', wall: t.wall, minute: t.minute, label: labelOf(t), side, teamId: team.id, player: p.name,
          title: `OWN GOAL · ${team.name} score`, text: `${shortName(p.name)} turns the ball into his own net` });
        continue;
      }
      const ps = onPitch(data, side, t.wall);
      const scorer = rnd.weighted(ps, ps.map((p) => POS_W_SCORE[p.position]));
      if (kind === 'PENALTY') {
        mk({ type: 'PENALTY', wall: t.wall, minute: t.minute, label: labelOf(t), side, teamId: team.id, player: scorer.name,
          title: `PENALTY SCORED! ${team.name}`, text: `${shortName(scorer.name)} sends the keeper the wrong way from the spot` });
      } else {
        let assist: Player | undefined;
        if (rnd.chance(0.66)) {
          const others = ps.filter((p) => p.id !== scorer.id);
          assist = rnd.weighted(others, others.map((p) => POS_W_ASSIST[p.position]));
        }
        mk({ type: 'GOAL', wall: t.wall, minute: t.minute, label: labelOf(t), side, teamId: team.id, player: scorer.name,
          assist: assist?.name,
          title: `GOAL! ${team.name}`,
          text: `${shortName(scorer.name)}${assist ? ` (Assist: ${shortName(assist.name)})` : ''} · ${rnd.pick(GOAL_STYLES)}` });
        // VAR check on a few goals
        if (rnd.chance(0.12)) {
          mk({ type: 'VAR', wall: t.wall + 0.7, minute: t.minute, label: labelOf(t), side, teamId: team.id,
            title: 'VAR check complete', text: `Goal stands for ${team.name}. No offside, no foul in the build-up.` });
        }
      }
    }
  }

  // cards
  for (const side of ['home', 'away'] as Side[]) {
    const opp = teamOf(side === 'home' ? 'away' : 'home');
    const team = teamOf(side);
    const yellows = Math.min(5, rnd.poisson(clamp(1.7 + (opp.strength - team.strength) / 70, 0.8, 2.8)));
    const booked = new Set<string>();
    for (let i = 0; i < yellows; i++) {
      const t = drawTime(rnd, s1, s2, H);
      const ps = onPitch(data, side, t.wall).filter((p) => !booked.has(p.id));
      if (!ps.length) continue;
      const p = rnd.weighted(ps, ps.map((x) => POS_W_CARD[x.position]));
      booked.add(p.id);
      mk({ type: 'YELLOW', wall: t.wall, minute: t.minute, label: labelOf(t), side, teamId: team.id, player: p.name,
        title: 'Yellow card', text: `${shortName(p.name)} (${team.short}) is shown a yellow card` });
    }
    if (rnd.chance(0.055)) {
      const t = drawTime(rnd, s1, s2, H);
      const ps = onPitch(data, side, t.wall).filter((p) => !booked.has(p.id) && p.position !== 'GK');
      if (ps.length) {
        const p = rnd.weighted(ps, ps.map((x) => POS_W_CARD[x.position]));
        mk({ type: 'RED', wall: t.wall, minute: t.minute, label: labelOf(t), side, teamId: team.id, player: p.name,
          title: 'RED CARD', text: `${shortName(p.name)} (${team.short}) is sent off` });
      }
    }
  }

  // substitution events
  for (const s of data.subs) {
    const m = Math.floor(s.wall - H) + 46;
    mk({ type: 'SUB', wall: s.wall, minute: m, label: `${m}'`, side: s.side, teamId: teamOf(s.side).id,
      player: s.in.name, playerOut: s.out.name,
      title: `${teamOf(s.side).name} substitution`, text: `${shortName(s.in.name)} replaces ${shortName(s.out.name)}` });
  }

  events.sort((a, b) => a.wall - b.wall);
  let h = 0;
  let a = 0;
  for (const e of events) {
    if (e.type === 'GOAL' || e.type === 'PENALTY' || e.type === 'OWN_GOAL') {
      if (e.side === 'home') h++; else a++;
      e.score = [h, a];
    }
  }
  const scoreAt = (w: number): [number, number] => {
    let sh = 0, sa = 0;
    for (const e of events) if (e.wall <= w && e.score) [sh, sa] = e.score;
    return [sh, sa];
  };
  const ht = scoreAt(45 + s1);
  events.push({ id: '', type: 'PERIOD', wall: 45 + s1, minute: 45, label: 'HT', title: 'Half-time', text: `${home.short} ${ht[0]}-${ht[1]} ${away.short}`, score: undefined });
  events.push({ id: '', type: 'FULLTIME', wall: total, minute: 90, label: 'FT', title: 'Full-time', text: `${home.short} ${h}-${a} ${away.short}` });
  events.sort((x, y) => x.wall - y.wall);
  events.forEach((e, i) => (e.id = `${f.id}:${i}`));

  // final stats
  const shotsH = Math.max(goalsH + 2, Math.round(8 + lamH * 3.4 + rnd.gauss(0, 2.2)));
  const shotsA = Math.max(goalsA + 2, Math.round(7 + lamA * 3.4 + rnd.gauss(0, 2.2)));
  const sotH = clamp(Math.round(shotsH * 0.36 + rnd.gauss(0, 1)), goalsH, shotsH);
  const sotA = clamp(Math.round(shotsA * 0.36 + rnd.gauss(0, 1)), goalsA, shotsA);
  data.final = {
    possH: clamp(Math.round(50 + diff * 0.22 + rnd.gauss(0, 4)), 30, 72),
    shotsH, shotsA, sotH, sotA,
    xgH: round2(clamp(sotH * 0.2 + (shotsH - sotH) * 0.035 + goalsH * 0.1 + rnd.gauss(0, 0.2), 0.2, 4.5)),
    xgA: round2(clamp(sotA * 0.2 + (shotsA - sotA) * 0.035 + goalsA * 0.1 + rnd.gauss(0, 0.2), 0.2, 4.5)),
    cornersH: Math.max(0, Math.round(shotsH * 0.42 + rnd.gauss(0, 1.2))),
    cornersA: Math.max(0, Math.round(shotsA * 0.42 + rnd.gauss(0, 1.2))),
    foulsH: rnd.int(8, 15), foulsA: rnd.int(8, 15),
    dangH: Math.round(shotsH * 3.6 + rnd.gauss(0, 5)), dangA: Math.round(shotsA * 3.6 + rnd.gauss(0, 5)),
  };

  return { fixture: f, home, away, sport: 'football', totalWall: total, events, data };
}

export const playedAt = (d: FootballData, wall: number) =>
  wall <= 45 + d.s1 ? Math.max(0, wall) : wall < d.H ? 45 + d.s1 : Math.min(45 + d.s1 + 45 + d.s2, 45 + d.s1 + (wall - d.H));
const wallAt = (d: FootballData, played: number) => (played <= 45 + d.s1 ? played : played + 15);
const playedLabel = (d: FootballData, p: number) => {
  if (p <= 45 + d.s1) return p <= 45 ? `${Math.max(1, Math.ceil(p))}'` : `45+${Math.ceil(p - 45)}'`;
  const q = p - (45 + d.s1);
  return q <= 45 ? `${45 + Math.max(1, Math.ceil(q))}'` : `90+${Math.ceil(q - 45)}'`;
};

function state(plan: Plan<FootballData>, wall: number): SimState {
  const d = plan.data;
  const total = plan.totalWall;
  const evs = visible(plan.events, wall);
  let homeScore = 0, awayScore = 0;
  for (const e of evs) if (e.score) [homeScore, awayScore] = e.score;
  let status: SimState['status'] = 'LIVE';
  let clock = '';
  let minute: number | null = null;
  let period = '1st half';
  if (wall < 0) { status = 'SCHEDULED'; period = ''; }
  else if (wall >= total) { status = 'FINISHED'; clock = 'FT'; minute = 90; period = 'Full time'; }
  else if (wall < 45 + d.s1) {
    const m = Math.max(1, Math.ceil(wall));
    minute = Math.min(45, m);
    clock = wall <= 45 ? `${m}'` : `45+${Math.ceil(wall - 45)}'`;
  } else if (wall < d.H) { status = 'HALFTIME'; clock = 'HT'; minute = 45; period = 'Half-time'; }
  else {
    const w2 = wall - d.H;
    const m = 45 + Math.max(1, Math.ceil(w2));
    minute = Math.min(90, m);
    clock = w2 <= 45 ? `${m}'` : `90+${Math.ceil(w2 - 45)}'`;
    period = '2nd half';
  }
  return { status, wall, progress: clamp(wall / total, 0, 1), clock, minute, period, homeScore, awayScore, events: evs };
}

function stats(plan: Plan<FootballData>, st: SimState): StatRow[] {
  const d = plan.data;
  const f = d.final;
  const totalPlayed = 45 + d.s1 + 45 + d.s2;
  const p = clamp(playedAt(d, st.wall) / totalPlayed, 0, 1);
  const k = p >= 1 ? 1 : Math.pow(p, 0.95);
  const count = (v: number, min = 0) => Math.max(min, Math.floor(v * k + 1e-9));
  const goalsH = st.events.filter((e) => e.side === 'home' && (e.type === 'GOAL' || e.type === 'PENALTY')).length;
  const goalsA = st.events.filter((e) => e.side === 'away' && (e.type === 'GOAL' || e.type === 'PENALTY')).length;
  const sotH = count(f.sotH, goalsH);
  const sotA = count(f.sotA, goalsA);
  const shotsH = count(f.shotsH, sotH);
  const shotsA = count(f.shotsA, sotA);
  const possH = p <= 0 ? 50 : Math.round(50 + (f.possH - 50) * Math.min(1, p * 1.3));
  const cards = (side: 'home' | 'away', type: 'YELLOW' | 'RED') => st.events.filter((e) => e.side === side && e.type === type).length;
  return [
    { key: 'possession', label: 'Ball Possession', home: possH, away: 100 - possH, format: 'pct' },
    { key: 'xg', label: 'Expected Goals (xG)', home: round2(f.xgH * k + goalsH * 0.05), away: round2(f.xgA * k + goalsA * 0.05), format: 'dec' },
    { key: 'shots', label: 'Total Shots', home: shotsH, away: shotsA, format: 'int' },
    { key: 'sot', label: 'Shots on Target', home: sotH, away: sotA, format: 'int' },
    { key: 'corners', label: 'Corner Kicks', home: count(f.cornersH), away: count(f.cornersA), format: 'int' },
    { key: 'dangerous', label: 'Dangerous Attacks', home: count(f.dangH), away: count(f.dangA), format: 'int' },
    { key: 'fouls', label: 'Fouls', home: count(f.foulsH), away: count(f.foulsA), format: 'int' },
    { key: 'yellow', label: 'Yellow Cards', home: cards('home', 'YELLOW'), away: cards('away', 'YELLOW'), format: 'int' },
    { key: 'red', label: 'Red Cards', home: cards('home', 'RED'), away: cards('away', 'RED'), format: 'int' },
  ];
}

function pois(l: number, k: number) {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.exp(-l) * Math.pow(l, k)) / f;
}

function winProb(plan: Plan<FootballData>, st: SimState) {
  const d = plan.data;
  const totalPlayed = 45 + d.s1 + 45 + d.s2;
  const rem = clamp(1 - playedAt(d, Math.max(0, st.wall)) / totalPlayed, 0, 1);
  const lh = d.lamH * rem;
  const la = d.lamA * rem;
  let ph = 0, pd = 0, pa = 0;
  const lead = st.homeScore - st.awayScore;
  for (let i = 0; i <= 8; i++) {
    for (let j = 0; j <= 8; j++) {
      const p = pois(lh, i) * pois(la, j);
      const diff = lead + i - j;
      if (diff > 0) ph += p; else if (diff < 0) pa += p; else pd += p;
    }
  }
  const s = ph + pd + pa || 1;
  return { home: Math.round((ph / s) * 100), draw: Math.round((pd / s) * 100), away: 100 - Math.round((ph / s) * 100) - Math.round((pd / s) * 100) };
}

// ---------- heavy extras (lineups, momentum, commentary, highlights), computed lazily ----------
export interface FootballExtras {
  lineups: { home: Lineup; away: Lineup };
  momentum: number[];
  commentary: CommentaryItem[];
  highlights: Highlight[];
}

const extrasCache = new Map<string, FootballExtras>();

function rowsX(rows: number): number[] {
  return rows === 4 ? [5, 20, 42, 66] : rows === 5 ? [5, 20, 34, 48, 68] : [5, 20, 38, 56, 70];
}

function buildLineup(d: FootballData, side: Side, team: Team): Lineup {
  const formation = FORMATIONS.find((f) => f.name === d.formation[side])!;
  const lines = [[d.xi[side][0]]];
  let idx = 1;
  for (const n of formation.rows) {
    lines.push(d.xi[side].slice(idx, idx + n));
    idx += n;
  }
  const xs = rowsX(lines.length);
  const starters: LineupPlayer[] = [];
  lines.forEach((row, li) => {
    row.forEach((p, j) => {
      const y = row.length === 1 ? 50 : 14 + (j * 72) / (row.length - 1);
      const x = side === 'home' ? xs[li] : 100 - xs[li];
      starters.push({ id: p.id, name: p.name, number: p.number, position: p.position, x, y: side === 'home' ? y : 100 - y });
    });
  });
  return {
    teamId: team.id,
    formation: formation.name,
    starters,
    bench: d.bench[side].map((p) => ({ id: p.id, name: p.name, number: p.number, position: p.position })),
    coach: coachFor(team.id),
  };
}

export function footballExtras(plan: Plan<FootballData>): FootballExtras {
  const hit = extrasCache.get(plan.fixture.id);
  if (hit) return hit;
  const d = plan.data;
  const { home, away } = plan;
  const rx = new Rand('fbx:' + plan.fixture.id);
  const totalPlayed = 45 + d.s1 + 45 + d.s2;
  const ph = [rx.float(0, 6.28), rx.float(0, 6.28), rx.float(0, 6.28)];
  const bias = (home.strength - away.strength) / 160 + 0.04;
  const mom = Array.from({ length: totalPlayed + 1 }, (_, i) =>
    clamp(bias + 0.42 * Math.sin(i / 6.5 + ph[0]) + 0.28 * Math.sin(i / 2.7 + ph[1]) + 0.12 * Math.sin(i / 11 + ph[2]), -0.95, 0.95),
  );
  for (const e of plan.events) {
    if (e.type === 'GOAL' || e.type === 'PENALTY' || e.type === 'OWN_GOAL') {
      const gi = Math.round(playedAt(d, e.wall));
      const sign = e.side === 'home' ? 1 : -1;
      for (let j = -5; j <= 8; j++) {
        const i = gi + j;
        if (i < 0 || i >= mom.length) continue;
        const boost = j < 0 ? 0.25 * (1 + j / 6) : 0.6 * Math.exp(-j / 3.5);
        mom[i] = clamp(mom[i] + sign * boost, -1, 1);
      }
    }
    if (e.type === 'RED') {
      const gi = Math.round(playedAt(d, e.wall));
      const sign = e.side === 'home' ? -1 : 1;
      for (let i = gi; i < mom.length; i++) mom[i] = clamp(mom[i] + sign * 0.2, -1, 1);
    }
  }

  const commentary: CommentaryItem[] = [];
  let ci = 0;
  const addC = (wall: number, kind: CommentaryItem['kind'], title: string, text: string) => {
    const played = playedAt(d, wall);
    commentary.push({ id: `${plan.fixture.id}:c${ci++}`, wall, minute: Math.ceil(played), label: playedLabel(d, played), kind, title, text });
  };
  for (const e of plan.events) {
    if (e.type === 'GOAL' || e.type === 'PENALTY' || e.type === 'OWN_GOAL') addC(e.wall, 'goal', e.title, e.text);
    else if (e.type === 'YELLOW' || e.type === 'RED') addC(e.wall, 'card', e.title, e.text);
    else if (e.type === 'SUB') addC(e.wall, 'sub', 'Substitution', e.text);
    else if (e.type === 'VAR') addC(e.wall, 'info', e.title, e.text);
  }
  const chanceTemplates = [
    (p: string, t: string, gk: string) => `${p} drives forward and unleashes a shot for ${t}. ${gk} gets down smartly to keep it out.`,
    (p: string, t: string) => `${p} curls one just wide of the far post. ${t} were so close there.`,
    (p: string, t: string) => `Dangerous free kick for ${t}. ${p} sends it over the wall but it clips the crossbar.`,
    (p: string, t: string) => `${p} breaks the offside trap but a last-ditch tackle denies ${t} a clear sight of goal.`,
    (p: string, t: string) => `Corner for ${t}. ${p} rises highest but heads over the bar.`,
    (p: string, t: string, gk: string) => `${p} fires from distance and ${gk} tips it round the post.`,
  ];
  const nChances = 13;
  for (let i = 0; i < nChances; i++) {
    const played = rx.float(3, totalPlayed - 2);
    const wall = wallAt(d, played);
    const side: Side = rx.chance(0.5 + clamp(mom[Math.floor(played)] ?? 0, -0.9, 0.9) * 0.35) ? 'home' : 'away';
    const opp: Side = side === 'home' ? 'away' : 'home';
    const ps = onPitch(d, side, wall).filter((p) => p.position !== 'GK');
    const p = rx.weighted(ps, ps.map((x) => POS_W_SCORE[x.position] + 0.5));
    const gk = onPitch(d, opp, wall).find((x) => x.position === 'GK') ?? d.xi[opp][0];
    const tpl = rx.pick(chanceTemplates);
    addC(wall, 'chance', 'Dangerous chance', tpl(shortName(p.name), side === 'home' ? home.name : away.name, shortName(gk.name)));
  }
  const tact = [
    [14, `${home.name} press higher up the pitch, trying to unsettle ${away.name} at the back.`],
    [58, `${coachFor(away.id)} makes a tactical tweak. ${away.name} push the full-backs on.`],
    [74, `${coachFor(home.id)} changes shape from the touchline as ${home.name} chase control.`],
  ] as const;
  for (const [pm, text] of tact) addC(wallAt(d, pm), 'tactical', 'Tactical adjustment', text);
  commentary.sort((a, b) => a.wall - b.wall);

  const highlights: Highlight[] = [];
  let hi = 0;
  for (const e of plan.events) {
    if (e.type === 'GOAL' || e.type === 'PENALTY' || e.type === 'OWN_GOAL') {
      highlights.push({ id: `${plan.fixture.id}:h${hi++}`, wall: e.wall + 0.8, minute: e.minute, kind: 'goal',
        title: `${shortName(e.player ?? '')} ${e.type === 'PENALTY' ? 'penalty' : e.type === 'OWN_GOAL' ? 'own goal' : 'goal'}`,
        subtitle: e.assist ? `Assist by ${shortName(e.assist)} · ${e.label}` : `${e.side === 'home' ? home.name : away.name} · ${e.label}`,
        durationSec: rx.int(24, 58) });
    } else if (e.type === 'RED') {
      highlights.push({ id: `${plan.fixture.id}:h${hi++}`, wall: e.wall + 0.8, minute: e.minute, kind: 'card',
        title: `Red card for ${shortName(e.player ?? '')}`, subtitle: `${e.side === 'home' ? home.name : away.name} · ${e.label}`, durationSec: rx.int(18, 40) });
    }
  }
  for (const c of commentary.filter((x) => x.kind === 'chance').slice(0, 3)) {
    highlights.push({ id: `${plan.fixture.id}:h${hi++}`, wall: c.wall + 0.8, minute: c.minute, kind: 'save', title: 'Big chance', subtitle: c.label, durationSec: rx.int(14, 30) });
  }
  highlights.sort((a, b) => a.wall - b.wall);

  const extras = { lineups: { home: buildLineup(d, 'home', home), away: buildLineup(d, 'away', away) }, momentum: mom, commentary, highlights };
  if (extrasCache.size > 400) extrasCache.delete(extrasCache.keys().next().value as string);
  extrasCache.set(plan.fixture.id, extras);
  return extras;
}

const ease = (u: number) => u * u * (3 - 2 * u);

/** Where the ball is right now. Pure function of the match timeline, so the browser can animate it locally. */
export function trackerAt(plan: Plan<FootballData>, wall: number): TrackerState {
  const d = plan.data;
  const ex = footballExtras(plan);
  const PHASE = 1.4;
  const k = Math.floor(wall / PHASE);
  const u = ease(wall / PHASE - k);
  const wp = (i: number) => {
    const r = new Rand(`trk:${plan.fixture.id}:${i}`);
    const w = i * PHASE;
    const m = ex.momentum[clamp(Math.floor(playedAt(d, w)), 0, ex.momentum.length - 1)] ?? 0;
    const homeAtk = r.chance(0.5 + m * 0.42);
    const x = homeAtk ? r.float(52, 90) : r.float(10, 48);
    const y = r.float(14, 86);
    return { x, y, homeAtk, m };
  };
  const a = wp(k);
  const b = wp(k + 1);
  const x = a.x + (b.x - a.x) * u;
  const y = a.y + (b.y - a.y) * u;
  const m = Math.abs(a.m);
  const attacking: TrackerState['attacking'] = m < 0.12 ? 'none' : a.homeAtk ? 'home' : 'away';
  const team = a.homeAtk ? plan.home : plan.away;
  const flank = a.y < 38 ? 'left' : a.y > 62 ? 'right' : 'central';
  const third = (a.homeAtk ? a.x : 100 - a.x) > 66 ? 'final third' : 'half-space';
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    attacking,
    pressure: Math.round(clamp(35 + Math.abs(a.m) * 65, 20, 95)),
    zone: `${flank} ${third}`,
    headline: attacking === 'none' ? 'Midfield battle' : `${team.name} attacking ${flank === 'central' ? 'through the middle' : `${flank} ${third}`}`,
  };
}

export const football: SportModel<FootballData> = { build, state, stats, winProb };
