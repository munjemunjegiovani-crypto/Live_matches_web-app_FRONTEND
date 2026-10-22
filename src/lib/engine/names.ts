import { Rand, hashStr } from './rng';
import { teamById } from './catalog';
import type { Player } from './types';

// Players are fictional: they are generated deterministically from the team id so squads stay stable.
type Pool = { first: string[]; last: string[] };
const POOLS: Record<string, Pool> = {
  en: {
    first: ['James', 'Harry', 'Jack', 'Oliver', 'Callum', 'Declan', 'Marcus', 'Ben', 'Tom', 'Luke', 'Sam', 'Ryan', 'Kyle', 'Jordan', 'Conor', 'Aaron', 'Reece', 'Jude', 'Mason', 'Cole', 'Liam', 'Ethan'],
    last: ['Walker', 'Hughes', 'Stone', 'Palmer', 'Mitchell', 'Foster', 'Grant', 'Bennett', 'Carter', 'Hayes', 'Shaw', 'Fletcher', 'Barnes', 'Cole', 'Wright', 'Rowe', 'Gibbs', 'Lowe', 'Marsh', 'Hale', 'Dixon', 'Reeves', 'Pearce', 'Holt'],
  },
  es: {
    first: ['Álvaro', 'Sergio', 'Marcos', 'Iker', 'Pablo', 'Diego', 'Raúl', 'Hugo', 'Adrián', 'Mario', 'Rubén', 'Javier', 'Daniel', 'Carlos', 'Unai', 'Aitor', 'Nacho', 'Borja'],
    last: ['Alvarez', 'Navarro', 'Ortega', 'Molina', 'Serrano', 'Cabrera', 'Ramos', 'Iglesias', 'Vidal', 'Herrera', 'Campos', 'Rubio', 'Medina', 'Pascual', 'Lozano', 'Fuentes', 'Mendez', 'Garrido', 'Sanz', 'Carrasco'],
  },
  it: {
    first: ['Matteo', 'Luca', 'Andrea', 'Federico', 'Davide', 'Simone', 'Lorenzo', 'Marco', 'Nicolò', 'Riccardo', 'Giorgio', 'Alessio', 'Stefano', 'Emanuele', 'Fabio', 'Tommaso'],
    last: ['Romano', 'Conti', 'Ferrari', 'Greco', 'Bruno', 'Gallo', 'Costa', 'Fontana', 'Marino', 'Rinaldi', 'Caruso', 'Moretti', 'Barbieri', 'Lombardi', 'Santoro', 'Ferri', 'Valentini', 'Bianchi', 'Leone', 'Coppola'],
  },
  de: {
    first: ['Lukas', 'Jonas', 'Felix', 'Leon', 'Moritz', 'Niklas', 'Florian', 'Tim', 'Jan', 'Maximilian', 'Kai', 'Lars', 'Sven', 'Tobias', 'Julian', 'Philipp'],
    last: ['Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter', 'Wolf', 'Neumann', 'Braun', 'Krüger', 'Hartmann', 'Lange', 'Schmitt', 'Keller', 'Vogel', 'Roth', 'Berger', 'Fuchs', 'Winter', 'Böhm', 'Lehmann'],
  },
  fr: {
    first: ['Hugo', 'Théo', 'Maxime', 'Antoine', 'Lucas', 'Baptiste', 'Julien', 'Mathis', 'Rémi', 'Enzo', 'Clément', 'Yanis', 'Corentin', 'Quentin', 'Axel', 'Dylan'],
    last: ['Lefèvre', 'Moreau', 'Fournier', 'Girard', 'Bonnet', 'Dupuis', 'Lambert', 'Fontaine', 'Rousseau', 'Mercier', 'Blanchard', 'Guerin', 'Perrin', 'Chevalier', 'Marchand', 'Robin', 'Gauthier', 'Faure', 'Carpentier', 'Colin'],
  },
  pt: {
    first: ['Tiago', 'Rafael', 'Bruno', 'Diogo', 'João', 'Miguel', 'Rúben', 'Gonçalo', 'André', 'Nuno', 'Vasco', 'Pedro'],
    last: ['Almeida', 'Ferreira', 'Carvalho', 'Pinto', 'Teixeira', 'Rocha', 'Moreira', 'Cardoso', 'Barros', 'Nogueira', 'Silva', 'Duarte', 'Correia', 'Batista'],
  },
  nl: {
    first: ['Daan', 'Sem', 'Luuk', 'Joris', 'Milan', 'Bram', 'Stijn', 'Thijs', 'Ruben', 'Jesse', 'Noah', 'Tijn'],
    last: ['de Vries', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'Bos', 'Vos', 'Peters', 'Hendriks'],
  },
  tr: {
    first: ['Emre', 'Burak', 'Kerem', 'Arda', 'Cem', 'Mert', 'Ozan', 'Yusuf', 'Barış', 'Efe', 'Can', 'Selim'],
    last: ['Yilmaz', 'Demir', 'Çelik', 'Kaya', 'Aydin', 'Arslan', 'Koç', 'Şahin', 'Öztürk', 'Aksoy', 'Polat', 'Erdem'],
  },
  jp: {
    first: ['Haruto', 'Ren', 'Sota', 'Yuto', 'Kaito', 'Daiki', 'Ryota', 'Takumi', 'Shun', 'Kenta', 'Hayato', 'Yuki', 'Kota', 'Riku'],
    last: ['Tanaka', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Hayashi', 'Shimizu', 'Mori', 'Ogawa'],
  },
  cm: {
    first: ['Samuel', 'Eric', 'Joseph', 'Vincent', 'Georges', 'Ernest', 'Franck', 'Patrick', 'Arnaud', 'Clinton', 'Bryan', 'Collins', 'Nicolas', 'Alain', 'Roger', 'Yannick', 'Steve', 'Jean'],
    last: ['Mbarga', 'Fouda', 'Tchamba', 'Kamga', 'Ngassa', 'Atangana', 'Essomba', 'Mvondo', 'Etame', 'Zambo', 'Bekolo', 'Manga', 'Ekambi', 'Ndjock', 'Nguemo', 'Tchouaméni', 'Biyick', 'Ateba', 'Nkeng', 'Mboma'],
  },
  us: {
    first: ['Marcus', 'Jalen', 'Darius', 'Tyrese', 'Devin', 'Malik', 'Cameron', 'Isaiah', 'Trey', 'Andre', 'Xavier', 'Jaylen', 'Terrence', 'Caleb', 'Dante', 'Mason'],
    last: ['Johnson', 'Williams', 'Brooks', 'Jackson', 'Harris', 'Coleman', 'Reed', 'Simmons', 'Bryant', 'Hamilton', 'Woods', 'Gordon', 'Pierce', 'Sanders', 'Watkins', 'Barrett', 'Fields', 'Mack'],
  },
  in: {
    first: ['Rohan', 'Arjun', 'Vikram', 'Karan', 'Aditya', 'Rahul', 'Sanjay', 'Imran', 'Deepak', 'Nikhil', 'Siddharth', 'Ishaan', 'Pranav', 'Harsh', 'Varun', 'Tushar'],
    last: ['Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Kapoor', 'Singh', 'Iyer', 'Khan', 'Mehta', 'Joshi', 'Menon', 'Bose', 'Chauhan', 'Rawat', 'Bhatt'],
  },
};

const TEAM_POOL: Record<string, string> = {
  benfica: 'pt', 'sporting-cp': 'pt', 'psv-eindhoven': 'nl', galatasaray: 'tr',
  france: 'fr', ireland: 'en', england: 'en', scotland: 'en', italy: 'it', wales: 'en',
};
const COUNTRY_POOL: Record<string, string> = {
  England: 'en', Spain: 'es', Italy: 'it', Germany: 'de', France: 'fr', Cameroon: 'cm', Japan: 'jp', USA: 'us', India: 'in',
};

const squadCache = new Map<string, Player[]>();

const SIZES = { football: [3, 8, 7, 6], basketball: [0, 4, 4, 4], cricket: [0, 4, 6, 4], rugby: [2, 8, 7, 6], tennis: [0, 0, 0, 0] } as const;

export function squadFor(teamId: string): Player[] {
  const cached = squadCache.get(teamId);
  if (cached) return cached;
  const team = teamById.get(teamId);
  if (!team) return [];
  const rnd = new Rand('squad:' + teamId);
  const pool = POOLS[TEAM_POOL[teamId] ?? COUNTRY_POOL[team.country ?? ''] ?? 'en'];
  const sizes = SIZES[team.sportId];
  const positions: Player['position'][] = ['GK', 'DF', 'MF', 'FW'];
  const used = new Set<string>();
  const numbers = new Set<number>();
  const players: Player[] = [];
  positions.forEach((pos, pi) => {
    for (let i = 0; i < sizes[pi]; i++) {
      let name = '';
      for (let tries = 0; tries < 20; tries++) {
        name = `${rnd.pick(pool.first)} ${rnd.pick(pool.last)}`;
        if (!used.has(name)) break;
      }
      used.add(name);
      let number = pos === 'GK' && i === 0 ? 1 : rnd.int(2, 40);
      while (numbers.has(number)) number = rnd.int(2, 40);
      numbers.add(number);
      players.push({ id: `${teamId}-${players.length + 1}`, teamId, name, number, position: pos });
    }
  });
  squadCache.set(teamId, players);
  return players;
}

/** "Marcos Alvarez" -> "M. Alvarez" */
export function shortName(full: string): string {
  const parts = full.split(' ');
  if (parts.length < 2) return full;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

const COACH_FIRST = ['Mikel', 'Pep', 'Thomas', 'Carlo', 'Luis', 'Diego', 'Xavi', 'Hansi', 'Antonio', 'Jose', 'Marco', 'Roberto', 'Sean', 'Gareth', 'Julian'];
export function coachFor(teamId: string): string {
  const rnd = new Rand('coach:' + teamId);
  const team = teamById.get(teamId);
  const pool = POOLS[TEAM_POOL[teamId] ?? COUNTRY_POOL[team?.country ?? ''] ?? 'en'];
  return `${rnd.pick(COACH_FIRST)} ${rnd.pick(pool.last)}`;
}

const REF_FIRST = ['Michael', 'Daniele', 'Felix', 'Clément', 'Jesús', 'Anthony', 'Slavko', 'Szymon', 'Danny', 'Istvan'];
const REF_LAST = ['Oliver', 'Orsato', 'Zwayer', 'Turpin', 'Gil', 'Taylor', 'Vinčić', 'Marciniak', 'Makkelie', 'Kovács', 'Hernández', 'Brych'];
export function refereeFor(id: string): string {
  const rnd = new Rand('ref:' + id);
  return `${rnd.pick(REF_FIRST)} ${rnd.pick(REF_LAST)}`;
}

export function stableHash(s: string) {
  return hashStr(s);
}
