/**
 * SQUAD CONFIG (**G9**). Groups of opponents that stand together, one card each
 * on the selection screen.
 *
 * One table, `LINEUPS`: an id, how the group takes turns, and who is in it by
 * roster id. Everything else is read off the members — how long the battle is,
 * which rungs it draws from, what colour the card is — so a new squad is one
 * line here plus a name in the text pack (src/locale) under the same id.
 *
 * **A squad is picked for its mix of rows, and the table is written that way**:
 * every group below covers as many rows of the grid as it has room for, which
 * is the whole point of a shuffled one. Left to itself a battle is a run of one
 * row (**G8**); a shuffled squad is «mixed, not blocked» put back, so a lineup
 * of three that asked addition three times over would be a squad in name only.
 */
import { t } from '@/locale'
import { MAX_SQUAD } from './Battle'
import { monsterById, type Monster } from './monsters'

export interface Squad {
  readonly id: string
  /** Localised display name, from `t.squads`. */
  readonly name: string
  /** In the order they were written. The same monster may appear twice. */
  readonly monsters: readonly Monster[]
  /** How the group takes turns — see `BattleConfig.shuffle` (**G9**). */
  readonly shuffle: boolean
  /** Every heart of every member: the length of the battle. */
  readonly hearts: number
  /** Which math levels (C1) the battle can draw from, across all the members. */
  readonly levels: readonly number[]
  /** The card's colour, taken from the member that tops out highest. */
  readonly color: string
}

interface Lineup {
  readonly id: string
  readonly shuffle: boolean
  readonly members: readonly string[]
}

/** The rung a unit tops out at, which is also its level band in ASKS. */
const top = (monster: Monster) => Math.max(...monster.levels)

// ─────────────────────────────────────────────────────────────────────────
// LINEUPS — who stands with whom. Easiest first, the way the roster is
// ordered: the table's own order is what the screen shows, since four groups
// written by hand read as a progression and sorting them would only hide a
// mistake in one. A test holds the order.
//
// The row each member asks is in the comment beside it, and it is the reason
// they are grouped this way. Change a member and check the rows still add up.
// ─────────────────────────────────────────────────────────────────────────

const LINEUPS: readonly Lineup[] = [
  // The smallest group there is, on the easiest rung: two members, two rows.
  { id: 'two-on-the-path', shuffle: true, members: ['peasant', 'robber'] },
  //                                                 +          −

  // Three members, three rows — every row of the grid inside one battle.
  { id: 'beast-pack', shuffle: true, members: ['wolf', 'hyena', 'swamp-snake'] },
  //                                            +       −        <>

  { id: 'sky-watch', shuffle: true, members: ['griffin', 'gorgul', 'sky-guard', 'beholder'] },
  //                                           +          −         <>           +

  // The one group drawn from more than one band: rungs 1, 2, 3 and 3, so the
  // level moves under the child as well as the row. The hardest of the four,
  // and it is last for that reason rather than for its size.
  { id: 'motley-band', shuffle: true, members: ['gobot', 'zombie', 'frost-spider', 'guardsman'] },
  //                                             +(1)     −(2)      <>(3)           +(3)
]

function build(lineup: Lineup): Squad {
  // Two is what makes it a group; one is a duel, and the roster already has
  // forty-eight cards for that.
  if (lineup.members.length < 2) {
    throw new RangeError(`Squad ${lineup.id} is not a group: it needs at least two members`)
  }
  if (lineup.members.length > MAX_SQUAD) {
    throw new RangeError(`Squad ${lineup.id} is more than ${MAX_SQUAD} strong`)
  }

  // Throws for an id nobody has, and it fires when the game is opened rather
  // than when somebody next runs the tests.
  const monsters = lineup.members.map(monsterById)

  // A squad puts its members on the screen, so the roster's rule holds for
  // them too: no picture, no appearance (see IMAGES in monsters.ts).
  for (const monster of monsters) {
    if (monster.image === undefined) {
      throw new RangeError(`Squad ${lineup.id} fields ${monster.id}, which has no picture`)
    }
  }

  return {
    id: lineup.id,
    // Falling back to the id keeps a missing translation visible instead of
    // blank. A test makes sure it never actually comes to that.
    name: t.squads[lineup.id] ?? lineup.id,
    monsters,
    shuffle: lineup.shuffle,
    hearts: monsters.reduce((sum, monster) => sum + monster.hearts, 0),
    levels: [...new Set(monsters.flatMap((monster) => monster.levels))].sort((a, b) => a - b),
    color: monsters.reduce((hardest, monster) => (top(monster) >= top(hardest) ? monster : hardest))
      .color,
  }
}

/** Every group on the selection screen, easiest first. */
export const SQUADS: readonly Squad[] = LINEUPS.map(build)

export function squadById(id: string): Squad {
  const squad = SQUADS.find((candidate) => candidate.id === id)
  if (!squad) throw new RangeError(`No such squad: ${id}`)
  return squad
}
