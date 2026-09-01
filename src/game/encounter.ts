/**
 * WHAT A BATTLE IS FOUGHT AGAINST.
 *
 * One opponent used to be enough: a battle was a monster and a row of hearts,
 * and `Battle` took the monster itself. A squad needs a name of its own — the
 * thing a node on the map hands to `Battle` — and this is it.
 *
 * The type lives here rather than in `journey.ts` on purpose. The campaign
 * produces encounters and the battle consumes them, so the vocabulary belongs
 * below both; a `Battle` that had to import the map to learn what it is
 * fighting would have the dependency upside down.
 */
import type { TaskKind } from '@/core/math'
import type { Monster } from './monsters'

/** One unit in a squad, with the hearts it holds. */
export interface Stack {
  readonly monster: Monster
  readonly hearts: number
}

/**
 * Where the encounter sits on the map.
 *
 * The battle does not care — it is the same fight either way. The map draws by
 * it and the purse pays by it.
 */
export type EncounterKind = 'road' | 'pocket' | 'siege'

export interface Encounter {
  readonly id: string
  /** Fought one at a time, in this order. Never empty. */
  readonly stacks: readonly Stack[]
  /** Which math rungs (C1) the questions are drawn from. */
  readonly levels: readonly number[]
  /** Which rows of the grid it asks. One row for the whole squad (G8). */
  readonly tasks: readonly TaskKind[]
  readonly kind: EncounterKind
  /** What winning pays into the purse. */
  readonly gold: number
}

/** The unit that fronts the squad — its face on the map and in the popup. */
export function leaderOf(encounter: Encounter): Monster {
  const first = encounter.stacks[0]
  if (!first) throw new RangeError('An encounter needs at least one stack')
  return first.monster
}

/** Every heart on the other side: how long the battle runs, at best. */
export function encounterHearts(encounter: Encounter): number {
  return encounter.stacks.reduce((sum, stack) => sum + stack.hearts, 0)
}

/**
 * How many hearts the child brings to this fight.
 *
 * It used to be six, whatever the battle. A squad makes battles of very
 * different lengths — five questions against one stack, twenty-five against
 * five — and six hearts means «you may miss a third of them» in the first case
 * and «one in four» in the second. So it scales with the work: roughly one
 * heart per three and a half questions, which is what six hearts were worth
 * across the twenty-task battles the number was chosen for.
 *
 * The floor of four is for the short ones. Two hearts is not a battle, it is a
 * coin toss.
 */
export function playerHeartsFor(encounter: Encounter): number {
  return Math.max(4, Math.round(encounterHearts(encounter) / 3.5))
}
