export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT'

export interface Club {
  name: string
  country: string
  countryCode: string
}

export interface Salary {
  /** Gross annual base salary, normalized to EUR. UI converts at render-time. */
  annualEur: number
  source: string
  /**
   * When true, the figure is a market-value estimate (Transfermarkt, etc.),
   * NOT an annual wage. UI labels it accordingly.
   */
  isMarketValue?: boolean
}

export interface Player {
  id: string
  name: string
  position: string
  group: PositionGroup
  age: number
  heightCm: number
  jerseyNumber: number
  club: Club
  photoUrl?: string
  salary?: Salary
  fotmobRating?: number
  starRating?: number
  isStartingXI: boolean
  pitchX?: number
  pitchY?: number
}

export interface Team {
  id: string
  name: string
  countryCode: string
  fifaRanking?: number
  formation?: string
  squad: Player[]
}

export interface TeamRef {
  id: string
  name: string
  countryCode: string
}

export interface Match {
  id: string
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'
  group?: string
  kickoff: string
  venue?: string
  home: TeamRef
  away: TeamRef
  hasLineups?: boolean
}

export interface MatchDetail {
  match: Match
  home: Team
  away: Team
}

export type LiveStatusShort =
  | 'TBD' | 'NS'        // not started
  | '1H' | 'HT' | '2H'  // first / half time / second
  | 'ET' | 'BT' | 'P'   // extra time / break / penalties
  | 'SUSP' | 'INT'      // suspended / interrupted
  | 'FT' | 'AET' | 'PEN'// finished
  | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO' // off

export interface LiveStatus {
  fixtureId: string
  statusShort: LiveStatusShort | string
  statusLong?: string | null
  elapsed?: number | null
  addedMinute?: number | null
  scoreHome?: number | null
  scoreAway?: number | null
  htHome?: number | null
  htAway?: number | null
  hasLineups: boolean
  updatedAt?: string
}

export type MatchEventType = 'Goal' | 'Card' | 'subst' | 'Var' | 'Lineup' | string

export interface MatchEvent {
  fixtureId: string
  minute: number
  addedMinute?: number | null
  type: MatchEventType
  detail?: string | null   // 'Normal Goal', 'Yellow Card', 'Red Card', etc.
  teamId?: string | null
  teamName?: string | null
  playerId?: string | null
  playerName?: string | null
  assistId?: string | null
  assistName?: string | null
  comments?: string | null
}

export interface Standing {
  rank: number
  team: TeamRef
  played: number
  win: number
  draw: number
  lose: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form?: string // e.g. "WLDWW"
}

export interface GroupStanding {
  group: string // 'A', 'B', ..., 'L'
  rows: Standing[]
}

export interface WorldCupDataProvider {
  getMatches(): Promise<Match[]>
  getMatchDetail(matchId: string): Promise<MatchDetail | null>
  getStandings(): Promise<GroupStanding[]>
  /**
   * Reads cached live status from Supabase for every fixture, returned as a
   * Map keyed by fixtureId. Empty when no rows / Supabase unconfigured.
   */
  getLiveStatuses(): Promise<Record<string, LiveStatus>>
  /** Reads the event timeline (goals, cards, subs) for a single fixture. */
  getMatchEvents(matchId: string): Promise<MatchEvent[]>
}

export interface SalaryProvider {
  getSalary(playerId: string): Salary | undefined
}
