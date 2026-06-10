import Link from 'next/link'
import { MatchOnlyCurrencyToggle } from './MatchOnlyCurrencyToggle'
import { AuthMenu } from './AuthMenu'

export function AppHeader() {
  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner">
        <Link
          href="/"
          className="app-header__brand"
          aria-label="The Maracanã — home"
        >
          <span className="app-header__mark" aria-hidden="true">✦</span>
          <span className="app-header__brand-text">
            <span className="app-header__brand-the">The</span>
            <span className="app-header__brand-word">Maracanã</span>
          </span>
        </Link>
        <div className="app-header__right">
          <MatchOnlyCurrencyToggle />
          <AuthMenu />
        </div>
      </div>
    </header>
  )
}
