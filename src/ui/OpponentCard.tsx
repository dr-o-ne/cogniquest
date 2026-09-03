import { type Monster, type Squad } from '@/game'
import { t } from '@/locale'
import { MonsterAvatar } from './MonsterAvatar'

/**
 * What a card of the game is printed with, and how a squad's cards are fanned.
 *
 * It came out of `BattleGame.tsx` when a second screen wanted it — the quest's
 * path draws the same opponents the arena does, only smaller. Nothing here was
 * designed for that second caller; it was already written to be reusable and
 * merely lived in the wrong file.
 */

/**
 * What is printed on a monster's card, without the element around it.
 *
 * That element differs and cannot be shared: in the roster the card is a button
 * the child presses, in a squad's hand it is a plain span (a button cannot nest
 * inside the button the hand is), and on a quest's path it is a button again or
 * nothing at all, depending on whether that stop can be walked into. The
 * printing is the same every time, and this is what makes «the same card»
 * true rather than a resemblance kept up by hand in three places.
 */
export function MonsterFace({ monster }: { monster: Monster }) {
  return (
    <>
      <CardTop level={monster.level} />
      <MonsterAvatar monster={monster} size="card" />
      <span className="card__name">{monster.name}</span>
    </>
  )
}

/**
 * What the card says about difficulty, in its two top corners: the level as a
 * rank on the left, the way a playing card carries one, and the same level as a
 * word on the right.
 *
 * A flow row rather than two absolutely positioned corners, because «Очень
 * сильный» takes most of an eleven-rem card's width — pinned to the corner it
 * would lie across the picture. As a row it also cannot change the card's
 * height, which is what keeps the roster even.
 */
function CardTop({ level }: { level: number }) {
  return (
    <span className="card__top">
      <span className="card__level">{level}</span>
      <Strength level={level} />
    </span>
  )
}

/**
 * How hard this opponent is, in a word — the one thing on a selection card that
 * names the difficulty out loud.
 *
 * It took the place of the row of hearts, which named the length instead, and
 * length runs the other way (**G7**): «Непобедимый» is the shortest battle on
 * the screen. So the two are not interchangeable, and the card now answers «how
 * hard» rather than «how long».
 *
 * Drawn in the card's own colour, which is the level's colour — so the word and
 * the frame are one statement said twice, not two facts.
 */
function Strength({ level }: { level: number }) {
  // A rung with no wording falls back to its number rather than to nothing, the
  // same way a missing monster name falls back to its id: next to the pill that
  // already shows the number it reads as obviously unfinished, which is the
  // point. A test holds that it never comes to that for a level in use.
  return <span className="card__strength">{t.strength[level] ?? level}</span>
}

/**
 * A squad's members, fanned out like a hand of cards.
 *
 * Only the fan — the element around it belongs to the caller, the same way a
 * monster's does: the arena wraps it in a button, and a quest's path in a button
 * or a plain span. The geometry is all in the stylesheet; what comes from here
 * is how many cards there are and which one each is.
 */
export function SquadHand({ squad }: { squad: Squad }) {
  return (
    <span className="card__hand" style={{ '--hand': squad.monsters.length } as React.CSSProperties}>
      {/* Keyed by slot: the same monster may stand in a squad twice. */}
      {squad.monsters.map((monster, slot) => (
        <span
          key={slot}
          className="card card--mini"
          style={{ '--slot': slot, '--card': monster.color } as React.CSSProperties}
        >
          <MonsterFace monster={monster} />
        </span>
      ))}
    </span>
  )
}
