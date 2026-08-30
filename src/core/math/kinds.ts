import type { Exercise } from '../exercises'
import { assertNever } from '../exhaustive'
import type { Random } from '../random'
import { createChainExercise } from './chains'
import { createEquationExercise } from './equations'
import { generateProblem, toExercise } from './generator'
import { MATH_LEVELS } from './levels'

/**
 * A kind of task, named for the row of the grid it comes from
 * (see docs/EXERCISES.md).
 *
 * One name per row and no groupings above them: «arithmetic» would be a word
 * covering three of these and telling a reader nothing, and an opponent that
 * asks only subtraction has no way to say so through a grouping.
 *
 * The rows still to be written — comparing, sequences — join this union as they
 * land, and every switch over it stops compiling until it says what to do with
 * them.
 */
export type TaskKind = 'addition' | 'subtraction' | 'addition-subtraction' | 'missing-number'

/** Every kind that exists today, for defaults and for tests. */
export const TASK_KINDS: readonly TaskKind[] = [
  'addition',
  'subtraction',
  'addition-subtraction',
  'missing-number',
]

/**
 * Which levels each kind actually has a rung on.
 *
 * Every row reaches every level today, but rows still to be written may not —
 * and a kind drawn at a level it does not reach throws in the middle of a
 * battle, which is the worst place to find out. Kept as a table, and paired
 * with the levels before a question is drawn, so that never happens.
 */
const RUNGS: Record<TaskKind, readonly number[]> = {
  addition: MATH_LEVELS,
  subtraction: MATH_LEVELS,
  'addition-subtraction': MATH_LEVELS,
  // Rides the addition/subtraction ladder — a base problem for the level with
  // one operand hidden — so it reaches every rung they do.
  'missing-number': MATH_LEVELS,
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

    case 'addition-subtraction':
      return createChainExercise(levelId, random)

    case 'missing-number':
      return createEquationExercise(levelId, random)

    default:
      return assertNever(kind, 'kind of task')
  }
}
