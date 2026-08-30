import { describe, expect, it } from 'vitest'
import { createRandom } from '../random'
import { compare } from './ComparisonAnswer'
import {
  COMPARISON_LEVELS,
  createComparisonExercise,
  generateComparison,
  type ComparisonProblem,
} from './comparison'
import { levelsFor, taskChoices } from './kinds'

function sample(levelId: number, count = 6000): ComparisonProblem[] {
  const random = createRandom(levelId * 977 + 13)
  return Array.from({ length: count }, () => generateComparison(levelId, random))
}

const share = (problems: ComparisonProblem[], matches: (p: ComparisonProblem) => boolean) =>
  problems.filter(matches).length / problems.length

describe('the row stops at level 2', () => {
  it('two rungs, and the task table agrees', () => {
    expect(COMPARISON_LEVELS).toEqual([1, 2])
    expect(levelsFor('comparing-numbers')).toEqual([1, 2])
  })

  it('a level-3 opponent is simply never asked to compare', () => {
    // Not a throw in the middle of a battle: the pairing drops the kind.
    expect(taskChoices(['comparing-numbers'], [3, 4, 5])).toEqual([])
    expect(taskChoices(['comparing-numbers'], [2, 3])).toEqual([
      { kind: 'comparing-numbers', level: 2 },
    ])
  })

  it('asking for a rung that does not exist is a programming error', () => {
    expect(() => generateComparison(3, createRandom(1))).toThrow(RangeError)
  })
})

describe('comparison — rules that hold on every level', () => {
  for (const level of COMPARISON_LEVELS) {
    describe(`level ${level}`, () => {
      const problems = sample(level)

      it('the answer is what the two numbers say it is', () => {
        for (const p of problems) expect(p.answer).toBe(compare(p.left, p.right))
      })

      it('the bigger number is on either side, or «меньше» always wins', () => {
        // An answer that can be given without looking at the numbers is not an
        // answer, and «the left one is always smaller» would be exactly that.
        const less = share(problems, (p) => p.answer === 'less')
        const greater = share(problems, (p) => p.answer === 'greater')

        expect(Math.abs(less - greater)).toBeLessThan(0.05)
      })

      it('«равно» turns up, but does not carry the level', () => {
        // The teacher offers all three words in every question. One that never
        // came up would make the offer a lie; a third of the level would make
        // it the easy way through.
        const equal = share(problems, (p) => p.answer === 'equal')

        expect(equal).toBeGreaterThan(0.1)
        expect(equal).toBeLessThan(0.25)
      })
    })
  }
})

describe('level 1 — within ten', () => {
  const problems = sample(1)

  it('both numbers are within ten', () => {
    for (const p of problems) {
      expect(p.left).toBeGreaterThanOrEqual(0)
      expect(p.left).toBeLessThanOrEqual(10)
      expect(p.right).toBeGreaterThanOrEqual(0)
      expect(p.right).toBeLessThanOrEqual(10)
    }
  })
})

describe('level 2 — the tens decide it, not the units', () => {
  const problems = sample(2)
  const unequal = problems.filter((p) => p.answer !== 'equal')

  it('both numbers are two-digit', () => {
    for (const p of problems) {
      expect(p.left).toBeGreaterThanOrEqual(10)
      expect(p.left).toBeLessThanOrEqual(99)
      expect(p.right).toBeGreaterThanOrEqual(10)
      expect(p.right).toBeLessThanOrEqual(99)
    }
  })

  it('the units never settle it on their own', () => {
    // «45 □ 47» is answered correctly by comparing units — which is the wrong
    // method, working by luck. The rung exists to catch that method out, so
    // the units are always either the other way round or identical.
    for (const p of unequal) {
      const byUnits = compare(p.left % 10, p.right % 10)
      expect(byUnits, `${p.left} ? ${p.right}`).not.toBe(p.answer)
    }
  })

  it('nor does the units rule turned upside down', () => {
    // If the units always pointed the other way, «smaller units means bigger
    // number» would be right every time — a shortcut again, just an inverted
    // one. Identical units say nothing at all, and there are plenty of them.
    const sameUnits = share(unequal, (p) => p.left % 10 === p.right % 10)

    expect(sameUnits).toBeGreaterThan(0.4)
    expect(sameUnits).toBeLessThan(0.6)
  })

  it('the tens always differ when the numbers do', () => {
    for (const p of unequal) {
      expect(Math.floor(p.left / 10)).not.toBe(Math.floor(p.right / 10))
    }
  })
})

describe('createComparisonExercise', () => {
  const exercise = createComparisonExercise(1, createRandom(5))

  it('carries both numbers to the screen', () => {
    const prompt = exercise.prompt
    if (prompt.kind !== 'comparison') throw new Error('expected a comparison prompt')

    expect(prompt.left).toBeGreaterThanOrEqual(0)
    expect(prompt.right).toBeGreaterThanOrEqual(0)
  })

  it('the id keeps the order and hides the answer', () => {
    // «5?7» and «7?5» are two tasks with two answers, so the review queue (C3)
    // must tell them apart — hence the order, and hence a mark that is not one
    // of «<», «=», «>»: a sign would write the answer into the id.
    const prompt = exercise.prompt
    if (prompt.kind !== 'comparison') throw new Error('expected a comparison prompt')

    expect(exercise.id).toBe(`math:${prompt.left}?${prompt.right}`)
  })

  it('is answered by word, not by number', () => {
    expect(exercise.answer.kind).toBe('comparison')
    expect(exercise.answer.check({ kind: 'number', value: 7 })).toBe('unrecognised')
  })
})
