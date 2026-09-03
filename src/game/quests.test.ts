import { describe, expect, it } from 'vitest'
import { taskChoices } from '@/core/math'
import { t } from '@/locale'
import { availableMonsters } from './monsters'
import { questById, QUESTS } from './quests'

/**
 * The hand-made maps (**G10**).
 *
 * Most of what can go wrong with a path is arithmetic nobody would notice while
 * reading it: a stop too many, the boss in the middle, an opponent who never
 * appears on any screen. The generator that will write these later has to satisfy
 * the same rules, so they are worth pinning now, while there is one map to check
 * them against.
 */
describe('the quest maps', () => {
  it('there are some, and every id is unique', () => {
    expect(QUESTS.length).toBeGreaterThan(0)
    const ids = QUESTS.map((quest) => quest.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('a path is twelve stops and then the boss', () => {
    for (const quest of QUESTS) {
      expect(quest.nodes.length, quest.id).toBe(13)

      const bosses = quest.nodes.filter((node) => node.boss)
      expect(bosses.length, `${quest.id} has ${bosses.length} bosses`).toBe(1)
      expect(quest.nodes.at(-1)!.boss, `${quest.id} does not end on its boss`).toBe(true)
    }
  })

  it('the boss of a quest is the monster its last stop fields', () => {
    // `boss` is the face of the quest on the selection screen, and the last
    // node is what the child actually fights. They must not drift apart.
    for (const quest of QUESTS) {
      const last = quest.nodes.at(-1)!.opposition
      expect(last.kind, `${quest.id} ends on a squad`).toBe('duel')
      if (last.kind === 'duel') expect(last.monster).toBe(quest.boss)
    }
  })

  it('the first map is ten duels and two squads before the boss', () => {
    const walk = questById('first-path').nodes.filter((node) => !node.boss)

    expect(walk.filter((node) => node.opposition.kind === 'duel')).toHaveLength(10)
    expect(walk.filter((node) => node.opposition.kind === 'squad')).toHaveLength(2)
  })

  it('every opponent on a path is one the child could also meet on the arena', () => {
    // A path puts its opponents on the screen, so the roster's own rule holds:
    // no picture, no appearance. `build` throws for it; this pins the rule.
    const shown = new Set(availableMonsters().map((monster) => monster.id))

    for (const quest of QUESTS) {
      for (const node of quest.nodes) {
        const monsters =
          node.opposition.kind === 'duel'
            ? [node.opposition.monster]
            : node.opposition.squad.monsters

        for (const monster of monsters) {
          expect(shown.has(monster.id), `${quest.id} fields ${monster.id}, who is not shown`).toBe(
            true,
          )
        }
      }
    }
  })

  it('every stop has a question it can actually be asked', () => {
    for (const quest of QUESTS) {
      for (const node of quest.nodes) {
        const monsters =
          node.opposition.kind === 'duel'
            ? [node.opposition.monster]
            : node.opposition.squad.monsters

        for (const monster of monsters) {
          const choices = taskChoices(monster.tasks, monster.levels)
          expect(choices.length, `nothing to ask for ${monster.id} in ${quest.id}`).toBeGreaterThan(
            0,
          )
        }
      }
    }
  })

  it('every quest has a name in the text pack', () => {
    for (const quest of QUESTS) {
      expect(t.quests[quest.id], `no name for ${quest.id}`).toBeDefined()
      expect(quest.name).not.toBe(quest.id)
    }
  })

  /**
   * The first map is written to climb, and that is the half a table cannot hold
   * on its own: nothing about a list of ids says the walk gets harder, so a
   * re-shuffle could flatten it without anybody noticing.
   */
  it('the first map does not get easier as it goes', () => {
    const levels = questById('first-path').nodes.map((node) =>
      node.opposition.kind === 'duel' ? node.opposition.monster.level : node.opposition.squad.level,
    )

    for (let i = 1; i < levels.length; i++) {
      expect(levels[i], `stop ${i} is easier than the one before it`).toBeGreaterThanOrEqual(
        levels[i - 1]!,
      )
    }
  })

  it('the first map mixes the rows of the grid rather than drilling one', () => {
    const rows = new Set(
      questById('first-path').nodes.flatMap((node) =>
        node.opposition.kind === 'duel'
          ? node.opposition.monster.tasks
          : node.opposition.squad.monsters.flatMap((monster) => monster.tasks),
      ),
    )

    // A path is thirteen battles long. Settling into one row for that stretch is
    // exactly what «mixed, not blocked» exists to prevent.
    expect(rows.size).toBeGreaterThanOrEqual(4)
  })

  it('an unknown quest is an error', () => {
    expect(() => questById('the-long-way-round')).toThrow(RangeError)
  })
})
