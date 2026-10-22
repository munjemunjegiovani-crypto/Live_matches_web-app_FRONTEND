import { Rand, clamp, round2 } from '../rng';
import { shortName, squadFor } from '../names';
import type { MatchEvent, StatRow, Team } from '../types';
import type { Fixture } from '../schedule';
import type { Plan, SimState, SportModel } from '../simTypes';
import { logistic, visible } from '../simTypes';

type Side = 'home' | 'away';
interface Over { r: number; w: number }
interface Inns { side: Side; overs: Over[]; start: number; end: number; runs: number; wkts: number; cum: number[] }

export interface CricketData {
  kind: 'cricket';
  inns: [Inns, Inns];
  target: number;
  resultText: string;
}

const OVER_LEN = 4.25;
const INNINGS_BREAK = 20;

function genInnings(rnd: Rand, bat: Team, bowl: Team, start: number, side: Side, target?: number): Inns {
  const overs: Over[] = [];
  let runs = 0;
  let wk = 0;
  const adj = (bat.strength - bowl.strength) / 55;
  for (let i = 0; i < 20; i++) {
    const base = i < 6 ? 8.1 : i < 15 ? 7.3 : 10.6;
    const r = Math.max(0, Math.round(base + adj + rnd.gauss(0, 3.1)));
    const pW = (i < 6 ? 0.26 : i < 15 ? 0.3 : 0.42) * (1 - adj * 0.25);
    let w = 0;
    if (rnd.chance(pW)) w++;
    if (rnd.chance(pW * 0.22)) w++;
    w = Math.min(w, 10 - wk);
    overs.push({ r, w });
    runs += r;
    wk += w;
    if (wk >= 10) break;
    if (target && runs >= target) break;
  }
  const cum = [0];
  overs.forEach((o, i) => cum.push(cum[i] + o.r));
  return { side, overs, start, end: start + overs.length * OVER_LEN, runs, wkts: wk, cum };
}

function build(f: Fixture, home: Team, away: Team): Plan<CricketData> {
  const rnd = new Rand('ck:' + f.id);
  const homeFirst = rnd.chance(0.5);
  const first: Side = homeFirst ? 'home' : 'away';
  const second: Side = homeFirst ? 'away' : 'home';
  const t = (s: Side) => (s === 'home' ? home : away);
  const inn1 = genInnings(rnd, t(first), t(second), 0, first);
  const target = inn1.runs + 1;
  const inn2 = genInnings(rnd, t(second), t(first), inn1.end + INNINGS_BREAK, second, target);
  const total = inn2.end;

  let resultText: string;
  const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (inn2.runs >= target) resultText = `${t(second).name} won by ${pl(10 - inn2.wkts, 'wicket')}`;
  else if (inn2.runs < inn1.runs) resultText = `${t(first).name} won by ${pl(inn1.runs - inn2.runs, 'run')}`;
  else resultText = 'Match tied';

  const events: MatchEvent[] = [];
  let sixes = 0;
  for (const inn of [inn1, inn2]) {
    const bat = t(inn.side);
    const bowl = t(inn.side === 'home' ? 'away' : 'home');
    const batters = squadFor(bat.id).slice();
    const bowlers = squadFor(bowl.id).filter((p) => p.position !== 'GK');
    let wicketNo = 0;
    inn.overs.forEach((o, i) => {
      const overStart = inn.start + i * OVER_LEN;
      for (let k = 0; k < o.w; k++) {
        const wall = overStart + (0.1 + (k * 0.4) + rnd.float(0, 0.4)) * OVER_LEN;
        const frac = (wall - overStart) / OVER_LEN;
        const runsNow = inn.cum[i] + Math.floor(frac * o.r);
        wicketNo++;
        const batter = batters[(wicketNo - 1) % batters.length];
        const bowler = rnd.pick(bowlers);
        const how = rnd.pick(['b', 'c', 'lbw', 'run out', 'c']);
        const text = how === 'run out' ? `${shortName(batter.name)} run out` : how === 'lbw' ? `${shortName(batter.name)} lbw b ${shortName(bowler.name)}` : how === 'b' ? `${shortName(batter.name)} b ${shortName(bowler.name)}` : `${shortName(batter.name)} c fielder b ${shortName(bowler.name)}`;
        events.push({ id: '', type: 'WICKET', wall, minute: i + 1, label: `${i}.${Math.min(5, Math.floor(frac * 6)) + 1}`, side: inn.side, teamId: bat.id, player: batter.name,
          title: `WICKET! ${bat.short} ${runsNow}/${wicketNo}`, text });
      }
      if (o.r >= 13 && sixes < 12) {
        sixes++;
        const batter = batters[rnd.int(0, Math.min(5, batters.length - 1))];
        events.push({ id: '', type: 'BOUNDARY', wall: overStart + rnd.float(0.2, 0.9) * OVER_LEN, minute: i + 1, label: `${i + 1}ov`, side: inn.side, teamId: bat.id, player: batter.name,
          title: 'SIX!', text: `${shortName(batter.name)} clears the rope for ${bat.short}` });
      }
    });
  }
  events.push({ id: '', type: 'PERIOD', wall: inn1.end, minute: 0, label: 'Break', title: 'Innings break', text: `${t(first).short} ${inn1.runs}/${inn1.wkts}. ${t(second).short} need ${target} to win` });
  events.push({ id: '', type: 'FULLTIME', wall: total, minute: 0, label: 'Result', title: 'Match complete', text: resultText });
  events.sort((a, b) => a.wall - b.wall);
  events.forEach((e, i) => (e.id = `${f.id}:${i}`));
  return { fixture: f, home, away, sport: 'cricket', totalWall: total, events, data: { kind: 'cricket', inns: [inn1, inn2], target, resultText } };
}

function inningsAt(plan: Plan<CricketData>, inn: Inns, wall: number) {
  if (wall <= inn.start) return { runs: 0, wkts: 0, balls: 0, overs: '0.0' };
  const t = Math.min(wall, inn.end);
  const oversF = (t - inn.start) / OVER_LEN;
  const c = Math.min(Math.floor(oversF), inn.overs.length);
  const frac = oversF - c;
  const runs = wall >= inn.end ? inn.runs : inn.cum[c] + (c < inn.overs.length ? Math.floor(frac * inn.overs[c].r) : 0);
  const wkts = wall >= inn.end ? inn.wkts : plan.events.filter((e) => e.type === 'WICKET' && e.side === inn.side && e.wall >= inn.start && e.wall <= wall).length;
  const balls = wall >= inn.end ? 0 : Math.floor(frac * 6);
  const completeOvers = wall >= inn.end ? inn.overs.length : c;
  return { runs, wkts, balls, overs: `${completeOvers}.${balls}` };
}

function state(plan: Plan<CricketData>, wall: number): SimState {
  const d = plan.data;
  const total = plan.totalWall;
  const evs = visible(plan.events, wall);
  const [i1, i2] = d.inns;
  const a = inningsAt(plan, i1, wall);
  const b = inningsAt(plan, i2, wall);
  const byside: Record<Side, { runs: number; wkts: number }> = { home: { runs: 0, wkts: 0 }, away: { runs: 0, wkts: 0 } };
  byside[i1.side] = a;
  byside[i2.side] = b;
  const scoreLabel = {
    home: wall < 0 ? '' : i1.side === 'home' || wall >= i2.start ? `${byside.home.runs}/${byside.home.wkts}` : '',
    away: wall < 0 ? '' : i1.side === 'away' || wall >= i2.start ? `${byside.away.runs}/${byside.away.wkts}` : '',
  };
  const innings = [
    { team: i1.side, runs: a.runs, wickets: a.wkts, overs: a.overs },
    ...(wall >= i2.start ? [{ team: i2.side, runs: b.runs, wickets: b.wkts, overs: b.overs }] : []),
  ];
  const base = { wall, progress: clamp(wall / total, 0, 1), homeScore: byside.home.runs, awayScore: byside.away.runs, scoreLabel, minute: null as number | null, events: evs, innings };
  if (wall < 0) return { ...base, status: 'SCHEDULED', clock: '', period: '', scoreLabel: undefined, innings: undefined };
  if (wall >= total) return { ...base, status: 'FINISHED', clock: 'FT', period: 'Final', resultText: d.resultText };
  if (wall < i1.end) return { ...base, status: 'LIVE', clock: `Inn 1 · ${a.overs} ov`, period: 'Innings 1' };
  if (wall < i2.start) return { ...base, status: 'LIVE', clock: 'Innings break', period: 'Break' };
  return { ...base, status: 'LIVE', clock: `Inn 2 · ${b.overs} ov`, period: 'Innings 2' };
}

function stats(plan: Plan<CricketData>, st: SimState): StatRow[] {
  const d = plan.data;
  const rows = (side: Side) => {
    const inn = d.inns[0].side === side ? d.inns[0] : d.inns[1];
    const s = inningsAt(plan, inn, st.wall);
    const overs = Math.max(0.1, parseInt(s.overs) + parseInt(s.overs.split('.')[1]) / 6);
    return { ...s, rr: s.runs / overs, fours: Math.floor((s.runs * 0.4) / 4), sixes: Math.floor((s.runs * 0.2) / 6), extras: Math.floor(s.runs * 0.06) };
  };
  const h = rows('home');
  const a = rows('away');
  return [
    { key: 'rr', label: 'Run Rate', home: round2(h.rr), away: round2(a.rr), format: 'dec' },
    { key: 'fours', label: 'Fours', home: h.fours, away: a.fours, format: 'int' },
    { key: 'sixes', label: 'Sixes', home: h.sixes, away: a.sixes, format: 'int' },
    { key: 'extras', label: 'Extras', home: h.extras, away: a.extras, format: 'int' },
    { key: 'wkts', label: 'Wickets Lost', home: h.wkts, away: a.wkts, format: 'int' },
  ];
}

function winProb(plan: Plan<CricketData>, st: SimState) {
  const d = plan.data;
  const [i1, i2] = d.inns;
  const t = (s: Side) => (s === 'home' ? plan.home : plan.away);
  if (st.status === 'FINISHED') {
    const chaserWon = i2.runs >= d.target;
    const w: Side = chaserWon ? i2.side : i1.side;
    return { home: w === 'home' ? 100 : 0, draw: 0, away: w === 'home' ? 0 : 100 };
  }
  let pFirst: number;
  if (st.wall < i2.start) {
    const s = inningsAt(plan, i1, st.wall);
    const overs = Math.max(1, parseInt(s.overs) + parseInt(s.overs.split('.')[1]) / 6);
    const proj = (s.runs / overs) * 20 * (1 - s.wkts * 0.025);
    pFirst = logistic((t(i1.side).strength - t(i2.side).strength) / 25 + (proj - 165) / 40);
  } else {
    const s = inningsAt(plan, i2, st.wall);
    const ballsUsed = parseInt(s.overs) * 6 + parseInt(s.overs.split('.')[1]);
    const ballsLeft = 120 - ballsUsed;
    const need = d.target - s.runs;
    const exp = ballsLeft * ((8.2 + (t(i2.side).strength - t(i1.side).strength) / 70) / 6) * Math.pow((10 - s.wkts) / 10, 0.6);
    const pChase = logistic((exp - need) / (12 + ballsLeft / 8));
    pFirst = 1 - pChase;
  }
  const pHome = i1.side === 'home' ? pFirst : 1 - pFirst;
  return { home: Math.round(pHome * 100), draw: 0, away: 100 - Math.round(pHome * 100) };
}

export const cricket: SportModel<CricketData> = { build, state, stats, winProb };
