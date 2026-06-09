import type { Player } from '@/lib/types'
import { cmToFeetInches, formatSalary } from '@/lib/utils'
import { CountryFlag } from './CountryFlag'
import { StarRating } from './StarRating'
import { PlayerAvatar } from './PlayerAvatar'

interface PlayerCardProps {
  player: Player
}

const groupLabel: Record<string, string> = {
  GK: 'GK',
  DEF: 'DEF',
  MID: 'MID',
  ATT: 'ATT',
}

export function PlayerCard({ player }: PlayerCardProps) {
  const heightDisplay = player.heightCm
    ? `${player.heightCm} cm / ${cmToFeetInches(player.heightCm)}`
    : '—'
  const salaryDisplay = player.salary
    ? formatSalary(player.salary.annual, player.salary.currency)
    : '—'
  const salaryLabel = player.salary?.isMarketValue ? 'Market value' : 'Salary / yr'

  const initials = player.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  return (
    <article className="player-card" data-group={player.group}>
      <div className="player-card__header">
        <PlayerAvatar
          photoUrl={player.photoUrl}
          initials={initials}
          jerseyNumber={player.jerseyNumber}
        />
        <div className="player-card__identity">
          <span className="player-card__name">{player.name}</span>
          <span className="player-card__position">{player.position}</span>
        </div>
        {player.isStartingXI && (
          <span className="player-card__xi-badge" aria-label="Starting XI">XI</span>
        )}
      </div>

      <dl className="player-card__stats">
        <div className="player-card__stat">
          <dt>Age</dt>
          <dd className="font-mono">{player.age}</dd>
        </div>
        <div className="player-card__stat">
          <dt>Height</dt>
          <dd className="font-mono">{heightDisplay}</dd>
        </div>
        <div className="player-card__stat">
          <dt>Club</dt>
          <dd className="player-card__club">
            {player.club.name && player.club.name !== 'Unknown' ? (
              <>
                <CountryFlag
                  countryCode={player.club.countryCode}
                  countryName={player.club.country}
                  size="sm"
                />
                <span>{player.club.name}</span>
              </>
            ) : (
              <span className="text-ink-muted">—</span>
            )}
          </dd>
        </div>
        <div className="player-card__stat">
          <dt>{salaryLabel}</dt>
          <dd className="font-mono" title={player.salary?.source}>{salaryDisplay}</dd>
        </div>
        <div className="player-card__stat">
          <dt>Rating</dt>
          <dd>
            <StarRating starRating={player.starRating} fotmobRating={player.fotmobRating} />
          </dd>
        </div>
      </dl>
    </article>
  )
}
