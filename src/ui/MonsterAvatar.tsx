import { useEffect, useState } from 'react'
import type { Monster } from '@/game'

type Size = 'hud' | 'card' | 'popup' | 'chip' | 'face'

/**
 * The character's picture.
 *
 * Only units that have one are ever fielded, so the fallback is for a broken
 * link and nothing else: a renamed file, or a base path that resolves somewhere
 * the pictures are not. The first letter on the unit's own colour keeps such a
 * screen usable while somebody fixes it.
 *
 * There used to be an emoji between the two — one per unit in TUNING, thirty-one
 * lines of it — and it could not be reached: a unit without a picture never
 * reaches the game at all. It went the way `Monster.stats` did.
 */
export function MonsterAvatar({ monster, size }: { monster: Monster; size: Size }) {
  const [failed, setFailed] = useState(false)

  // The link in the config was fixed — try again.
  useEffect(() => setFailed(false), [monster.image])

  if (monster.image && !failed) {
    return (
      <img
        className={`avatar avatar--${size}`}
        src={monster.image}
        alt={monster.name}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <span
      className={`avatar avatar--${size} avatar--letter`}
      style={{ background: monster.color }}
      role="img"
      aria-label={monster.name}
    >
      {monster.name.charAt(0)}
    </span>
  )
}
