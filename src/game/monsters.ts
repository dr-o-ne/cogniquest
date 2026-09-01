/**
 * OPPONENT CONFIG.
 *
 * Three tables below, and normally only the second one gets edited:
 *
 *   ROSTER  — every King's Bounty unit and the level it fights at
 *   IMAGES  — pictures. A UNIT WITHOUT A PICTURE NEVER APPEARS IN THE GAME
 *   TUNING  — hand corrections where the level alone gets a unit wrong
 *
 * To add an opponent: drop a picture into public/monsters/ and add a line to
 * IMAGES. Nothing else is needed — both the length of the battle and the
 * difficulty of its tasks come from the unit's level. The display name comes
 * from the text pack (src/locale), keyed by the same id.
 */
import { publicUrl } from '@/assets'
import type { TaskKind } from '@/core/math'
import { t } from '@/locale'

export interface Monster {
  readonly id: string
  /** Localised display name, from `t.monsters`. */
  readonly name: string
  /**
   * The unit's King's Bounty level, 1–5: which region of the journey it belongs
   * to, and the one number every other dial is read off.
   */
  readonly level: number
  /**
   * Which kinds of task this fight draws from — a pool, like `levels`, with
   * one drawn afresh for every question. A row of the grid per name; an
   * opponent listing four asks all four, turn about.
   *
   * `DEFAULT_TASKS` unless TUNING says otherwise. A kind whose rungs miss this
   * opponent's levels is simply never drawn (`taskChoices` pairs kind with
   * level), so a short row like comparing-numbers can ride along in every pool
   * and still only surface for opponents that reach levels 1–2.
   */
  readonly tasks: readonly TaskKind[]
  /** A picture from public/monsters/. No picture, and the unit stays hidden. */
  readonly image?: string
  /** An emoji for when the picture fails to load. */
  readonly avatar?: string
  /** Which math levels (C1) the tasks are drawn from. */
  readonly levels: readonly number[]
  readonly color: string
}



// ─────────────────────────────────────────────────────────────────────────
// What a unit's level decides
//
// One thing now: which math rungs its questions are drawn from. The length of
// a battle is not here at all any more — it is the size of the squad, which
// the journey decides (see journey.ts, and G7 as amended by G9).
//
// Math levels (C1, see docs/MATH.md):
//   1 — ± within five                    4 — two-digit, nothing carried
//   2 — ± up to ten, the ten not crossed  5 — two-digit, the units overflow
//   3 — across the ten, and whole tens to a hundred
//
// A unit's own level is a King's Bounty number and runs 1–5; the math ladder
// is a different list that will grow past five. BY_LEVEL below is the join
// between them, and it is the one place that has to be re-cut when it does.
// ─────────────────────────────────────────────────────────────────────────

/**
 * What a unit's level is worth: which math rungs (C1) its questions are drawn
 * from, and the colour it is drawn in.
 *
 * The hearts that used to sit here are now a ladder in journey.ts, and they
 * mean the hearts of one stack rather than the length of a whole battle.
 */
const BY_LEVEL: Record<number, { levels: number[]; color: string }> = {
  1: { levels: [1], color: '#7cb342' },
  2: { levels: [1, 2], color: '#4aa3a0' },
  3: { levels: [2, 3], color: '#4a7de0' },
  4: { levels: [3, 4], color: '#a0417a' },
  5: { levels: [4, 5], color: '#c0392b' },
}



// ─────────────────────────────────────────────────────────────────────────
// IMAGES — who takes part in the game
//
// The key is a unit id from ROSTER. Units missing here never show up on the
// selection screen, even though they are in the roster.
// ─────────────────────────────────────────────────────────────────────────

const IMAGES: Record<string, string> = {
  'forest-fairy': '/monsters/fairy.webp',
  peasant: '/monsters/peasant.webp',
  robber: '/monsters/robber.webp',
  swordsman: '/monsters/swordsman.webp',
  skeleton: '/monsters/skeleton.webp',
  'skeleton-archer': '/monsters/skeleton-archer.webp',
  archer: '/monsters/archer.webp',
  priest: '/monsters/priest.webp',
  goblin: '/monsters/goblin.webp',
  imp: '/monsters/imp.webp',
  zombie: '/monsters/zombie.webp',
  'ancient-vampire-bat': '/monsters/vampire.webp',
  gorgul: '/monsters/gorgul.webp',
  gobot: '/monsters/gobot.webp',
  'adult-gobot': '/monsters/adult-gobot.webp',
  'fire-spider': '/monsters/spider-fire.webp',
  'sea-devil': '/monsters/sea-devil.webp',
  pirate: '/monsters/pirate.webp',
  'ghost-pirate': '/monsters/ghost-pirate.webp',
  'mage-slayer': '/monsters/mage-slayer.webp',
  guardsman: '/monsters/guardsman.webp',
  inquisitor: '/monsters/inquisitor.webp',
  scout: '/monsters/scout.webp',
  'sky-guard': '/monsters/sky-guard.webp',
  assassin: '/monsters/assassin.webp',
  archmage: '/monsters/archmage.webp',
  cavalryman: '/monsters/cavalryman.webp',
  pyromancer: '/monsters/pyromancer.webp',
  knight: '/monsters/knight.webp',
  paladin: '/monsters/paladin.webp',
  // Off the selection screen for now — he is wanted, but not yet within reach.
  // Uncomment when level 5 sums stop being a wall.
  // archdemon: '/monsters/archdemon.webp',
}

// ─────────────────────────────────────────────────────────────────────────
// TUNING — hand corrections to the computed values
//
// Going by level alone gives every unit of a level the same battle. Here they
// can be pulled apart by character: one tough, another quick and nasty.
// ─────────────────────────────────────────────────────────────────────────

/**
 * What an opponent asks unless it is on the other side of the split, or TUNING
 * overrides it outright.
 *
 * Addition alone at the moment. The rows still parked in `core/math/kinds` are
 * listed below and would not compile until they come back.
 *
 * Chains (`addition-subtraction`) were never in this default even so: they need
 * a two-digit-carrying head for level 4, so they belong to opponents chosen for
 * it, not to a peasant.
 */
const DEFAULT_TASKS: readonly TaskKind[] = [
  'addition',
  // 'missing-number',
  // 'comparing-numbers',
]

/** The other side of the split (G8). One row, nothing mixed into it. */
const SUBTRACTION_TASKS: readonly TaskKind[] = ['subtraction']

/**
 * Which opponents are on it (**G8**).
 *
 * A row comes back on a share of the roster rather than in every pool, because
 * a battle is already a run of one row — ten to twenty tasks of nothing else —
 * and that is the run the methodology asks for before a row joins the draw. The
 * child meets both rows in a session and one row in a battle.
 *
 * **The share is taken inside each level band and never between them.** Were
 * the subtraction opponents the hard ones, «subtraction» would quietly become a
 * name for a difficulty, and **G7** has two dials already. «The split covers
 * every band» in Battle.test.ts holds it, so a new opponent cannot tilt a band
 * unnoticed — a list on its own could not, since nothing about a roster row
 * says which side it lands on.
 *
 * A list and not a rule, deliberately. Faction was the tempting rule — the
 * undead and the demons take away — and it does not divide: at level 2 they are
 * two opponents out of ten. A rule bent until the numbers work is worse than a
 * list that says what it is.
 */
const SUBTRACTS: ReadonlySet<string> = new Set([
  // level 1
  'robber',
  'skeleton',
  'skeleton-archer',
  // level 2
  'zombie',
  'imp',
  'pirate',
  'swordsman',
  'fire-spider',
  // level 3
  'gorgul',
  'inquisitor',
  'sky-guard',
  // level 4
  'archmage',
  'cavalryman',
  'paladin',
])

const TUNING: Record<string, { levels?: number[]; avatar?: string; tasks?: TaskKind[] }> = {
  'forest-fairy': { avatar: '🧚' },
  peasant: { avatar: '🧑‍🌾' },
  robber: { avatar: '🦹' },
  swordsman: { avatar: '⚔️' },
  skeleton: { avatar: '💀' },
  'skeleton-archer': { avatar: '💀' },
  // Off the addition/subtraction split entirely: the goblin asks comparing
  // numbers, its own row for the length of a battle. Rungs 1–2 here (numbers),
  // and — when `addition-subtraction` comes back — this is also where the whole
  // list would be spelled out for chains.
  goblin: { avatar: '👺', tasks: ['comparing-numbers'] },
  zombie: { avatar: '🧟' },
  archer: { avatar: '🏹' },
  priest: { avatar: '✝️' },
  imp: { avatar: '👿' },
  'ancient-vampire-bat': { avatar: '🧛' },
  gorgul: { avatar: '🗿' },
  gobot: { avatar: '🦎' },
  'adult-gobot': { avatar: '🐊' },
  'fire-spider': { avatar: '🕷' },
  'sea-devil': { avatar: '🦑' },
  pirate: { avatar: '🏴‍☠️' },
  'ghost-pirate': { avatar: '👻' },
  'mage-slayer': { avatar: '🗡️' },
  guardsman: { avatar: '🛡️' },
  inquisitor: { avatar: '⚖️' },
  scout: { avatar: '🧝' },
  'sky-guard': { avatar: '🦅' },
  // The other comparing-numbers opponent, up where the sides are expressions
  // to work out first — rungs 3–4 (levels [3, 4]).
  assassin: { avatar: '🥷', tasks: ['comparing-numbers'] },
  archmage: { avatar: '🧙' },
  cavalryman: { avatar: '🐎' },
  pyromancer: { avatar: '🔥' },
  knight: { avatar: '⚔️' },
  paladin: { avatar: '🌟' },
  archdemon: { avatar: '😈' },
}

// ─────────────────────────────────────────────────────────────────────────
// ROSTER — every unit
//
// id · level. The battle is worked out from the level alone (see BY_LEVEL);
// King's Bounty's own combat stats are not part of it and are not carried.
// Ordered by level, then by id.
// ─────────────────────────────────────────────────────────────────────────

type Row = readonly [id: string, level: number]

const ROSTER: readonly Row[] = [
  // Level 1
  ['dead-spider', 1],
  ['forest-fairy', 1],
  ['gobot', 1],
  ['ice-ball', 1],
  ['lizardman', 1],
  ['peasant', 1],
  ['robber', 1],
  ['sea-devil', 1],
  ['skeleton', 1],
  ['skeleton-archer', 1],
  ['slinger', 1],

  // Level 2
  ['adult-gobot', 2],
  ['archer', 2],
  ['barbarian', 2],
  ['dryad', 2],
  ['fire-spider', 2],
  ['frenzied-goblin', 2],
  ['goblin', 2],
  ['hyena', 2],
  ['imp', 2],
  ['mad-barbarian', 2],
  ['mage-slayer', 2],
  ['miner', 2],
  ['minion', 2],
  ['mocking-imp', 2],
  ['pirate', 2],
  ['priest', 2],
  ['rotting-zombie', 2],
  ['shapeshifter', 2],
  ['snake', 2],
  ['spy', 2],
  ['swamp-snake', 2],
  ['swordsman', 2],
  ['viking', 2],
  ['wolf', 2],
  ['zombie', 2],

  // Level 3
  ['ancient-bear', 3],
  ['axe-thrower', 3],
  ['bear', 3],
  ['beholder', 3],
  ['berserker', 3],
  ['cerberus', 3],
  ['cursed-ghost', 3],
  ['dark-elf', 3],
  ['druid', 3],
  ['dwarf', 3],
  ['elf', 3],
  ['frost-spider', 3],
  ['ghost', 3],
  ['ghost-gorguana', 3],
  ['ghost-pirate', 3],
  ['goblin-shaman', 3],
  ['gorguana', 3],
  ['gorgul', 3],
  ['griffin', 3],
  ['guardsman', 3],
  ['inquisitor', 3],
  ['man-eating-wolf', 3],
  ['orc', 3],
  ['scout', 3],
  ['sky-guard', 3],
  ['vampire', 3],
  ['vampire-bat', 3],
  ['white-wolf', 3],

  // Level 4
  ['alchemist', 4],
  ['amazon', 4],
  ['ancient-vampire', 4],
  ['ancient-vampire-bat', 4],
  ['archmage', 4],
  ['assassin', 4],
  ['avenger', 4],
  ['black-knight', 4],
  ['black-unicorn', 4],
  ['brontor', 4],
  ['cannoneer', 4],
  ['cavalryman', 4],
  ['darkwood-ent', 4],
  ['demon', 4],
  ['demoness', 4],
  ['demonologist', 4],
  ['ent', 4],
  ['evil-beholder', 4],
  ['executioner', 4],
  ['frost-unicorn', 4],
  ['gorgon', 4],
  ['guard-droid', 4],
  ['haiterant', 4],
  ['hunter', 4],
  ['jarl', 4],
  ['knight', 4],
  ['mystic', 4],
  ['necromancer', 4],
  ['observer', 4],
  ['orc-hunter', 4],
  ['orc-veteran', 4],
  ['paladin', 4],
  ['pathfinder', 4],
  ['polar-bear', 4],
  ['pyromancer', 4],
  ['royal-griffin', 4],
  ['royal-thorn', 4],
  ['shieldmaiden', 4],
  ['unicorn', 4],

  // Level 5
  ['ancient-darkwood-ent', 5],
  ['ancient-ent', 5],
  ['archdemon', 5],
  ['black-dragon', 5],
  ['bone-dragon', 5],
  ['chosha', 5],
  ['emerald-dragon', 5],
  ['giant', 5],
  ['jotun', 5],
  ['lava-golem', 5],
  ['nekroh', 5],
  ['ogre', 5],
  ['orc-chief', 5],
  ['t-rex', 5],
]

function build(row: Row): Monster {
  const [id, level] = row

  const base = BY_LEVEL[level]
  if (!base) throw new RangeError(`Unit ${id} has an unknown level ${level}`)

  const tuned = TUNING[id] ?? {}
  const image = IMAGES[id]

  return {
    id,
    // Falling back to the id keeps a missing translation visible instead of
    // blank. A test makes sure it never actually comes to that.
    name: t.monsters[id] ?? id,
    level,
    tasks: tuned.tasks ?? (SUBTRACTS.has(id) ? SUBTRACTION_TASKS : DEFAULT_TASKS),
    // Written as a root path in IMAGES, resolved against wherever the app is
    // actually served from — see src/assets.ts.
    ...(image !== undefined ? { image: publicUrl(image) } : {}),
    ...(tuned.avatar !== undefined ? { avatar: tuned.avatar } : {}),
    levels: tuned.levels ?? base.levels,
    color: base.color,
  }
}

/** The whole roster, including units that have no picture yet. */
export const MONSTERS: readonly Monster[] = ROSTER.map(build)

/**
 * Who the game can actually field: only units that have a picture. Ordered
 * easiest first, so the ladder reads at a glance.
 */
export function availableMonsters(): readonly Monster[] {
  return MONSTERS.filter((monster) => monster.image !== undefined).sort(
    (a, b) => a.level - b.level || a.id.localeCompare(b.id),
  )
}

/** The colour a level is drawn in — hearts, bands of the map, and the road. */
export function levelColor(level: number): string {
  return BY_LEVEL[level]?.color ?? '#7a7a88'
}

export function monsterById(id: string): Monster {
  const monster = MONSTERS.find((candidate) => candidate.id === id)
  if (!monster) throw new RangeError(`No such monster: ${id}`)
  return monster
}
