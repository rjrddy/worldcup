import Link from 'next/link'
import type { Match } from '@/lib/types'
import { formatKickoff } from '@/lib/utils'
import { CountryFlag } from './CountryFlag'

interface MatchCardProps {
  match: Match
}

export function MatchCard({ match }: MatchCardProps) {
  const kickoffDisplay = formatKickoff(match.kickoff)

  const inner = (
    <div className="match-card__inner">
      <div className="match-card__teams">
        <span className="match-card__team">
          <CountryFlag
            countryCode={match.home.countryCode}
            countryName={match.home.name}
            size="sm"
          />
          <span className="match-card__team-name">{match.home.name}</span>
        </span>
        <span className="match-card__vs" aria-hidden="true">vs</span>
        <span className="match-card__team match-card__team--away">
          <span className="match-card__team-name">{match.away.name}</span>
          <CountryFlag
            countryCode={match.away.countryCode}
            countryName={match.away.name}
            size="sm"
          />
        </span>
      </div>
      <div className="match-card__meta">
        <time dateTime={match.kickoff} className="match-card__time">
          {kickoffDisplay}
        </time>
        {match.venue && (
          <span className="match-card__venue">{match.venue}</span>
        )}
      </div>
      {match.hasLineups && (
        <span className="match-card__lineups-badge" aria-label="Lineups available">
          View Squads →
        </span>
      )}
    </div>
  )

  if (match.hasLineups) {
    return (
      <Link
        href={`/match/${match.id}`}
        className="match-card match-card--clickable"
        aria-label={`${match.home.name} vs ${match.away.name} — ${kickoffDisplay}. Lineups available.`}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div
      className="match-card"
      aria-label={`${match.home.name} vs ${match.away.name} — ${kickoffDisplay}`}
    >
      {inner}
    </div>
  )
}
