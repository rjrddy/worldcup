import type { Team, PositionGroup } from '@/lib/types'
import { CountryFlag } from './CountryFlag'
import { PositionSection } from './PositionSection'
import { PitchView } from './PitchView'

interface TeamPanelProps {
  team: Team
  side: 'home' | 'away'
}

const GROUP_ORDER: PositionGroup[] = ['GK', 'DEF', 'MID', 'ATT']

export function TeamPanel({ team, side }: TeamPanelProps) {
  const byGroup = GROUP_ORDER.reduce<
    Record<PositionGroup, typeof team.squad[number][]>
  >(
    (acc, g) => {
      acc[g] = team.squad.filter((p) => p.group === g)
      return acc
    },
    { GK: [], DEF: [], MID: [], ATT: [] }
  )

  const hasSquad = team.squad.length > 0

  return (
    <section className="team-panel" aria-labelledby={`team-${side}-heading`}>
      <header className="team-panel__header">
        <CountryFlag
          countryCode={team.countryCode}
          countryName={team.name}
          size="lg"
        />
        <div className="team-panel__heading-block">
          <p className="team-panel__side-chip">{side === 'home' ? 'Home' : 'Away'}</p>
          <h2 id={`team-${side}-heading`} className="team-panel__name">
            {team.name}
          </h2>
          <div className="team-panel__meta">
            {team.formation && (
              <span className="team-panel__meta-item">
                <span aria-hidden="true">⬡ </span>
                {team.formation}
              </span>
            )}
            {team.fifaRanking && (
              <span className="team-panel__meta-item">
                FIFA #{team.fifaRanking}
              </span>
            )}
            <span className="team-panel__meta-item">
              {team.squad.length} players
            </span>
          </div>
        </div>
      </header>

      {!hasSquad ? (
        <p className="team-panel__empty">Squad not yet available</p>
      ) : (
        <>
          <div className="team-panel__pitch-wrap">
            <PitchView players={team.squad} teamName={team.name} />
          </div>
          <div className="team-panel__squad">
            {GROUP_ORDER.map((g) => (
              <PositionSection key={g} group={g} players={byGroup[g]} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
