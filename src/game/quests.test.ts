import { describe, expect, it } from 'vitest'
import { taskChoices } from '@/core/math'
import { t } from '@/locale'
import { availableMonsters } from './monsters'
import { questById, QUESTS } from './quests'

/**
 * The generated quest maps (**G10**).
 *
 * Most of what can go wrong with a path is arithmetic nobody would notice
 * while reading its JSON file: a demand nothing can answer, a band of one, the
 * boss in the middle. This is those rules, held against whatever `./quests/`
 * actually contains — see `quests/README.md` for the file format itself.
 */
describe('the quest maps', () => {
  it('there are some, and every id is unique', () => {
    expect(QUESTS.length).toBeGreaterThan(0)
    const ids = QUESTS.map((quest) => quest.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('a path ends on exactly one boss, and nowhere else', () => {
    for (const quest of QUESTS) {
      expect(quest.nodes.length, quest.id).toBeGreaterThan(1)

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
    // no picture, no appearance. `assembleSquad` and `monstersAsking` only
    // ever draw from monsters ASKS already fields, so this pins the rule
    // rather than being the reason it holds.
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
   * on its own: nothing about a list of demands says the walk gets harder, so a
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

  /**
   * The generator's own rule (**G10**): a demand asked twice in one file must
   * not put the same picture on the path twice in a row, or drilling one thing
   * on purpose — «addition 1, addition 1» — would look like a mistake in the
   * file rather than a repeat asked for. `first-path.json` asks `addition 1`
   * once as its own stop and once inside the band four stops later, and
   * `ASKS[1].addition` has two names to give — `gobot`, then `peasant`.
   */
  it('the same demand asked twice draws two different opponents', () => {
    const nodes = questById('first-path').nodes
    const first = nodes[0]!.opposition
    const band = nodes[4]!.opposition

    expect(first.kind).toBe('duel')
    expect(band.kind).toBe('squad')
    if (first.kind !== 'duel' || band.kind !== 'squad') return

    const fromBand = band.squad.monsters.find((monster) => monster.tasks.includes('addition'))
    expect(fromBand, 'no addition member in the band').toBeDefined()
    expect(fromBand!.id).not.toBe(first.monster.id)
  })

  it('an unknown quest is an error', () => {
    expect(() => questById('the-long-way-round')).toThrow(RangeError)
  })
})
