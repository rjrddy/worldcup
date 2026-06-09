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
      {groupKeys.map((group) => (
        <section key={group} className="match-list__group" aria-labelledby={`group-${group}-heading`}>
          <h2 id={`group-${group}-heading`} className="match-list__group-heading">
            Group {group}
          </h2>
          <ol className="match-list__cards" role="list">
            {byGroup[group].map((match) => (
              <li key={match.id}>
                <MatchCard match={match} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
