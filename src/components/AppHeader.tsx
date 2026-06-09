import Link from 'next/link'
import { CurrencyToggle } from './CurrencyToggle'
import { AuthMenu } from './AuthMenu'

export function AppHeader() {
  return (
    <header className="app-header" role="banner">
      <div className="app-header__inner">
        <Link href="/" className="app-header__brand" aria-label="World Cup 2026 — home">
          <span className="app-header__mark" aria-hidden="true">
            ⬢
          </span>
          <span className="app-header__brand-text">
            <span className="app-header__brand-line1">World Cup</span>
            <span className="app-header__brand-line2">2026</span>
          </span>
        </Link>
        <div className="app-header__right">
          <CurrencyToggle />
          <AuthMenu />
        </div>
      </div>
    </header>
  )
}
