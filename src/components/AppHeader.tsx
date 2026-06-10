'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { MatchOnlyCurrencyToggle } from './MatchOnlyCurrencyToggle'
import { AuthMenu } from './AuthMenu'

const TABS = [
  { href: '/', label: 'Schedule' },
  { href: '/standings', label: 'Standings' },
  { href: '/bracket', label: 'Bracket' },
] as const

/** px from page top before the header allows itself to hide on scroll-down */
const HIDE_BUFFER = 100

export function AppHeader() {
  const pathname = usePathname() ?? '/'
  const [hidden, setHidden] = useState(false)
  const lastYRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    function onScroll() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        const y = window.scrollY
        const prev = lastYRef.current
        // Hide when scrolling down past the buffer; show on any scroll-up.
        if (y > prev + 4 && y > HIDE_BUFFER) {
          setHidden(true)
        } else if (y < prev - 4 || y <= HIDE_BUFFER / 2) {
          setHidden(false)
        }
        lastYRef.current = y
        rafRef.current = null
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Tabs make sense on main views; hide on deeper context pages.
  const showTabs =
    !pathname.startsWith('/match/') && !pathname.startsWith('/profile')

  return (
    <header
      className={`app-header ${hidden ? 'is-hidden' : ''}`}
      role="banner"
    >
      <div className="app-header__inner">
        <Link
          href="/"
          className="app-header__brand"
          aria-label="The Maracanã — home"
        >
          <span className="app-header__mark" aria-hidden="true">
            ✦
          </span>
          <span className="app-header__brand-text">
            <span className="app-header__brand-the">The</span>
            <span className="app-header__brand-word">Maracanã</span>
          </span>
        </Link>

        {showTabs && (
          <nav className="app-header__tabs" aria-label="Main views">
            {TABS.map((t) => {
              const isActive =
                t.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(t.href)
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`app-header__tab ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>
        )}

        <div className="app-header__right">
          <MatchOnlyCurrencyToggle />
          <AuthMenu />
        </div>
      </div>
    </header>
  )
}
