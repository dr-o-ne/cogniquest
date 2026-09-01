/**
 * OPPONENT CONFIG.
 *
 * Three tables below, and normally only the second one gets edited:
 *
 *   ROSTER  — King's Bounty units with their stats, straight from the game
 *   IMAGES  — pictures. A UNIT WITHOUT A PICTURE NEVER APPEARS IN THE GAME
 *   TUNING  — hand corrections to hearts and difficulty where the maths is off
 *
 * To add an opponent: drop a picture into public/monsters/ and add a line to
 * IMAGES. Nothing else is needed — both the length of the battle and the
 * difficulty of its tasks come from the unit's level. The display name comes
 * from the text pack (src/locale), keyed by the same id.
 */
import { publicUrl } from '@/assets'
import type { TaskKind } from '@/core/math'
import { t } from '@/locale'

export interface UnitStats {
  readonly level: number
  readonly leadership: number
  readonly attack: number
  readonly defense: number
  readonly initiative: number
  readonly speed: number
  readonly health: number
  readonly damage: string
}

export interface Monster {
  readonly id: string
  /** Localised display name, from `t.monsters`. */
  readonly name: string
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
  /** How many correct answers it takes to win. */
  readonly hearts: number
  /** Which math levels (C1) the tasks are drawn from. */
  readonly levels: readonly number[]
  readonly color: string
  /** King's Bounty stats. Not used by the game yet. */
  readonly stats?: UnitStats
}

/**
 * How many hearts the child has. One is lost per wrong answer.
 *
 * Set against the longest battle rather than the average one: twenty tasks are
 * twenty chances to collect a mistake simply along the way, and at five hearts
 * a long battle would turn not into «longer» but into «harder».
 */
export const PLAYER_HEARTS = 6

// ─────────────────────────────────────────────────────────────────────────
// How a unit's level turns into a battle
//
// Both dials come from LEVEL: how many tasks the battle runs to, and which
// math rungs they are drawn from. HEALTH no longer enters into it. It used to
// set the hearts on a log scale, which balanced the wrong thing — health is a
// King's Bounty number tuned for King's Bounty fights, and it made the hardest
// opponent the longest one as well, thirty-five tasks for an ancient ent.
//
// The two dials now run in opposite directions, on purpose. Easy tasks are
// quick and want repeating, so a level 1 battle is twenty of them; two-digit
// carrying is slow and expensive to hold, so a level 5 battle is ten.
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
 * What a unit's level is worth: how many tasks its battle runs to, which math
 * rungs (C1) they are drawn from, and the colour of its card.
 *
 * Hearts fall as the rungs rise. Twenty bonds within five is a warm-up a child
 * can hold; twenty two-digit carries is an evening's work.
 */
const BY_LEVEL: Record<number, { hearts: number; levels: number[]; color: string }> = {
  1: { hearts: 20, levels: [1], color: '#7cb342' },
  2: { hearts: 18, levels: [1, 2], color: '#4aa3a0' },
  3: { hearts: 16, levels: [2, 3], color: '#4a7de0' },
  4: { hearts: 12, levels: [3, 4], color: '#a0417a' },
  5: { hearts: 10, levels: [4, 5], color: '#c0392b' },
}

/**
 * How long the shortest and longest battles are — read off the table rather
 * than written down beside it, so a re-tuned rung cannot leave them behind.
 *
 * Worth having because TUNING may still set hearts by hand, and a slip there
 * is how a battle of forty questions would arrive.
 */
const HEARTS_PER_LEVEL = Object.values(BY_LEVEL).map((battle) => battle.hearts)
export const HEARTS_MIN = Math.min(...HEARTS_PER_LEVEL)
export const HEARTS_MAX = Math.max(...HEARTS_PER_LEVEL)

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

const TUNING: Record<
  string,
  { hearts?: number; levels?: number[]; avatar?: string; tasks?: TaskKind[] }
> = {
  // Her hearts used to be set by hand, because she has no stats to work them
  // out from. The level answers that now, so the correction is gone.
  'forest-fairy': { avatar: '🧚' },
  peasant: { avatar: '🧑‍🌾' },
  robber: { avatar: '🦹' },
  swordsman: { avatar: '⚔️' },
  skeleton: { avatar: '💀' },
  'skeleton-archer': { avatar: '💀' },
  // The one opponent that also asks chains — hence the whole list spelled out.
  // Parked with the row itself; back when `addition-subtraction` is.
  goblin: {
    avatar: '👺',
    // tasks: [...DEFAULT_TASKS, 'addition-subtraction'],
  },
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
  assassin: { avatar: '🥷' },
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
// id · level · leadership · attack · defense · initiative · speed ·
// health · damage
//
// Everything after the level may be left out — then the battle is worked out
// from the level alone.
// ─────────────────────────────────────────────────────────────────────────

type Row = readonly [
  id: string,
  level: number,
  leadership?: number,
  attack?: number,
  defense?: number,
  initiative?: number,
  speed?: number,
  health?: number,
  damage?: string,
]

const ROSTER: readonly Row[] = [
  // This one was not in the table we were given: its stats are unknown, so
  // only the level is listed and the battle is worked out from that.
  ['forest-fairy', 1],

  // Humans
  ['peasant', 1, 5, 1, 1, 3, 2, 6, '1–2'],
  ['robber', 1, 20, 10, 6, 4, 2, 15, '2–4'],
  ['swordsman', 2, 35, 10, 16, 3, 3, 35, '4–5'],
  ['archer', 2, 50, 16, 10, 4, 2, 34, '3–4'],
  ['priest', 2, 50, 10, 10, 4, 2, 32, '2–4'],
  ['guardsman', 3, 50, 15, 17, 4, 3, 50, '6–8'],
  ['inquisitor', 3, 100, 16, 16, 5, 2, 70, '5–7'],
  ['paladin', 4, 220, 30, 36, 3, 2, 200, '16–20'],
  ['knight', 4, 180, 27, 27, 3, 2, 160, '14–18'],
  ['cavalryman', 4, 180, 29, 25, 7, 5, 150, '14–18'],
  ['archmage', 4, 200, 20, 24, 6, 2, 140, '5–8'],
  ['pyromancer', 4, 300, 24, 28, 5, 2, 170, '7–10'],

  // Dwarves
  ['miner', 2, 20, 8, 8, 3, 2, 20, '3–4'],
  ['dwarf', 3, 80, 20, 16, 4, 2, 80, '8–12'],
  ['alchemist', 4, 270, 25, 35, 5, 2, 170, '10–25'],
  ['cannoneer', 4, 220, 30, 22, 6, 2, 100, '6–10'],
  ['giant', 5, 1600, 54, 60, 5, 1, 900, '80–100'],

  // Elves
  ['elf', 3, 80, 21, 15, 5, 2, 50, '4–5'],
  ['pathfinder', 4, 150, 27, 18, 6, 2, 90, '8–10'],
  ['druid', 3, 100, 16, 22, 2, 2, 100, '4–8'],
  ['dryad', 2, 20, 4, 12, 4, 3, 25, '1–3'],
  ['ent', 4, 260, 30, 36, 2, 2, 260, '25–30'],
  ['ancient-ent', 5, 1200, 40, 50, 1, 1, 1000, '100–140'],
  ['unicorn', 4, 130, 23, 20, 7, 5, 120, '9–15'],
  ['black-unicorn', 4, 150, 27, 24, 5, 4, 140, '11–20'],
  ['frost-unicorn', 4, 170, 30, 25, 5, 4, 155, '11–21'],
  ['avenger', 4, 200, 24, 22, 6, 2, 130, '12–16'],

  // Dark elves
  ['scout', 3, 90, 22, 16, 5, 2, 60, '4–5'],
  ['white-wolf', 3, 100, 22, 16, 5, 4, 90, '8–11'],
  ['dark-elf', 3, 80, 21, 15, 5, 2, 60, '4–5'],
  ['hunter', 4, 150, 27, 18, 6, 2, 110, '8–12'],
  ['darkwood-ent', 4, 260, 30, 36, 2, 2, 260, '25–30'],
  ['ancient-darkwood-ent', 5, 1200, 50, 60, 1, 1, 1400, '100–140'],

  // Orcs
  ['goblin', 2, 40, 16, 10, 5, 2, 26, '2–4'],
  ['frenzied-goblin', 2, 45, 14, 14, 8, 3, 40, '3–7'],
  ['goblin-shaman', 3, 120, 20, 15, 5, 2, 60, '4–8'],
  ['orc', 3, 60, 16, 17, 4, 2, 65, '7–10'],
  ['orc-veteran', 4, 140, 26, 26, 6, 3, 130, '13–16'],
  ['orc-hunter', 4, 160, 24, 26, 6, 3, 150, '15–22'],
  ['orc-chief', 5, 1200, 45, 40, 4, 2, 770, '55–75'],
  ['ogre', 5, 1000, 37, 47, 5, 2, 680, '50–60'],

  // Demons
  ['cerberus', 3, 90, 18, 18, 5, 4, 90, '8–12'],
  ['imp', 2, 40, 16, 12, 5, 4, 25, '3–6'],
  ['mocking-imp', 2, 60, 16, 16, 6, 3, 45, '4–7'],
  ['demoness', 4, 160, 26, 24, 6, 2, 100, '10–18'],
  ['demon', 4, 300, 30, 30, 4, 3, 240, '28–35'],
  ['executioner', 4, 360, 40, 30, 5, 2, 280, '32–34'],
  ['archdemon', 5, 1600, 66, 66, 8, 9, 766, '88–99'],

  // Undead
  ['skeleton', 1, 12, 3, 2, 3, 2, 14, '2–3'],
  ['skeleton-archer', 1, 14, 3, 2, 4, 2, 10, '2–3'],
  ['zombie', 2, 30, 9, 13, 2, 2, 36, '3–4'],
  ['rotting-zombie', 2, 40, 13, 15, 1, 2, 48, '5–6'],
  ['ghost', 3, 80, 18, 13, 4, 4, 40, '4–8'],
  ['cursed-ghost', 3, 130, 21, 17, 6, 4, 60, '6–9'],
  // Undead by race, whatever the name suggests — hence filed here and not
  // beside the living pirate.
  ['ghost-pirate', 3, 50, 12, 6, 4, 3, 25, '4–6'],
  ['vampire', 3, 80, 20, 20, 5, 2, 70, '6–12'],
  ['ancient-vampire', 4, 180, 25, 25, 6, 2, 140, '10–18'],
  ['vampire-bat', 3, 80, 20, 15, 6, 4, 50, '5–8'],
  ['ancient-vampire-bat', 4, 180, 25, 20, 7, 5, 100, '8–12'],
  ['black-knight', 4, 150, 28, 28, 5, 2, 160, '12–16'],
  ['bone-dragon', 5, 1300, 53, 53, 6, 7, 790, '50–80'],
  ['necromancer', 4, 200, 30, 30, 7, 2, 140, '8–12'],

  // Barbarians and beasts
  ['barbarian', 2, 35, 10, 8, 5, 3, 30, '4–6'],
  ['mad-barbarian', 2, 35, 20, 4, 6, 3, 30, '4–6'],
  ['wolf', 2, 30, 10, 6, 5, 3, 24, '3–6'],
  ['hyena', 2, 20, 12, 14, 6, 3, 18, '3–4'],
  ['bear', 3, 70, 14, 16, 2, 2, 60, '7–10'],
  ['ancient-bear', 3, 80, 18, 20, 3, 2, 70, '9–12'],
  ['polar-bear', 4, 150, 22, 26, 4, 2, 130, '12–22'],
  ['griffin', 3, 80, 20, 20, 5, 5, 90, '5–10'],
  ['royal-griffin', 4, 300, 35, 30, 6, 6, 215, '20–30'],
  ['beholder', 3, 140, 20, 24, 5, 3, 80, '7–12'],
  ['evil-beholder', 4, 180, 22, 28, 4, 3, 100, '9–15'],

  // Dragons and giants
  ['black-dragon', 5, 2500, 70, 70, 6, 8, 1000, '110–130'],
  ['emerald-dragon', 5, 1900, 53, 60, 5, 6, 800, '80–110'],
  ['royal-thorn', 4, 380, 30, 30, 2, 1, 360, '20–30'],

  // Spiders, snakes, small fry
  ['frost-spider', 3, 120, 18, 22, 4, 3, 60, '6–10'],
  ['fire-spider', 2, 30, 12, 12, 6, 3, 30, '4–5'],
  ['dead-spider', 1, 13, 4, 2, 6, 3, 13, '2–3'],
  ['snake', 2, 30, 14, 8, 5, 2, 30, '3–6'],
  ['swamp-snake', 2, 28, 12, 8, 4, 2, 28, '3–5'],
  ['ice-ball', 1, 5, 10, 40, 2, 2, 10, '10–15'],
  ['sea-devil', 1, 12, 6, 4, 7, 3, 10, '1–3'],
  ['pirate', 2, 25, 8, 4, 5, 3, 25, '3–5'],

  // Lizards
  ['lizardman', 1, 15, 7, 1, 7, 3, 6, '1–2'],
  ['gobot', 1, 15, 7, 1, 7, 3, 6, '1–2'],
  ['adult-gobot', 2, 15, 11, 4, 6, 3, 8, '2–3'],
  ['gorgul', 3, 70, 20, 16, 7, 3, 70, '5–7'],
  ['gorguana', 3, 120, 20, 24, 4, 2, 76, '6–10'],
  ['ghost-gorguana', 3, 145, 20, 22, 5, 2, 80, '7–11'],
  ['haiterant', 4, 150, 31, 29, 6, 6, 110, '7–13'],
  ['gorgon', 4, 240, 24, 30, 4, 3, 130, '11–16'],
  ['brontor', 4, 200, 28, 35, 3, 2, 200, '20–25'],
  ['t-rex', 5, 900, 45, 45, 3, 3, 600, '50–70'],
  ['chosha', 5, 1000, 50, 50, 2, 2, 800, '70–100'],

  // Northmen
  ['viking', 2, 40, 12, 10, 5, 3, 30, '4–6'],
  ['slinger', 1, 22, 4, 3, 4, 2, 12, '2–3'],
  ['axe-thrower', 3, 120, 20, 16, 5, 3, 90, '4–7'],
  ['berserker', 3, 60, 20, 14, 6, 3, 52, '4–7'],
  ['shieldmaiden', 4, 200, 29, 25, 6, 5, 150, '14–18'],
  ['mystic', 4, 300, 26, 28, 5, 2, 170, '14–18'],
  ['jarl', 4, 320, 32, 36, 4, 3, 240, '20–30'],
  ['jotun', 5, 1350, 46, 48, 5, 2, 720, '60–70'],

  // Others
  ['minion', 2, 50, 12, 10, 7, 3, 35, '3–5'],
  ['observer', 4, 270, 26, 30, 4, 3, 140, '12–17'],
  ['sky-guard', 3, 60, 20, 15, 6, 5, 33, '4–7'],
  ['assassin', 4, 150, 36, 20, 6, 3, 100, '11–13'],
  ['amazon', 4, 180, 29, 25, 7, 5, 150, '12–18'],
  ['shapeshifter', 2, 60, 18, 10, 7, 2, 30, '2–4'],
  ['spy', 2, 55, 10, 16, 3, 2, 45, '2–4'],
  ['mage-slayer', 2, 55, 14, 12, 5, 3, 55, '6–9'],
  ['man-eating-wolf', 3, 60, 16, 10, 5, 4, 55, '5–8'],
  ['demonologist', 4, 210, 30, 25, 6, 2, 160, '12–14'],
  ['lava-golem', 5, 1, 35, 40, 5, 2, 650, '400'],
  ['nekroh', 5, 2400, 52, 55, 5, 4, 1000, '90–130'],
  ['guard-droid', 4, 120, 25, 25, 6, 3, 100, '12'],
]

function build(row: Row): Monster {
  const [id, level, leadership, attack, defense, initiative, speed, health, damage] = row

  const base = BY_LEVEL[level]
  if (!base) throw new RangeError(`Unit ${id} has an unknown level ${level}`)

  const tuned = TUNING[id] ?? {}
  const image = IMAGES[id]

  const hasStats =
    leadership !== undefined &&
    attack !== undefined &&
    defense !== undefined &&
    initiative !== undefined &&
    speed !== undefined &&
    health !== undefined &&
    damage !== undefined

  return {
    id,
    // Falling back to the id keeps a missing translation visible instead of
    // blank. A test makes sure it never actually comes to that.
    name: t.monsters[id] ?? id,
    tasks: tuned.tasks ?? (SUBTRACTS.has(id) ? SUBTRACTION_TASKS : DEFAULT_TASKS),
    // Written as a root path in IMAGES, resolved against wherever the app is
    // actually served from — see src/assets.ts.
    ...(image !== undefined ? { image: publicUrl(image) } : {}),
    ...(tuned.avatar !== undefined ? { avatar: tuned.avatar } : {}),
    hearts: tuned.hearts ?? base.hearts,
    levels: tuned.levels ?? base.levels,
    color: base.color,
    ...(hasStats
      ? { stats: { level, leadership, attack, defense, initiative, speed, health, damage } }
      : {}),
  }
}

/** The whole roster, including units that have no picture yet. */
export const MONSTERS: readonly Monster[] = ROSTER.map(build)

/**
 * Who is shown on the selection screen: only units that have a picture.
 * Ordered from the easiest tasks to the hardest, so the ladder reads at a
 * glance — which is also, now, from the longest battle to the shortest.
 */
export function availableMonsters(): readonly Monster[] {
  return MONSTERS.filter((monster) => monster.image !== undefined).sort(
    (a, b) => Math.max(...a.levels) - Math.max(...b.levels) || a.hearts - b.hearts,
  )
}

export function monsterById(id: string): Monster {
  const monster = MONSTERS.find((candidate) => candidate.id === id)
  if (!monster) throw new RangeError(`No such monster: ${id}`)
  return monster
}
