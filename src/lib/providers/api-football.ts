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
  GroupStanding,
  Standing,
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
  'Bosnia and Herzegovina': 'ba',
  'Bosnia & Herzegovina': 'ba',  // alias used by api-football team data
  Turkey: 'tr', 'Türkiye': 'tr',
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
  Curacao: 'cw', 'Curaçao': 'cw',
  'Cape Verde Islands': 'cv',  // api-football alias

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

/** Raw shape persisted to data/standings.json by the fetch script. */
interface StandingsCache {
  groups: Array<
    Array<{
      rank: number
      team: { id: string; name: string; logo?: string | null }
      played: number
      win: number
      draw: number
      lose: number
      goalsFor: number
      goalsAgainst: number
      goalDifference: number
      points: number
      form?: string
      groupRaw?: string | null
    }>
  >
}

async function loadCaches() {
  const [fixtures, squads, teams, lineups, clubs, clubMeta, standings] =
    await Promise.all([
      readJson<FixturesCache>('fixtures.json'),
      readJson<SquadCache>('squads.json'),
      readJson<TeamMetaCache>('teams.json'),
      readJson<LineupCache>('lineups.json'),
      readJson<ClubsCache>('clubs.json'),
      readJson<ClubMetaCache>('club-meta.json'),
      readJson<StandingsCache>('standings.json'),
    ])
  const safeSquads = squads ?? {}
  const safeTeams = teams ?? {}
  return {
    fixtures,
    squads: safeSquads,
    teams: safeTeams,
    standings,
    lineups: lineups ?? {},
    salaryMap: buildSalaryMap(safeSquads, safeTeams),
    clubs: clubs ?? {},
    clubMeta: clubMeta ?? {},
  }
}

/**
 * Re-resolve a match's team country codes from the team name using the
 * provider's full COUNTRY_TO_CODE map. The codes baked into fixtures.json
 * at fetch time were computed with an older / partial map (slice(0,2)
 * fallback) and have a few wrong matches (Bosnia → Bolivia, etc.) This
 * fixes them at render time without a refetch.
 */
function withFixedFlags(m: Match): Match {
  return {
    ...m,
    home: { ...m.home, countryCode: clubCountryCode(m.home.name) },
    away: { ...m.away, countryCode: clubCountryCode(m.away.name) },
  }
}

/**
 * Fill in `group` for every match.
 *
 * api-football's round name is only "Group Stage - 1/2/3" (no letter) so we
 * can't extract group letters from there. Instead we cluster matches by team
 * co-occurrence (each team plays exactly its 3 group-mates) and label
 * clusters using the published 2026 draw for the 4 host-anchored groups.
 * Remaining clusters get E–L deterministically by alphabetical order of
 * their first team's name — guarantees stability across page loads.
 */
const KNOWN_GROUPS: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic', 'Czechia'],
  B: [
    'Canada',
    'Bosnia & Herzegovina',
    'Bosnia and Herzegovina',
    'Qatar',
    'Switzerland',
  ],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: [
    'USA',
    'United States',
    'Paraguay',
    'Australia',
    'Türkiye',
    'Turkey',
  ],
}
const KNOWN_TEAM_TO_LETTER: Record<string, string> = {}
for (const [letter, names] of Object.entries(KNOWN_GROUPS)) {
  for (const n of names) KNOWN_TEAM_TO_LETTER[n] = letter
}
const ALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function withDerivedGroups(matches: Match[]): Match[] {
  // Skip work if every match already has a group letter.
  if (matches.every((m) => m.group)) return matches

  // Build team graph: edge between home + away.
  const adj = new Map<string, Set<string>>()
  const idToName = new Map<string, string>()
  for (const m of matches) {
    idToName.set(m.home.id, m.home.name)
    idToName.set(m.away.id, m.away.name)
    if (!adj.has(m.home.id)) adj.set(m.home.id, new Set())
    if (!adj.has(m.away.id)) adj.set(m.away.id, new Set())
    adj.get(m.home.id)!.add(m.away.id)
    adj.get(m.away.id)!.add(m.home.id)
  }

  // Find connected components via BFS.
  const visited = new Set<string>()
  const clusters: string[][] = []
  for (const seed of Array.from(adj.keys())) {
    if (visited.has(seed)) continue
    const cluster: string[] = []
    const queue = [seed]
    while (queue.length) {
      const cur = queue.shift()!
      if (visited.has(cur)) continue
      visited.add(cur)
      cluster.push(cur)
      const neighbors = adj.get(cur)
      if (neighbors) {
        for (const n of Array.from(neighbors)) {
          if (!visited.has(n)) queue.push(n)
        }
      }
    }
    clusters.push(cluster)
  }

  // Label A–D using KNOWN_GROUPS, defer the rest.
  const idToLetter = new Map<string, string>()
  const usedLetters = new Set<string>()
  const deferred: { teamIds: string[]; repName: string }[] = []

  for (const cluster of clusters) {
    let letter: string | undefined
    for (const tid of cluster) {
      const candidate = KNOWN_TEAM_TO_LETTER[idToName.get(tid) ?? '']
      if (candidate && !usedLetters.has(candidate)) {
        letter = candidate
        break
      }
    }
    if (letter) {
      usedLetters.add(letter)
      for (const tid of cluster) idToLetter.set(tid, letter)
    } else {
      const names = cluster.map((id) => idToName.get(id) ?? '').sort()
      deferred.push({ teamIds: cluster, repName: names[0] ?? '' })
    }
  }

  // Assign remaining letters deterministically.
  deferred.sort((a, b) => a.repName.localeCompare(b.repName))
  const remaining = ALL_LETTERS.filter((L) => !usedLetters.has(L))
  deferred.forEach((c, i) => {
    if (i < remaining.length) {
      for (const tid of c.teamIds) idToLetter.set(tid, remaining[i])
    }
  })

  return matches.map((m) => ({
    ...m,
    group:
      m.group ??
      idToLetter.get(m.home.id) ??
      idToLetter.get(m.away.id),
  }))
}

export const apiFootballProvider: WorldCupDataProvider = {
  async getMatches(): Promise<Match[]> {
    const { fixtures } = await loadCaches()
    if (!fixtures) {
      throw new Error(
        'No cached api-football data found. Run `npm run fetch:data` to populate `data/`.'
      )
    }
    return withDerivedGroups(fixtures.matches.map(withFixedFlags))
  },

  async getMatchDetail(matchId: string): Promise<MatchDetail | null> {
    const { fixtures, squads, teams, lineups, salaryMap, clubs, clubMeta } =
      await loadCaches()
    if (!fixtures) {
      throw new Error(
        'No cached api-football data found. Run `npm run fetch:data` to populate `data/`.'
      )
    }
    // Derive groups across the whole fixture set so we can look up the missing
    // group on the requested match.
    const allMatches = withDerivedGroups(fixtures.matches.map(withFixedFlags))
    const match = allMatches.find((m) => m.id === matchId)
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

  async getStandings(): Promise<GroupStanding[]> {
    const { standings } = await loadCaches()
    if (!standings?.groups?.length) return []

    // api-football's standings response embeds the official group letter as
    // `groupRaw` ("Group A"). Use it to label tables — falls back to "?".
    // Sometimes the response returns extra/aggregate tables; filter to those
    // with a real group letter.
    const out: GroupStanding[] = []
    for (const rows of standings.groups) {
      if (!rows?.length) continue
      const rawLabel = rows[0].groupRaw ?? ''
      const m = rawLabel.match(/Group\s+([A-L])/i)
      if (!m) continue
      const group = m[1].toUpperCase()
      const mapped: Standing[] = rows.map((r) => ({
        rank: r.rank,
        team: {
          id: r.team.id,
          name: r.team.name,
          countryCode: clubCountryCode(r.team.name),
        },
        played: r.played,
        win: r.win,
        draw: r.draw,
        lose: r.lose,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDifference: r.goalDifference,
        points: r.points,
        form: r.form || undefined,
      }))
      out.push({ group, rows: mapped })
    }
    return out.sort((a, b) => a.group.localeCompare(b.group))
  },
}
