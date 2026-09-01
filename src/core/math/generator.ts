import type { Exercise, MathOp } from '../exercises'
import { assertNever } from '../exhaustive'
import { randomInt, type Random } from '../random'
import { ArithmeticAnswer } from './ArithmeticAnswer'

/** One bracketed run of terms, worked out before the rest of the chain. */
interface Bracket {
  readonly from: number
  readonly to: number
}

export interface ArithmeticProblem {
  readonly terms: readonly number[]
  readonly ops: readonly MathOp[]
  readonly answer: number
  readonly bracket?: Bracket
  /**
   * The highest number the child might plausibly say here, right or wrong.
   * The recognition grammar spans zero to this (T16), and it travels with the
   * problem rather than being looked up by level number — a level means «how
   * hard», and only the generator knows what its answers can be.
   *
   * Level 3 is why that matters more than it used to: it asks two shapes, one
   * that stops at twenty and one that runs to a hundred, so even one rung has
   * no single ceiling to look up.
   *
   * Deliberately not a pair of bounds. The bottom is always zero, so storing
   * it would only offer a later reader the chance to raise it and quietly
   * hand every answer to the child.
   */
  readonly heardUpTo: number
}

/**
 * Evaluates a chain left to right: 8 − 3 + 2 = 7.
 *
 * The shape is checked rather than assumed. A chain one number short used to
 * add `undefined` and hand back NaN without a word, and NaN does not stay
 * quiet for long in a useful way: as an answer it makes `check` compare
 * against NaN, which is false for every number, so the child answers
 * correctly and is marked wrong every single time, with no way to win. The
 * other path reaches `numberToWords`, which throws deep inside the battle
 * loop, far from whatever built the chain.
 *
 * Both are programming errors rather than anything a child can cause, so the
 * place to notice them is here, loudly, at the seam they come through.
 */
export function evaluate(
  terms: readonly number[],
  ops: readonly MathOp[],
  bracket?: Bracket,
): number {
  if (terms.length !== ops.length + 1) {
    throw new RangeError(
      `A chain has one operation fewer than it has numbers, but got ${terms.length} numbers and ${ops.length} operations`,
    )
  }

  if (!bracket) return leftToRight(terms, ops)

  const { from, to } = bracket
  if (from < 0 || to <= from || to >= terms.length) {
    throw new RangeError(`A bracket over ${from}..${to} does not fit ${terms.length} numbers`)
  }

  // What is inside is worked out first, then stands in the chain as one number.
  const inside = leftToRight(terms.slice(from, to + 1), ops.slice(from, to))

  return leftToRight(
    [...terms.slice(0, from), inside, ...terms.slice(to + 1)],
    [...ops.slice(0, from), ...ops.slice(to)],
  )
}

function leftToRight(terms: readonly number[], ops: readonly MathOp[]): number {
  let total = terms[0]!
  for (let i = 0; i < ops.length; i++) {
    const term = terms[i + 1]!
    const op = ops[i]!

    switch (op) {
      case '+':
        total += term
        break
      case '-':
        total -= term
        break
      default:
        // Not «everything that is not a plus is a minus»: the day MathOp grows
        // a multiplication, this must fail to compile rather than quietly
        // subtract.
        assertNever(op, 'math operation')
    }
  }
  return total
}

/**
 * Problems are built to the rule of the level, never «generate and check»:
 * nothing is made at random and then thrown away, so the generator cannot spin
 * and always lands inside the rule (C1).
 *
 * One of them — level 4 subtraction — enumerates the legal choices and draws
 * one. That is a third thing, neither retrying nor building digit by digit, and
 * it keeps what the rule above is for: the work is bounded (a hundred steps at
 * worst, once per task), the draw is uniform, and no problem is ever created
 * only to be rejected. Index arithmetic over a rectangle with two corners
 * missing would avoid the list and read far worse; speed is not the constraint
 * at one task per ten seconds of a child's time.
 *
 * Every second operand is at least one, with one exception made on purpose:
 * level 1 carries a small dose of zero, because «4 + 0» and «4 − 4» are facts
 * a child has to meet somewhere. See `ZERO_CHANCE`.
 *
 * The ladder adds exactly one new difficulty per step, and the two rows share
 * it — subtraction is the same rung read backwards, not a ladder of its own:
 *
 * | Level | What is new | Addition | Subtraction |
 * |---|---|---|---|
 * | 1 | the bonds within five, and a dose of zero | `3+2`, `4+0` | `5−2`, `4−4` |
 * | 2 | the second five, and the ten filled but not crossed | `7+3` | `9−4` |
 * | 3 | the ten itself — crossed to twenty, or counted whole to a hundred | `8+5`, `30+40` | `13−6`, `70−40` |
 * | 4 | two digits, taken place by place, nothing carried | `45+23` | `68−14` |
 * | 5 | the carry | `47+28` | `63−27` |
 *
 * Levels 4 and 5 are a pair: one forbids carrying, the other insists on it.
 * That is what makes carrying a rung of its own rather than something met by
 * accident.
 *
 * Each rung is built to stay clear of the one below it, not merely to allow
 * itself: level 2 always reaches past five, and level 4 never lets both units
 * fall to zero, because «30 + 40» is a level 3 problem whatever level draws it.
 */
export function generateProblem(
  levelId: number,
  random: Random,
  operation: MathOp,
): ArithmeticProblem {
  const plus = operation === '+'

  switch (levelId) {
    case 1:
      return plus ? addWithinFive(random) : subtractWithinFive(random)

    case 2:
      return plus ? addWithinTen(random) : subtractWithinTen(random)

    case 3:
      return random() < ROUND_TENS_CHANCE
        ? plus
          ? addRoundTens(random)
          : subtractRoundTens(random)
        : plus
          ? addAcrossTheTen(random)
          : subtractAcrossTheTen(random)

    case 4:
      return plus ? addByPlace(random) : subtractByPlace(random)

    case 5:
      return plus ? addAcrossPlace(random) : subtractAcrossPlace(random)

    default:
      throw new RangeError(`No generator for level ${levelId}`)
  }
}

/**
 * «8-3+2», and «20-(5+3)» when there is a bracket — for the id and for
 * debugging.
 *
 * The bracket has to appear here. «20-(5+3)» and «20-5+3» are different
 * problems with different answers, and an id that could not tell them apart
 * would have the review queue (C3) treat one as the other.
 */
export function describe(problem: ArithmeticProblem): string {
  return problem.terms.reduce((text, term, i) => {
    const open = problem.bracket?.from === i ? '(' : ''
    const close = problem.bracket?.to === i ? ')' : ''
    const operation = i === 0 ? '' : problem.ops[i - 1]

    return `${text}${operation}${open}${term}${close}`
  }, '')
}

/**
 * @param ceiling the highest answer this kind of problem can produce. Wrong
 * answers within reach of it are just as much part of the grammar as the right
 * one — a list of one word would be heard everywhere (T16).
 */
export function buildProblem(
  terms: readonly number[],
  ops: readonly MathOp[],
  ceiling: number,
  bracket?: Bracket,
): ArithmeticProblem {
  return {
    terms,
    ops,
    answer: evaluate(terms, ops, bracket),
    heardUpTo: ceiling,
    ...(bracket ? { bracket } : {}),
  }
}

/**
 * Wraps a problem as an exercise. Shared by every generator that produces
 * arithmetic, whichever ladder it belongs to.
 *
 * The id carries no note of which generator made it, on purpose: the same
 * expression is the same task to a child, so the review queue (C3) should
 * treat «8+7» from one ladder and «8+7» from another as one thing to come
 * back to.
 */
export function toExercise(problem: ArithmeticProblem, levelId: number): Exercise {
  return {
    id: `math:${describe(problem)}`,
    subject: 'math',
    level: levelId,
    prompt: {
      kind: 'arithmetic',
      terms: problem.terms,
      ops: problem.ops,
      ...(problem.bracket ? { bracket: problem.bracket } : {}),
    },
    answer: new ArithmeticAnswer(problem.answer, problem.heardUpTo),
  }
}

/**
 * The grammar the first two rungs are heard against.
 *
 * Their answers stop at ten, and so does this — but the point is the other
 * direction: it must not stop at five. Level 1 never answers above ten either,
 * and a recognition list of six words is a list Vosk hears one of in anything
 * at all (T16). Eleven is short enough to be sharp and long enough to be a
 * choice.
 */
const WITHIN_TEN = 10

/** Two-digit work is heard against the whole range the numerals reach. */
const WITHIN_HUNDRED = 100

/**
 * How often level 1 puts a zero into a problem — «4 + 0», «4 − 0», «4 − 4».
 *
 * Three facts of their own, and a child who never meets them has nowhere to
 * have learned them. Zero is not one of the numbers from one to five, so this
 * is the one place on the rung where that rule is set aside deliberately,
 * rather than the rung being widened to let zero in everywhere.
 *
 * The whole question is dosage. It used to arrive by accident: subtrahends
 * were drawn from [1, a], so the odds of landing on a were 1/a, and almost a
 * third of the level became a chance to answer «zero» without counting
 * anything. One in twenty is often enough to be learned and rare enough that
 * it is never a way of answering.
 *
 * Only level 1. Higher up, crossing the ten, carrying and borrowing rule zero
 * out on their own, and by then it is not news anyway.
 */
const ZERO_CHANCE = 1 / 20

/**
 * Level 1: the bonds within five — «3 + 2».
 *
 * The automaticity rung. Nothing here is meant to be worked out; five and
 * fewer is the range a child holds whole, and the row exists so that holding
 * it becomes quicker than counting it. Both numbers come from one to five, so
 * the sum never passes ten.
 */
function addWithinFive(random: Random): ArithmeticProblem {
  // Adding nothing is a fact about zero. «0 + 0» is not — it is nothing at all
  // — so the other term always carries something.
  if (random() < ZERO_CHANCE) {
    return buildProblem([randomInt(random, 1, 5), 0], ['+'], WITHIN_TEN)
  }

  return buildProblem(
    [randomInt(random, 1, 5), randomInt(random, 1, 5)],
    ['+'],
    WITHIN_TEN,
  )
}

/** Level 1 backwards: «5 − 2», and now and then one of the zero facts. */
function subtractWithinFive(random: Random): ArithmeticProblem {
  const left = randomInt(random, 2, 5)

  // Both ways round: nothing taken away, and everything taken away.
  if (random() < ZERO_CHANCE) {
    return buildProblem([left, random() < 0.5 ? 0 : left], ['-'], WITHIN_TEN)
  }

  return buildProblem([left, randomInt(random, 1, left - 1)], ['-'], WITHIN_TEN)
}

/**
 * Level 2: up to ten, with the ten filled but never crossed — «7 + 3».
 *
 * What is new is the second five. One of the two numbers is always above five,
 * or the problem is one level 1 already asks — and the pair that fills the ten
 * exactly, «6 + 4», «8 + 2», is the fact this rung is really for.
 *
 * Ten is the ceiling of the answer, not of a number in it: a ten with anything
 * added to it has already crossed, and that is level 3.
 */
function addWithinTen(random: Random): ArithmeticProblem {
  const big = randomInt(random, 6, 9)
  const small = randomInt(random, 1, 10 - big)

  // Not always the larger one first: «3 + 7» has to be met as well, or the
  // child learns the shape of the line rather than the sum on it.
  const terms = random() < 0.5 ? [big, small] : [small, big]

  return buildProblem(terms, ['+'], WITHIN_TEN)
}

/**
 * Level 2 backwards: «9 − 4», taken from a number above five.
 *
 * Nothing is borrowed — there is only one digit to take from — so the rung is
 * about the size of the numbers and nothing else. Something is always left
 * behind: zero belongs to level 1, in its one deliberate dose.
 */
function subtractWithinTen(random: Random): ArithmeticProblem {
  const left = randomInt(random, 6, 10)

  return buildProblem([left, randomInt(random, 1, left - 1)], ['-'], WITHIN_TEN)
}

/**
 * How often level 3 counts in whole tens instead of crossing one.
 *
 * The rung holds two shapes because they are two halves of one idea — the ten
 * as a thing in itself. «8 + 5» breaks a ten open; «30 + 40» counts in nothing
 * but tens, which is the same discovery from the other side, and the first
 * time a child works with a hundred at all. Half and half, so neither half
 * quietly becomes the level.
 */
const ROUND_TENS_CHANCE = 1 / 2

/** Level 3: the sum has to cross the ten — «8 + 5». Twenty at the very most. */
function addAcrossTheTen(random: Random): ArithmeticProblem {
  const left = randomInt(random, 2, 9)
  const right = randomInt(random, 11 - left, 9)

  return buildProblem([left, right], ['+'], 20)
}

/**
 * Level 3: the units fall short, so a ten has to be broken open — «13 − 6».
 *
 * Read from the minuend downwards: a number in the teens, and something larger
 * than its units taken from it. The units stop at 8 because a 9 would leave
 * the subtrahend nowhere to sit — it has to fit in [leftUnits + 1, 9].
 *
 * An earlier version worked backwards from the answer instead. It reached
 * exactly the same problems, verified by enumeration, and said far less about
 * why they look the way they do.
 */
function subtractAcrossTheTen(random: Random): ArithmeticProblem {
  const leftUnits = randomInt(random, 1, 8)
  const right = randomInt(random, leftUnits + 1, 9)

  return buildProblem([10 + leftUnits, right], ['-'], 20)
}

/**
 * Level 3, the other half: whole tens, up to a hundred — «30 + 40».
 *
 * Three tens and four tens are seven tens, which is the first sum a child can
 * do in the hundreds column by knowing «3 + 4». The hundred itself is allowed
 * — «60 + 40» — and it is the top of what the numerals can say (T16), so the
 * ladder stops there rather than at ninety.
 */
function addRoundTens(random: Random): ArithmeticProblem {
  const leftTens = randomInt(random, 1, 9)
  const rightTens = randomInt(random, 1, 10 - leftTens)

  return buildProblem([leftTens * 10, rightTens * 10], ['+'], WITHIN_HUNDRED)
}

/** Level 3 backwards: «70 − 40», with a ten always left standing. */
function subtractRoundTens(random: Random): ArithmeticProblem {
  const leftTens = randomInt(random, 2, 10)
  const rightTens = randomInt(random, 1, leftTens - 1)

  return buildProblem([leftTens * 10, rightTens * 10], ['-'], WITHIN_HUNDRED)
}

/**
 * Level 4: two-digit numbers taken place by place, with nothing carried over —
 * «45 + 23».
 *
 * Units are given room for each other and so are tens — that is precisely what
 * «no carrying» means.
 *
 * The two units are never both zero. «30 + 40» is a round-tens problem, which
 * is level 3's business, and a rung that can draw the rung below it is a rung
 * that sometimes teaches nothing.
 */
function addByPlace(random: Random): ArithmeticProblem {
  const leftUnits = randomInt(random, 0, 8)
  const rightUnits = randomInt(random, leftUnits === 0 ? 1 : 0, 9 - leftUnits)
  const leftTens = randomInt(random, 1, 8)
  // The second operand must not come out as zero, so with no units it needs tens.
  const rightTens = randomInt(random, rightUnits === 0 ? 1 : 0, 9 - leftTens)

  return buildProblem([leftTens * 10 + leftUnits, rightTens * 10 + rightUnits], ['+'], WITHIN_HUNDRED)
}

/**
 * Level 4: the mirror image — every digit of the subtrahend fits under its own.
 *
 * The minuend always carries units of its own, which keeps «70 − 40» where it
 * belongs, a rung below, and guarantees the enumeration below finds something
 * to draw.
 */
function subtractByPlace(random: Random): ArithmeticProblem {
  const leftTens = randomInt(random, 1, 9)
  const leftUnits = randomInt(random, 1, 9)
  const left = leftTens * 10 + leftUnits

  // Every subtrahend that borrows nothing: some of the tens, some of the units.
  // Zero is not a subtraction, and neither is a number taken from itself.
  const candidates: number[] = []
  for (let takenTens = 0; takenTens <= leftTens; takenTens++) {
    for (let takenUnits = 0; takenUnits <= leftUnits; takenUnits++) {
      const right = takenTens * 10 + takenUnits
      if (right >= 1 && right < left) candidates.push(right)
    }
  }

  return buildProblem(
    [left, candidates[randomInt(random, 0, candidates.length - 1)]!],
    ['-'],
    WITHIN_HUNDRED,
  )
}

/**
 * Level 5: two-digit numbers where the units overflow — «47 + 28».
 *
 * The central skill of the second year, and the one the ladder is built
 * towards: the units make more than ten, so a ten is carried into the column
 * beside it. Level 4 rules this out on purpose; here it is compulsory.
 */
function addAcrossPlace(random: Random): ArithmeticProblem {
  // The units must overflow: leftUnits + rightUnits >= 10, so the second one
  // starts at 10 - leftUnits. That floor is never above 9, so there is always
  // something left to draw.
  const leftUnits = randomInt(random, 1, 9)
  const rightUnits = randomInt(random, 10 - leftUnits, 9)

  // The tens then have to hold the ten that arrives from below:
  //   leftTens + rightTens + 1 <= 9,  hence  rightTens <= 8 - leftTens.
  // Which also keeps the sum under a hundred — 98 at the very most, since the
  // units can carry at most 18 and leave 8 behind.
  const leftTens = randomInt(random, 1, 8)
  const rightTens = randomInt(random, 0, 8 - leftTens)

  return buildProblem(
    [leftTens * 10 + leftUnits, rightTens * 10 + rightUnits],
    ['+'],
    WITHIN_HUNDRED,
  )
}

/**
 * Level 5 the other way — «63 − 27».
 *
 * The units above are too few, so a ten has to be broken open. The minuend
 * always has at least two tens, which keeps this clear of level 3, where the
 * same borrowing happens under twenty.
 */
function subtractAcrossPlace(random: Random): ArithmeticProblem {
  // The borrow is forced by making the units below strictly larger:
  //   rightUnits > leftUnits,  so leftUnits stops at 8 and leaves room for it.
  const leftUnits = randomInt(random, 0, 8)
  const rightUnits = randomInt(random, leftUnits + 1, 9)

  // One ten is then broken open for the units, so the subtrahend has to leave
  // it there:  rightTens <= leftTens - 1,  and the answer never goes negative.
  // Two tens at least up top, or this would be level 3 wearing another name.
  const leftTens = randomInt(random, 2, 9)
  const rightTens = randomInt(random, 0, leftTens - 1)

  return buildProblem(
    [leftTens * 10 + leftUnits, rightTens * 10 + rightUnits],
    ['-'],
    WITHIN_HUNDRED,
  )
}
