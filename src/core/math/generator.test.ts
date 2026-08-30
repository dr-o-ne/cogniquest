import { describe, expect, it } from 'vitest'
import { createRandom } from '../random'
import {
  createArithmeticExercise,
  evaluate,
  generateProblem,
  type ArithmeticProblem,
} from './generator'
import { MATH_LEVELS, mathLevel } from './levels'

/** Many seeds are run through: the rule of the level must hold on every one. */
function sample(levelId: number, count = 400): ArithmeticProblem[] {
  const random = createRandom(levelId * 1000 + 7)
  return Array.from({ length: count }, () => generateProblem(levelId, random))
}

describe('generateProblem — rules that hold everywhere', () => {
  for (const level of MATH_LEVELS) {
    describe(`level ${level.id}`, () => {
      const problems = sample(level.id)

      it('the answer stays inside the range of the level', () => {
        for (const p of problems) {
          expect(p.answer).toBeGreaterThanOrEqual(level.answerRange.min)
          expect(p.answer).toBeLessThanOrEqual(level.answerRange.max)
        }
      })

      it('the arithmetic adds up', () => {
        for (const p of problems) expect(p.answer).toBe(evaluate(p.terms, p.ops))
      })

      it('one operation fewer than there are numbers', () => {
        for (const p of problems) expect(p.ops).toHaveLength(p.terms.length - 1)
      })

      it('no zero operands — «7 + 0» teaches nothing', () => {
        for (const p of problems) {
          for (const term of p.terms.slice(1)) expect(term).toBeGreaterThanOrEqual(1)
        }
      })

      it('nothing negative', () => {
        for (const p of problems) expect(p.answer).toBeGreaterThanOrEqual(0)
      })

      it('both operations show up', () => {
        expect(problems.some((p) => p.ops.includes('+'))).toBe(true)
        expect(problems.some((p) => p.ops.includes('-'))).toBe(true)
      })
    })
  }
})

describe('level 1 — within 10', () => {
  it('two numbers, neither above ten', () => {
    for (const p of sample(1)) {
      expect(p.terms).toHaveLength(2)
      for (const term of p.terms) expect(term).toBeLessThanOrEqual(10)
    }
  })
})

describe('level 2 — two operations within 10', () => {
  const problems = sample(2)

  it('three numbers and two operations', () => {
    for (const p of problems) {
      expect(p.terms).toHaveLength(3)
      expect(p.ops).toHaveLength(2)
    }
  })

  it('every intermediate step stays within ten', () => {
    for (const p of problems) {
      // The child works step by step, so no single step may leave the bounds,
      // not just the final answer.
      let total = p.terms[0]!
      expect(total).toBeGreaterThanOrEqual(0)
      expect(total).toBeLessThanOrEqual(10)

      for (let i = 0; i < p.ops.length; i++) {
        total = p.ops[i] === '+' ? total + p.terms[i + 1]! : total - p.terms[i + 1]!
        expect(total).toBeGreaterThanOrEqual(0)
        expect(total).toBeLessThanOrEqual(10)
      }
    }
  })

  it('all four combinations of operations occur', () => {
    const seen = new Set(problems.map((p) => p.ops.join('')))
    expect(seen).toEqual(new Set(['++', '+-', '-+', '--']))
  })
})

describe('level 3 — across the ten', () => {
  it('addition has to cross ten', () => {
    for (const p of sample(3).filter((x) => x.ops[0] === '+')) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect((left % 10) + right).toBeGreaterThan(9)
      expect(p.answer).toBeGreaterThan(10)
    }
  })

  it('subtraction has to borrow', () => {
    for (const p of sample(3).filter((x) => x.ops[0] === '-')) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(left).toBeGreaterThan(10)
      expect(left % 10).toBeLessThan(right)
    }
  })
})

describe('level 4 — round tens', () => {
  it('every number is a multiple of ten', () => {
    for (const p of sample(4)) {
      for (const term of p.terms) expect(term % 10).toBe(0)
      expect(p.answer % 10).toBe(0)
    }
  })
})

describe('evaluate', () => {
  it('counts left to right', () => {
    expect(evaluate([8, 3, 2], ['-', '+'])).toBe(7)
    expect(evaluate([2, 3, 4], ['+', '+'])).toBe(9)
    expect(evaluate([2, 3], ['+'])).toBe(5)
  })
})

describe('createArithmeticExercise', () => {
  it('identical problems get an identical id — C3 rests on this', () => {
    const a = createArithmeticExercise(1, () => 0.0)
    const b = createArithmeticExercise(1, () => 0.0)
    expect(a.id).toBe(b.id)
    expect(a.id).toMatch(/^math:\d+[+-]\d+$/)
  })

  it('a chain carries every link in its id', () => {
    const exercise = createArithmeticExercise(2, createRandom(5))
    expect(exercise.id).toMatch(/^math:\d+[+-]\d+[+-]\d+$/)
  })

  it('assembles the whole exercise', () => {
    const exercise = createArithmeticExercise(3, createRandom(42))
    expect(exercise.subject).toBe('math')
    expect(exercise.level).toBe(3)
    expect(exercise.prompt.kind).toBe('arithmetic')
  })

  it('the exercise grammar covers the correct answer (A5, T16)', () => {
    const random = createRandom(11)
    for (const level of MATH_LEVELS) {
      for (let i = 0; i < 50; i++) {
        const exercise = createArithmeticExercise(level.id, random)
        const grammar = (exercise.answer as unknown as { grammar: string[] }).grammar
        const range = mathLevel(level.id).answerRange
        expect(grammar).toHaveLength(range.max - range.min + 1)
        expect(exercise.answer.check({ kind: 'number', value: -1 })).toBe('wrong')
      }
    }
  })

  it('rejects a level that does not exist', () => {
    expect(() => createArithmeticExercise(99, createRandom(1))).toThrow(RangeError)
  })
})
