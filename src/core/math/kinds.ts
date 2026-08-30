import type { Exercise } from '../exercises'
import { assertNever } from '../exhaustive'
import type { Random } from '../random'
import { createChainExercise } from './chains'
import { generateProblem, toExercise } from './generator'

/**
 * A kind of task, named for the row of the grid it comes from
 * (see docs/EXERCISES.md).
 *
 * One name per row and no groupings above them: «arithmetic» would be a word
 * covering three of these and telling a reader nothing, and an opponent that
 * asks only subtraction has no way to say so through a grouping.
 *
 * The rows still to be written — missing number, comparing, sequences — join
 * this union as they land, and every switch over it stops compiling until it
 * says what to do with them.
 */
export type TaskKind = 'addition' | 'subtraction' | 'addition-subtraction'

/** Every kind that exists today, for defaults and for tests. */
export const TASK_KINDS: readonly TaskKind[] = ['addition', 'subtraction', 'addition-subtraction']

export function createMathExercise(kind: TaskKind, levelId: number, random: Random): Exercise {
  switch (kind) {
    case 'addition':
      return toExercise(generateProblem(levelId, random, '+'), levelId)

    case 'subtraction':
      return toExercise(generateProblem(levelId, random, '-'), levelId)

    case 'addition-subtraction':
      return createChainExercise(levelId, random)

    default:
      return assertNever(kind, 'kind of task')
  }
}
