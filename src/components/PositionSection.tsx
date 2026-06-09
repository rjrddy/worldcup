import type { Player, PositionGroup } from '@/lib/types'
import { PlayerCard } from './PlayerCard'

const GROUP_META: Record<PositionGroup, { label: string; fullLabel: string }> = {
  GK: { label: 'GK', fullLabel: 'Goalkeepers' },
  DEF: { label: 'DEF', fullLabel: 'Defenders' },
  MID: { label: 'MID', fullLabel: 'Midfielders' },
  ATT: { label: 'ATT', fullLabel: 'Attackers' },
}

interface PositionSectionProps {
  group: PositionGroup
  players: Player[]
}

export function PositionSection({ group, players }: PositionSectionProps) {
  if (players.length === 0) return null
  const { label, fullLabel } = GROUP_META[group]

  return (
    <section className="position-section" aria-labelledby={`pos-${group}`}>
      <div className="position-section__header" data-group={group}>
        <div className="position-section__bar" aria-hidden="true" />
        <h3 id={`pos-${group}`} className="position-section__label">
          <span className="position-section__code">{label}</span>
          <span className="position-section__full">{fullLabel}</span>
        </h3>
      </div>
      <div className="position-section__grid">
        {players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </div>
    </section>
  )
}
