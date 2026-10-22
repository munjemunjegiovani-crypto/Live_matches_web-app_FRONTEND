import { Rand, clamp } from '../rng';
import { shortName, squadFor } from '../names';
import type { MatchEvent, Player, StatRow, Team } from '../types';
import type { Fixture } from '../schedule';
import type { Plan, SimState, SportModel } from '../simTypes';
import { logistic, visible } from '../simTypes';

type Side = 'home' | 'away';

export interface RugbyData {
  kind: 'rugby';
  s1: number;
  s2: number;
  H: number;
  final: Record<string, number>;
}

function drawTime(rnd: Rand, s1: number, s2: number, H: number) {
  if (rnd.chance(0.48)) {
    const m = rnd.int(1, 40);
    return { wall: m - 1 + rnd.float(0.05, 0.95), minute: m };
  }
  if (rnd.chance(0.06)) {
    const e = rnd.int(1, s2);
    return { wall: H + 40 + (e - 1) + rnd.float(0.05, 0.95), minute: 80 };
  }
  const m = rnd.int(41, 80);
  return { wall: H + (m - 41) + rnd.float(0.05, 0.95), minute: m };
}

function build(f: Fixture, home: Team, away: Team): Plan<RugbyData> {
  const rnd = new Rand('rg:' + f.id);
  const diff = home.strength - away.strength;
  const s1 = rnd.int(1, 3);
  const s2 = rnd.int(1, 4);
  const H = 40 + s1 + 10;
  const total = H + 40 + s2;
  const events: MatchEvent[] = [];
  const squad = (t: Team) => squadFor(t.id);
  for (const side of ['home', 'away'] as Side[]) {
    const team = side === 'home' ? home : away;
    const tries = Math.min(8, rnd.poisson(clamp(side === 'home' ? 2.6 * (1 + diff / 90) : 2.2 * (1 - diff / 90), 0.6, 5.5)));
    const pens = Math.min(5, rnd.poisson(1.6));
    const sq = squad(team);
    const kickers = sq.filter((p) => p.position === 'MF');
    const pick = (): Player => rnd.weighted(sq.filter((p) => p.position !== 'GK'), sq.filter((p) => p.position !== 'GK').map((p) => (p.position === 'FW' ? 3 : p.position === 'DF' ? 3 : 2.5)));
    for (let i = 0; i < tries; i++) {
      const t = drawTime(rnd, s1, s2, H);
      const p = pick();
      events.push({ id: '', type: 'TRY', wall: t.wall, minute: t.minute, label: `${t.minute}'`, side, teamId: team.id, player: p.name,
        title: `TRY! ${team.name}`, text: `${shortName(p.name)} dots down` });
      if (rnd.chance(0.72)) {
        const k = rnd.pick(kickers);
        events.push({ id: '', type: 'CONVERSION', wall: t.wall + 0.4, minute: t.minute, label: `${t.minute}'`, side, teamId: team.id, player: k.name,
          title: 'Conversion', text: `${shortName(k.name)} adds the two points` });
      }
    }
    for (let i = 0; i < pens; i++) {
      const t = drawTime(rnd, s1, s2, H);
      const k = rnd.pick(kickers);
      events.push({ id: '', type: 'PENALTY_KICK', wall: t.wall, minute: t.minute, label: `${t.minute}'`, side, teamId: team.id, player: k.name,
        title: 'Penalty goal', text: `${shortName(k.name)} slots the penalty for ${team.short}` });
    }
    if (rnd.chance(0.35)) {
      const t = drawTime(rnd, s1, s2, H);
      const p = rnd.pick(sq.filter((x) => x.position !== 'GK'));
      events.push({ id: '', type: 'YELLOW', wall: t.wall, minute: t.minute, label: `${t.minute}'`, side, teamId: team.id, player: p.name,
        title: 'Yellow card', text: `${shortName(p.name)} (${team.short}) is sent to the sin-bin` });
    }
  }
  events.sort((a, b) => a.wall - b.wall);
  let h = 0, a = 0;
  for (const e of events) {
    const pts = e.type === 'TRY' ? 5 : e.type === 'CONVERSION' ? 2 : e.type === 'PENALTY_KICK' ? 3 : 0;
    if (pts) { if (e.side === 'home') h += pts; else a += pts; e.score = [h, a]; }
  }
  const scoreAt = (w: number): [number, number] => {
    let sh = 0, sa = 0;
    for (const e of events) if (e.wall <= w && e.score) [sh, sa] = e.score;
    return [sh, sa];
  };
  const ht = scoreAt(40 + s1);
  events.push({ id: '', type: 'PERIOD', wall: 40 + s1, minute: 40, label: 'HT', title: 'Half-time', text: `${home.short} ${ht[0]}-${ht[1]} ${away.short}` });
  events.push({ id: '', type: 'FULLTIME', wall: total, minute: 80, label: 'FT', title: 'Full-time', text: `${home.short} ${h}-${a} ${away.short}` });
  events.sort((x, y) => x.wall - y.wall);
  events.forEach((e, i) => (e.id = `${f.id}:${i}`));
  const final: Record<string, number> = {
    possH: clamp(Math.round(50 + diff * 0.15 + rnd.gauss(0, 5)), 36, 64),
    terrH: clamp(Math.round(50 + diff * 0.2 + rnd.gauss(0, 5)), 34, 66),
    tackH: rnd.int(95, 160), tackA: rnd.int(95, 160), lbH: rnd.int(3, 12), lbA: rnd.int(3, 12),
    carH: rnd.int(80, 130), carA: rnd.int(80, 130), penH: rnd.int(4, 12), penA: rnd.int(4, 12),
  };
  return { fixture: f, home, away, sport: 'rugby', totalWall: total, events, data: { kind: 'rugby', s1, s2, H, final } };
}

function state(plan: Plan<RugbyData>, wall: number): SimState {
  const d = plan.data;
  const total = plan.totalWall;
  const evs = visible(plan.events, wall);
  let homeScore = 0, awayScore = 0;
  for (const e of evs) if (e.score) [homeScore, awayScore] = e.score;
  const base = { wall, progress: clamp(wall / total, 0, 1), homeScore, awayScore, events: evs };
  if (wall < 0) return { ...base, status: 'SCHEDULED', clock: '', minute: null, period: '' };
  if (wall >= total) return { ...base, status: 'FINISHED', clock: 'FT', minute: 80, period: 'Full time' };
  if (wall < 40 + d.s1) { const m = Math.max(1, Math.ceil(wall)); return { ...base, status: 'LIVE', clock: wall <= 40 ? `${m}'` : `40+${Math.ceil(wall - 40)}'`, minute: Math.min(40, m), period: '1st half' }; }
  if (wall < d.H) return { ...base, status: 'HALFTIME', clock: 'HT', minute: 40, period: 'Half-time' };
  const w2 = wall - d.H;
  const m = 40 + Math.max(1, Math.ceil(w2));
  return { ...base, status: 'LIVE', clock: w2 <= 40 ? `${m}'` : `80+${Math.ceil(w2 - 40)}'`, minute: Math.min(80, m), period: '2nd half' };
}

function stats(plan: Plan<RugbyData>, st: SimState): StatRow[] {
  const f = plan.data.final;
  const p = clamp(st.progress, 0, 1);
  const k = p >= 1 ? 1 : Math.pow(p, 0.95);
  const c = (v: number) => Math.floor(v * k + 1e-9);
  const poss = p <= 0 ? 50 : f.possH;
  const terr = p <= 0 ? 50 : f.terrH;
  const tries = (s: Side) => st.events.filter((e) => e.type === 'TRY' && e.side === s).length;
  return [
    { key: 'poss', label: 'Possession', home: poss, away: 100 - poss, format: 'pct' },
    { key: 'terr', label: 'Territory', home: terr, away: 100 - terr, format: 'pct' },
    { key: 'tries', label: 'Tries', home: tries('home'), away: tries('away'), format: 'int' },
    { key: 'carries', label: 'Carries', home: c(f.carH), away: c(f.carA), format: 'int' },
    { key: 'tackles', label: 'Tackles Made', home: c(f.tackH), away: c(f.tackA), format: 'int' },
    { key: 'lb', label: 'Line Breaks', home: c(f.lbH), away: c(f.lbA), format: 'int' },
    { key: 'pen', label: 'Penalties Conceded', home: c(f.penH), away: c(f.penA), format: 'int' },
  ];
}

function winProb(plan: Plan<RugbyData>, st: SimState) {
  const lead = st.homeScore - st.awayScore;
  if (st.status === 'FINISHED') return { home: lead > 0 ? 100 : lead < 0 ? 0 : 50, draw: 0, away: lead > 0 ? 0 : lead < 0 ? 100 : 50 };
  const rem = Math.max(0.04, 1 - st.progress);
  const p = logistic(((plan.home.strength - plan.away.strength) / 20 + 0.15) * Math.sqrt(rem) + lead / (Math.sqrt(rem) * 9));
  return { home: Math.round(p * 100), draw: 0, away: 100 - Math.round(p * 100) };
}

export const rugby: SportModel<RugbyData> = { build, state, stats, winProb };
