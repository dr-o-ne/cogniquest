/**
 * THE JOURNEY — one campaign, generated rather than written out.
 *
 * The map is a single road from the first meadow to the castle gate: thirty-two
 * battles, one region to a screen, which is a couple of thousand questions and
 * a couple of weeks of play before the castle falls and a fresh campaign is
 * drawn.
 *
 * **Pockets are parked, not removed.** A pocket is a dead end beside the road —
 * optional, worth half again the gold — and the machinery for them is all here.
 * Every region asks for none at the moment, so the map is road and nothing else;
 * putting them back is a number in the table below, and «the map is all road»
 * in journey.test.ts is the test that says the state is meant rather than
 * accidental.
 *
 * Generated, and that is the point: fifty encounters written out by hand would
 * be a data file nobody maintains, and they would be the same fifty every time.
 * A seed gives a campaign that is stable for as long as it is being walked and
 * different the next time round.
 *
 * Two dials move along the road, and only ever forwards:
 *
 *   WITHIN a region the squad grows, one stack to five, so battles lengthen
 *   from twenty questions to a hundred.
 *   BETWEEN regions the maths steps up a rung and the squad drops back to one.
 *
 * That sawtooth is deliberate. Five peasants and one swordsman are neighbouring
 * steps rather than a cliff, and meeting a new rung in a short battle is kinder
 * than meeting it in a long one.
 *
 * Nothing here knows about the screen: positions come out as percentages of the
 * map, and drawing them is somebody else's problem.
 */
import { taskChoices, type TaskKind } from '@/core/math'
import { createRandom, pick, type Random } from '@/core/random'
import { t } from '@/locale'
import type { Encounter, Stack } from './encounter'
import { availableMonsters, type Monster } from './monsters'

/** The grid the medallions are packed into. A skeleton; it is never drawn. */
export const MAP_COLS = 4
export const MAP_ROWS = 8

/**
 * How many screens tall the map is: one per region, and the child scrolls.
 *
 * Everything vertical is measured off this rather than off MAP_ROWS. A region
 * gets a screen whether it owns one row of the grid or two — Хрюкино Поле is
 * six nodes with room to breathe, Гоблинские Огороды is twelve on the same
 * height. Packed by rows instead, a two-row region would be twice the climb of
 * a one-row one for no reason the child could see.
 */
export const MAP_SCREENS = 5

/**
 * Hearts on one stack, by the level it belongs to.
 *
 * These are the numbers that used to be the length of a whole battle — twenty
 * questions at level 1, down to ten at level 5 — and they are now the length of
 * one *kill*. A squad of five at level 1 is a hundred questions.
 *
 * Falling as the rungs rise, for the reason they always did: bonds within five
 * are quick and want repeating, two-digit carrying is slow and expensive to
 * hold. This table and MAX_STACKS are the two knobs for the length of a battle,
 * and nothing else touches it.
 */
const HEARTS_BY_LEVEL: Record<number, number> = { 1: 20, 2: 18, 3: 16, 4: 14, 5: 12 }

export function heartsPerStack(level: number): number {
  return HEARTS_BY_LEVEL[level] ?? 12
}

const MAX_STACKS = 5

/** The three stages of the assault, in stacks. */
const SIEGE_STACKS = [4, 5, 5] as const

/**
 * The approach to the castle, ahead of the siege.
 *
 * Spelled out rather than curved, so the run into the siege never steps down:
 * it leads straight into 4 5 5, and the squad grows to the last question of the
 * campaign.
 */
const CASTLE_SIZES = [3] as const

/** What a pocket pays over a road node of the same size. */
const POCKET_GOLD = 1.5

interface RegionSpec {
  /** The unit level the region is built on, and the key of its name. */
  readonly level: number
  /** Which grid rows it owns, counted from the top. */
  readonly rows: readonly number[]
  /** Road nodes. Must come to `rows.length * MAP_COLS` once pockets are added. */
  readonly spine: number
  /** Dead ends beside the road. Zero everywhere at the moment — see the header. */
  readonly pockets: number
  readonly siege: number
  /** Which math rungs (C1) its battles draw from. */
  readonly mathLevels: readonly number[]
  /** Which roster levels its units come from. */
  readonly units: readonly number[]
}

/**
 * The road from the bottom of the map to the top, listed the way the grid is
 * drawn — highest region first.
 *
 * The castle takes units from levels 4 *and* 5 because level 5 has no pictures
 * yet: public/monsters carries one, and it is commented out of IMAGES. When the
 * art lands this row narrows to [5] and nothing else moves, since the throne
 * room already prefers a level 5 unit whenever one exists.
 */
const REGIONS: readonly RegionSpec[] = [
  { level: 5, rows: [0], spine: 4, pockets: 0, siege: 3, mathLevels: [4, 5], units: [4, 5] },
  { level: 4, rows: [1, 2], spine: 8, pockets: 0, siege: 0, mathLevels: [3, 4], units: [4] },
  { level: 3, rows: [3, 4], spine: 8, pockets: 0, siege: 0, mathLevels: [2, 3], units: [3] },
  { level: 2, rows: [5, 6], spine: 8, pockets: 0, siege: 0, mathLevels: [1, 2], units: [2] },
  { level: 1, rows: [7], spine: 4, pockets: 0, siege: 0, mathLevels: [1], units: [1] },
]

export interface Cell {
  readonly row: number
  readonly col: number
}

/**
 * A row of cells as drawn: how far down the map its middle sits and how much
 * room each cell in it has. Percentages of the whole scrolling map.
 */
export interface CellBox {
  readonly y: number
  readonly width: number
  readonly height: number
}

/** A place on the map, in percent of its width and height. */
export interface Point {
  readonly x: number
  readonly y: number
}

export interface JourneyNode {
  readonly id: string
  readonly encounter: Encounter
  /** The region's level — its name, its colour and its rungs. */
  readonly region: number
  readonly regionName: string
  /** How far along the road, or null for a pocket standing beside it. */
  readonly step: number | null
  /** The step that has to be reached before this node can be entered. */
  readonly opensAt: number
  readonly cell: Cell
  /** Where the medallion sits: the cell's centre, nudged off it. */
  readonly at: Point
  /** The stage of the assault, for the three nodes that are one. */
  readonly siegeName: string | null
}

export interface Campaign {
  readonly seed: number
  readonly nodes: readonly JourneyNode[]
}

/**
 * Where a cell sits on the whole scrolling map, and how big it is.
 *
 * The horizontal half is plain: six columns, evenly. The vertical half is what
 * the scrolling is for — the map is MAP_SCREENS tall, each region owns exactly
 * one of those screens, and its rows divide that screen between them.
 */
export function cellBox(region: number, row: number): CellBox {
  const index = REGIONS.findIndex((spec) => spec.level === region)
  const spec = REGIONS[index]
  if (!spec) throw new RangeError(`No region ${region}`)

  const screen = 100 / MAP_SCREENS
  const height = screen / spec.rows.length
  const within = row - spec.rows[0]!

  return {
    y: index * screen + (within + 0.5) * height,
    width: 100 / MAP_COLS,
    height,
  }
}

/**
 * How big the squad is at position `index` of `count`.
 *
 * Rises fast and flattens against five, so most of a region is fought at three
 * or four stacks rather than crawling up one at a time. Never falls, which is
 * half of «the road only gets harder».
 */
export function squadSize(index: number, count: number): number {
  if (count <= 1) return 1
  const along = index / (count - 1)
  return Math.min(MAX_STACKS, Math.max(1, 1 + Math.round(4 * Math.pow(along, 0.7))))
}

/** A region's cells in the order the road walks them: a serpentine, bottom up. */
function cellsOf(spec: RegionSpec): Cell[] {
  const cells: Cell[] = []

  for (const row of [...spec.rows].reverse()) {
    // Counted from the bottom, so every turn lands the next region's first
    // cell directly above the one the road left off at.
    const leftToRight = (MAP_ROWS - 1 - row) % 2 === 0
    for (let i = 0; i < MAP_COLS; i++) {
      cells.push({ row, col: leftToRight ? i : MAP_COLS - 1 - i })
    }
  }

  return cells
}

/**
 * Where the pockets sit among a region's cells: spread evenly, never first.
 *
 * Evenly rather than at random, because a pocket is a choice and three of them
 * in a row is not three choices — it is one dull stretch.
 */
function pocketPositions(count: number, span: number): ReadonlySet<number> {
  const spots = new Set<number>()

  for (let i = 0; i < count; i++) {
    let spot = Math.round(((i + 0.5) * span) / count)
    while (spot < 1 || spots.has(spot)) spot++
    if (spot >= span) throw new RangeError(`No room for ${count} pockets in ${span} cells`)
    spots.add(spot)
  }

  return spots
}

/** Units of the right level asking the right row. Never empty — a test holds it. */
function poolFor(roster: readonly Monster[], spec: RegionSpec, row: TaskKind): readonly Monster[] {
  return roster.filter((unit) => spec.units.includes(unit.level) && unit.tasks.includes(row))
}

/**
 * Which rows a region can actually ask, read off its units rather than listed.
 *
 * Read off, because the roster is where a row lives: an opponent's `tasks` says
 * what it asks, and the split that hands rows out across the roster is **G8**'s
 * business, not the map's. Listing them here would mean a unit given a new row
 * in `monsters.ts` quietly vanishing from the journey — which is exactly what
 * happened to the goblin the day he was moved to comparing-numbers.
 *
 * Sorted, so the order the child meets rows in does not depend on the order the
 * roster happens to be written in. A row with no rung at this region's levels is
 * dropped: drawing one would throw in the middle of a battle.
 */
function rowsOf(roster: readonly Monster[], spec: RegionSpec): readonly TaskKind[] {
  const rows = new Set<TaskKind>()
  for (const unit of roster) {
    if (spec.units.includes(unit.level)) for (const row of unit.tasks) rows.add(row)
  }

  return [...rows].sort().filter((row) => taskChoices([row], spec.mathLevels).length > 0)
}

function squadOf(
  random: Random,
  pool: readonly Monster[],
  leader: Monster,
  stacks: number,
  hearts: number,
): Stack[] {
  return Array.from({ length: stacks }, (_, i) => ({
    monster: i === 0 ? leader : pick(random, pool),
    hearts,
  }))
}

export function generateCampaign(seed: number): Campaign {
  const random = createRandom(seed)
  const roster = availableMonsters()
  const nodes: JourneyNode[] = []

  let step = 0
  /**
   * Where the rows are up to. The road takes them turn about — never the same
   * row twice running, region boundaries included — so the child cannot settle
   * into one operation and stop reading the question.
   */
  let cursor = 0
  let previousRow: TaskKind | null = null

  // Bottom of the map first: that is the order the road is walked, and so the
  // order the squad sizes and the rows have to be worked out in.
  for (const spec of [...REGIONS].reverse()) {
    const cells = cellsOf(spec)
    // The siege is the tail of the region and takes no pockets: nothing should
    // hang off the road past the throne room.
    const span = cells.length - spec.siege
    const pocketAt = pocketPositions(spec.pockets, span)
    const regular = spec.spine - spec.siege
    const regionOpensAt = step
    const rows = rowsOf(roster, spec)
    if (rows.length === 0) throw new RangeError(`No unit asks anything at level ${spec.level}`)

    let order = 0
    let lastSize = 1

    cells.forEach((cell, index) => {
      const isPocket = pocketAt.has(index)
      const siegeIndex = !isPocket && spec.siege > 0 ? order - regular : -1
      const isSiege = siegeIndex >= 0

      const stacks = isPocket
        ? lastSize
        : isSiege
          ? SIEGE_STACKS[siegeIndex]!
          : spec.level === 5
            ? (CASTLE_SIZES[order] ?? MAX_STACKS)
            : squadSize(order, regular)

      if (!isPocket) lastSize = stacks

      // Turn about, and never twice running. A pocket takes the row the road
      // is not about to ask, so stepping aside is a change of subject too.
      let row = rows[cursor % rows.length]!
      if (row === previousRow && rows.length > 1) row = rows[++cursor % rows.length]!

      if (isPocket) {
        row = rows[(cursor + 1) % rows.length]!
      } else {
        cursor++
        previousRow = row
      }

      const pool = poolFor(roster, spec, row)
      if (pool.length === 0) throw new RangeError(`No ${row} units at level ${spec.level}`)

      // The throne room is fronted by a level 5 unit the moment one exists.
      const boss = pool.filter((unit) => unit.level === 5)
      const crowned = isSiege && siegeIndex === SIEGE_STACKS.length - 1 && boss.length > 0
      const leader = pick(random, crowned ? boss : pool)

      const id = `n${nodes.length}`
      const perStack = heartsPerStack(spec.level)
      const hearts = stacks * perStack

      const encounter: Encounter = {
        id,
        stacks: squadOf(random, pool, leader, stacks, perStack),
        levels: spec.mathLevels,
        tasks: [row],
        kind: isPocket ? 'pocket' : isSiege ? 'siege' : 'road',
        gold: Math.round(hearts * spec.level * (isPocket ? POCKET_GOLD : 1)),
      }

      // The grid keeps medallions from colliding; the nudge keeps the road from
      // looking like a table. Measured as a share of the cell rather than of
      // the map, so a one-row region — a whole screen for six nodes — gets a
      // trail that really wanders, while a two-row one stays tidy. A quarter of
      // the cell is the ceiling either way: past it the guarantee the grid was
      // there for is gone.
      const box = cellBox(spec.level, cell.row)
      const edge = cell.row === 0 || cell.row === MAP_ROWS - 1
      const spread = box.width * (isPocket ? 0.5 : 0.45)
      const rise = box.height * (isPocket ? 0.5 : 0.3) * (edge ? 0.6 : 1)

      nodes.push({
        id,
        encounter,
        region: spec.level,
        regionName: t.map.regions[spec.level] ?? String(spec.level),
        step: isPocket ? null : step,
        opensAt: isPocket ? regionOpensAt : step,
        cell,
        at: {
          x: (cell.col + 0.5) * box.width + (random() - 0.5) * spread,
          y: box.y + (random() - 0.5) * rise,
        },
        siegeName: isSiege ? (t.map.siege[siegeIndex] ?? null) : null,
      })

      if (!isPocket) {
        order++
        step++
      }
    })
  }

  return { seed, nodes }
}

/** The road itself, in the order it is walked. */
export function road(campaign: Campaign): readonly JourneyNode[] {
  return campaign.nodes.filter((node) => node.step !== null).sort((a, b) => a.step! - b.step!)
}

/** The pockets beside it. */
export function pocketsOf(campaign: Campaign): readonly JourneyNode[] {
  return campaign.nodes.filter((node) => node.step === null)
}

/**
 * How far along the road the child has got: the first step not yet taken.
 *
 * Read off what has been cleared rather than stored, so a node beaten twice —
 * or beaten out of order by an older save — cannot put the token somewhere the
 * road does not go.
 */
export function currentStep(campaign: Campaign, cleared: ReadonlySet<string>): number {
  const steps = road(campaign)
  let reached = 0
  while (reached < steps.length && cleared.has(steps[reached]!.id)) reached++
  return reached
}

/** Whether the child may enter this node yet. */
export function isOpen(node: JourneyNode, current: number): boolean {
  return node.opensAt <= current
}

/** Whether the castle has fallen and a fresh campaign is owed. */
export function isFinished(campaign: Campaign, cleared: ReadonlySet<string>): boolean {
  return currentStep(campaign, cleared) >= road(campaign).length
}

/** Every question the campaign holds, split the way the child meets them. */
export function totalTasks(campaign: Campaign): { road: number; pockets: number } {
  const tasks = (nodes: readonly JourneyNode[]) =>
    nodes.reduce(
      (sum, node) => sum + node.encounter.stacks.reduce((hearts, s) => hearts + s.hearts, 0),
      0,
    )

  return { road: tasks(road(campaign)), pockets: tasks(pocketsOf(campaign)) }
}

/** Every coin the campaign holds, pockets included. */
export function totalGold(campaign: Campaign): number {
  return campaign.nodes.reduce((sum, node) => sum + node.encounter.gold, 0)
}

/** The regions, top of the map first — for drawing the bands. */
export function regions(): readonly RegionSpec[] {
  return REGIONS
}
