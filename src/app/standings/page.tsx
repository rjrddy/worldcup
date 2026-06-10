import type { Metadata } from 'next'
import { getProvider } from '@/lib/providers'
import { CountryFlag } from '@/components/CountryFlag'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Standings',
}

export default async function StandingsPage() {
  const provider = getProvider()
  const standings = await provider.getStandings()

  const totalGames = standings.reduce(
    (n, g) => n + g.rows.reduce((s, r) => s + r.played, 0),
    0
  )
  const tournamentStarted = totalGames > 0

  return (
    <main className="page-shell" id="main-content">
      <header className="standings-hero">
        <p className="standings-hero__eyebrow">Live group standings</p>
        <h1 className="standings-hero__title">Standings</h1>
        {!tournamentStarted ? (
          <p className="standings-hero__sub">
            The tournament hasn’t started yet — tables fill in as group-stage
            results come in.
          </p>
        ) : (
          <p className="standings-hero__sub">
            Top 2 of each group + 8 best 3rds advance to the Round of 32.
          </p>
        )}
      </header>

      {standings.length === 0 ? (
        <div className="standings-empty">
          No standings available yet. Run{' '}
          <code>npm run fetch:data</code> to refresh.
        </div>
      ) : (
        <div className="standings-grid">
          {standings.map((g) => (
            <article
              key={g.group}
              className="standings-table"
              aria-labelledby={`standings-${g.group}`}
            >
              <header className="standings-table__header">
                <h2 id={`standings-${g.group}`} className="standings-table__letter">
                  {g.group}
                </h2>
                <span className="standings-table__hint">Group {g.group}</span>
              </header>
              <table className="standings-table__table">
                <thead>
                  <tr>
                    <th scope="col" className="standings-table__th--rank">#</th>
                    <th scope="col" className="standings-table__th--team">Team</th>
                    <th scope="col">P</th>
                    <th scope="col">W</th>
                    <th scope="col">D</th>
                    <th scope="col">L</th>
                    <th scope="col">GD</th>
                    <th scope="col">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, i) => {
                    const isAdvancing = i < 2  // top 2 always advance
                    const isOnBubble = i === 2 // 3rd place is wildcard candidate
                    return (
                      <tr
                        key={r.team.id}
                        className={`standings-table__row ${
                          isAdvancing
                            ? 'is-advancing'
                            : isOnBubble
                            ? 'is-bubble'
                            : ''
                        }`}
                      >
                        <td className="standings-table__rank">{r.rank}</td>
                        <td className="standings-table__team">
                          <CountryFlag
                            countryCode={r.team.countryCode}
                            countryName={r.team.name}
                            size="sm"
                          />
                          <span>{r.team.name}</span>
                        </td>
                        <td>{r.played}</td>
                        <td>{r.win}</td>
                        <td>{r.draw}</td>
                        <td>{r.lose}</td>
                        <td>
                          {r.goalDifference > 0 ? '+' : ''}
                          {r.goalDifference}
                        </td>
                        <td className="standings-table__pts">{r.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="standings-table__legend">
                <span className="standings-table__legend-dot standings-table__legend-dot--advance" />
                Advances to R32
                <span className="standings-table__legend-spacer" />
                <span className="standings-table__legend-dot standings-table__legend-dot--bubble" />
                Wildcard contender
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
