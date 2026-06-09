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
      <p className="text-ink-muted text-sm text-center py-8">
        No lineup data available
      </p>
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
        {/* Pitch background */}
        <rect x="0" y="0" width="100" height="110" fill="var(--pitch-green)" />

        {/* Pitch markings */}
        <rect x="2" y="2" width="96" height="106" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        {/* Centre line */}
        <line x1="2" y1="55" x2="98" y2="55" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        {/* Centre circle */}
        <circle cx="50" cy="55" r="10" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        {/* Centre spot */}
        <circle cx="50" cy="55" r="0.8" fill="rgba(255,255,255,0.6)" />
        {/* Penalty areas */}
        <rect x="20" y="2" width="60" height="22" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        <rect x="20" y="86" width="60" height="22" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        {/* Goal areas */}
        <rect x="35" y="2" width="30" height="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        <rect x="35" y="100" width="30" height="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
        {/* Penalty spots */}
        <circle cx="50" cy="18" r="0.8" fill="rgba(255,255,255,0.6)" />
        <circle cx="50" cy="92" r="0.8" fill="rgba(255,255,255,0.6)" />

        {starters.map((player) => {
          const x = player.pitchX!
          const y = player.pitchY!
          const color = GROUP_COLOR[player.group]
          const shortName = player.name.split(' ').pop() ?? player.name

          return (
            <g key={player.id} className="pitch-player" role="listitem">
              <title>{`${player.name} — ${player.position} (#${player.jerseyNumber})`}</title>
              <circle cx={x} cy={y} r="4.5" fill={color} opacity="0.92" />
              <text
                x={x}
                y={y + 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="2.5"
                fontWeight="700"
                fill="white"
                fontFamily="var(--font-hanken), sans-serif"
              >
                {player.jerseyNumber}
              </text>
              <text
                x={x}
                y={y + 7}
                textAnchor="middle"
                dominantBaseline="hanging"
                fontSize="2.8"
                fill="white"
                fontWeight="600"
                fontFamily="var(--font-hanken), sans-serif"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
              >
                {shortName.length > 8 ? shortName.slice(0, 7) + '.' : shortName}
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
