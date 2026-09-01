import { describe, expect, it } from 'vitest'
import { createRandom } from '../random'
import { compare } from './ComparisonAnswer'
import {
  COMPARISON_LEVELS,
  createComparisonExercise,
  describeSide,
  generateComparison,
  type ComparisonProblem,
  type ComparisonSide,
} from './comparison'
import { evaluate } from './generator'
import { createMathExercise, levelsFor, taskChoices } from './kinds'

function sample(levelId: number, count = 6000): ComparisonProblem[] {
  const random = createRandom(levelId * 977 + 13)
  return Array.from({ length: count }, () => generateComparison(levelId, random))
}

const worth = (side: ComparisonSide) => evaluate(side.terms, side.ops)
const isNumber = (side: ComparisonSide) => side.ops.length === 0
const isSum = (side: ComparisonSide) => side.ops.length === 1

const share = (problems: ComparisonProblem[], matches: (p: ComparisonProblem) => boolean) =>
  problems.filter(matches).length / problems.length

describe('the row runs the whole ladder', () => {
  it('five rungs', () => {
    expect(COMPARISON_LEVELS).toEqual([1, 2, 3, 4, 5])
    expect(levelsFor('comparing-numbers')).toEqual([1, 2, 3, 4, 5])
  })

  it('an opponent is paired with the rungs its levels reach', () => {
    expect(taskChoices(['comparing-numbers'], [3, 4])).toEqual([
      { kind: 'comparing-numbers', level: 3 },
      { kind: 'comparing-numbers', level: 4 },
    ])
  })

  it('asking for a rung that does not exist is a programming error', () => {
    expect(() => generateComparison(6, createRandom(1))).toThrow(RangeError)
  })
})

describe('comparison — rules that hold on every level', () => {
  for (const level of COMPARISON_LEVELS) {
    describe(`level ${level}`, () => {
      const problems = sample(level)

      it('the answer is what the two sides work out to', () => {
        for (const p of problems) {
          expect(p.answer).toBe(compare(worth(p.left), worth(p.right)))
        }
      })

      it('the bigger side is on either hand, or «меньше» always wins', () => {
        const less = share(problems, (p) => p.answer === 'less')
        const greater = share(problems, (p) => p.answer === 'greater')

        expect(Math.abs(less - greater)).toBeLessThan(0.05)
      })

      it('«равно» turns up, but does not carry the level', () => {
        const equal = share(problems, (p) => p.answer === 'equal')

        expect(equal).toBeGreaterThan(0.1)
        // Rungs 3–5 draw both sides independently, so a pair can also land equal
        // by chance on top of the one-in-six that is built that way.
        expect(equal).toBeLessThan(level <= 2 ? 0.25 : 0.42)
      })
    })
  }
})

describe('level 1 — two numbers up to twenty', () => {
  const problems = sample(1)

  it('both sides are bare numbers, 0 to 20', () => {
    for (const p of problems) {
      for (const side of [p.left, p.right]) {
        expect(isNumber(side)).toBe(true)
        expect(worth(side)).toBeGreaterThanOrEqual(0)
        expect(worth(side)).toBeLessThanOrEqual(20)
      }
    }
  })

  it('some of the range is above ten', () => {
    expect(share(problems, (p) => worth(p.left) > 10 || worth(p.right) > 10)).toBeGreaterThan(0.3)
  })
})

describe('level 2 — the tens decide it, not the units', () => {
  const problems = sample(2)
  const unequal = problems.filter((p) => p.answer !== 'equal')
  const value = (side: ComparisonSide) => worth(side)

  it('both sides are two-digit numbers', () => {
    for (const p of problems) {
      for (const side of [p.left, p.right]) {
        expect(isNumber(side)).toBe(true)
        expect(value(side)).toBeGreaterThanOrEqual(10)
        expect(value(side)).toBeLessThanOrEqual(99)
      }
    }
  })

  it('the units never settle it on their own', () => {
    for (const p of unequal) {
      const byUnits = compare(value(p.left) % 10, value(p.right) % 10)
      expect(byUnits, `${value(p.left)} ? ${value(p.right)}`).not.toBe(p.answer)
    }
  })

  it('nor does the units rule turned upside down', () => {
    const sameUnits = share(unequal, (p) => value(p.left) % 10 === value(p.right) % 10)

    expect(sameUnits).toBeGreaterThan(0.4)
    expect(sameUnits).toBeLessThan(0.6)
  })

  it('the tens always differ when the numbers do', () => {
    for (const p of unequal) {
      expect(Math.floor(value(p.left) / 10)).not.toBe(Math.floor(value(p.right) / 10))
    }
  })
})

describe('levels 3–5 — comparing sums', () => {
  const ceilingFor: Record<number, number> = { 3: 10, 4: 10, 5: 100 }

  for (const level of [3, 4, 5]) {
    describe(`level ${level}`, () => {
      const problems = sample(level)

      it('every side works out inside its arithmetic rung', () => {
        for (const p of problems) {
          for (const side of [p.left, p.right]) {
            expect(worth(side)).toBeGreaterThanOrEqual(0)
            expect(worth(side)).toBeLessThanOrEqual(ceilingFor[level]!)
          }
        }
      })

      it('an unequal pair is two sums; an equal pair puts a bare number opposite one', () => {
        for (const p of problems) {
          if (p.answer === 'equal') {
            // Either an engineered equal (a sum against its own value) or an
            // accidental one (two sums that happen to match).
            expect(isSum(p.left) || isSum(p.right)).toBe(true)
          } else {
            expect(isSum(p.left)).toBe(true)
            expect(isSum(p.right)).toBe(true)
          }
        }
      })

      it('the engineered equal case really is a sum against a number', () => {
        const engineered = problems.filter(
          (p) => p.answer === 'equal' && (isNumber(p.left) || isNumber(p.right)),
        )
        expect(engineered.length).toBeGreaterThan(0)
        for (const p of engineered) {
          const [sum, plain] = isSum(p.left) ? [p.left, p.right] : [p.right, p.left]
          expect(isSum(sum)).toBe(true)
          expect(worth(sum)).toBe(worth(plain))
        }
      })
    })
  }
})

describe('createComparisonExercise', () => {
  it('carries both sides to the screen', () => {
    const exercise = createComparisonExercise(4, createRandom(5))
    const prompt = exercise.prompt
    if (prompt.kind !== 'comparison') throw new Error('expected a comparison prompt')

    expect(prompt.left.terms.length).toBeGreaterThanOrEqual(1)
    expect(prompt.right.terms.length).toBeGreaterThanOrEqual(1)
  })

  it('the id keeps the order and hides the answer', () => {
    const exercise = createComparisonExercise(3, createRandom(5))
    const prompt = exercise.prompt
    if (prompt.kind !== 'comparison') throw new Error('expected a comparison prompt')

    expect(exercise.id).toBe(`math:${describeSide(prompt.left)}?${describeSide(prompt.right)}`)
    expect(exercise.id).toContain('?')
    expect(exercise.id).not.toMatch(/[<>=]/)
  })

  it('«3+2» and «2+3» are told apart by describeSide', () => {
    expect(describeSide({ terms: [3, 2], ops: ['+'] })).toBe('3+2')
    expect(describeSide({ terms: [2, 3], ops: ['+'] })).toBe('2+3')
    expect(describeSide({ terms: [7], ops: [] })).toBe('7')
  })

  it('is answered by word, not by number', () => {
    const exercise = createComparisonExercise(1, createRandom(5))
    expect(exercise.answer.kind).toBe('comparison')
    expect(exercise.answer.check({ kind: 'number', value: 7 })).toBe('unrecognised')
    expect(exercise.answer.check({ kind: 'text', value: 'кхм' })).toBe('unrecognised')
  })
})

describe('createMathExercise wires the row back in', () => {
  it('builds a comparison at every rung', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const exercise = createMathExercise('comparing-numbers', level, createRandom(level))
      expect(exercise.prompt.kind).toBe('comparison')
      expect(exercise.level).toBe(level)

      const prompt = exercise.prompt
      if (prompt.kind !== 'comparison') throw new Error('expected a comparison prompt')
      const right = compare(
        evaluate(prompt.left.terms, prompt.left.ops),
        evaluate(prompt.right.terms, prompt.right.ops),
      )
      expect(exercise.answer.check({ kind: 'choice', value: right })).toBe('correct')
      const wrong = right === 'less' ? 'greater' : 'less'
      expect(exercise.answer.check({ kind: 'choice', value: wrong })).toBe('wrong')
    }
  })
})
