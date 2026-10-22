import { hashStr, clamp } from './rng';
import type { League, Sport, SportId, StandingZone, Team } from './types';

export const SPORTS: Sport[] = [
  { id: 'football', name: 'Football', emoji: '⚽' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾' },
  { id: 'cricket', name: 'Cricket', emoji: '🏏' },
  { id: 'rugby', name: 'Rugby', emoji: '🏉' },
];

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// name, short code, stadium, optional strength override
type TD = [name: string, short: string, stadium?: string, strength?: number];

// ----- Football -----
const PL: TD[] = [
  ['Arsenal', 'ARS', 'Emirates Stadium'],
  ['Manchester City', 'MCI', 'Etihad Stadium'],
  ['Liverpool', 'LIV', 'Anfield'],
  ['Chelsea', 'CHE', 'Stamford Bridge'],
  ['Tottenham Hotspur', 'TOT', 'Tottenham Hotspur Stadium'],
  ['Manchester United', 'MUN', 'Old Trafford'],
  ['Newcastle United', 'NEW', "St James' Park"],
  ['Aston Villa', 'AVL', 'Villa Park'],
  ['Brighton & Hove Albion', 'BHA', 'Amex Stadium'],
  ['West Ham United', 'WHU', 'London Stadium'],
  ['Crystal Palace', 'CRY', 'Selhurst Park'],
  ['Fulham', 'FUL', 'Craven Cottage'],
  ['Brentford', 'BRE', 'Gtech Community Stadium'],
  ['AFC Bournemouth', 'BOU', 'Vitality Stadium'],
  ['Everton', 'EVE', 'Hill Dickinson Stadium'],
  ['Wolverhampton Wanderers', 'WOL', 'Molineux Stadium'],
  ['Nottingham Forest', 'NFO', 'City Ground'],
  ['Leeds United', 'LEE', 'Elland Road'],
  ['Sunderland', 'SUN', 'Stadium of Light'],
  ['Burnley', 'BUR', 'Turf Moor'],
];
const LALIGA: TD[] = [
  ['Real Madrid', 'RMA', 'Santiago Bernabéu'],
  ['Barcelona', 'BAR', 'Spotify Camp Nou'],
  ['Atlético Madrid', 'ATM', 'Riyadh Air Metropolitano'],
  ['Athletic Club', 'ATH', 'San Mamés'],
  ['Villarreal', 'VIL', 'Estadio de la Cerámica'],
  ['Real Sociedad', 'RSO', 'Reale Arena'],
  ['Real Betis', 'BET', 'Benito Villamarín'],
  ['Sevilla', 'SEV', 'Ramón Sánchez-Pizjuán'],
  ['Valencia', 'VAL', 'Mestalla'],
  ['Girona', 'GIR', 'Montilivi'],
  ['Celta Vigo', 'CEL', 'Balaídos'],
  ['Osasuna', 'OSA', 'El Sadar'],
  ['Getafe', 'GET', 'Coliseum'],
  ['Mallorca', 'MLL', 'Son Moix'],
  ['Rayo Vallecano', 'RAY', 'Estadio de Vallecas'],
  ['Espanyol', 'ESP', 'RCDE Stadium'],
  ['Alavés', 'ALA', 'Mendizorroza'],
  ['Elche', 'ELC', 'Martínez Valero'],
  ['Levante', 'LEV', 'Ciutat de València'],
  ['Real Oviedo', 'OVI', 'Carlos Tartiere'],
];
const SERIEA: TD[] = [
  ['Inter', 'INT', 'San Siro'],
  ['Napoli', 'NAP', 'Stadio Diego Armando Maradona'],
  ['AC Milan', 'MIL', 'San Siro'],
  ['Juventus', 'JUV', 'Allianz Stadium'],
  ['Atalanta', 'ATA', 'Gewiss Stadium'],
  ['Roma', 'ROM', 'Stadio Olimpico'],
  ['Lazio', 'LAZ', 'Stadio Olimpico'],
  ['Fiorentina', 'FIO', 'Stadio Artemio Franchi'],
  ['Bologna', 'BOL', "Stadio Renato Dall'Ara"],
  ['Torino', 'TOR', 'Stadio Olimpico Grande Torino'],
  ['Genoa', 'GEN', 'Stadio Luigi Ferraris'],
  ['Udinese', 'UDI', 'Bluenergy Stadium'],
  ['Cagliari', 'CAG', 'Unipol Domus'],
  ['Como', 'COM', 'Stadio Giuseppe Sinigaglia'],
  ['Parma', 'PAR', 'Stadio Ennio Tardini'],
  ['Lecce', 'LEC', 'Stadio Via del Mare'],
  ['Sassuolo', 'SAS', 'Mapei Stadium'],
  ['Hellas Verona', 'VER', 'Stadio Bentegodi'],
  ['Cremonese', 'CRE', 'Stadio Giovanni Zini'],
  ['Pisa', 'PIS', 'Arena Garibaldi'],
];
const BUNDESLIGA: TD[] = [
  ['Bayern Munich', 'BAY', 'Allianz Arena'],
  ['Borussia Dortmund', 'BVB', 'Signal Iduna Park'],
  ['Bayer Leverkusen', 'B04', 'BayArena'],
  ['RB Leipzig', 'RBL', 'Red Bull Arena'],
  ['Eintracht Frankfurt', 'SGE', 'Deutsche Bank Park'],
  ['VfB Stuttgart', 'VFB', 'MHPArena'],
  ['Borussia Mönchengladbach', 'BMG', 'Borussia-Park'],
  ['SC Freiburg', 'SCF', 'Europa-Park Stadion'],
  ['Werder Bremen', 'SVW', 'Weserstadion'],
  ['VfL Wolfsburg', 'WOB', 'Volkswagen Arena'],
  ['Mainz 05', 'M05', 'Mewa Arena'],
  ['Union Berlin', 'FCU', 'An der Alten Försterei'],
  ['TSG Hoffenheim', 'TSG', 'PreZero Arena'],
  ['FC Augsburg', 'FCA', 'WWK Arena'],
  ['FC St. Pauli', 'STP', 'Millerntor-Stadion'],
  ['1. FC Heidenheim', 'HDH', 'Voith-Arena'],
  ['1. FC Köln', 'KOE', 'RheinEnergieStadion'],
  ['Hamburger SV', 'HSV', 'Volksparkstadion'],
];
const LIGUE1: TD[] = [
  ['Paris Saint-Germain', 'PSG', 'Parc des Princes'],
  ['Marseille', 'OM', 'Stade Vélodrome'],
  ['Monaco', 'ASM', 'Stade Louis II'],
  ['Lille', 'LIL', 'Stade Pierre-Mauroy'],
  ['Lyon', 'OL', 'Groupama Stadium'],
  ['Nice', 'NIC', 'Allianz Riviera'],
  ['Lens', 'RCL', 'Stade Bollaert-Delelis'],
  ['Rennes', 'REN', 'Roazhon Park'],
  ['Strasbourg', 'STR', 'Stade de la Meinau'],
  ['Toulouse', 'TFC', 'Stadium de Toulouse'],
  ['Nantes', 'NAN', 'Stade de la Beaujoire'],
  ['Brest', 'BRS', 'Stade Francis-Le Blé'],
  ['Auxerre', 'AUX', "Stade de l'Abbé-Deschamps"],
  ['Angers', 'ANG', 'Stade Raymond Kopa'],
  ['Le Havre', 'HAC', 'Stade Océane'],
  ['Lorient', 'LOR', 'Stade du Moustoir'],
  ['Metz', 'MET', 'Stade Saint-Symphorien'],
  ['Paris FC', 'PFC', 'Stade Charléty'],
];
const ELITE_ONE: TD[] = [
  ['Coton Sport', 'COT', 'Roumdé Adjia Stadium'],
  ['Canon Yaoundé', 'CAN', 'Ahmadou Ahidjo Stadium'],
  ['Union Douala', 'UNI', 'Stade de la Réunification'],
  ['Fovu Club', 'FOV', 'Stade Municipal de Baham'],
  ['Colombe Sportive', 'COL', 'Stade de Dschang'],
  ['Bamboutos FC', 'BAM', 'Stade de Mbouda'],
  ['Dynamo Douala', 'DYN', 'Stade de la Réunification'],
  ['Stade Renard', 'SRM', 'Stade de Melong'],
  ['PWD Bamenda', 'PWD', 'Bamenda Municipal Stadium'],
  ['Eding Sport', 'EDI', 'Stade de Lekié'],
  ['Avion Academy', 'AVI', 'Stade de Yaoundé'],
  ['Victoria United', 'VIC', 'Limbe Omnisport Stadium'],
  ['Yong Sports Academy', 'YSA', 'Bamenda Municipal Stadium'],
  ['Panthère du Ndé', 'PAN', 'Stade de Bangangté'],
  ['Aigle Royal', 'AIG', 'Stade de Dschang'],
  ['Les Astres', 'AST', 'Stade de la Réunification'],
];
const J1: TD[] = [
  ['Vissel Kobe', 'KOB', 'Noevir Stadium Kobe'],
  ['Yokohama F. Marinos', 'YFM', 'Nissan Stadium'],
  ['Kawasaki Frontale', 'KAW', 'Todoroki Stadium'],
  ['Urawa Red Diamonds', 'URA', 'Saitama Stadium 2002'],
  ['Kashima Antlers', 'KAS', 'Kashima Soccer Stadium'],
  ['Gamba Osaka', 'GAM', 'Panasonic Stadium Suita'],
  ['Cerezo Osaka', 'CER', 'Yodoko Sakura Stadium'],
  ['Sanfrecce Hiroshima', 'SAN', 'Edion Peace Wing Hiroshima'],
  ['FC Tokyo', 'FCT', 'Ajinomoto Stadium'],
  ['Nagoya Grampus', 'NAG', 'Toyota Stadium'],
  ['Kyoto Sanga', 'KYO', 'Sanga Stadium by Kyocera'],
  ['Avispa Fukuoka', 'AVF', 'Best Denki Stadium'],
  ['Machida Zelvia', 'MAC', 'Machida GION Stadium'],
  ['Shimizu S-Pulse', 'SHI', 'IAI Stadium Nihondaira'],
  ['Tokyo Verdy', 'TKV', 'Ajinomoto Stadium'],
  ['Kashiwa Reysol', 'KSW', 'Sankyo Frontier Kashiwa'],
  ['Albirex Niigata', 'ALB', 'Denka Big Swan'],
  ['Fagiano Okayama', 'FAG', 'City Light Stadium'],
];
// Extra Champions League clubs that are not in the domestic lists above
const UCL_EXTRA: TD[] = [
  ['Benfica', 'BEN', 'Estádio da Luz', 76],
  ['Sporting CP', 'SCP', 'Estádio José Alvalade', 77],
  ['PSV Eindhoven', 'PSV', 'Philips Stadion', 74],
  ['Galatasaray', 'GAL', 'RAMS Park', 71],
];
const UCL_NAMES = [
  'Real Madrid', 'Barcelona', 'Atlético Madrid', 'Bayern Munich', 'Borussia Dortmund', 'Bayer Leverkusen',
  'Arsenal', 'Manchester City', 'Liverpool', 'Chelsea', 'Tottenham Hotspur', 'Newcastle United',
  'Inter', 'AC Milan', 'Napoli', 'Juventus', 'Atalanta', 'Paris Saint-Germain',
  'Marseille', 'Monaco', 'Benfica', 'Sporting CP', 'PSV Eindhoven', 'Galatasaray',
];

// ----- Basketball (NBA) -----
const NBA: TD[] = [
  ['Boston Celtics', 'BOS', 'TD Garden'], ['Oklahoma City Thunder', 'OKC', 'Paycom Center'],
  ['Cleveland Cavaliers', 'CLE', 'Rocket Arena'], ['New York Knicks', 'NYK', 'Madison Square Garden'],
  ['Denver Nuggets', 'DEN', 'Ball Arena'], ['Minnesota Timberwolves', 'MIN', 'Target Center'],
  ['Milwaukee Bucks', 'MIL', 'Fiserv Forum'], ['Indiana Pacers', 'IND', 'Gainbridge Fieldhouse'],
  ['Orlando Magic', 'ORL', 'Kia Center'], ['Detroit Pistons', 'DET', 'Little Caesars Arena'],
  ['Houston Rockets', 'HOU', 'Toyota Center'], ['Los Angeles Lakers', 'LAL', 'Crypto.com Arena'],
  ['Golden State Warriors', 'GSW', 'Chase Center'], ['Los Angeles Clippers', 'LAC', 'Intuit Dome'],
  ['Memphis Grizzlies', 'MEM', 'FedExForum'], ['Dallas Mavericks', 'DAL', 'American Airlines Center'],
  ['Phoenix Suns', 'PHX', 'Footprint Center'], ['Sacramento Kings', 'SAC', 'Golden 1 Center'],
  ['San Antonio Spurs', 'SAS', 'Frost Bank Center'], ['Atlanta Hawks', 'ATL', 'State Farm Arena'],
  ['Miami Heat', 'MIA', 'Kaseya Center'], ['Chicago Bulls', 'CHI', 'United Center'],
  ['Toronto Raptors', 'TOR', 'Scotiabank Arena'], ['Philadelphia 76ers', 'PHI', 'Xfinity Mobile Arena'],
  ['Brooklyn Nets', 'BKN', 'Barclays Center'], ['Portland Trail Blazers', 'POR', 'Moda Center'],
  ['Utah Jazz', 'UTA', 'Delta Center'], ['New Orleans Pelicans', 'NOP', 'Smoothie King Center'],
  ['Charlotte Hornets', 'CHA', 'Spectrum Center'], ['Washington Wizards', 'WAS', 'Capital One Arena'],
];

// ----- Cricket (IPL) -----
const IPL: TD[] = [
  ['Mumbai Indians', 'MI', 'Wankhede Stadium'], ['Chennai Super Kings', 'CSK', 'M. A. Chidambaram Stadium'],
  ['Royal Challengers Bengaluru', 'RCB', 'M. Chinnaswamy Stadium'], ['Kolkata Knight Riders', 'KKR', 'Eden Gardens'],
  ['Gujarat Titans', 'GT', 'Narendra Modi Stadium'], ['Rajasthan Royals', 'RR', 'Sawai Mansingh Stadium'],
  ['Sunrisers Hyderabad', 'SRH', 'Rajiv Gandhi Stadium'], ['Delhi Capitals', 'DC', 'Arun Jaitley Stadium'],
  ['Punjab Kings', 'PBKS', 'PCA Stadium Mohali'], ['Lucknow Super Giants', 'LSG', 'BRSABV Ekana Stadium'],
];

// ----- Cricket (Big Bash) -----
const BBL: TD[] = [
  ['Perth Scorchers', 'SCO', 'Optus Stadium'], ['Sydney Sixers', 'SIX', 'Sydney Cricket Ground'],
  ['Brisbane Heat', 'HEA', 'The Gabba'], ['Melbourne Stars', 'STA', 'Melbourne Cricket Ground'],
  ['Adelaide Strikers', 'STR', 'Adelaide Oval'], ['Sydney Thunder', 'THU', 'Sydney Showground Stadium'],
  ['Hobart Hurricanes', 'HUR', 'Bellerive Oval'], ['Melbourne Renegades', 'REN', 'Marvel Stadium'],
];

// ----- Rugby (Six Nations) -----
const SIX: TD[] = [
  ['France', 'FRA', 'Stade de France', 86], ['Ireland', 'IRE', 'Aviva Stadium', 85],
  ['England', 'ENG', 'Twickenham Stadium', 80], ['Scotland', 'SCO', 'Murrayfield', 74],
  ['Italy', 'ITA', 'Stadio Olimpico', 62], ['Wales', 'WAL', 'Principality Stadium', 60],
];

// ----- Tennis -----
const ATP: TD[] = ['Carlos Alcaraz', 'Jannik Sinner', 'Novak Djokovic', 'Alexander Zverev', 'Daniil Medvedev', 'Taylor Fritz',
  'Alex de Minaur', 'Ben Shelton', 'Casper Ruud', 'Lorenzo Musetti', 'Holger Rune', 'Andrey Rublev',
  'Stefanos Tsitsipas', 'Tommy Paul', 'Jack Draper', 'Grigor Dimitrov', 'Felix Auger-Aliassime', 'Frances Tiafoe',
  'Hubert Hurkacz', 'Flavio Cobolli', 'Jakub Mensik', 'Joao Fonseca', 'Arthur Fils', 'Ugo Humbert'].map(
  (n) => [n, n.split(' ').pop()!.slice(0, 3).toUpperCase(), 'Centre Court'] as TD,
);
const WTA: TD[] = ['Aryna Sabalenka', 'Iga Swiatek', 'Coco Gauff', 'Elena Rybakina', 'Jessica Pegula', 'Jasmine Paolini',
  'Qinwen Zheng', 'Madison Keys', 'Amanda Anisimova', 'Mirra Andreeva', 'Emma Navarro', 'Paula Badosa',
  'Elina Svitolina', 'Jelena Ostapenko', 'Danielle Collins', 'Karolina Muchova', 'Daria Kasatkina', 'Diana Shnaider',
  'Barbora Krejcikova', 'Marta Kostyuk', 'Liudmila Samsonova', 'Victoria Azarenka', 'Donna Vekic', 'Beatriz Haddad Maia'].map(
  (n) => [n, n.split(' ').pop()!.slice(0, 3).toUpperCase(), 'Centre Court'] as TD,
);

// Brand colours for well-known clubs. Everything else gets a stable colour derived from its name.
const BRAND: Record<string, [string, string]> = {
  Arsenal: ['#EF0107', '#FFFFFF'], 'Manchester City': ['#6CABDD', '#1C2C5B'], Liverpool: ['#C8102E', '#F6EB61'],
  Chelsea: ['#034694', '#DBA111'], 'Tottenham Hotspur': ['#132257', '#FFFFFF'], 'Manchester United': ['#DA291C', '#FBE122'],
  'Newcastle United': ['#241F20', '#FFFFFF'], 'Aston Villa': ['#670E36', '#95BFE5'], 'West Ham United': ['#7A263A', '#1BB1E7'],
  'Real Madrid': ['#F1F2F6', '#FEBE10'], Barcelona: ['#A50044', '#004D98'], 'Atlético Madrid': ['#CB3524', '#272E61'],
  'Athletic Club': ['#EE2523', '#FFFFFF'], Villarreal: ['#FBE122', '#005187'], Sevilla: ['#F43333', '#FFFFFF'],
  Valencia: ['#EE7203', '#000000'], 'Bayern Munich': ['#DC052D', '#0066B2'], 'Borussia Dortmund': ['#FDE100', '#000000'],
  'Bayer Leverkusen': ['#E32221', '#000000'], 'RB Leipzig': ['#DD0741', '#001F47'], 'Eintracht Frankfurt': ['#E1000F', '#000000'],
  Inter: ['#0068A8', '#000000'], 'AC Milan': ['#FB090B', '#000000'], Juventus: ['#111111', '#FFFFFF'], Napoli: ['#12A0D7', '#FFFFFF'],
  Atalanta: ['#1E71B8', '#000000'], Roma: ['#8E1F2F', '#F0BC42'], Lazio: ['#87D8F7', '#FFFFFF'],
  'Paris Saint-Germain': ['#004170', '#DA291C'], Marseille: ['#2FAEE0', '#FFFFFF'], Monaco: ['#E51B22', '#FFFFFF'],
  Lyon: ['#1D3C8F', '#E2001A'], Lille: ['#E01E13', '#1D2A5E'], Benfica: ['#E83030', '#FFFFFF'], 'Sporting CP': ['#008057', '#FFFFFF'],
  'PSV Eindhoven': ['#ED1C24', '#FFFFFF'], Galatasaray: ['#FDB913', '#A90432'], 'Coton Sport': ['#1B7A3E', '#FFFFFF'],
  'Canon Yaoundé': ['#E3A100', '#2B2B2B'], 'Union Douala': ['#D12B2B', '#1A1A1A'],
  'Boston Celtics': ['#007A33', '#FFFFFF'], 'Los Angeles Lakers': ['#552583', '#FDB927'], 'Golden State Warriors': ['#1D428A', '#FFC72C'],
  'Miami Heat': ['#98002E', '#F9A01B'], 'New York Knicks': ['#006BB6', '#F58426'], 'Chicago Bulls': ['#CE1141', '#000000'],
  'Oklahoma City Thunder': ['#007AC1', '#EF3B24'], 'Denver Nuggets': ['#0E2240', '#FEC524'], 'Milwaukee Bucks': ['#00471B', '#EEE1C6'],
  'Dallas Mavericks': ['#00538C', '#B8C4CA'], 'Phoenix Suns': ['#E56020', '#1D1160'], 'Brooklyn Nets': ['#111111', '#FFFFFF'],
  'Mumbai Indians': ['#004BA0', '#D1AB3E'], 'Chennai Super Kings': ['#F9CD05', '#0081E9'], 'Royal Challengers Bengaluru': ['#C8102E', '#1A1A1A'],
  'Kolkata Knight Riders': ['#3A225D', '#B3A123'], 'Gujarat Titans': ['#1B2133', '#A0814F'], 'Rajasthan Royals': ['#EA1A85', '#254AA5'],
  'Sunrisers Hyderabad': ['#F26522', '#1A1A1A'], 'Delhi Capitals': ['#17479E', '#EF1B23'], 'Punjab Kings': ['#D71920', '#A7A9AC'],
  'Lucknow Super Giants': ['#00A7E0', '#F58220'],
  'Perth Scorchers': ['#F26522', '#1A1A1A'], 'Sydney Sixers': ['#E5007D', '#FFFFFF'], 'Brisbane Heat': ['#FF5800', '#0B2A5B'],
  'Melbourne Stars': ['#00A650', '#FFFFFF'], 'Adelaide Strikers': ['#009EDB', '#FFD200'], 'Sydney Thunder': ['#C5D82E', '#1A1A1A'],
  'Hobart Hurricanes': ['#6F2C91', '#FFFFFF'], 'Melbourne Renegades': ['#E31837', '#1A1A1A'],
  France: ['#1F3A93', '#FFFFFF'], Ireland: ['#169B62', '#FFFFFF'], England: ['#FFFFFF', '#CF142B'], Scotland: ['#0B2C5F', '#FFFFFF'],
  Italy: ['#0072BC', '#FFFFFF'], Wales: ['#C8102E', '#FFFFFF'],
};

function paletteFor(name: string): [string, string] {
  if (BRAND[name]) return BRAND[name];
  const h = hashStr(name);
  const hue = h % 360;
  const sat = 55 + (h % 25);
  const light = 38 + ((h >> 8) % 14);
  const hsl = (hh: number, s: number, l: number) => `hsl(${hh} ${s}% ${l}%)`;
  return [hsl(hue, sat, light), hsl((hue + 40) % 360, 70, 88)];
}

export interface LeagueDef extends League {
  teamIds: string[];
  /** kickoff schedule configuration, interpreted by schedule.ts */
  schedule:
    | { kind: 'weekly'; parts: [dow: number, hh: number, mm: number][][]; rounds: number }
    | { kind: 'daily'; times: (dowMon0: number) => [number, number][]; }
    | { kind: 'stream'; offsetMin: number };
  streamPct: number;
  broadcasters: { name: string; region: string }[];
}

const teamMap = new Map<string, Team>();
const leagueDefs: LeagueDef[] = [];

function addTeams(
  list: TD[],
  sportId: SportId,
  leagueId: string,
  top: number,
  bottom: number,
  country: string,
): string[] {
  const n = list.length;
  const ids: string[] = [];
  list.forEach(([name, short, stadium, strengthOverride], i) => {
    const id = slug(name);
    ids.push(id);
    const existing = teamMap.get(id);
    if (existing) {
      if (!existing.leagueIds.includes(leagueId)) existing.leagueIds.push(leagueId);
      return;
    }
    const base = top - (i * (top - bottom)) / Math.max(1, n - 1);
    const noise = ((hashStr(name) % 9) - 4) * 0.8;
    const strength = strengthOverride ?? clamp(Math.round(base + noise), 25, 97);
    const [color, color2] = paletteFor(name);
    teamMap.set(id, {
      id,
      name,
      short,
      color,
      color2,
      country,
      sportId,
      leagueIds: [leagueId],
      strength,
      stadium: stadium ?? `${name} Stadium`,
    });
  });
  return ids;
}

function zones(...z: [number, number, string, StandingZone['color']][]): StandingZone[] {
  return z.map(([from, to, label, color]) => ({ from, to, label, color }));
}

const domZones = (n: number): StandingZone[] =>
  zones([1, 4, 'Champions League', 'primary'], [5, 5, 'Europa League', 'secondary'], [n - 2, n, 'Relegation', 'live']);

function defineLeague(
  def: Omit<LeagueDef, 'teamIds' | 'teamCount' | 'season' | 'round'> & { teams: string[] },
) {
  const { teams, ...rest } = def;
  leagueDefs.push({ ...rest, teamIds: teams, teamCount: teams.length, season: '', round: '' });
}

const MON = 0, TUE = 1, WED = 2, THU = 3, FRI = 4, SAT = 5, SUN = 6;
type Slot = [number, number, number];
const rep = (n: number, dow: number, hh: number, mm = 0): Slot[] => Array.from({ length: n }, () => [dow, hh, mm] as Slot);

// Football leagues
const eplIds = addTeams(PL, 'football', 'epl', 92, 48, 'England');
defineLeague({
  id: 'epl', name: 'Premier League', short: 'EPL', sportId: 'football', country: 'England', flag: 'ENG', kind: 'table',
  description: 'The top flight of English football, simulated with 20 clubs.',
  zones: domZones(20), teams: eplIds, streamPct: 85,
  broadcasters: [{ name: 'Sky Sports Premier League', region: 'UK' }, { name: 'TNT Sports 1', region: 'UK' }, { name: 'Peacock', region: 'US' }],
  schedule: { kind: 'weekly', rounds: 38, parts: [
    [[FRI, 20, 0], [SAT, 12, 30], ...rep(4, SAT, 15), [SAT, 17, 30], ...rep(2, SUN, 14), [SUN, 16, 30]],
    [...rep(2, MON, 20), ...rep(3, THU, 17, 30), ...rep(5, THU, 19, 45)],
  ] },
});
const laligaIds = addTeams(LALIGA, 'football', 'laliga', 91, 46, 'Spain');
defineLeague({
  id: 'laliga', name: 'La Liga', short: 'LAL', sportId: 'football', country: 'Spain', flag: 'ESP', kind: 'table',
  description: 'Spain\'s top division, simulated with 20 clubs.',
  zones: domZones(20), teams: laligaIds, streamPct: 75,
  broadcasters: [{ name: 'ESPN', region: 'US' }, { name: 'Movistar+', region: 'Spain' }, { name: 'beIN Sports', region: 'MENA' }],
  schedule: { kind: 'weekly', rounds: 38, parts: [
    [[FRI, 20, 0], [SAT, 13, 0], [SAT, 15, 15], [SAT, 17, 30], [SAT, 20, 0], [SUN, 13, 0], [SUN, 15, 15], [SUN, 17, 30], ...rep(2, SUN, 20)],
    [...rep(2, MON, 20), ...rep(3, THU, 18), ...rep(5, THU, 20)],
  ] },
});
const serieaIds = addTeams(SERIEA, 'football', 'seriea', 88, 44, 'Italy');
defineLeague({
  id: 'seriea', name: 'Serie A', short: 'SA', sportId: 'football', country: 'Italy', flag: 'ITA', kind: 'table',
  description: 'Italy\'s top division, simulated with 20 clubs.',
  zones: domZones(20), teams: serieaIds, streamPct: 70,
  broadcasters: [{ name: 'DAZN', region: 'Europe' }, { name: 'Paramount+', region: 'US' }, { name: 'Sky Sport', region: 'Italy' }],
  schedule: { kind: 'weekly', rounds: 38, parts: [
    [[FRI, 19, 45], [SAT, 14, 0], [SAT, 17, 0], [SAT, 19, 45], [SUN, 11, 30], [SUN, 14, 0], [SUN, 17, 0], ...rep(2, SUN, 19, 45), [SAT, 19, 45]],
    [...rep(2, MON, 20, 45), ...rep(3, THU, 18, 30), ...rep(5, THU, 20, 45)],
  ] },
});
const bundesligaIds = addTeams(BUNDESLIGA, 'football', 'bundesliga', 93, 44, 'Germany');
defineLeague({
  id: 'bundesliga', name: 'Bundesliga', short: 'BUN', sportId: 'football', country: 'Germany', flag: 'GER', kind: 'table',
  description: 'Germany\'s top division, simulated with 18 clubs.',
  zones: domZones(18), teams: bundesligaIds, streamPct: 70,
  broadcasters: [{ name: 'Sky Deutschland', region: 'Germany' }, { name: 'ESPN+', region: 'US' }, { name: 'DAZN', region: 'Europe' }],
  schedule: { kind: 'weekly', rounds: 34, parts: [
    [[FRI, 19, 30], ...rep(4, SAT, 14, 30), [SAT, 17, 30], [SUN, 14, 30], [SUN, 16, 30], [SUN, 18, 30]],
    [...rep(2, MON, 20, 30), ...rep(3, THU, 18, 30), ...rep(4, THU, 20, 30)],
  ] },
});
const ligue1Ids = addTeams(LIGUE1, 'football', 'ligue1', 90, 40, 'France');
defineLeague({
  id: 'ligue1', name: 'Ligue 1', short: 'L1', sportId: 'football', country: 'France', flag: 'FRA', kind: 'table',
  description: 'France\'s top division, simulated with 18 clubs.',
  zones: domZones(18), teams: ligue1Ids, streamPct: 55,
  broadcasters: [{ name: 'Ligue 1+', region: 'France' }, { name: 'beIN Sports', region: 'MENA' }, { name: 'Canal+', region: 'Africa' }],
  schedule: { kind: 'weekly', rounds: 34, parts: [
    [[FRI, 19, 45], [SAT, 15, 0], [SAT, 17, 0], [SAT, 19, 45], [SUN, 13, 0], ...rep(2, SUN, 15), [SUN, 17, 5], [SUN, 19, 45]],
    [...rep(2, MON, 20, 45), ...rep(3, THU, 18), ...rep(4, THU, 20, 45)],
  ] },
});
addTeams(UCL_EXTRA, 'football', 'ucl', 76, 70, 'Europe');
const uclIds = UCL_NAMES.map((n) => {
  const id = slug(n);
  const t = teamMap.get(id)!;
  if (!t.leagueIds.includes('ucl')) t.leagueIds.push('ucl');
  return id;
});
defineLeague({
  id: 'ucl', name: 'Champions League', short: 'UCL', sportId: 'football', country: 'Europe', flag: 'EUR', kind: 'table',
  description: 'Europe\'s elite club competition. League phase of 24 clubs, eight matchdays.',
  zones: zones([1, 8, 'Round of 16', 'primary'], [9, 16, 'Knockout play-offs', 'secondary'], [17, 24, 'Eliminated', 'live']),
  teams: uclIds, streamPct: 100,
  broadcasters: [{ name: 'TNT Sports 1', region: 'UK' }, { name: 'Paramount+', region: 'US' }, { name: 'Canal+ Sport', region: 'Africa' }, { name: 'beIN Sports', region: 'MENA' }],
  schedule: { kind: 'weekly', rounds: 8, parts: [[...rep(3, TUE, 16, 45), ...rep(3, TUE, 19), ...rep(3, WED, 16, 45), ...rep(3, WED, 19)]] },
});
const eliteIds = addTeams(ELITE_ONE, 'football', 'elite-one', 58, 28, 'Cameroon');
defineLeague({
  id: 'elite-one', name: 'MTN Elite One', short: 'E1', sportId: 'football', country: 'Cameroon', flag: 'CMR', kind: 'table',
  description: 'Cameroon\'s top division, simulated with 16 clubs.',
  zones: zones([1, 1, 'CAF Champions League', 'primary'], [2, 2, 'CAF Confederation Cup', 'secondary'], [14, 16, 'Relegation', 'live']),
  teams: eliteIds, streamPct: 40,
  broadcasters: [{ name: 'CRTV Sport', region: 'Cameroon' }, { name: 'Canal+ Sport', region: 'Africa' }],
  schedule: { kind: 'weekly', rounds: 30, parts: [
    [...rep(2, SAT, 13), ...rep(2, SAT, 15), ...rep(2, SUN, 13), ...rep(2, SUN, 15)],
    [...rep(4, WED, 13), ...rep(4, WED, 15)],
  ] },
});
const j1Ids = addTeams(J1, 'football', 'j1', 66, 38, 'Japan');
defineLeague({
  id: 'j1', name: 'J1 League', short: 'J1', sportId: 'football', country: 'Japan', flag: 'JPN', kind: 'table',
  description: 'Japan\'s top division, simulated with 18 clubs. Plays through the early-morning hours in Europe and Africa.',
  zones: zones([1, 3, 'AFC Champions League', 'primary'], [16, 18, 'Relegation', 'live']),
  teams: j1Ids, streamPct: 25,
  broadcasters: [{ name: 'DAZN Japan', region: 'Japan' }, { name: 'DAZN', region: 'Global' }],
  schedule: { kind: 'weekly', rounds: 34, parts: [
    [...rep(3, SAT, 5), ...rep(2, SAT, 9), ...rep(2, SUN, 5), ...rep(2, SUN, 9)],
    [...rep(4, WED, 9), ...rep(5, WED, 10)],
  ] },
});

// Basketball
const nbaIds = addTeams(NBA, 'basketball', 'nba', 90, 40, 'USA');
defineLeague({
  id: 'nba', name: 'NBA Regular Season', short: 'NBA', sportId: 'basketball', country: 'USA', flag: 'USA', kind: 'table',
  description: 'The NBA regular season with all 30 franchises.',
  zones: zones([1, 6, 'Playoffs', 'primary'], [7, 10, 'Play-in', 'secondary']),
  teams: nbaIds, streamPct: 80,
  broadcasters: [{ name: 'ESPN', region: 'US' }, { name: 'NBA League Pass', region: 'Global' }, { name: 'TNT', region: 'US' }],
  schedule: { kind: 'daily', times: () => [[23, 30], [0, 0], [0, 30], [1, 0], [2, 0], [2, 30], [3, 0]] },
});

// Cricket
const iplIds = addTeams(IPL, 'cricket', 'ipl', 82, 52, 'India');
defineLeague({
  id: 'ipl', name: 'T20 Premier League', short: 'T20', sportId: 'cricket', country: 'India', flag: 'IND', kind: 'table',
  description: 'A ten-franchise T20 league modelled on the IPL.',
  zones: zones([1, 4, 'Playoffs', 'primary']),
  teams: iplIds, streamPct: 100,
  broadcasters: [{ name: 'Star Sports', region: 'India' }, { name: 'JioHotstar', region: 'India' }, { name: 'Willow', region: 'US' }],
  schedule: { kind: 'daily', times: (d) => (d >= 5 ? [[10, 0], [14, 0]] : [[14, 0]]) },
});

// Big Bash (cricket, Australia): keeps cricket live during the early hours in Europe and Africa
const bblIds = addTeams(BBL, 'cricket', 'bbl', 78, 55, 'Australia');
defineLeague({
  id: 'bbl', name: 'Big Bash League', short: 'BBL', sportId: 'cricket', country: 'Australia', flag: 'AUS', kind: 'table',
  description: 'Eight-team T20 franchise league from Australia.',
  zones: zones([1, 4, 'Finals', 'primary']),
  teams: bblIds, streamPct: 100,
  broadcasters: [{ name: 'Fox Cricket', region: 'Australia' }, { name: 'Kayo Sports', region: 'Australia' }, { name: 'Willow', region: 'US' }],
  schedule: { kind: 'daily', times: (d) => (d >= 5 ? [[4, 0], [8, 0]] : [[8, 0]]) },
});

// Rugby
const sixIds = addTeams(SIX, 'rugby', 'six-nations', 86, 60, 'Europe');
defineLeague({
  id: 'six-nations', name: 'Six Nations', short: '6N', sportId: 'rugby', country: 'Europe', flag: 'INT', kind: 'table',
  description: 'Six teams, every team plays every other team.',
  zones: zones([1, 1, 'Champions', 'primary']),
  teams: sixIds, streamPct: 100,
  broadcasters: [{ name: 'ITV', region: 'UK' }, { name: 'France TV', region: 'France' }, { name: 'Peacock', region: 'US' }],
  schedule: { kind: 'weekly', rounds: 10, parts: [[[SAT, 14, 15], [SAT, 16, 45], [SUN, 15, 0]], [[THU, 20, 45], [FRI, 20, 0], [FRI, 20, 0]]] },
});

// Tennis
const atpIds = addTeams(ATP, 'tennis', 'atp', 96, 62, 'INT');
defineLeague({
  id: 'atp', name: 'ATP Tour', short: 'ATP', sportId: 'tennis', country: 'World', flag: 'INT', kind: 'ranking',
  description: 'Men\'s tour-level singles. Matches run around the clock across the tour.',
  zones: [], teams: atpIds, streamPct: 45,
  broadcasters: [{ name: 'Tennis Channel', region: 'US' }, { name: 'Sky Sports Tennis', region: 'UK' }, { name: 'Eurosport', region: 'Europe' }],
  schedule: { kind: 'stream', offsetMin: 0 },
});
const wtaIds = addTeams(WTA, 'tennis', 'wta', 96, 62, 'INT');
defineLeague({
  id: 'wta', name: 'WTA Tour', short: 'WTA', sportId: 'tennis', country: 'World', flag: 'INT', kind: 'ranking',
  description: 'Women\'s tour-level singles. Matches run around the clock across the tour.',
  zones: [], teams: wtaIds, streamPct: 35,
  broadcasters: [{ name: 'Tennis Channel', region: 'US' }, { name: 'Sky Sports Tennis', region: 'UK' }, { name: 'Eurosport', region: 'Europe' }],
  schedule: { kind: 'stream', offsetMin: 30 },
});

export const LEAGUES: LeagueDef[] = leagueDefs;
export const TEAMS: Team[] = [...teamMap.values()];
export const leagueById = new Map(LEAGUES.map((l) => [l.id, l]));
export const teamById = teamMap;
