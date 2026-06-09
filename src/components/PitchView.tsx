import type { Player } from '@/lib/types'

interface PitchViewProps {
  players: Player[]
  teamName: string
}

const GROUP_COLOR: Record<string, string> = {
  GK: 'var(--color-pos-gk)',
  DEF: 'var(--color-pos-def)',
  MID: 'var(--color-pos-mid)',
  ATT: 'var(--color-pos-att)',
}

export function PitchView({ players, teamName }: PitchViewProps) {
  const starters = players.filter(
    (p) => p.isStartingXI && p.pitchX != null && p.pitchY != null
  )

  if (starters.length === 0) {
    return (
      <div className="pitch-view pitch-view--empty">
        <div className="pitch-view__empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <p className="pitch-view__empty-title">Lineup not yet announced</p>
        <p className="pitch-view__empty-sub">Starting XI publishes ~1 hour before kick-off</p>
      </div>
    )
  }

  return (
    <figure className="pitch-view" aria-label={`${teamName} starting XI formation`}>
      <svg
        viewBox="0 0 100 110"
        className="pitch-view__svg"
        role="img"
        aria-label={`Pitch diagram showing ${teamName} starting XI positions`}
      >
        {/* Pitch background — gradient stripes for a TV-style turf */}
        <defs>
          <linearGradient id="turf-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pitch-green-light)" />
            <stop offset="100%" stopColor="var(--pitch-green)" />
          </linearGradient>
          <pattern id="turf-stripes" width="100" height="11" patternUnits="userSpaceOnUse">
            <rect width="100" height="11" fill="url(#turf-grad)" />
            <rect width="100" height="5.5" fill="rgba(255,255,255,0.04)" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="110" fill="url(#turf-stripes)" />

        {/* Pitch markings */}
        <g stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" fill="none">
          <rect x="2" y="2" width="96" height="106" />
          <line x1="2" y1="55" x2="98" y2="55" />
          <circle cx="50" cy="55" r="10" />
          <rect x="20" y="2" width="60" height="22" />
          <rect x="20" y="86" width="60" height="22" />
          <rect x="35" y="2" width="30" height="8" />
          <rect x="35" y="100" width="30" height="8" />
        </g>
        <g fill="rgba(255,255,255,0.6)">
          <circle cx="50" cy="55" r="0.8" />
          <circle cx="50" cy="18" r="0.8" />
          <circle cx="50" cy="92" r="0.8" />
        </g>

        {starters.map((player) => {
          const x = player.pitchX!
          const y = player.pitchY!
          const color = GROUP_COLOR[player.group]
          const shortName = player.name.split(' ').pop() ?? player.name

          return (
            <g key={player.id} className="pitch-player">
              <title>{`${player.name} — ${player.position} (#${player.jerseyNumber})`}</title>
              <circle cx={x} cy={y + 0.4} r="5" fill="rgba(0,0,0,0.25)" />
              <circle cx={x} cy={y} r="5" fill={color} stroke="white" strokeWidth="0.4" />
              <text
                x={x}
                y={y + 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="2.8"
                fontWeight="800"
                fill="white"
                fontFamily="var(--font-hanken), sans-serif"
              >
                {player.jerseyNumber}
              </text>
              <text
                x={x}
                y={y + 8}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize="3"
                fill="white"
                fontWeight="700"
                fontFamily="var(--font-hanken), sans-serif"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
              >
                {shortName.length > 9 ? shortName.slice(0, 8) + '.' : shortName}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="sr-only">
        {starters.map((p) => `${p.jerseyNumber} ${p.name} (${p.position})`).join(', ')}
      </figcaption>
    </figure>
  )
}
