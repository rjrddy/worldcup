import type { Metadata } from 'next'
import { getProvider } from '@/lib/providers'
import { MatchList } from '@/components/MatchList'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Schedule — World Cup 2026',
}

export default async function HomePage() {
  const provider = getProvider()
  const matches = await provider.getMatches()

  return (
    <>
      <header className="hero" role="banner">
        <p className="hero__eyebrow">FIFA World Cup™</p>
        <h1 className="hero__title">World Cup 2026</h1>
        <div className="hero__facts" role="list" aria-label="Tournament facts">
          <div className="hero__fact" role="listitem">
            <span className="hero__fact-value">48</span>
            <span className="hero__fact-label">Teams</span>
          </div>
          <div className="hero__fact" role="listitem">
            <span className="hero__fact-value">104</span>
            <span className="hero__fact-label">Matches</span>
          </div>
          <div className="hero__fact" role="listitem">
            <span className="hero__fact-value">12</span>
            <span className="hero__fact-label">Groups</span>
          </div>
          <div className="hero__fact" role="listitem">
            <span className="hero__fact-value">3</span>
            <span className="hero__fact-label">Host nations</span>
          </div>
          <div className="hero__fact" role="listitem">
            <span className="hero__fact-value">Jun 11</span>
            <span className="hero__fact-label">Kick-off</span>
          </div>
          <div className="hero__fact" role="listitem">
            <span className="hero__fact-value">Jul 19</span>
            <span className="hero__fact-label">Final</span>
          </div>
        </div>
      </header>

      <main className="page-shell">
        <MatchList matches={matches} />
      </main>
    </>
  )
}
