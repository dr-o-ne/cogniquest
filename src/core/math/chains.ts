import type { Exercise, MathOp } from '../exercises'
import { randomInt, type Random } from '../random'
import { buildProblem, toExercise, type ArithmeticProblem } from './generator'

/**
 * Chains — the «addition and subtraction together» row of the grid.
 *
 * A ladder of its own, and the reason it needs one: its difficulty runs along
 * a different axis from the addition ladder. There the step is size, place
 * value, carrying; here it is how many operations have to be held at once, and
 * then whether the order they are done in is the written one.
 *
 * | Level | Numbers | Range | New |
 * |---|---|---|---|
 * | 1 | 3 | ≤ 10 | the signs are mixed — «7 + 2 − 4» |
 * | 2 | 3 | ≤ 20 | across the ten — «13 − 5 + 4» |
 * | 3 | 4 | ≤ 100 | longer, and bigger — «20 + 15 − 5 + 10» |
 * | 4 | 3 | ≤ 100 | brackets: the order is given — «70 − (25 + 15)» |
 * | 5 | 4 | ≤ 100 | the order has to be found — «23 + 48 − 3 + 12» |
 *
 * The last two steps are worth reading together. At level 4 the child is told
 * what to do first; at level 5 nobody tells them, and the useful order is
 * theirs to spot. The addition ladder used to end on that same insight — «47 +
 * 19 + 3», where a pair makes a round number — and when it was re-cut around
 * two-digit work the trick stayed here, which is now the only row that asks it.
 *
 * It carries a warning with it: an insight is only a step up while the
 * arithmetic underneath it stays as heavy as the rung below. A first cut of
 * this file put brackets on numbers under twenty and came out easier than
 * level 3, which is how a ladder quietly stops being one.
 *
 * The answer stays a single number throughout, so `ArithmeticAnswer` and the
 * recognition grammar carry over untouched (A5, T16).
 */
export function generateChain(levelId: number, random: Random): ArithmeticProblem {
  switch (levelId) {
    case 1:
      return mixedChain(random, 3, 10)

    // Above ten from the first number on, so the ten is crossed somewhere in
    // the working. Without the floor this rung would keep producing level 1
    // over again — a quarter of it did.
    case 2:
      return mixedChain(random, 3, 20, 11)

    case 3:
      return mixedChain(random, 4, 100)

    case 4:
      return bracketed(random)

    case 5:
      return regrouping(random, 100)

    default:
      throw new RangeError(`No chain generator for level ${levelId}`)
  }
}

export function createChainExercise(levelId: number, random: Random): Exercise {
  return toExercise(generateChain(levelId, random), levelId)
}

/**
 * A chain where both signs are certain to appear.
 *
 * The point of these levels is that the child cannot settle into one operation
 * and stay there, so «mixed» has to be a guarantee rather than a likelihood:
 * left to chance, a quarter of three-term chains come out all-plus.
 *
 * The signs are chosen first and the numbers fitted to them, not the other way
 * round. Draw the numbers first and there is nothing to be done about a chain
 * that turned out one-sided except throw it away and start again — which is
 * the «generate and check» this file is built to avoid.
 */
function mixedChain(
  random: Random,
  termCount: number,
  ceiling: number,
  floor = 1,
): ArithmeticProblem {
  const opCount = termCount - 1
  const ops: MathOp[] = Array.from({ length: opCount }, () => (random() < 0.5 ? '+' : '-'))

  // Two different positions are pinned, one to each sign.
  const plusAt = randomInt(random, 0, opCount - 1)
  const takeAt = (plusAt + randomInt(random, 1, opCount - 1)) % opCount
  ops[plusAt] = '+'
  ops[takeAt] = '-'

  return alongSigns(random, ops, ceiling, floor)
}

/**
 * Fits numbers to a given run of signs, keeping every intermediate result
 * inside the bounds.
 *
 * The child works a chain out one step at a time while holding a running
 * total, so it is not enough for the answer to fit: no step along the way may
 * cross the ceiling or fall below zero.
 *
 * Each step also leaves room for the steps still to come — a unit for every
 * subtraction left, a unit under the ceiling for every addition left. Without
 * that reserve a chain can spend everything early and arrive at a subtraction
 * with nothing left to take, which is the one way a generator built to a rule
 * can still fail to satisfy it.
 */
function alongSigns(
  random: Random,
  ops: readonly MathOp[],
  ceiling: number,
  floor = 1,
): ArithmeticProblem {
  const takes = ops.filter((op) => op === '-').length
  const adds = ops.length - takes

  let total = randomInt(random, Math.max(floor, takes + 1), ceiling - adds)
  const terms: number[] = [total]

  for (const [i, op] of ops.entries()) {
    const rest = ops.slice(i + 1)
    const takesLeft = rest.filter((next) => next === '-').length
    const addsLeft = rest.length - takesLeft

    // A step that undoes the one before it — «5 + 3 − 3» — can be answered by
    // noticing the repeat instead of by counting, so the number that would do
    // it is kept out.
    const undoes = i > 0 && ops[i - 1] !== op ? terms[i] : undefined
    const room = op === '+' ? ceiling - total - addsLeft : total - 1 - takesLeft
    const operand = drawExcept(random, room, undoes)

    total = op === '+' ? total + operand : total - operand
    terms.push(operand)
  }

  return buildProblem(terms, ops, ceiling)
}

/**
 * A number from 1 to `most`, never the forbidden one — drawn from the shortened
 * range and stepped over the gap, so every allowed value stays equally likely
 * and nothing is drawn twice.
 */
function drawExcept(random: Random, most: number, forbidden: number | undefined): number {
  if (forbidden === undefined || forbidden > most || most <= 1) return randomInt(random, 1, most)

  const drawn = randomInt(random, 1, most - 1)
  return drawn >= forbidden ? drawn + 1 : drawn
}

/**
 * Level 4: a bracket that changes the answer — «70 − (25 + 15)».
 *
 * Always a minus in front of the bracket, and the bracket always at the end.
 * That is not a simplification but the whole lesson. «(20 + 5) − 8» comes to
 * the same 17 with the bracket or without it, and a bracket that changes
 * nothing teaches that brackets are decoration. Here the plain reading would
 * give 60 and the right one gives 30.
 *
 * Everything stays two-digit. Four levels have trained the child to work left
 * to right; unlearning that on numbers under twenty would be a rung down.
 */
function bracketed(random: Random): ArithmeticProblem {
  if (random() < 0.5) {
    // «70 − (25 + 15)»: the whole bracket comes off, so it has to fit under
    // the first number and still leave something behind.
    const first = randomInt(random, 30, 99)
    const inside = randomInt(random, 11, first - 1)
    const second = randomInt(random, 10, inside - 1)

    return buildProblem([first, second, inside - second], ['-', '+'], 100, { from: 1, to: 2 })
  }

  // «70 − (25 − 15)»: what is left inside is taken away, and never nothing.
  const second = randomInt(random, 12, 99)
  const third = randomInt(random, 1, second - 1)

  // Thirty at least, whatever is left inside. Without the floor this branch
  // could produce «3 − (12 − 11)», which is the level-below problem again with
  // brackets drawn around it.
  const first = randomInt(random, Math.max(30, second - third + 1), 99)

  return buildProblem([first, second, third], ['-', '-'], 100, { from: 1, to: 2 })
}

/**
 * Level 5: a chain where finding the order makes it easy — «23 + 48 − 3 + 12».
 *
 * Head-on that is three operations across the place. Notice that the 23 and
 * the 3 cancel down to a round 20 and what is left is two easy additions.
 *
 * Longer than level 4 on purpose. Level 4 hands the child an order to work in;
 * here nobody does, and the step up is that they have to find one — which is
 * only a step up if the long way round still costs what it did below.
 */
function regrouping(random: Random, ceiling: number): ArithmeticProblem {
  const units = randomInt(random, 1, 9)
  const base = randomInt(random, 1, 3) * 10
  const first = base + units

  // Both of the others carry tens, or the long way round is not long at all.
  const middle = randomInt(random, 11, 40)
  const last = randomInt(random, 10, Math.max(10, ceiling - base - middle))

  // The trick: taking away the units the first number carried leaves it round.
  return buildProblem([first, middle, units, last], ['+', '-', '+'], ceiling)
}
