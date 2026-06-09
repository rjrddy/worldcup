import type { Player } from '@/lib/types'
import { cmToFeetInches, formatSalary } from '@/lib/utils'
import { CountryFlag } from './CountryFlag'
import { StarRating } from './StarRating'
import { PlayerAvatar } from './PlayerAvatar'

interface PlayerCardProps {
  player: Player
}

export function PlayerCard({ player }: PlayerCardProps) {
  const heightDisplay = player.heightCm ? `${player.heightCm}cm` : '—'
  const heightTitle = player.heightCm
    ? `${player.heightCm} cm · ${cmToFeetInches(player.heightCm)}`
    : ''
  const salaryDisplay = player.salary
    ? formatSalary(player.salary.annual, player.salary.currency)
    : '—'
  const salaryTitle = player.salary
    ? `${player.salary.isMarketValue ? 'Market value' : 'Salary / yr'} · ${player.salary.source}`
    : ''
  const hasClub = !!player.club.name && player.club.name !== 'Unknown'

  const initials = player.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()

  return (
    <article className="player-card" data-group={player.group}>
      <PlayerAvatar
        photoUrl={player.photoUrl}
        initials={initials}
        jerseyNumber={player.jerseyNumber}
      />

      <div className="player-card__main">
        <div className="player-card__name">{player.name}</div>
        <div className="player-card__position">{player.position}</div>
      </div>

      <div className="player-card__cell player-card__cell--age" title="Age">
        {player.age || '—'}
      </div>

      <div className="player-card__cell player-card__cell--height" title={heightTitle}>
        {heightDisplay}
      </div>

      <div className="player-card__cell player-card__cell--club">
        {hasClub ? (
          <>
            <CountryFlag
              countryCode={player.club.countryCode}
              countryName={player.club.country}
              size="sm"
            />
            <span title={player.club.country}>{player.club.name}</span>
          </>
        ) : (
          <span className="player-card__empty">—</span>
        )}
      </div>

      <div className="player-card__cell player-card__cell--salary" title={salaryTitle}>
        {salaryDisplay}
      </div>

      <div className="player-card__cell player-card__cell--rating">
        <StarRating
          starRating={player.starRating}
          fotmobRating={player.fotmobRating}
        />
      </div>

      {player.isStartingXI && (
        <span className="player-card__xi-badge" aria-label="Starting XI">
          XI
        </span>
      )}
    </article>
  )
}
