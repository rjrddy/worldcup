'use client'

import { formatKickoffDate } from '@/lib/utils'

/**
 * Renders a kickoff timestamp in the visitor's local timezone.
 *
 * Why this is a client component: pages are statically pre-rendered at
 * build time, where Node.js uses the server's TZ (Vercel = UTC). Without
 * this, every viewer would see UTC times. By rendering in a client
 * component, `toLocaleString` picks up the browser's TZ at hydration.
 *
 * `suppressHydrationWarning` lets React reconcile the server (UTC) snapshot
 * with the client (local) re-render without console noise.
 */
interface Props {
  iso: string
  variant: 'card-chip' | 'card-meta' | 'hero'
}

export function KickoffTime({ iso, variant }: Props) {
  const k = formatKickoffDate(iso)

  if (variant === 'card-chip') {
    return (
      <>
        <span className="match-card__date-month" suppressHydrationWarning>
          {k.month}
        </span>
        <span className="match-card__date-day" suppressHydrationWarning>
          {k.day}
        </span>
      </>
    )
  }

  if (variant === 'card-meta') {
    return (
      <span suppressHydrationWarning>
        {k.weekday} · {k.time} {k.tz}
      </span>
    )
  }

  // hero
  return (
    <>
      <div className="match-hero__vs-date" suppressHydrationWarning>
        {k.weekday} {k.month} {k.day}
      </div>
      <div className="match-hero__vs-time" suppressHydrationWarning>
        {k.time}
      </div>
      <div className="match-hero__vs-tz" suppressHydrationWarning>
        {k.tz}
      </div>
    </>
  )
}
