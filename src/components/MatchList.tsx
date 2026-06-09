import type { Match } from '@/lib/types'
import { groupMatchesByGroup } from '@/lib/utils'
import { MatchCard } from './MatchCard'

interface MatchListProps {
  matches: Match[]
}

export function MatchList({ matches }: MatchListProps) {
  const byGroup = groupMatchesByGroup(matches)
  const groupKeys = Object.keys(byGroup).sort()

  return (
    <div className="match-list">
      {groupKeys.map((group) => {
        const groupMatches = byGroup[group]
        const teams = new Set<string>()
        groupMatches.forEach((m) => {
          teams.add(m.home.name)
          teams.add(m.away.name)
        })

        return (
          <section
            key={group}
            className="match-list__group"
            aria-labelledby={`group-${group}-heading`}
          >
            <header className="match-list__group-header">
              <span
                className="match-list__group-letter"
                aria-hidden="true"
              >
                {group}
              </span>
              <div className="match-list__group-meta">
                <h2
                  id={`group-${group}-heading`}
                  className="match-list__group-title"
                >
                  Group {group}
                </h2>
                <p className="match-list__group-teams">
                  {Array.from(teams).join(' · ')}
                </p>
              </div>
            </header>
            <ol className="match-list__cards" role="list">
              {groupMatches.map((match) => (
                <li key={match.id}>
                  <MatchCard match={match} />
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
