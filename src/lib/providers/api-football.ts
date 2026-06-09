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

const DATA_DIR = path.join(process.cwd(), 'data')

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
  clubs: ClubsCache
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
          country: club.country ?? '',
          countryCode: clubCountryCode(club.country),
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

const COUNTRY_TO_CODE: Record<string, string> = {
  England: 'gb-eng',
  Scotland: 'gb-sct',
  Wales: 'gb-wls',
  'Northern Ireland': 'gb-nir',
  Spain: 'es',
  Italy: 'it',
  Germany: 'de',
  France: 'fr',
  Portugal: 'pt',
  Netherlands: 'nl',
  Belgium: 'be',
  Brazil: 'br',
  Argentina: 'ar',
  Mexico: 'mx',
  USA: 'us',
  'United States': 'us',
  Canada: 'ca',
  Morocco: 'ma',
  'South Korea': 'kr',
  'Korea Republic': 'kr',
  'South Africa': 'za',
  Czechia: 'cz',
  'Czech Republic': 'cz',
  Bosnia: 'ba',
  'Bosnia and Herzegovina': 'ba',
  Qatar: 'qa',
  Switzerland: 'ch',
  Haiti: 'ht',
  Paraguay: 'py',
  Australia: 'au',
  Turkey: 'tr',
  'Saudi Arabia': 'sa',
  'United Arab Emirates': 'ae',
  Greece: 'gr',
  Japan: 'jp',
  Croatia: 'hr',
  Denmark: 'dk',
  Norway: 'no',
  Sweden: 'se',
  Poland: 'pl',
  Austria: 'at',
  Serbia: 'rs',
  Uruguay: 'uy',
  Colombia: 'co',
  Chile: 'cl',
  Peru: 'pe',
  Ecuador: 'ec',
  Senegal: 'sn',
  Nigeria: 'ng',
  Ghana: 'gh',
  Egypt: 'eg',
  Algeria: 'dz',
  Tunisia: 'tn',
  'Ivory Coast': 'ci',
  Cameroon: 'cm',
  Iran: 'ir',
  Iraq: 'iq',
  Jordan: 'jo',
  Uzbekistan: 'uz',
  'New Zealand': 'nz',
}

function clubCountryCode(country: string | undefined): string {
  if (!country) return 'un'
  return COUNTRY_TO_CODE[country] ?? country.slice(0, 2).toLowerCase()
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

interface MarketValueCache {
  [playerId: string]: Salary
}

interface ClubsCache {
  [playerId: string]: {
    id: number
    name: string
    country?: string | null
    logo?: string | null
  } | null
}

async function loadCaches() {
  const [fixtures, squads, teams, lineups, marketValues, clubs] = await Promise.all([
    readJson<FixturesCache>('fixtures.json'),
    readJson<SquadCache>('squads.json'),
    readJson<TeamMetaCache>('teams.json'),
    readJson<LineupCache>('lineups.json'),
    readJson<MarketValueCache>('market-values.json'),
    readJson<ClubsCache>('clubs.json'),
  ])
  return {
    fixtures,
    squads: squads ?? {},
    teams: teams ?? {},
    lineups: lineups ?? {},
    marketValues: marketValues ?? {},
    clubs: clubs ?? {},
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
    const { fixtures, squads, teams, lineups, marketValues, clubs } = await loadCaches()
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
        mapSquadPlayer(p, marketValues, nationalTeamRawId, clubs)
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
