import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/core/exercises'
import { ArithmeticAnswer, taskChoices } from '@/core/math'
import type { AnswerResult } from '@/core/session'
import { t } from '@/locale'
import { Battle } from './Battle'
import {
  availableMonsters,
  HEARTS_MAX,
  HEARTS_MIN,
  MONSTERS,
  monsterById,
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

const dummy: Monster = {
  id: 'test',
  tasks: ['addition'],
  name: 'Test',
  hearts: 3,
  levels: [1],
  color: '#000',
}

describe('Battle', () => {
  it('a correct answer takes a heart off the monster', () => {
    const battle = new Battle(dummy, 5)
    battle.onAnswerAccepted(answer('correct'))

    expect(battle.state.monsterHearts).toBe(2)
    expect(battle.state.playerHearts).toBe(5)
    expect(battle.state.lastHit).toBe('monster')
  })

  it('a mistake takes a heart off the child', () => {
    const battle = new Battle(dummy, 5)
    battle.onAnswerAccepted(answer('wrong'))

    expect(battle.state.playerHearts).toBe(4)
    expect(battle.state.monsterHearts).toBe(3)
    expect(battle.state.lastHit).toBe('player')
  })

  it('C5: a miss costs not a single heart', () => {
    const battle = new Battle(dummy, 5)
    feed(battle, 'unrecognised', 10)

    expect(battle.state.playerHearts).toBe(5)
    expect(battle.state.monsterHearts).toBe(3)
    expect(battle.state.lastHit).toBeNull()
    expect(battle.finished).toBe(false)
  })

  it('the monster runs out of hearts — the child wins', () => {
    const battle = new Battle(dummy, 5)
    feed(battle, 'correct', 3)

    expect(battle.finished).toBe(true)
    expect(battle.state.winner).toBe('player')
    expect(battle.state.monsterHearts).toBe(0)
  })

  it('the child runs out of hearts — the monster wins', () => {
    const battle = new Battle(dummy, 2)
    feed(battle, 'wrong', 2)

    expect(battle.finished).toBe(true)
    expect(battle.state.winner).toBe('monster')
  })

  it('answers change nothing once the battle is over', () => {
    const battle = new Battle(dummy, 5)
    feed(battle, 'correct', 3)
    feed(battle, 'wrong', 10)

    expect(battle.state.winner).toBe('player')
    expect(battle.state.playerHearts).toBe(5)
  })

  it('hearts never go negative', () => {
    const battle = new Battle(dummy, 1)
    feed(battle, 'wrong', 5)
    expect(battle.state.playerHearts).toBe(0)
  })

  it('a battle without hearts makes no sense', () => {
    expect(() => new Battle(dummy, 0)).toThrow(RangeError)
    expect(() => new Battle({ ...dummy, hearts: 0 })).toThrow(RangeError)
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

  it('stats were carried over without loss', () => {
    const dragon = monsterById('black-dragon')
    expect(dragon.stats).toEqual({
      level: 5,
      leadership: 2500,
      attack: 70,
      defense: 70,
      initiative: 6,
      speed: 8,
      health: 1000,
      damage: '110–130',
    })
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
      expect(shown.has('black-dragon')).toBe(false)
    })

    it('ordered from easy to hard', () => {
      const shown = availableMonsters()
      for (let i = 1; i < shown.length; i++) {
        expect(Math.max(...shown[i]!.levels)).toBeGreaterThanOrEqual(Math.max(...shown[i - 1]!.levels))
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
      // health. Health is King's Bounty balance, not a child's practice.
      expect(zombie.stats!.health).toBeGreaterThan(goblin.stats!.health)
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

    it('a unit with no stats still gets a battle from its level', () => {
      const fairy = monsterById('forest-fairy')

      expect(fairy.stats).toBeUndefined()
      expect(fairy.hearts).toBe(20)
    })
  })

  it('an unknown monster is an error', () => {
    expect(() => monsterById('dragon')).toThrow(RangeError)
  })
})
