'use client'

import { useState } from 'react'

interface PlayerAvatarProps {
  photoUrl?: string
  initials: string
  jerseyNumber: number
}

export function PlayerAvatar({ photoUrl, initials, jerseyNumber }: PlayerAvatarProps) {
  const [loadFailed, setLoadFailed] = useState(false)
  const showImage = photoUrl && !loadFailed

  return (
    <div className="player-card__avatar" aria-hidden="true">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          loading="lazy"
          className="player-card__photo"
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <span className="player-card__initials">{initials}</span>
      )}
      <span
        className="player-card__number-badge"
        aria-label={`Jersey number ${jerseyNumber}`}
      >
        {jerseyNumber || '—'}
      </span>
    </div>
  )
}
