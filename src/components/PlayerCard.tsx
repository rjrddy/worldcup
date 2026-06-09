import type { Player } from '@/lib/types'
import { cmToFeetInches } from '@/lib/utils'
import { CountryFlag } from './CountryFlag'
import { StarRating } from './StarRating'
import { PlayerAvatar } from './PlayerAvatar'
import { SalaryCell } from './SalaryCell'

interface PlayerCardProps {
  player: Player
}

export function PlayerCard({ player }: PlayerCardProps) {
  // Imperial/metric format, e.g. 6'4"/193cm
  const heightDisplay = player.heightCm
    ? `${cmToFeetInches(player.heightCm)}/${player.heightCm}cm`
    : '—'

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

      <div
        className="player-card__cell player-card__cell--height"
        title="Imperial / metric"
      >
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

      <div className="player-card__cell player-card__cell--salary">
        <SalaryCell
          annualEur={player.salary?.annualEur}
          source={player.salary?.source}
          isMarketValue={player.salary?.isMarketValue}
        />
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
