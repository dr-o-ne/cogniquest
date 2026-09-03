/**
 * QUEST CONFIG. A quest is generated from data rather than hand-picked: what
 * a quest file holds is a list of *demands* — a row of the grid, and the band
 * (1–5) to ask it at — and this module is the generator that turns each into
 * the opponent actually standing there.
 *
 * A quest is a walk down a path: node after node, each one a battle, no
 * choosing and no going round. That is the whole difference from the arena,
 * where the child picks whoever they like and nothing is locked.
 *
 * **The files are written by hand, under `./quests/`.** One file per path,
 * named `<order>_<id>.json` — see `quests/README.md` for the shape and the
 * worked example. A parent writes «addition 1, addition 1, subtraction 1» and
 * this file is the machine-readable form of exactly that: a demand is a
 * `{ kind, level }` pair, and a stop with several of them is a squad rather
 * than a duel. Nothing here names a monster by id — an opponent is drawn from
 * the very pile `ASKS` (`monsters.ts`) already deals the arena out of, so a
 * quest and the arena can never disagree about who asks what.
 */
import { publicUrl } from '@/assets'
import type { TaskKind } from '@/core/math'
import { t } from '@/locale'
import { monstersAsking, type Monster } from './monsters'
import type { Opposition } from './opposition'
import { assembleSquad } from './squads'

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
   * The monster the last node fields, still kept for its colour — the quest's
   * card on the selection screen is framed in the same colour the last stop's
   * own card would be.
   */
  readonly boss: Monster
  /**
   * The mini-boss's portrait — what the card on the selection screen actually
   * shows. Chosen by hand in `BOSS_IMAGES` below, unlike `boss` above: King's
   * Bounty's own mini-boss for a road is not whoever the generator happened to
   * draw for its last stop.
   */
  readonly image: string
}

/** A row of the grid, asked at an opponent's own band — one opponent's worth. */
interface Demand {
  readonly kind: TaskKind
  readonly level: number
}

/**
 * A stop as it is written in a file: one demand for a duel, several — each
 * with its own band — for a squad. The two shapes differ only in whether
 * `kind` is a string or a list, which is what every branch below switches on.
 */
type RawStop = Demand | { readonly kind: readonly Demand[] }

interface QuestFile {
  readonly stops: readonly RawStop[]
}

/**
 * Every file under `./quests/`, loaded whole rather than fetched: a quest is
 * offered from a menu of all of them (`QuestScreen`), so every file is wanted
 * from the very first screen that shows a quest at all, and there is nothing
 * here a loading spinner would ever earn its keep on.
 */
const FILES = import.meta.glob<QuestFile>('./quests/*.json', { eager: true, import: 'default' })

/** `<order>_<id>.json`, wherever in the path Vite happens to have put it. */
const FILENAME = /(\d+)_([a-z0-9-]+)\.json$/

interface Entry {
  readonly order: number
  readonly id: string
  readonly file: QuestFile
}

const ENTRIES: readonly Entry[] = Object.entries(FILES)
  .map(([path, file]): Entry => {
    const match = FILENAME.exec(path)
    if (!match) throw new RangeError(`Quest file ${path} is not named <order>_<id>.json`)
    const [, order, id] = match
    return { order: Number(order), id: id!, file }
  })
  .sort((a, b) => a.order - b.order)

function assertUniqueIds(entries: readonly Entry[]): void {
  const seen = new Set<string>()
  for (const entry of entries) {
    if (seen.has(entry.id)) throw new RangeError(`Two quest files share the id "${entry.id}"`)
    seen.add(entry.id)
  }
}
assertUniqueIds(ENTRIES)

// ─────────────────────────────────────────────────────────────────────────
// BOSS_IMAGES — the King's Bounty mini-boss who fronts each quest's card on
// the selection screen, keyed by quest id and kept in `public/quests/`
// (see the README there). A path with no line here has nothing to show, so
// `build` throws rather than leaving a card blank.
// ─────────────────────────────────────────────────────────────────────────
const BOSS_IMAGES: Record<string, string> = {
  'first-path': '/quests/robber.webp',
  'second-path': '/quests/joe.webp',
}

/**
 * Draws a monster for a demand, cycling through the pile rather than always
 * taking the first — and one counter for every file together, not one per
 * file. Two *different* quests asking the same demand — a common first stop,
 * «addition 1», is exactly the case a hash of the id could still collide on —
 * draw two different opponents because the second one is simply the next
 * draw the pile has not given out yet, the same way a repeat two stops apart
 * in one file already does.
 *
 * The price is real and worth naming: inserting or removing a stop in an
 * earlier-ordered file can shift what a later file draws, since the count is
 * cumulative across all of them in the order `ENTRIES` names. That is
 * accepted on purpose — the generated quests are recomputed fresh from the
 * files on every load rather than saved anywhere (nothing about a specific
 * draw is ever persisted, only how many *stops* of a quest are cleared), so
 * there is nothing for a shifted draw to contradict; the only cost is that a
 * path drawn while checking one file can look different once a sibling file
 * is edited.
 */
function makeDraw(): (questId: string, demand: Demand) => Monster {
  const drawnSoFar = new Map<string, number>()

  return (questId, demand) => {
    const pile = monstersAsking(demand.level, demand.kind)
    if (pile.length === 0) {
      throw new RangeError(
        `Quest ${questId} asks ${demand.kind} at level ${demand.level}, and nothing does`,
      )
    }

    const key = `${demand.level}:${demand.kind}`
    const at = drawnSoFar.get(key) ?? 0
    drawnSoFar.set(key, at + 1)

    return pile[at % pile.length]!
  }
}

/** Shared by every quest built below, so the round-robin runs across all of them. */
const draw = makeDraw()

/** A stop resolved to who actually stands there. */
function resolveStop(questId: string, index: number, raw: RawStop): Opposition {
  // `typeof`, not `Array.isArray`: TS narrows the whole union off a property
  // check like this one, and only off this one — `Array.isArray(raw.kind)`
  // narrows the type of `raw.kind` alone and leaves `raw` itself unresolved,
  // so `draw(raw)` below would still see the union rather than `Demand`.
  if (typeof raw.kind === 'string') return { kind: 'duel', monster: draw(questId, raw) }

  const band = raw.kind
  if (band.length < 2) {
    throw new RangeError(`Quest ${questId} stop ${index} bands fewer than two types`)
  }
  const rows = new Set(band.map((demand) => demand.kind))
  if (rows.size !== band.length) {
    throw new RangeError(`Quest ${questId} stop ${index} bands the same row twice`)
  }

  const monsters = band.map((demand) => draw(questId, demand))
  // Every stop generated this way is a fresh mix of rows, so shuffled is the
  // only mode that makes sense for it — see G9 on what the two modes are for.
  return { kind: 'squad', squad: assembleSquad(`${questId}:${index}`, monsters, true) }
}

function build(id: string, file: QuestFile): Quest {
  if (file.stops.length < 2) {
    throw new RangeError(`Quest ${id} has too few stops to end on a boss`)
  }

  const last = file.stops[file.stops.length - 1]!
  if (Array.isArray(last.kind)) {
    throw new RangeError(`Quest ${id} ends on a band; the boss must be a single opponent`)
  }

  const nodes: QuestNode[] = file.stops.map((raw, index) => ({
    opposition: resolveStop(id, index, raw),
    boss: index === file.stops.length - 1,
  }))

  // Safe: `last` was just checked to be a single demand, and `resolveStop`
  // turns exactly that shape into a duel, never a squad.
  const bossOpposition = nodes[nodes.length - 1]!.opposition
  if (bossOpposition.kind !== 'duel') throw new RangeError(`Quest ${id} did not end on a duel`)

  const image = BOSS_IMAGES[id]
  if (image === undefined) throw new RangeError(`Quest ${id} has no portrait in BOSS_IMAGES`)

  return {
    id,
    // Falling back to the id keeps a missing translation visible instead of
    // blank. A test makes sure it never actually comes to that.
    name: t.quests[id] ?? id,
    nodes,
    boss: bossOpposition.monster,
    image: publicUrl(image),
  }
}

/** Every path there is, in the order the files name. */
export const QUESTS: readonly Quest[] = ENTRIES.map((entry) => build(entry.id, entry.file))

export function questById(id: string): Quest {
  const quest = QUESTS.find((candidate) => candidate.id === id)
  if (!quest) throw new RangeError(`No such quest: ${id}`)
  return quest
}
