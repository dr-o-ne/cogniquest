import type { Exercise } from '../exercises'
import { assertNever } from '../exhaustive'
import type { Random } from '../random'
// Parked along with the row it builds — see the note on `TaskKind` below.
// import { createChainExercise } from './chains'
import { COMPARISON_LEVELS, createComparisonExercise } from './comparison'
import { createCompositionExercise, MAKING_LEVELS } from './composition'
import { createEquationExercise, MISSING_LEVELS } from './equations'
import { generateProblem, toExercise } from './generator'
import { MATH_LEVELS } from './levels'

/**
 * A kind of task, named for the row of the grid it comes from
 * (see docs/MATH.md).
 *
 * One name per row and no groupings above them: «arithmetic» would be a word
 * covering three of these and telling a reader nothing, and an opponent that
 * asks only subtraction has no way to say so through a grouping.
 *
 * The rows still to be written — sequences, «how many more», word problems —
 * join this union as they land, and every switch over it stops compiling until
 * it says what to do with them.
 *
 * **All the rows but one are asked; `addition-subtraction` is still parked.**
 * The parked one is written and still under test — its generator, its rules and
 * its test file are untouched — but not drawn. Parked, not deleted: a row is
 * commented out in exactly three places, this union, `RUNGS` and the switch at
 * the foot of the file, plus its import at the top. Uncomment those and the row
 * is playable again, along with whatever in game/monsters.ts offers it to an
 * opponent.
 *
 * Subtraction needed no import of its own, which is why it came back first: it
 * shares `generateProblem` with addition and passes it a different operation.
 * One ladder read two ways rather than two ladders — see docs/MATH.md.
 */
export type TaskKind =
  | 'addition'
  | 'subtraction'
  | 'comparing-numbers'
  | 'making-a-number'
  | 'missing-number'
// | 'addition-subtraction'

/**
 * Which levels each kind actually has a rung on.
 *
 * Not every row need reach every level — a kind drawn at a level it does not
 * reach throws in the middle of a battle, which is the worst place to find out.
 * Kept as a table, and paired with the levels before a question is drawn, so
 * that never happens. Comparing numbers now does run the whole ladder — rungs
 * 3–5 compare expressions, so the hundred wall no longer stops it (see
 * comparison.ts) — but the table stays the mechanism.
 */
const RUNGS: Record<TaskKind, readonly number[]> = {
  addition: MATH_LEVELS,
  subtraction: MATH_LEVELS,
  'comparing-numbers': COMPARISON_LEVELS,
  // Four rungs: place value stops at two digits (see composition.ts).
  'making-a-number': MAKING_LEVELS,
  // Two rungs, both under ten (see equations.ts): a band that reaches neither
  // simply never draws it.
  'missing-number': MISSING_LEVELS,
  // 'addition-subtraction': MATH_LEVELS,
}

export function levelsFor(kind: TaskKind): readonly number[] {
  return RUNGS[kind]
}

/**
 * Every question an opponent could legally be asked: each of its kinds paired
 * with each of the levels that kind reaches.
 *
 * Enumerated rather than drawn and checked, for the same reason the generators
 * enumerate — a draw that can come up illegal has to be retried, and a retry
 * that can fail has no bound. Fifteen pairs at the very most.
 */
export function taskChoices(
  kinds: readonly TaskKind[],
  levels: readonly number[],
): readonly { readonly kind: TaskKind; readonly level: number }[] {
  return kinds.flatMap((kind) =>
    levels.filter((level) => levelsFor(kind).includes(level)).map((level) => ({ kind, level })),
  )
}

export function createMathExercise(kind: TaskKind, levelId: number, random: Random): Exercise {
  switch (kind) {
    case 'addition':
      return toExercise(generateProblem(levelId, random, '+'), levelId)

    case 'subtraction':
      return toExercise(generateProblem(levelId, random, '-'), levelId)

    case 'comparing-numbers':
      return createComparisonExercise(levelId, random)

    case 'making-a-number':
      return createCompositionExercise(levelId, random)

    case 'missing-number':
      return createEquationExercise(levelId, random)

    // case 'addition-subtraction':
    //   return createChainExercise(levelId, random)

    default:
      return assertNever(kind, 'kind of task')
  }
}
