'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CountryFlag } from '@/components/CountryFlag'

interface Team {
  id: string
  name: string
  countryCode: string
}

interface Props {
  userId: string
  initial: {
    displayName: string
    favoriteTeamId: string | null
    email: string
    avatarUrl: string | null
  }
  teams: Team[]
}

export function ProfileForm({ userId, initial, teams }: Props) {
  const supabase = createClient()
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(
    initial.favoriteTeamId
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const favoriteTeam = favoriteTeamId
    ? teams.find((t) => t.id === favoriteTeamId)
    : null

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        favorite_team_id: favoriteTeamId,
      })
      .eq('user_id', userId)

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <form className="profile-form" onSubmit={onSave}>
      <div className="profile-form__top">
        {initial.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={initial.avatarUrl}
            alt=""
            className="profile-form__avatar"
          />
        ) : (
          <div className="profile-form__avatar profile-form__avatar--fallback">
            {(displayName || initial.email || '?')[0]?.toUpperCase()}
          </div>
        )}
        <div className="profile-form__top-info">
          <div className="profile-form__email">{initial.email}</div>
          <div className="profile-form__hint">Connected via Google</div>
        </div>
      </div>

      <label className="profile-form__field">
        <span className="profile-form__label">Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How others see you"
          className="profile-form__input"
          maxLength={40}
        />
      </label>

      <fieldset className="profile-form__field">
        <legend className="profile-form__label">Favorite team</legend>
        {favoriteTeam && (
          <div className="profile-form__current-team">
            <CountryFlag
              countryCode={favoriteTeam.countryCode}
              countryName={favoriteTeam.name}
              size="md"
            />
            <span>
              You’re backing <strong>{favoriteTeam.name}</strong>
            </span>
          </div>
        )}
        <div className="profile-form__team-grid" role="radiogroup">
          {teams.map((t) => (
            <label
              key={t.id}
              className={`profile-form__team-option ${
                favoriteTeamId === t.id ? 'is-selected' : ''
              }`}
            >
              <input
                type="radio"
                name="favorite-team"
                value={t.id}
                checked={favoriteTeamId === t.id}
                onChange={() => setFavoriteTeamId(t.id)}
                className="sr-only"
              />
              <CountryFlag
                countryCode={t.countryCode}
                countryName={t.name}
                size="md"
              />
              <span className="profile-form__team-name">{t.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="profile-form__actions">
        <button
          type="submit"
          className="profile-form__submit"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span className="profile-form__status profile-form__status--ok">
            Saved ✓
          </span>
        )}
        {error && (
          <span className="profile-form__status profile-form__status--err">
            {error}
          </span>
        )}
      </div>
    </form>
  )
}
