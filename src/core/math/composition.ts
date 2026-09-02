import type { Exercise } from '../exercises'
import { randomInt, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'

/**
 * Making a number (состав числа) — the «5 = 2 И □» row of the grid (see
 * docs/MATH.md).
 *
 * A whole and its two parts, drawn as a bond: the number up top, two lines
 * fanning down to two boxes with «И» between them. One box holds a part, the
 * other is the blank the child names. The answer is `whole − known`, a single
 * number, so `ArithmeticAnswer` and its recognition grammar carry over
 * untouched (A5, T16).
 *
 * | Level | Whole | The two parts |
 * |---|---|---|
 * | 1 | 2–5   | any split, each at least one — `5 = 2 И 3` |
 * | 2 | 6–10  | any split — `10 = 6 И 4` (six and up, or it is level 1 again) |
 * | 3 | 11–19 | always ten and the units — `13 = 10 И 3` |
 * | 4 | 20–99 | always the round tens and the units — `47 = 40 И 7` |
 *
 * Four rungs, not five: place value stops at two digits and there is no fifth
 * thing for it to compose. Its own splitter, not the addition ladder's — the
 * place-value rule at rungs 3–4 and «clear of the rung below» at rung 2 read
 * better said outright than borrowed.
 */
export const MAKING_LEVELS: readonly number[] = [1, 2, 3, 4]

export interface Composition {
  readonly whole: number
  /** Left and right parts, in written order. Exactly one is `null`. */
  readonly parts: readonly [number | null, number | null]
  /** The number the child says — the value of the `null` part. */
  readonly answer: number
  /** Grammar ceiling: the range the answer is heard against (T16). */
  readonly heardUpTo: number
}

/** The two part values a level splits its whole into, before either is hidden. */
function split(levelId: number, random: Random): { whole: number; left: number; right: number } {
  switch (levelId) {
    case 1: {
      const whole = randomInt(random, 2, 5)
      const left = randomInt(random, 1, whole - 1)
      return { whole, left, right: whole - left }
    }

    case 2: {
      const whole = randomInt(random, 6, 10)
      const left = randomInt(random, 1, whole - 1)
      return { whole, left, right: whole - left }
    }

    // The ten and the units — the first step of place value.
    case 3: {
      const whole = randomInt(random, 11, 19)
      return { whole, left: 10, right: whole - 10 }
    }

    // Round tens and units. Units never zero — «40 И 0» is not a bond.
    case 4: {
      const tens = randomInt(random, 2, 9)
      const units = randomInt(random, 1, 9)
      return { whole: tens * 10 + units, left: tens * 10, right: units }
    }

    default:
      throw new RangeError(`No composition generator for level ${levelId}`)
  }
}

const HEARD_UP_TO: Record<number, number> = { 1: 10, 2: 10, 3: 20, 4: 100 }

export function generateComposition(levelId: number, random: Random): Composition {
  const { whole, left, right } = split(levelId, random)
  const blankLeft = random() < 0.5

  return {
    whole,
    parts: blankLeft ? [null, right] : [left, null],
    answer: blankLeft ? left : right,
    heardUpTo: HEARD_UP_TO[levelId]!,
  }
}

/**
 * «5=2+□», «5=□+3» — for the id and for debugging.
 *
 * Whole first, so it never reads as a missing-number id («…=5») or a plain
 * addition one («5+2»). The blank's side is kept: «5=2+□» and «5=□+2» are the
 * same bond but two tasks to a child, and the review queue (C3) keys on this.
 */
export function describeComposition(composition: Composition): string {
  const [left, right] = composition.parts
  const show = (part: number | null) => (part === null ? '□' : String(part))
  return `${composition.whole}=${show(left)}+${show(right)}`
}

export function createCompositionExercise(levelId: number, random: Random): Exercise {
  const composition = generateComposition(levelId, random)

  return {
    id: `math:${describeComposition(composition)}`,
    subject: 'math',
    level: levelId,
    prompt: { kind: 'composition', whole: composition.whole, parts: composition.parts },
    answer: new ArithmeticAnswer(composition.answer, composition.heardUpTo),
  }
}
