interface CountryFlagProps {
  countryCode: string
  countryName: string
  size?: 'sm' | 'md' | 'lg'
}

// flagcdn.com only serves these widths: 20, 40, 80, 160, 320, 640, 1280, 2560
const sizeMap = {
  sm: { w: 20, h: 14, cls: 'w-5 h-[14px]', cdnWidth: 40 },
  md: { w: 32, h: 22, cls: 'w-8 h-[22px]', cdnWidth: 80 },
  lg: { w: 48, h: 34, cls: 'w-12 h-[34px]', cdnWidth: 160 },
}

export function CountryFlag({ countryCode, countryName, size = 'md' }: CountryFlagProps) {
  const { w, h, cls, cdnWidth } = sizeMap[size]

  // 'un' / empty / 'Unknown' = country not known. Render a neutral placeholder
  // box instead of a broken image (and skip flagcdn entirely).
  const code = (countryCode ?? '').toLowerCase()
  if (!code || code === 'un' || code === 'unknown') {
    return (
      <span
        className={`${cls} inline-block rounded-sm bg-[var(--color-border)]`}
        role="img"
        aria-label={`Flag unavailable for ${countryName}`}
      />
    )
  }

  const src = `https://flagcdn.com/w${cdnWidth}/${code}.png`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Flag of ${countryName}`}
      width={w}
      height={h}
      className={`${cls} object-cover rounded-sm inline-block`}
      loading="lazy"
    />
  )
}
