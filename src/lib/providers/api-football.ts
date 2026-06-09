import { promises as fs } from 'fs'
import path from 'path'
import type {
  WorldCupDataProvider,
  Match,
  MatchDetail,
  Team,
  Player,
  PositionGroup,
  Salary,
} from '@/lib/types'
import {
  curatedSalaries,
  type CuratedSalary,
} from '@/lib/data/curated-salaries'

const DATA_DIR = path.join(process.cwd(), 'data')

/** Lowercase + accent-strip for fuzzy name matching. */
function normalizeName(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Build the salary lookup map keyed by `af-<playerId>` from the curated list
 * by walking the squad cache and matching by lastname + nationality.
 *
 * Memoized at module level — recomputed only when squads/teams cache changes.
 */
let _salaryCache:
  | { squadsRef: unknown; teamsRef: unknown; map: Record<string, Salary> }
  | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSalaryMap(squads: any, teams: any): Record<string, Salary> {
  if (_salaryCache && _salaryCache.squadsRef === squads && _salaryCache.teamsRef === teams) {
    return _salaryCache.map
  }
  const map: Record<string, Salary> = {}

  // Group curated entries by lowercased nationality for fast filter.
  const byNat: Record<string, CuratedSalary[]> = {}
  for (const c of curatedSalaries) {
    const k = c.nationality.toLowerCase()
    ;(byNat[k] ??= []).push(c)
  }

  for (const [teamId, players] of Object.entries(squads)) {
    const teamMeta = teams[teamId as string]
    const teamNationality = (teamMeta?.name ?? '').toLowerCase()
    const candidates = byNat[teamNationality] ?? []
    if (!candidates.length) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of players as any[]) {
      const pid = p.player?.id
      if (!pid) continue

      const haystack = normalizeName(
        [p.player?.name, p.player?.firstname, p.player?.lastname]
          .filter(Boolean)
          .join(' ')
      )
      const firstName = normalizeName(p.player?.firstname)

      for (const c of candidates) {
        if (!haystack.includes(normalizeName(c.lastname))) continue
        // Optional firstname disambiguation (e.g. multiple Silvas in Portugal)
        if (c.firstnameHint && !firstName.includes(normalizeName(c.firstnameHint))) {
          continue
        }
        map[`af-${pid}`] = {
          annualEur: c.annualEur,
          source: c.source,
          isMarketValue: false,
        }
        break
      }
    }
  }

  _salaryCache = { squadsRef: squads, teamsRef: teams, map }
  return map
}

/**
 * Reads JSON files produced by `npm run fetch:data`.
 * Falls back to throwing a friendly error when the cache is missing.
 */
async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), 'utf8')
    return JSON.parse(raw) as T
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

function mapPositionGroup(pos: string): PositionGroup {
  const p = (pos ?? '').toLowerCase()
  if (p.startsWith('g') || p.includes('keeper')) return 'GK'
  if (p.startsWith('d') || p.includes('defend') || p.includes('back')) return 'DEF'
  if (p.startsWith('m') || p.includes('mid')) return 'MID'
  return 'ATT'
}

function parseHeight(raw: string | number | null | undefined): number {
  if (raw == null || raw === '') return 0
  // Accept "190 cm", "190cm", or plain "190" — /players/profiles returns it bare.
  const s = String(raw).trim()
  const m = s.match(/(\d{2,3})/)
  return m ? parseInt(m[1], 10) : 0
}

/**
 * api-football grid is "row:col" where row 1 is closest to goal.
 * Map to our pitch coordinate system (0–100 X, 0–110 Y, with Y=95 at own goal).
 */
function gridToPitch(
  grid: string | null,
  formation: string | null
): { pitchX?: number; pitchY?: number } {
  if (!grid) return {}
  const [rowStr, colStr] = grid.split(':')
  const row = parseInt(rowStr, 10)
  const col = parseInt(colStr, 10)
  if (!row || !col) return {}

  const lineCounts = (formation ?? '4-3-3').split('-').map((n) => parseInt(n, 10))
  // row 1 = GK, row 2 = first outfield line, etc.
  const rowsTotal = lineCounts.length + 1
  const colsInRow = row === 1 ? 1 : lineCounts[row - 2] ?? 4

  // Vertical: row 1 near own goal (Y=92), last row near opp goal (Y=15)
  const yMin = 15
  const yMax = 92
  const pitchY = yMax - ((row - 1) / Math.max(1, rowsTotal - 1)) * (yMax - yMin)

  // Horizontal: distribute columns evenly across pitch (15–85)
  const xMin = 15
  const xMax = 85
  const pitchX =
    colsInRow === 1
      ? 50
      : xMin + ((col - 1) / (colsInRow - 1)) * (xMax - xMin)

  return { pitchX, pitchY }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSquadPlayer(
  raw: any,
  salaryMap: Record<string, Salary>,
  nationalTeamRawId: number | undefined,
  clubs: ClubsCache,
  clubMeta: ClubMetaCache
): Player {
  const rawId = raw.player?.id ?? raw.id
  const id = `af-${rawId}`
  const allStats = raw.statistics ?? []

  // Position / number / rating come from the overlaid roster slot (stats[0]).
  const games = allStats[0]?.games ?? {}

  // Club source priority:
  //   1. clubs.json — authoritative, derived from /players/teams (covers everyone)
  //   2. statistics fallback (legacy path for unfetched players)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsClubEntry = allStats.find(
    (s: any) =>
      s?.team?.id != null &&
      s.team.id !== nationalTeamRawId &&
      s.team.national !== true &&
      !/\bU-?\d{1,2}\b/i.test(s.team.name ?? '')
  )
  const clubFromCache = clubs[String(rawId)]
  const club = clubFromCache ?? statsClubEntry?.team

  // Country for the club flag. Priority: club-meta.json (authoritative),
  // then whatever the club record itself carries.
  const clubCountry =
    (club?.id != null && clubMeta[String(club.id)]?.country) ||
    club?.country ||
    ''

  const position = games.position ?? raw.position ?? ''

  return {
    id,
    name: raw.player?.name ?? raw.name ?? 'Unknown',
    position,
    group: mapPositionGroup(position),
    age: raw.player?.age ?? raw.age ?? 0,
    heightCm: parseHeight(raw.player?.height ?? raw.height),
    jerseyNumber: games.number ?? raw.number ?? 0,
    club: club
      ? {
          name: club.name,
          country: clubCountry,
          countryCode: clubCountryCode(clubCountry),
        }
      : { name: '', country: '', countryCode: '' },
    photoUrl: raw.player?.photo ?? raw.photo,
    salary: salaryMap[id],
    fotmobRating: statsClubEntry?.games?.rating
      ? parseFloat(statsClubEntry.games.rating)
      : games.rating
      ? parseFloat(games.rating)
      : undefined,
    starRating: statsClubEntry?.games?.rating
      ? +(parseFloat(statsClubEntry.games.rating) / 2).toFixed(1)
      : games.rating
      ? +(parseFloat(games.rating) / 2).toFixed(1)
      : undefined,
    isStartingXI: false,
  }
}

// Country names from api-football → ISO-3166 alpha-2 codes (used by flagcdn.com).
// Includes the four UK subdivisions where flagcdn supports them.
const COUNTRY_TO_CODE: Record<string, string> = {
  // UK home nations
  England: 'gb-eng',
  Scotland: 'gb-sct',
  Wales: 'gb-wls',
  'Northern Ireland': 'gb-nir',

  // Europe
  Spain: 'es', Italy: 'it', Germany: 'de', France: 'fr', Portugal: 'pt',
  Netherlands: 'nl', Belgium: 'be', Switzerland: 'ch', Austria: 'at',
  Greece: 'gr', Croatia: 'hr', Serbia: 'rs', Slovenia: 'si', Slovakia: 'sk',
  'Czech Republic': 'cz', Czechia: 'cz', Hungary: 'hu', Romania: 'ro',
  Bulgaria: 'bg', Poland: 'pl', Ukraine: 'ua', Russia: 'ru',
  Denmark: 'dk', Norway: 'no', Sweden: 'se', Finland: 'fi', Iceland: 'is',
  Ireland: 'ie', 'Republic of Ireland': 'ie', Cyprus: 'cy', Malta: 'mt',
  Albania: 'al', 'North Macedonia': 'mk', Bosnia: 'ba',
  'Bosnia and Herzegovina': 'ba', Turkey: 'tr', 'Türkiye': 'tr',
  Israel: 'il', Luxembourg: 'lu', Estonia: 'ee', Latvia: 'lv', Lithuania: 'lt',
  Belarus: 'by', Georgia: 'ge', Armenia: 'am', Azerbaijan: 'az',
  Kazakhstan: 'kz', Moldova: 'md',

  // Americas
  Brazil: 'br', Argentina: 'ar', Uruguay: 'uy', Paraguay: 'py',
  Chile: 'cl', Peru: 'pe', Colombia: 'co', Ecuador: 'ec', Venezuela: 've',
  Bolivia: 'bo', Mexico: 'mx', USA: 'us', 'United States': 'us', Canada: 'ca',
  'Costa Rica': 'cr', Panama: 'pa', Honduras: 'hn', 'El Salvador': 'sv',
  Guatemala: 'gt', Nicaragua: 'ni', Jamaica: 'jm', Haiti: 'ht', Cuba: 'cu',
  'Dominican Republic': 'do', 'Trinidad and Tobago': 'tt',

  // Asia
  'South Korea': 'kr', 'Korea Republic': 'kr', 'North Korea': 'kp',
  Japan: 'jp', China: 'cn', 'China PR': 'cn', India: 'in',
  Indonesia: 'id', Malaysia: 'my', Thailand: 'th', Vietnam: 'vn',
  Singapore: 'sg', Philippines: 'ph', Iran: 'ir', Iraq: 'iq',
  'Saudi Arabia': 'sa', 'United Arab Emirates': 'ae', Qatar: 'qa',
  Bahrain: 'bh', Kuwait: 'kw', Oman: 'om', Yemen: 'ye',
  Jordan: 'jo', Lebanon: 'lb', Syria: 'sy', Palestine: 'ps',
  Uzbekistan: 'uz', Tajikistan: 'tj', Turkmenistan: 'tm', Kyrgyzstan: 'kg',
  Afghanistan: 'af', Pakistan: 'pk', Bangladesh: 'bd', 'Sri Lanka': 'lk',

  // Africa
  Morocco: 'ma', Algeria: 'dz', Tunisia: 'tn', Egypt: 'eg', Libya: 'ly',
  Senegal: 'sn', Nigeria: 'ng', Ghana: 'gh', 'South Africa': 'za',
  'Ivory Coast': 'ci', "Cote d'Ivoire": 'ci', Cameroon: 'cm', Kenya: 'ke',
  'Cape Verde': 'cv', Mali: 'ml', 'Burkina Faso': 'bf', Angola: 'ao',
  'Congo DR': 'cd', 'DR Congo': 'cd', Ethiopia: 'et', Uganda: 'ug',
  Tanzania: 'tz', Zimbabwe: 'zw', Zambia: 'zm', Mozambique: 'mz', Sudan: 'sd',

  // Oceania
  Australia: 'au', 'New Zealand': 'nz', Fiji: 'fj',
}

function clubCountryCode(country: string | undefined | null): string {
  if (!country) return 'un'
  // api-football uses hyphens ("Saudi-Arabia", "United-Arab-Emirates") —
  // normalize to spaces for lookup, fall back to raw, then fall back to
  // a hash-warning placeholder so a bad mapping is loudly visible.
  const normalized = country.replace(/-/g, ' ').trim()
  return (
    COUNTRY_TO_CODE[normalized] ??
    COUNTRY_TO_CODE[country] ??
    'un'
  )
}

interface FixturesCache {
  matches: Match[]
}

interface SquadCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [teamId: string]: any[]
}

interface TeamMetaCache {
  [teamId: string]: {
    id: string
    name: string
    countryCode: string
    fifaRanking?: number
    formation?: string
  }
}

interface LineupCache {
  [matchId: string]: {
    home: { formation: string; startXI: { playerId: number; grid: string }[] }
    away: { formation: string; startXI: { playerId: number; grid: string }[] }
  }
}

interface ClubsCache {
  [playerId: string]: {
    id: number
    name: string
    country?: string | null
    logo?: string | null
  } | null
}

interface ClubMetaCache {
  [clubId: string]: {
    id: number
    name: string
    country?: string | null
    code?: string | null
    logo?: string | null
  } | null
}

async function loadCaches() {
  const [fixtures, squads, teams, lineups, clubs, clubMeta] = await Promise.all([
    readJson<FixturesCache>('fixtures.json'),
    readJson<SquadCache>('squads.json'),
    readJson<TeamMetaCache>('teams.json'),
    readJson<LineupCache>('lineups.json'),
    readJson<ClubsCache>('clubs.json'),
    readJson<ClubMetaCache>('club-meta.json'),
  ])
  const safeSquads = squads ?? {}
  const safeTeams = teams ?? {}
  return {
    fixtures,
    squads: safeSquads,
    teams: safeTeams,
    lineups: lineups ?? {},
    salaryMap: buildSalaryMap(safeSquads, safeTeams),
    clubs: clubs ?? {},
    clubMeta: clubMeta ?? {},
  }
}

export const apiFootballProvider: WorldCupDataProvider = {
  async getMatches(): Promise<Match[]> {
    const { fixtures } = await loadCaches()
    if (!fixtures) {
      throw new Error(
        'No cached api-football data found. Run `npm run fetch:data` to populate `data/`.'
      )
    }
    return fixtures.matches
  },

  async getMatchDetail(matchId: string): Promise<MatchDetail | null> {
    const { fixtures, squads, teams, lineups, salaryMap, clubs, clubMeta } =
      await loadCaches()
    if (!fixtures) {
      throw new Error(
        'No cached api-football data found. Run `npm run fetch:data` to populate `data/`.'
      )
    }
    const match = fixtures.matches.find((m) => m.id === matchId)
    if (!match) return null

    const lineup = lineups[matchId]
    const homeMeta = teams[match.home.id]
    const awayMeta = teams[match.away.id]

    const buildTeam = (
      ref: typeof match.home,
      side: 'home' | 'away',
      meta?: TeamMetaCache[string]
    ): Team => {
      const rawSquad = squads[ref.id] ?? []
      // ref.id looks like "af-team-16" — extract the raw 16 so the mapper
      // can filter out the national-team statistics entry from each player.
      const nationalTeamRawId = (() => {
        const m = ref.id.match(/^af-team-(\d+)$/)
        return m ? parseInt(m[1], 10) : undefined
      })()
      let players: Player[] = rawSquad.map((p) =>
        mapSquadPlayer(p, salaryMap, nationalTeamRawId, clubs, clubMeta)
      )

      const xiData = lineup?.[side]
      if (xiData) {
        const formation = xiData.formation
        const xiIds = new Set(xiData.startXI.map((x) => `af-${x.playerId}`))
        const gridById: Record<string, string> = {}
        xiData.startXI.forEach((x) => {
          gridById[`af-${x.playerId}`] = x.grid
        })
        players = players.map((p) => {
          if (!xiIds.has(p.id)) return p
          const pos = gridToPitch(gridById[p.id], formation)
          return { ...p, isStartingXI: true, ...pos }
        })
      }

      return {
        id: ref.id,
        name: ref.name,
        countryCode: ref.countryCode,
        fifaRanking: meta?.fifaRanking,
        formation: xiData?.formation ?? meta?.formation,
        squad: players,
      }
    }

    return {
      match,
      home: buildTeam(match.home, 'home', homeMeta),
      away: buildTeam(match.away, 'away', awayMeta),
    }
  },
}
