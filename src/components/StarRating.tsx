interface StarRatingProps {
  starRating?: number
  fotmobRating?: number
}

export function StarRating({ starRating, fotmobRating }: StarRatingProps) {
  if (starRating == null && fotmobRating == null) {
    return <span className="text-ink-muted font-mono text-xs">—</span>
  }

  const stars = starRating ?? (fotmobRating ? fotmobRating / 2 : 0)
  const display = fotmobRating ?? (starRating ? starRating * 2 : 0)
  const fullStars = Math.floor(stars)
  const hasHalf = stars - fullStars >= 0.5
  const label = `${display.toFixed(1)} out of 10`

  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`Star rating: ${label}`}
    >
      <span className="inline-flex items-center gap-px" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < fullStars
          const half = !filled && i === fullStars && hasHalf
          return (
            <svg
              key={i}
              viewBox="0 0 16 16"
              className="w-3 h-3"
              fill={filled ? 'var(--color-accent)' : 'none'}
              xmlns="http://www.w3.org/2000/svg"
            >
              {half ? (
                <>
                  <defs>
                    <linearGradient id={`half-${i}`} x1="0" x2="1" y1="0" y2="0">
                      <stop offset="50%" stopColor="var(--color-accent)" />
                      <stop offset="50%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="8,1 10,6 15,6 11,9.5 12.5,14.5 8,11.5 3.5,14.5 5,9.5 1,6 6,6"
                    fill={`url(#half-${i})`}
                    stroke="var(--color-accent)"
                    strokeWidth="1"
                  />
                </>
              ) : (
                <polygon
                  points="8,1 10,6 15,6 11,9.5 12.5,14.5 8,11.5 3.5,14.5 5,9.5 1,6 6,6"
                  stroke="var(--color-accent)"
                  strokeWidth="1"
                />
              )}
            </svg>
          )
        })}
      </span>
      <span className="font-mono text-[11px] text-ink-muted tabular-nums">{display.toFixed(1)}</span>
    </span>
  )
}
