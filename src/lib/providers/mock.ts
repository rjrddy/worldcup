import type { WorldCupDataProvider, Match, MatchDetail, Team } from '@/lib/types'
import { allMatches } from '@/lib/data/matches'
import { brazilSquad } from '@/lib/data/brazil-squad'
import { moroccoSquad } from '@/lib/data/morocco-squad'
import { staticSalaryProvider } from '@/lib/data/salaries'

const brazilTeam: Team = {
  id: 'BRA',
  name: 'Brazil',
  countryCode: 'br',
  fifaRanking: 5,
  formation: '4-3-3',
  squad: brazilSquad.map((p) => ({
    ...p,
    salary: staticSalaryProvider.getSalary(p.id),
  })),
}

const moroccoTeam: Team = {
  id: 'MAR',
  name: 'Morocco',
  countryCode: 'ma',
  fifaRanking: 12,
  formation: '4-3-3',
  squad: moroccoSquad.map((p) => ({
    ...p,
    salary: staticSalaryProvider.getSalary(p.id),
  })),
}

const teamMap: Record<string, Team> = {
  BRA: brazilTeam,
  MAR: moroccoTeam,
}

export const mockProvider: WorldCupDataProvider = {
  async getMatches(): Promise<Match[]> {
    return allMatches
  },

  async getMatchDetail(matchId: string): Promise<MatchDetail | null> {
    const match = allMatches.find((m) => m.id === matchId)
    if (!match) return null

    const home = teamMap[match.home.id]
    const away = teamMap[match.away.id]

    if (!home || !away) {
      return {
        match,
        home: {
          id: match.home.id,
          name: match.home.name,
          countryCode: match.home.countryCode,
          squad: [],
        },
        away: {
          id: match.away.id,
          name: match.away.name,
          countryCode: match.away.countryCode,
          squad: [],
        },
      }
    }

    return { match, home, away }
  },
}
