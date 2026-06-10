'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'Schedule' },
  { href: '/standings', label: 'Standings' },
  { href: '/bracket', label: 'Bracket' },
] as const

/**
 * Sticky top-middle tab bar. Renders only on the three main views; hidden
 * on detail pages (match, profile, auth flows).
 */
export function SubNav() {
  const pathname = usePathname() ?? '/'

  const allowedRoots = ['/', '/standings', '/bracket']
  const allowed =
    allowedRoots.includes(pathname) ||
    allowedRoots.some((r) => r !== '/' && pathname.startsWith(r))
  if (!allowed) return null

  return (
    <nav className="sub-nav" aria-label="Main views">
      <div className="sub-nav__inner">
        <ul className="sub-nav__tabs" role="list">
          {TABS.map((t) => {
            const isActive =
              t.href === '/' ? pathname === '/' : pathname.startsWith(t.href)
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`sub-nav__tab ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
