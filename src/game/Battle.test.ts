import { describe, expect, it } from 'vitest'
import type { Exercise } from '@/core/exercises'
import { ArithmeticAnswer, taskChoices, type TaskKind } from '@/core/math'
import type { AnswerResult } from '@/core/session'
import { t } from '@/locale'
import { Battle } from './Battle'
import { playerHeartsFor, type Encounter } from './encounter'
import { heartsPerStack } from './journey'
import { availableMonsters, MONSTERS, monsterById, type Monster } from './monsters'

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
  level: 1,
  levels: [1],
  color: '#000',
}

/** A squad of `hearts.length` stacks, each holding the hearts given. */
function squad(...hearts: number[]): Encounter {
  return {
    id: 'squad',
    stacks: hearts.map((count) => ({ monster: dummy, hearts: count })),
    levels: [1],
    tasks: ['addition'],
    kind: 'road',
    gold: 0,
  }
}

const solo = squad(3)

describe('Battle', () => {
  it('a correct answer takes a heart off the stack in front', () => {
    const battle = new Battle(solo, 5)
    battle.onAnswerAccepted(answer('correct'))

    expect(battle.state.stacks[0]!.hearts).toBe(2)
    expect(battle.state.playerHearts).toBe(5)
    expect(battle.state.lastHit).toBe('monster')
  })

  it('a mistake takes a heart off the child', () => {
    const battle = new Battle(solo, 5)
    battle.onAnswerAccepted(answer('wrong'))

    expect(battle.state.playerHearts).toBe(4)
    expect(battle.state.stacks[0]!.hearts).toBe(3)
    expect(battle.state.lastHit).toBe('player')
  })

  it('C5: a miss costs not a single heart', () => {
    const battle = new Battle(solo, 5)
    feed(battle, 'unrecognised', 10)

    expect(battle.state.playerHearts).toBe(5)
    expect(battle.state.stacks[0]!.hearts).toBe(3)
    expect(battle.state.lastHit).toBeNull()
    expect(battle.finished).toBe(false)
  })

  it('the last stack falls — the child wins', () => {
    const battle = new Battle(solo, 5)
    feed(battle, 'correct', 3)

    expect(battle.finished).toBe(true)
    expect(battle.state.winner).toBe('player')
    expect(battle.state.stacks[0]!.hearts).toBe(0)
  })

  it('the child runs out of hearts — the monster wins', () => {
    const battle = new Battle(solo, 2)
    feed(battle, 'wrong', 2)

    expect(battle.finished).toBe(true)
    expect(battle.state.winner).toBe('monster')
  })

  it('answers change nothing once the battle is over', () => {
    const battle = new Battle(solo, 5)
    feed(battle, 'correct', 3)
    feed(battle, 'wrong', 10)

    expect(battle.state.winner).toBe('player')
    expect(battle.state.playerHearts).toBe(5)
  })

  it('hearts never go negative', () => {
    const battle = new Battle(solo, 1)
    feed(battle, 'wrong', 5)
    expect(battle.state.playerHearts).toBe(0)
  })

  it('a battle without hearts makes no sense', () => {
    expect(() => new Battle(solo, 0)).toThrow(RangeError)
    expect(() => new Battle(squad(0))).toThrow(RangeError)
    expect(() => new Battle(squad())).toThrow(RangeError)
  })
})

/**
 * A squad is the length dial (G7 as amended): the level says how hard the
 * questions are, the number of stacks says how long the battle runs. Which is
 * also why a stack falling matters — it is a win every few tasks instead of
 * one at the end.
 */
describe('a battle against a squad', () => {
  it('stacks fall front to back, one at a time', () => {
    const battle = new Battle(squad(2, 2, 2), 5)

    feed(battle, 'correct', 2)
    expect(battle.state.stacks[0]!.hearts).toBe(0)
    expect(battle.state.stacks[1]!.hearts).toBe(2)
    expect(battle.state.target).toBe(1)
    expect(battle.finished).toBe(false)

    feed(battle, 'correct', 2)
    expect(battle.state.target).toBe(2)
    expect(battle.state.stacks[2]!.hearts).toBe(2)
    expect(battle.finished).toBe(false)
  })

  it('the win comes only when the last stack falls', () => {
    const battle = new Battle(squad(1, 1, 1, 1, 1), 5)

    feed(battle, 'correct', 4)
    expect(battle.finished).toBe(false)

    battle.onAnswerAccepted(answer('correct'))
    expect(battle.finished).toBe(true)
    expect(battle.state.winner).toBe('player')
  })

  it('a felled stack is announced once, so the screen can drop it', () => {
    const battle = new Battle(squad(2, 2), 5)

    battle.onAnswerAccepted(answer('correct'))
    expect(battle.state.felled).toBeNull()

    battle.onAnswerAccepted(answer('correct'))
    expect(battle.state.felled).toBe(0)

    // The next answer is about the next stack; the fall is old news.
    battle.onAnswerAccepted(answer('correct'))
    expect(battle.state.felled).toBeNull()
  })

  it('a mistake costs the child a heart whichever stack is in front', () => {
    const battle = new Battle(squad(1, 3), 5)

    feed(battle, 'correct', 1)
    feed(battle, 'wrong', 2)

    expect(battle.state.playerHearts).toBe(3)
    expect(battle.state.stacks[1]!.hearts).toBe(3)
    expect(battle.state.target).toBe(1)
  })

  it('the length of the battle is the squad added up', () => {
    const battle = new Battle(squad(5, 5, 5, 5), 40)
    feed(battle, 'correct', 19)
    expect(battle.finished).toBe(false)

    battle.onAnswerAccepted(answer('correct'))
    expect(battle.finished).toBe(true)
  })
})

describe('the monster config', () => {
  it('every id is unique', () => {
    const ids = MONSTERS.map((monster) => monster.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every unit has a level and at least one task level', () => {
    for (const monster of MONSTERS) {
      expect(monster.level).toBeGreaterThanOrEqual(1)
      expect(monster.level).toBeLessThanOrEqual(5)
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

  it('the stronger the unit, the harder the tasks — and the shorter the battle', () => {
    const peasant = monsterById('peasant')
    const dragon = monsterById('black-dragon')

    expect(Math.max(...dragon.levels)).toBeGreaterThan(Math.max(...peasant.levels))
    expect(dragon.level).toBeGreaterThan(peasant.level)
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

  /**
   * G8: a row comes back on a share of the roster, and the share is taken
   * inside each level band rather than between them.
   *
   * This is the half of the decision a list cannot hold on its own. Adding an
   * opponent is one row in an array, and nothing about that row says which side
   * of the split it lands on — so a band can tilt, or empty out altogether,
   * without anybody meaning it to. Then «subtraction» starts to mean «the hard
   * ones», which is the one thing G8 says it must not mean.
   */
  describe('the split covers every band', () => {
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

    it('both rows are on the selection screen at all', () => {
      const shown = availableMonsters()
      expect(asking(shown, 'addition').length).toBeGreaterThan(0)
      expect(asking(shown, 'subtraction').length).toBeGreaterThan(0)
    })

    it('every band offers both rows', () => {
      for (const [level, units] of bands()) {
        expect(asking(units, 'addition').length, `no addition at level ${level}`).toBeGreaterThan(0)
        expect(asking(units, 'subtraction').length, `no subtraction at level ${level}`).toBeGreaterThan(0)
      }
    })

    it('neither row is a token presence in a band', () => {
      // A third, floored, and never less than one: a band of six wants two of
      // each, a band of ten wants three. One opponent out of ten is a row the
      // child meets by accident rather than one they are being taught.
      for (const [level, units] of bands()) {
        const least = Math.max(1, Math.floor(units.length / 3))
        for (const kind of ['addition', 'subtraction'] as const) {
          expect(asking(units, kind).length, `${kind} at level ${level}`).toBeGreaterThanOrEqual(least)
        }
      }
    })
  })

  /**
   * A unit no longer carries a battle length at all. It used to: hearts came
   * off the level, 20 down to 10, and one dial did both jobs. The squad does
   * the length now, so what is left to check is that the level still decides
   * the maths and that a unit without stats is not treated differently.
   */
  describe('the level decides the questions, not the length', () => {
    it('the rungs, level by level', () => {
      expect(monsterById('peasant').levels).toEqual([1])
      expect(monsterById('goblin').levels).toEqual([1, 2])
      expect(monsterById('gorgul').levels).toEqual([2, 3])
      expect(monsterById('paladin').levels).toEqual([3, 4])
      expect(monsterById('black-dragon').levels).toEqual([4, 5])
    })

    it('two units of a level get the same questions, whatever their health', () => {
      const zombie = monsterById('zombie')
      const goblin = monsterById('goblin')

      // The zombie used to outlast the goblin by four tasks for having more
      // King's Bounty health. That number is not even carried any more, and
      // both units are level 2, so both draw from the same rungs.
      expect(zombie.level).toBe(goblin.level)
      expect(zombie.levels).toEqual(goblin.levels)
    })

    it('a unit gets its rungs from its level alone', () => {
      const fairy = monsterById('forest-fairy')

      expect(fairy.level).toBe(1)
      expect(fairy.levels).toEqual([1])
    })
  })

  /**
   * Six hearts were chosen against a twenty-task battle. Squads make battles of
   * five tasks and of twenty-five, and six would mean two very different games,
   * so the number follows the work instead of sitting still.
   */
  describe('the child brings hearts to match the battle', () => {
    const atLevel = (level: number, count: number) =>
      squad(...(Array(count).fill(heartsPerStack(level)) as number[]))

    it('a twenty-question fight is still worth six, as it always was', () => {
      // One stack at level 1 is exactly the battle six hearts were chosen for.
      expect(heartsPerStack(1)).toBe(20)
      expect(playerHeartsFor(atLevel(1, 1))).toBe(6)
    })

    it('a bigger squad brings more, one heart per three and a half questions', () => {
      expect(playerHeartsFor(atLevel(1, 2))).toBe(11)
      expect(playerHeartsFor(atLevel(1, 5))).toBe(29)
    })

    it('never fewer than four, or a skirmish is a coin toss', () => {
      expect(playerHeartsFor(squad(1))).toBe(4)
      expect(playerHeartsFor(squad(5))).toBe(4)
    })

    it('the battle takes the count unless it is told otherwise', () => {
      expect(new Battle(atLevel(1, 2)).state.playerMax).toBe(11)
      expect(new Battle(atLevel(1, 2), 3).state.playerMax).toBe(3)
    })
  })

  it('an unknown monster is an error', () => {
    expect(() => monsterById('dragon')).toThrow(RangeError)
  })
})
