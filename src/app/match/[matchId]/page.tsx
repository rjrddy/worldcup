import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getProvider } from '@/lib/providers'
import { TeamPanel } from '@/components/TeamPanel'
import { CountryFlag } from '@/components/CountryFlag'
import { formatKickoffDate } from '@/lib/utils'

// Pre-render every match page at build time. Data is read from cached JSON
// in ./data/, so this costs no API calls and produces fully static HTML.
export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  const provider = getProvider()
  const matches = await provider.getMatches()
  return matches.map((m) => ({ matchId: m.id }))
}

interface Props {
  params: { matchId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getProvider()
  const detail = await provider.getMatchDetail(params.matchId)
  if (!detail) return {}
  const { match } = detail
  return {
    title: `${match.home.name} vs ${match.away.name}`,
  }
}

export default async function MatchPage({ params }: Props) {
  const provider = getProvider()
  const detail = await provider.getMatchDetail(params.matchId)

  if (!detail) notFound()

  const { match, home, away } = detail
  const k = formatKickoffDate(match.kickoff)
  const stageLabel =
    match.stage === 'group'
      ? match.group
        ? `Group ${match.group}`
        : 'Group stage'
      : match.stage.toUpperCase()

  return (
    <>
      <nav aria-label="Breadcrumb" className="match-breadcrumb">
        <Link href="/" className="match-breadcrumb__link">
          <span aria-hidden="true">←</span> All matches
        </Link>
      </nav>

      <header className="match-hero" role="banner">
        <div className="match-hero__inner">
          <div className="match-hero__eyebrow">
            <span>{stageLabel}</span>
            <span aria-hidden="true">·</span>
            <span>FIFA World Cup 2026</span>
          </div>

          <div className="match-hero__matchup">
            <div className="match-hero__team match-hero__team--home">
              <CountryFlag
                countryCode={home.countryCode}
                countryName={home.name}
                size="lg"
              />
              <div className="match-hero__team-name">{home.name}</div>
            </div>

            <div className="match-hero__vs" aria-hidden="true">
              <div className="match-hero__vs-date">
                {k.weekday} {k.month} {k.day}
              </div>
              <div className="match-hero__vs-time">{k.time}</div>
              <div className="match-hero__vs-tz">{k.tz}</div>
            </div>

            <div className="match-hero__team match-hero__team--away">
              <CountryFlag
                countryCode={away.countryCode}
                countryName={away.name}
                size="lg"
              />
              <div className="match-hero__team-name">{away.name}</div>
            </div>
          </div>

          <h1 className="sr-only">
            {home.name} vs {away.name}
          </h1>

          {match.venue && (
            <div className="match-hero__venue">{match.venue}</div>
          )}
        </div>
      </header>

      <main className="page-shell" id="main-content">
        <div className="team-grid">
          <TeamPanel team={home} side="home" />
          <TeamPanel team={away} side="away" />
        </div>
      </main>
    </>
  )
}
