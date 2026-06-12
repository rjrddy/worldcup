import type {
  WorldCupDataProvider,
  Match,
  MatchDetail,
  Team,
  Player,
  PositionGroup,
  GroupStanding,
  LiveStatus,
  MatchEvent,
} from '@/lib/types'

const BASE = 'https://www.fotmob.com/api'

// World Cup 2026 league id on FotMob — update once confirmed
const WC_LEAGUE_ID = '77'

async function fotmobFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'x-mas': process.env.FOTMOB_X_MAS_HEADER ?? '',
      'User-Agent': 'Mozilla/5.0',
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`FotMob ${res.status} for ${path}`)
  return res.json()
}

function mapPositionGroup(pos: string): PositionGroup {
  const p = pos.toLowerCase()
  if (p.includes('goalkeeper') || p === 'gk') return 'GK'
  if (p.includes('back') || p.includes('defender') || p === 'cb' || p === 'rb' || p === 'lb')
    return 'DEF'
  if (p.includes('mid') || p === 'dm' || p === 'cm' || p === 'am') return 'MID'
  return 'ATT'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlayer(raw: any): Player {
  return {
    id: String(raw.id),
    name: raw.name ?? raw.shortName ?? 'Unknown',
    position: raw.positionDescription ?? raw.position ?? '',
    group: mapPositionGroup(raw.positionDescription ?? raw.position ?? ''),
    age: raw.age ?? 0,
    heightCm: raw.height ?? 0,
    jerseyNumber: raw.shirtNumber ?? 0,
    club: {
      name: raw.teamName ?? '',
      country: raw.teamCountry ?? '',
      countryCode: (raw.teamCountryCode ?? '').toLowerCase(),
    },
    fotmobRating: raw.rating,
    starRating: raw.rating ? +(raw.rating / 2).toFixed(1) : undefined,
    isStartingXI: raw.isStartingEleven ?? false,
    pitchX: raw.positionX,
    pitchY: raw.positionY,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTeamFromLineup(raw: any): Team {
  return {
    id: String(raw.teamId),
    name: raw.teamName ?? '',
    countryCode: (raw.teamCountryCode ?? '').toLowerCase(),
    formation: raw.formation,
    squad: (raw.players ?? []).map(mapPlayer),
  }
}

export const fotmobProvider: WorldCupDataProvider = {
  async getMatches(): Promise<Match[]> {
    // TODO: map FotMob league fixture list to Match[]
    // Shape: GET /leagues?id=77 → data.matches.allMatches[]
    const data = (await fotmobFetch(`/leagues?id=${WC_LEAGUE_ID}`)) as any
    const raw: any[] = data?.matches?.allMatches ?? []
    return raw.map((r) => ({
      id: String(r.id),
      stage: r.tournament?.toLowerCase()?.includes('group') ? 'group' : 'r16',
      group: r.roundName,
      kickoff: r.status?.utcTime ?? '',
      venue: r.venue?.name,
      home: {
        id: String(r.home?.id),
        name: r.home?.name ?? '',
        countryCode: (r.home?.countryCode ?? '').toLowerCase(),
      },
      away: {
        id: String(r.away?.id),
        name: r.away?.name ?? '',
        countryCode: (r.away?.countryCode ?? '').toLowerCase(),
      },
      hasLineups: r.status?.started,
    }))
  },

  async getMatchDetail(matchId: string): Promise<MatchDetail | null> {
    // TODO: map FotMob match detail to MatchDetail
    // Shape: GET /matchDetails?matchId=<id> → data.lineup
    const data = (await fotmobFetch(`/matchDetails?matchId=${matchId}`)) as any
    const lineup = data?.lineup
    if (!lineup) return null

    const matchRaw = data?.general
    const match: Match = {
      id: matchId,
      stage: 'group',
      group: matchRaw?.roundName,
      kickoff: matchRaw?.matchTimeUTC ?? '',
      venue: matchRaw?.venue?.name,
      home: {
        id: String(matchRaw?.homeTeam?.id),
        name: matchRaw?.homeTeam?.name ?? '',
        countryCode: (matchRaw?.homeTeam?.countryCode ?? '').toLowerCase(),
      },
      away: {
        id: String(matchRaw?.awayTeam?.id),
        name: matchRaw?.awayTeam?.name ?? '',
        countryCode: (matchRaw?.awayTeam?.countryCode ?? '').toLowerCase(),
      },
      hasLineups: true,
    }

    const home: Team = mapTeamFromLineup(lineup?.homeTeam ?? {})
    const away: Team = mapTeamFromLineup(lineup?.awayTeam ?? {})

    return { match, home, away }
  },

  async getStandings(): Promise<GroupStanding[]> {
    // TODO: FotMob standings endpoint not yet mapped.
    return []
  },

  async getLiveStatuses(): Promise<Record<string, LiveStatus>> {
    return {}
  },

  async getMatchEvents(): Promise<MatchEvent[]> {
    return []
  },
}
