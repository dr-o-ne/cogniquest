import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/core/exercises'
import { ArithmeticAnswer, levelsFor, taskChoices, type TaskKind } from '@/core/math'
import { createRandom } from '@/core/random'
import type { AnswerResult } from '@/core/session'
import { t } from '@/locale'
import { Battle, MAX_SQUAD } from './Battle'
import {
  ASKS,
  availableMonsters,
  HEARTS_MAX,
  HEARTS_MIN,
  MONSTERS,
  monsterById,
  PLAYER_HEARTS,
  type Monster,
} from './monsters'

const exercise: Exercise = {
  id: 'math:2+3',
  subject: 'math',
  level: 1,
  prompt: { kind: 'arithmetic', terms: [2, 3], ops: ['+'] },
  answer: new ArithmeticAnswer(5, 10),
}

function answer(verdict: AnswerResult['verdict']): AnswerResult {
  return { exercise, verdict, elapsedMs: 1000, streak: 0, attemptNumber: 1 }
}

function feed(battle: Battle, verdict: AnswerResult['verdict'], times: number) {
  for (let i = 0; i < times; i++) battle.onAnswerAccepted(answer(verdict))
}

function unit(id: string, hearts: number, tasks: readonly TaskKind[] = ['addition']): Monster {
  return { id, tasks, name: id, level: 1, hearts, levels: [1], color: '#000' }
}

const dummy = unit('test', 3)

/** Hearts left, opponent by opponent — the shape most of these assertions want. */
const hearts = (battle: Battle) => battle.state.foes.map((foe) => foe.hearts)

describe('Battle', () => {
  it('a correct answer takes a heart off the monster', () => {
    const battle = new Battle([dummy], { playerHearts: 5 })
    battle.onAnswerAccepted(answer('correct'))

    expect(hearts(battle)).toEqual([2])
    expect(battle.state.playerHearts).toBe(5)
    expect(battle.state.lastHit).toBe('monster')
    expect(battle.state.hitFoe).toBe(0)
  })

  it('a mistake takes a heart off the child', () => {
    const battle = new Battle([dummy], { playerHearts: 5 })
    battle.onAnswerAccepted(answer('wrong'))

    expect(battle.state.playerHearts).toBe(4)
    expect(hearts(battle)).toEqual([3])
    expect(battle.state.lastHit).toBe('player')
    expect(battle.state.hitFoe).toBeNull()
  })

  it('C5: a miss costs not a single heart', () => {
    const battle = new Battle([dummy], { playerHearts: 5 })
    feed(battle, 'unrecognised', 10)

    expect(battle.state.playerHearts).toBe(5)
    expect(hearts(battle)).toEqual([3])
    expect(battle.state.lastHit).toBeNull()
    expect(battle.finished).toBe(false)
  })

  it('the monster runs out of hearts — the child wins', () => {
    const battle = new Battle([dummy], { playerHearts: 5 })
    feed(battle, 'correct', 3)

    expect(battle.finished).toBe(true)
    expect(battle.state.winner).toBe('player')
    expect(hearts(battle)).toEqual([0])
  })

  it('the child runs out of hearts — the monster wins', () => {
    const battle = new Battle([dummy], { playerHearts: 2 })
    feed(battle, 'wrong', 2)

    expect(battle.finished).toBe(true)
    expect(battle.state.winner).toBe('monster')
  })

  it('answers change nothing once the battle is over', () => {
    const battle = new Battle([dummy], { playerHearts: 5 })
    feed(battle, 'correct', 3)
    feed(battle, 'wrong', 10)

    expect(battle.state.winner).toBe('player')
    expect(battle.state.playerHearts).toBe(5)
  })

  it('hearts never go negative', () => {
    const battle = new Battle([dummy], { playerHearts: 1 })
    feed(battle, 'wrong', 5)
    expect(battle.state.playerHearts).toBe(0)
  })

  it('a battle without hearts makes no sense', () => {
    expect(() => new Battle([dummy], { playerHearts: 0 })).toThrow(RangeError)
    expect(() => new Battle([{ ...dummy, hearts: 0 }])).toThrow(RangeError)
  })

  it('a battle needs somebody to fight, and not more than five', () => {
    const five = Array.from({ length: MAX_SQUAD }, (_, i) => unit(`u${i}`, 2))

    expect(() => new Battle([])).toThrow(RangeError)
    expect(() => new Battle([...five, dummy])).toThrow(RangeError)
    expect(new Battle(five).state.foes).toHaveLength(MAX_SQUAD)
  })
})

/**
 * A squad, one to five strong, and the two ways it takes turns.
 *
 * Both modes are the same battle with a different answer to one question —
 * «who asks next» — so every assertion below is really about `nextAsker`, and
 * about the heart landing on whoever it named rather than on the front of the
 * list.
 */
describe('a squad', () => {
  const squad = () => [unit('first', 2), unit('second', 3), unit('third', 1)]

  /** Beat whoever is asking, drawing a fresh asker between blows. */
  function beat(battle: Battle, times: number) {
    for (let i = 0; i < times; i++) {
      battle.nextAsker()
      battle.onAnswerAccepted(answer('correct'))
    }
  }

  describe('in order — a gauntlet of runs, one opponent at a time (G8)', () => {
    it('the front one holds the arena until it is beaten', () => {
      const battle = new Battle(squad())

      expect(battle.nextAsker().id).toBe('first')
      battle.onAnswerAccepted(answer('correct'))
      expect(battle.nextAsker().id).toBe('first')
      battle.onAnswerAccepted(answer('correct'))

      // Out of hearts, so the next one steps up — and only now.
      expect(hearts(battle)).toEqual([0, 3, 1])
      expect(battle.nextAsker().id).toBe('second')
    })

    it('a mistake costs the child a heart and nobody their turn', () => {
      const battle = new Battle(squad())
      battle.nextAsker()
      battle.onAnswerAccepted(answer('wrong'))

      expect(battle.state.playerHearts).toBe(PLAYER_HEARTS - 1)
      expect(hearts(battle)).toEqual([2, 3, 1])
      expect(battle.nextAsker().id).toBe('first')
    })

    it('works through the squad in the order it was picked', () => {
      const battle = new Battle(squad())
      beat(battle, 2 + 3)

      expect(hearts(battle)).toEqual([0, 0, 1])
      expect(battle.nextAsker().id).toBe('third')
    })
  })

  describe('shuffled — whichever survivor is drawn', () => {
    it('the heart comes off whoever asked, not off the front', () => {
      // 0.99 lands on the last of the survivors.
      const battle = new Battle(squad(), { shuffle: true, random: () => 0.99 })

      expect(battle.nextAsker().id).toBe('third')
      battle.onAnswerAccepted(answer('correct'))

      expect(hearts(battle)).toEqual([2, 3, 0])
      expect(battle.state.hitFoe).toBe(2)
    })

    it('a beaten opponent is never asked again', () => {
      const battle = new Battle(squad(), { shuffle: true, random: () => 0.99 })
      // The third one has a single heart, so one blow takes it out of the draw.
      beat(battle, 1)

      expect(battle.nextAsker().id).toBe('second')
      beat(battle, 3)
      expect(battle.nextAsker().id).toBe('first')
    })

    it('the draw actually moves around the squad', () => {
      // Every opponent deep enough that no draw can empty it, so anyone still
      // being asked is the draw moving rather than the survivors thinning out.
      const battle = new Battle([unit('a', 30), unit('b', 30), unit('c', 30)], {
        shuffle: true,
        random: createRandom(7),
      })

      const asked = new Set(Array.from({ length: 30 }, () => battle.nextAsker().id))
      expect(asked).toEqual(new Set(['a', 'b', 'c']))
    })
  })

  it('the child wins only once every last one of them is beaten', () => {
    const battle = new Battle(squad())
    beat(battle, 2 + 3)

    expect(battle.finished).toBe(false)
    expect(battle.state.winner).toBeNull()

    beat(battle, 1)
    expect(battle.state.winner).toBe('player')
    expect(hearts(battle)).toEqual([0, 0, 0])
  })

  it('the squad wins with whoever is left standing', () => {
    const battle = new Battle(squad(), { playerHearts: 2 })
    battle.nextAsker()
    feed(battle, 'wrong', 2)

    expect(battle.state.winner).toBe('monster')
    // Nobody lost a heart to a wrong answer, so the whole squad is still there.
    expect(hearts(battle)).toEqual([2, 3, 1])
    expect(battle.asker.id).toBe('first')
  })

  it('the same opponent may stand in the squad twice, with hearts of its own', () => {
    const battle = new Battle([unit('twin', 2), unit('twin', 2)])
    beat(battle, 2)

    expect(hearts(battle)).toEqual([0, 2])
    expect(battle.state.winner).toBeNull()
  })

  it('nobody left to ask — the pick stands, and the extra task goes nowhere', () => {
    // The session draws one more task after the last heart goes, and that task
    // is never put to the child. It still has to come from somebody.
    const battle = new Battle([unit('only', 1)])
    beat(battle, 1)

    expect(battle.state.winner).toBe('player')
    expect(battle.nextAsker().id).toBe('only')
  })
})

describe('the monster config', () => {
  it('every id is unique', () => {
    const ids = MONSTERS.map((monster) => monster.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every unit has hearts and at least one task level', () => {
    for (const monster of MONSTERS) {
      expect(monster.hearts).toBeGreaterThanOrEqual(1)
      expect(monster.levels.length).toBeGreaterThan(0)
      for (const level of monster.levels) {
        expect(level).toBeGreaterThanOrEqual(1)
        expect(level).toBeLessThanOrEqual(5)
      }
    }
  })

  it('every roster id has a name in the text pack', () => {
    for (const monster of MONSTERS) {
      expect(t.monsters[monster.id], `no name for ${monster.id}`).toBeDefined()
      expect(monster.name).not.toBe(monster.id)
    }
  })

  it('a unit carries its level, and it agrees with its top rung', () => {
    // BY_LEVEL is cut so that a unit's top rung is its level, and plenty of
    // code reads the band that way. The card now prints the level for the
    // child, so the two must not drift apart quietly: give level 3 the rungs
    // [2, 3, 4] and every card in the band would relabel itself.
    for (const monster of MONSTERS) {
      expect(Math.max(...monster.levels), `${monster.id} is labelled off its rungs`).toBe(
        monster.level,
      )
    }
  })

  it('every level the roster uses has a strength in the text pack', () => {
    // The card falls back to a bare number for a level with no wording, which
    // keeps a new rung visible rather than blank — but no unit may need it.
    for (const level of new Set(MONSTERS.map((monster) => monster.level))) {
      expect(t.strength[level], `no strength for level ${level}`).toBeDefined()
      expect(t.strength[level]!.length).toBeGreaterThan(0)
    }
  })

  it('the strength ramp runs the whole ladder, one wording per rung', () => {
    const levels = Object.keys(t.strength).map(Number).sort((a, b) => a - b)
    expect(levels).toEqual([1, 2, 3, 4, 5])

    // Two rungs sharing a word would make the ramp say less than it looks like
    // it says — and the word is now the whole of the label.
    const names = levels.map((level) => t.strength[level]!)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every unit has a question it can actually be asked', () => {
    // Not just a non-empty pool of kinds: the kinds and the levels can miss
    // each other entirely. An opponent at level 1 that asks only chains has
    // nothing legal to draw, and would throw on its first question of a real
    // battle rather than here.
    for (const monster of MONSTERS) {
      const choices = taskChoices(monster.tasks, monster.levels)
      expect(choices.length, `nothing to ask for ${monster.id}`).toBeGreaterThan(0)
    }
  })

  it('the stronger the unit, the harder the tasks — and the shorter the battle', () => {
    const peasant = monsterById('peasant')
    const dragon = monsterById('black-dragon')

    expect(Math.max(...dragon.levels)).toBeGreaterThan(Math.max(...peasant.levels))
    // The other way round the hardest opponent would also be the longest.
    expect(dragon.hearts).toBeLessThan(peasant.hearts)
  })

  describe('only units with a picture are shown', () => {
    it('everyone on the game list has a picture', () => {
      for (const monster of availableMonsters()) {
        expect(monster.image).toBeDefined()
      }
    })

    it('picture-less units are in the roster but never in the game', () => {
      const shown = new Set(availableMonsters().map((monster) => monster.id))
      expect(MONSTERS.length).toBeGreaterThan(shown.size)
      expect(shown.has('bone-dragon')).toBe(false)
    })

    it('ordered from easy to hard', () => {
      const shown = availableMonsters()
      for (let i = 1; i < shown.length; i++) {
        expect(Math.max(...shown[i]!.levels)).toBeGreaterThanOrEqual(Math.max(...shown[i - 1]!.levels))
      }
    })
  })

  /**
   * G8: a row comes back on a share of the roster, and the share is taken
   * inside each level band rather than between them.
   *
   * This is the half of the decision the table cannot hold on its own. Adding
   * an opponent is one id in one pile, and nothing about it says whether that
   * pile was already the fullest — so a band can tilt, or leave a row out
   * altogether, without anybody meaning it to. Then «subtraction» starts to
   * mean «the hard ones», which is the one thing G8 says it must not mean.
   *
   * Measured off the built monsters rather than off ASKS, so the dealing in
   * `build` is under test too, and not only the table it reads.
   */
  describe('the rows are shared out evenly, band by band', () => {
    /** Shown opponents grouped by the rung they top out at. */
    const bands = () => {
      const byLevel = new Map<number, Monster[]>()
      for (const monster of availableMonsters()) {
        const top = Math.max(...monster.levels)
        byLevel.set(top, [...(byLevel.get(top) ?? []), monster])
      }
      return byLevel
    }

    const asking = (units: readonly Monster[], kind: TaskKind) =>
      units.filter((monster) => monster.tasks.includes(kind))

    it('every row is on the selection screen at all', () => {
      const shown = availableMonsters()
      for (const kind of Object.keys(ASKS[1]!) as TaskKind[]) {
        expect(asking(shown, kind).length, `nobody asks ${kind}`).toBeGreaterThan(0)
      }
    })

    it('no pile in a band runs more than one ahead of another', () => {
      // Even, exactly: with a band of seven and three rows the piles are 3/2/2,
      // and 4/2/1 is the shape that turns a row into a difficulty. A band too
      // small to hold every row — level 5 is one opponent so far — reads as
      // «0 or 1 each» and passes, which is the most even it can be.
      //
      // A row with no rung in the band's levels (missing-number tops out at 3,
      // so bands 1 and 5 cannot ask it) is left an empty pile and sits out the
      // even check — it is not a row this band deals.
      for (const [band, piles] of Object.entries(ASKS)) {
        const units = bands().get(Number(band)) ?? []
        const bandLevels = units[0]?.levels ?? []
        const canAsk = (kind: TaskKind) =>
          levelsFor(kind).some((level) => bandLevels.includes(level))

        for (const kind of Object.keys(piles) as TaskKind[]) {
          if (!canAsk(kind)) {
            expect(piles[kind], `${kind} at level ${band} has no rung here`).toHaveLength(0)
          }
        }

        const dealt = (Object.keys(piles) as TaskKind[]).filter(canAsk)
        const counts = dealt.map((kind) => asking(units, kind).length)
        const total = counts.reduce((sum, count) => sum + count, 0)

        for (const [i, count] of counts.entries()) {
          const where = `${dealt[i]} at level ${band}`
          expect(count, where).toBeGreaterThanOrEqual(Math.floor(total / dealt.length))
          expect(count, where).toBeLessThanOrEqual(Math.ceil(total / dealt.length))
        }
      }
    })

    it('only a unit nobody can field resolves through the fallback', () => {
      // Every unit resolves to a row; the question is by which route. ASKS for
      // anyone the child can pick, UNDEALT_TASKS for the eighty-odd that have
      // no picture and never appear. An opponent taking the fallback is the
      // accident this suite exists for — and does not get this far, since
      // `build` throws for it and the file would not even load.
      const dealt = new Set(Object.values(ASKS).flatMap((piles) => Object.values(piles).flat()))
      for (const monster of MONSTERS) {
        expect(monster.tasks.length, `${monster.id} asks nothing`).toBeGreaterThan(0)
        if (dealt.has(monster.id)) continue
        expect(monster.image, `${monster.id} is fielded on the fallback`).toBeUndefined()
      }
    })

    it('the table and the roster agree on which band a unit is in', () => {
      // The band is written twice — as a key here, as a level in ROSTER — and
      // a pile under the wrong key would balance a band the child never plays.
      for (const [band, piles] of Object.entries(ASKS)) {
        for (const id of Object.values(piles).flat()) {
          expect(Math.max(...monsterById(id).levels), `${id} is not a level ${band} unit`).toBe(
            Number(band),
          )
        }
      }
    })
  })

  describe('hearts come from the level', () => {
    it('the table, rung by rung', () => {
      expect(monsterById('peasant').hearts).toBe(20) // unit level 1
      expect(monsterById('goblin').hearts).toBe(18) // 2
      expect(monsterById('gorgul').hearts).toBe(16) // 3
      expect(monsterById('paladin').hearts).toBe(12) // 4
      expect(monsterById('black-dragon').hearts).toBe(10) // 5
    })

    it('two units of a level get the same battle, whatever their health', () => {
      const zombie = monsterById('zombie')
      const goblin = monsterById('goblin')

      // The zombie used to outlast the goblin by four tasks for having more
      // King's Bounty health. Health is that game's balance, not a child's
      // practice — it is no longer carried, and both units are level 2, so
      // both get the same battle.
      expect(zombie.hearts).toBe(goblin.hearts)
    })

    it('the harder the tasks, the shorter the battle', () => {
      const shown = availableMonsters()
      for (let i = 1; i < shown.length; i++) {
        // The list runs easiest first, so hearts may only fall along it.
        expect(shown[i]!.hearts).toBeLessThanOrEqual(shown[i - 1]!.hearts)
      }
    })

    it('every battle stays inside the table', () => {
      // TUNING can still set hearts by hand; nothing may wander off the scale.
      for (const monster of MONSTERS) {
        expect(monster.hearts).toBeGreaterThanOrEqual(HEARTS_MIN)
        expect(monster.hearts).toBeLessThanOrEqual(HEARTS_MAX)
      }
    })

    it('a unit gets its battle from its level alone', () => {
      const fairy = monsterById('forest-fairy')

      expect(fairy.hearts).toBe(20)
    })
  })

  it('an unknown monster is an error', () => {
    expect(() => monsterById('dragon')).toThrow(RangeError)
  })
})
