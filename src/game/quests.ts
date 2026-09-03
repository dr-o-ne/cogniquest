/**
 * QUEST CONFIG. One table, `LINES`: the opponents a path is made of, in the
 * order the child meets them, and the mini-boss who ends it.
 *
 * A quest is a walk down a path: node after node, each one a battle, no
 * choosing and no going round. That is the whole difference from the arena,
 * where the child picks whoever they like and nothing is locked.
 *
 * **The maps are written by hand today and will be generated tomorrow.** The
 * plan is that a parent writes a list of demands — «addition 1, addition 1,
 * subtraction 1» — and a generator finds opponents that ask those rows at those
 * rungs and lays them out. That shape is deliberately not invented here: it
 * would be guessed off one hand-made map, and **A2** already records what
 * guessing a shape a phase early costs. What this file settles is only what a
 * path *is*, which the generator will fill rather than replace.
 */
import { t } from '@/locale'
import { monsterById, type Monster } from './monsters'
import type { Opposition } from './opposition'
import { squadById } from './squads'

/** One stop on the path. */
export interface QuestNode {
  readonly opposition: Opposition
  /** The last one, drawn larger. Exactly one node of a path has this. */
  readonly boss: boolean
}

export interface Quest {
  readonly id: string
  /** Localised display name, from `t.quests`. */
  readonly name: string
  /** In walking order, the boss last. */
  readonly nodes: readonly QuestNode[]
  /**
   * The face of the quest — what its card on the selection screen shows. The
   * same monster as the last node's, kept here because that is what the screen
   * asks for and unwrapping an `Opposition` to find it reads like a riddle.
   */
  readonly boss: Monster
}

/** How many ordinary stops a path has before its boss. */
const NODES_PER_PATH = 12

type Stop = { readonly monster: string } | { readonly squad: string }

interface Line {
  readonly id: string
  readonly stops: readonly Stop[]
  /** A monster id. Stands at the end, and is the twelve-plus-one'th stop. */
  readonly boss: string
}

// ─────────────────────────────────────────────────────────────────────────
// LINES — who stands where. Twelve stops, then the boss.
//
// The first map is written to climb: bands 1, then 2, then 3, so the sums grow
// under the child as they walk. The rows are mixed on purpose — all five of the
// grid's live rows appear — because a path is long enough to settle into one,
// and settling into one is what «mixed, not blocked» exists to prevent.
//
// The two squads are the two easiest of the arena's, placed where the band they
// belong to ends, so a group reads as the thing that closes a stretch.
// ─────────────────────────────────────────────────────────────────────────

const LINES: readonly Line[] = [
  {
    id: 'first-path',
    stops: [
      { monster: 'peasant' }, //        band 1  +
      { monster: 'forest-fairy' }, //   band 1  <>
      { monster: 'robber' }, //         band 1  −
      { monster: 'sea-devil' }, //      band 1  состав
      { squad: 'two-on-the-path' }, //  band 1  + −
      { monster: 'adult-gobot' }, //    band 2  +
      { monster: 'swordsman' }, //      band 2  □
      { monster: 'hyena' }, //          band 2  −
      { monster: 'priest' }, //         band 2  состав
      { squad: 'beast-pack' }, //       band 2  + − <>
      { monster: 'griffin' }, //        band 3  +
      { monster: 'bear' }, //           band 3  −
    ],
    // Band 4, a step above everything on the path. A stand-in: the boss
    // pictures are not drawn yet, and when they are, this is the line to change.
    boss: 'royal-griffin',
  },
]

/** A stop resolved to the opponents it stands for, and checked. */
function resolve(line: string, stop: Stop): Opposition {
  if ('squad' in stop) {
    // Throws for an unknown id, and its own build has already refused a member
    // without a picture.
    return { kind: 'squad', squad: squadById(stop.squad) }
  }

  const monster = monsterById(stop.monster)

  // A path puts its opponents on the screen, so the roster's rule holds here
  // too: no picture, no appearance (see IMAGES in monsters.ts).
  if (monster.image === undefined) {
    throw new RangeError(`Quest ${line} fields ${monster.id}, which has no picture`)
  }

  return { kind: 'duel', monster }
}

function build(line: Line): Quest {
  if (line.stops.length !== NODES_PER_PATH) {
    throw new RangeError(
      `Quest ${line.id} has ${line.stops.length} stops before its boss, not ${NODES_PER_PATH}`,
    )
  }

  const boss = monsterById(line.boss)
  if (boss.image === undefined) {
    throw new RangeError(`Quest ${line.id} is ended by ${boss.id}, which has no picture`)
  }

  const nodes: QuestNode[] = line.stops.map((stop) => ({
    opposition: resolve(line.id, stop),
    boss: false,
  }))
  nodes.push({ opposition: { kind: 'duel', monster: boss }, boss: true })

  return {
    id: line.id,
    // Falling back to the id keeps a missing translation visible instead of
    // blank. A test makes sure it never actually comes to that.
    name: t.quests[line.id] ?? line.id,
    nodes,
    boss,
  }
}

/** Every path there is, in the order they are offered. */
export const QUESTS: readonly Quest[] = LINES.map(build)

export function questById(id: string): Quest {
  const quest = QUESTS.find((candidate) => candidate.id === id)
  if (!quest) throw new RangeError(`No such quest: ${id}`)
  return quest
}
