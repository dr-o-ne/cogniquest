import { useEffect, useState } from 'react'
import type { Monster } from '@/game'

type Size = 'hud' | 'card' | 'popup' | 'map'

/**
 * The character's picture. Only units that have one reach the selection
 * screen, so the fallback is really only for a broken link: the emoji first if
 * there is one, otherwise the first letter of the name.
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

  if (monster.avatar) {
    return (
      <span className={`avatar avatar--${size} avatar--emoji`} role="img" aria-label={monster.name}>
        {monster.avatar}
      </span>
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
