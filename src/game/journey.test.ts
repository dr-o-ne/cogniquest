import { describe, expect, it } from 'vitest'
import { taskChoices } from '@/core/math'
import {
  cellBox,
  currentStep,
  generateCampaign,
  isFinished,
  isOpen,
  MAP_COLS,
  MAP_ROWS,
  MAP_SCREENS,
  pocketsOf,
  road,
  squadSize,
  totalGold,
  totalTasks,
  type Campaign,
  type JourneyNode,
} from './journey'
import { availableMonsters } from './monsters'

const campaign = generateCampaign(20260901)
const steps = road(campaign)
const pockets = pocketsOf(campaign)

const stacksOf = (node: JourneyNode) => node.encounter.stacks.length
const cleared = (upTo: number) => new Set(steps.slice(0, upTo).map((node) => node.id))

describe('the campaign is the right size', () => {
  it('fills the grid exactly once', () => {
    expect(campaign.nodes).toHaveLength(MAP_COLS * MAP_ROWS)
    expect(steps).toHaveLength(32)
  })

  /**
   * Pockets are parked, not removed: the machinery is still in journey.ts and
   * every region asks for none. This test is what makes that a decision rather
   * than a number somebody knocked out by accident — put pockets back and it
   * fails, which is the moment to think about whether they are wanted.
   */
  it('is all road at the moment, with no pockets beside it', () => {
    expect(pockets).toHaveLength(0)
    expect(campaign.nodes.every((node) => node.encounter.kind !== 'pocket')).toBe(true)
  })

  it('gives every node a cell of its own', () => {
    const taken = campaign.nodes.map((node) => `${node.cell.row}:${node.cell.col}`)
    expect(new Set(taken).size).toBe(taken.length)

    for (const node of campaign.nodes) {
      expect(node.cell.row).toBeGreaterThanOrEqual(0)
      expect(node.cell.row).toBeLessThan(MAP_ROWS)
      expect(node.cell.col).toBeGreaterThanOrEqual(0)
      expect(node.cell.col).toBeLessThan(MAP_COLS)
    }
  })

  /**
   * The nudge off the cell centre is what turns a serpentine into a trail, and
   * the grid is what promises the medallions will not collide. The promise only
   * holds while a node stays inside its own cell, so that is the bound — not
   * the prettiness of the curve.
   */
  it('never nudges a node out of its own cell', () => {
    for (const node of campaign.nodes) {
      const box = cellBox(node.region, node.cell.row)
      const dx = Math.abs(node.at.x - (node.cell.col + 0.5) * box.width)
      const dy = Math.abs(node.at.y - box.y)

      expect(dx, node.id).toBeLessThan(box.width * 0.45)
      expect(dy, node.id).toBeLessThan(box.height * 0.45)
    }
  })

  /**
   * One region, one screen — whether it owns one row of the grid or two. The
   * child scrolls from region to region, so a region is a place rather than a
   * stripe, and Хрюкино Поле is not half the climb of the Огороды for owning
   * half the rows.
   */
  it('gives every region a screen of its own', () => {
    const screen = 100 / MAP_SCREENS

    for (const node of campaign.nodes) {
      const index = [5, 4, 3, 2, 1].indexOf(node.region)
      expect(node.at.y, node.id).toBeGreaterThanOrEqual(index * screen)
      expect(node.at.y, node.id).toBeLessThanOrEqual((index + 1) * screen)
    }
  })

  /**
   * The volume, as a test. A window rather than a number, because both knobs —
   * the heart ladder and MAX_STACKS — are meant to be turned once the child has
   * played a while. The window is wide enough for tuning and narrow enough that
   * a mistake in the region table cannot halve the campaign unnoticed.
   *
   * Twice what was first asked for, and deliberately: the map was halved and
   * the hearts put back to 20-18-16-14-12, so there are fewer, longer battles.
   */
  it('holds a couple of thousand questions', () => {
    const { road: onTheRoad, pockets: aside } = totalTasks(campaign)

    expect(onTheRoad).toBeGreaterThanOrEqual(1500)
    expect(onTheRoad).toBeLessThanOrEqual(2000)
    expect(aside).toBe(0)
  })

  /**
   * The longest battle in the campaign, stated so it cannot grow by accident.
   * A hundred questions is twenty-five minutes with no way to stop and keep the
   * win, which is the one number in here worth watching on a real child.
   */
  it('never sets a battle longer than a hundred questions', () => {
    const longest = Math.max(
      ...campaign.nodes.map((node) =>
        node.encounter.stacks.reduce((sum, stack) => sum + stack.hearts, 0),
      ),
    )

    expect(longest).toBe(100)
  })

  it('pays by the work, and would pay a pocket half again', () => {
    expect(totalGold(campaign)).toBeGreaterThan(4000)

    // Stepping off the road is worth something, or there is no reason to do it.
    for (const node of campaign.nodes) {
      const hearts = node.encounter.stacks.reduce((sum, stack) => sum + stack.hearts, 0)
      const flat = hearts * node.region
      const expected = node.encounter.kind === 'pocket' ? Math.round(flat * 1.5) : flat

      expect(node.encounter.gold, node.id).toBe(expected)
    }
  })
})

describe('the road only gets harder', () => {
  it('never drops a rung', () => {
    for (let i = 1; i < steps.length; i++) {
      const before = Math.max(...steps[i - 1]!.encounter.levels)
      const now = Math.max(...steps[i]!.encounter.levels)
      expect(now, `step ${i}`).toBeGreaterThanOrEqual(before)
    }
  })

  it('grows the squad inside a region, and only shrinks it where the rung rises', () => {
    for (let i = 1; i < steps.length; i++) {
      const before = steps[i - 1]!
      const now = steps[i]!

      if (now.region === before.region) {
        expect(stacksOf(now), `step ${i} of region ${now.region}`).toBeGreaterThanOrEqual(
          stacksOf(before),
        )
      } else {
        // The one place the squad may fall back: a new region trades size for
        // a harder rung, so five peasants give way to one swordsman.
        expect(now.region).toBeGreaterThan(before.region)
      }
    }
  })

  it('starts small and ends with a full squad', () => {
    expect(stacksOf(steps[0]!)).toBe(1)
    expect(stacksOf(steps.at(-1)!)).toBe(5)
  })

  it('the curve itself never falls', () => {
    for (let i = 1; i < 15; i++) {
      expect(squadSize(i, 15)).toBeGreaterThanOrEqual(squadSize(i - 1, 15))
    }
    expect(squadSize(0, 15)).toBe(1)
    expect(squadSize(14, 15)).toBe(5)
    expect(squadSize(0, 1)).toBe(1)
  })
})

describe('there is one way to the castle', () => {
  it('numbers the road without a gap or a fork', () => {
    steps.forEach((node, i) => expect(node.step).toBe(i))
    expect(new Set(steps.map((node) => node.step)).size).toBe(steps.length)
  })

  it('opens the road one node at a time', () => {
    const nothing = currentStep(campaign, new Set())
    expect(nothing).toBe(0)
    expect(isOpen(steps[0]!, nothing)).toBe(true)
    expect(isOpen(steps[1]!, nothing)).toBe(false)

    const three = currentStep(campaign, cleared(3))
    expect(three).toBe(3)
    expect(isOpen(steps[3]!, three)).toBe(true)
    expect(isOpen(steps[4]!, three)).toBe(false)
  })

  it('a node beaten out of order does not move the token', () => {
    // An older save can hold anything. What counts is the unbroken run.
    const skipped = new Set([steps[0]!.id, steps[7]!.id])
    expect(currentStep(campaign, skipped)).toBe(1)
  })

  it('has nothing on it but the road, so every node is a step', () => {
    for (const node of campaign.nodes) {
      expect(node.step, node.id).not.toBeNull()
      expect(node.opensAt).toBe(node.step)
    }
  })

  it('reaches the castle by walking the road and nothing else', () => {
    const roadOnly = new Set(steps.map((node) => node.id))
    expect(isFinished(campaign, roadOnly)).toBe(true)
  })

  it('ends with the three stages of the assault and nothing after them', () => {
    const siege = steps.slice(-3)
    expect(siege.map((node) => node.encounter.kind)).toEqual(['siege', 'siege', 'siege'])
    expect(siege.map((node) => node.siegeName)).toEqual(['Стена', 'Ворота', 'Тронный зал'])
    expect(siege.every((node) => node.region === 5)).toBe(true)

    // Losing the throne room should cost the throne room, not the whole castle.
    expect(siege.map(stacksOf)).toEqual([4, 5, 5])
  })
})

describe('what each battle asks', () => {
  it('alternates the row along the road, region boundaries included', () => {
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.encounter.tasks, `step ${i}`).not.toEqual(steps[i - 1]!.encounter.tasks)
    }
  })

  it('asks one row per battle, so a battle stays a run of one row (G8)', () => {
    for (const node of campaign.nodes) {
      expect(node.encounter.tasks).toHaveLength(1)
    }
  })

  it('never draws a kind at a level it has no rung on', () => {
    for (const node of campaign.nodes) {
      const choices = taskChoices(node.encounter.tasks, node.encounter.levels)
      expect(choices.length, node.id).toBeGreaterThan(0)
    }
  })

  it('fields only units the game can actually draw', () => {
    const shown = new Set(availableMonsters().map((unit) => unit.id))

    for (const node of campaign.nodes) {
      expect(node.encounter.stacks.length).toBeGreaterThanOrEqual(1)
      expect(node.encounter.stacks.length).toBeLessThanOrEqual(5)

      for (const stack of node.encounter.stacks) {
        expect(shown.has(stack.monster.id), stack.monster.id).toBe(true)
        expect(stack.monster.image).toBeDefined()
      }
    }
  })

  it('fields units of the region it belongs to', () => {
    for (const node of campaign.nodes) {
      for (const stack of node.encounter.stacks) {
        // The castle borrows from level 4 until level 5 has pictures.
        const allowed = node.region === 5 ? [4, 5] : [node.region]
        expect(allowed, `${node.id}: ${stack.monster.id}`).toContain(stack.monster.level)
      }
    }
  })
})

describe('a campaign is a seed', () => {
  const same = generateCampaign(20260901)
  const other = generateCampaign(7)

  const shape = (one: Campaign) =>
    one.nodes.map((node) => `${node.id}:${node.encounter.stacks.map((s) => s.monster.id).join(',')}`)

  it('the same seed gives the same campaign', () => {
    expect(shape(same)).toEqual(shape(campaign))
    expect(same.nodes.map((node) => node.at)).toEqual(campaign.nodes.map((node) => node.at))
  })

  it('another seed gives another campaign', () => {
    expect(shape(other)).not.toEqual(shape(campaign))
  })

  it('but every campaign is the same size, whatever the seed', () => {
    for (const seed of [1, 42, 999, 20260901]) {
      const drawn = generateCampaign(seed)
      const { road: onTheRoad } = totalTasks(drawn)

      expect(road(drawn)).toHaveLength(32)
      expect(onTheRoad).toBeGreaterThanOrEqual(1500)
      expect(onTheRoad).toBeLessThanOrEqual(2000)
    }
  })
})
