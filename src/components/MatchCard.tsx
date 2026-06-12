import Link from 'next/link'
import type { Match } from '@/lib/types'
import { CountryFlag } from './CountryFlag'
import { KickoffTime } from './KickoffTime'

interface MatchCardProps {
  match: Match
}

export function MatchCard({ match }: MatchCardProps) {
  const isClickable = !!match.hasLineups
  const Tag = isClickable ? Link : 'div'
  // The aria-label uses the ISO string so screen readers always announce
  // the kickoff. Browsers convert it to the user's locale automatically.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagProps: any = isClickable
    ? {
        href: `/match/${match.id}`,
        'aria-label': `${match.home.name} vs ${match.away.name}. View squads.`,
      }
    : {
        'aria-label': `${match.home.name} vs ${match.away.name}`,
      }

  return (
    <Tag
      {...tagProps}
      className={`match-card ${isClickable ? 'match-card--clickable' : ''}`}
    >
      {match.group && (
        <span
          className="match-card__group-badge"
          aria-label={`Group ${match.group}`}
        >
          {match.group}
        </span>
      )}
      <div className="match-card__date" aria-hidden="true">
        <KickoffTime iso={match.kickoff} variant="card-chip" />
      </div>

      <div className="match-card__body">
        <div className="match-card__teams">
          <div className="match-card__team">
            <CountryFlag
              countryCode={match.home.countryCode}
              countryName={match.home.name}
              size="md"
            />
            <span className="match-card__team-name">{match.home.name}</span>
          </div>
          <div className="match-card__divider" aria-hidden="true">
            <span>vs</span>
          </div>
          <div className="match-card__team">
            <CountryFlag
              countryCode={match.away.countryCode}
              countryName={match.away.name}
              size="md"
            />
            <span className="match-card__team-name">{match.away.name}</span>
          </div>
        </div>

        <div className="match-card__meta">
          <time dateTime={match.kickoff} className="match-card__time">
            <KickoffTime iso={match.kickoff} variant="card-meta" />
          </time>
          {match.venue && (
            <span className="match-card__venue" title={match.venue}>
              {match.venue}
            </span>
          )}
        </div>
      </div>

      {isClickable && (
        <span className="match-card__chevron" aria-hidden="true">
          →
        </span>
      )}
    </Tag>
  )
}
