import { describe, expect, it } from 'vitest'
import { createRandom } from '../random'
import {
  createArithmeticExercise,
  evaluate,
  generateProblem,
  type ArithmeticProblem,
} from './generator'
import { MATH_LEVELS } from './levels'
import { numberToWords } from './numerals'

/** Many seeds are run through: the rule of the level must hold on every one. */
function sample(levelId: number, count = 400): ArithmeticProblem[] {
  const random = createRandom(levelId * 1000 + 7)
  return Array.from({ length: count }, () => generateProblem(levelId, random))
}

const units = (n: number) => n % 10
const tens = (n: number) => Math.floor(n / 10)

describe('generateProblem — rules that hold everywhere', () => {
  for (const level of MATH_LEVELS) {
    describe(`level ${level}`, () => {
      const problems = sample(level)

      it('the answer stays inside the range the problem declares', () => {
        for (const p of problems) {
          expect(p.answer).toBeGreaterThanOrEqual(p.range.min)
          expect(p.answer).toBeLessThanOrEqual(p.range.max)
        }
      })

      it('the arithmetic adds up', () => {
        for (const p of problems) expect(p.answer).toBe(evaluate(p.terms, p.ops))
      })

      it('one operation fewer than there are numbers', () => {
        for (const p of problems) expect(p.ops).toHaveLength(p.terms.length - 1)
      })

      it('no zero operands', () => {
        for (const p of problems) {
          for (const term of p.terms.slice(1)) expect(term).toBeGreaterThanOrEqual(1)
        }
      })

      it('nothing negative', () => {
        for (const p of problems) expect(p.answer).toBeGreaterThanOrEqual(0)
      })
    })
  }

  for (const level of MATH_LEVELS) {
    it(`level ${level}: both operations show up`, () => {
      const problems = sample(level)
      expect(problems.some((p) => p.ops.includes('+'))).toBe(true)
      expect(problems.some((p) => p.ops.includes('-'))).toBe(true)
    })
  }
})

describe('level 1 — within ten', () => {
  it('two numbers, neither above ten', () => {
    for (const p of sample(1)) {
      expect(p.terms).toHaveLength(2)
      for (const term of p.terms) expect(term).toBeLessThanOrEqual(10)
    }
  })
})

describe('level 2 — across the ten', () => {
  it('addition has to cross ten', () => {
    for (const p of sample(2).filter((x) => x.ops[0] === '+')) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(units(left) + right).toBeGreaterThan(9)
      expect(p.answer).toBeGreaterThan(10)
    }
  })

  it('subtraction has to borrow', () => {
    for (const p of sample(2).filter((x) => x.ops[0] === '-')) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(left).toBeGreaterThan(10)
      expect(units(left)).toBeLessThan(right)
    }
  })

  it('stays inside twenty', () => {
    for (const p of sample(2)) {
      for (const term of p.terms) expect(term).toBeLessThanOrEqual(20)
    }
  })
})

describe('level 3 — up to a hundred, digit by digit', () => {
  const problems = sample(3)

  it('two numbers, and the first one has tens', () => {
    for (const p of problems) {
      expect(p.terms).toHaveLength(2)
      expect(p.terms[0]!).toBeGreaterThanOrEqual(10)
      expect(p.terms[0]!).toBeLessThanOrEqual(99)
    }
  })

  it('addition never carries', () => {
    for (const p of problems.filter((x) => x.ops[0] === '+')) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(units(left) + units(right)).toBeLessThanOrEqual(9)
      expect(tens(left) + tens(right)).toBeLessThanOrEqual(9)
    }
  })

  it('subtraction never borrows', () => {
    for (const p of problems.filter((x) => x.ops[0] === '-')) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(units(right)).toBeLessThanOrEqual(units(left))
      expect(tens(right)).toBeLessThanOrEqual(tens(left))
    }
  })

  it('round tens still turn up — a case of this level, not a level of their own', () => {
    expect(problems.some((p) => p.terms.every((term) => term % 10 === 0))).toBe(true)
  })
})

describe('level 4 — two-digit, across the place', () => {
  const problems = sample(4)

  it('two numbers, and the first one has at least a ten', () => {
    for (const p of problems) {
      expect(p.terms).toHaveLength(2)
      expect(p.terms[0]!).toBeGreaterThanOrEqual(10)
      expect(p.terms[0]!).toBeLessThanOrEqual(99)
    }
  })

  it('addition always carries', () => {
    for (const p of problems.filter((x) => x.ops[0] === '+')) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(units(left) + units(right)).toBeGreaterThanOrEqual(10)
      expect(p.answer).toBeLessThanOrEqual(100)
    }
  })

  it('subtraction always borrows', () => {
    for (const p of problems.filter((x) => x.ops[0] === '-')) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(units(right)).toBeGreaterThan(units(left))
      // Twenty and up, or this would be level 2 again under another name.
      expect(left).toBeGreaterThanOrEqual(20)
    }
  })

  it('the second number is never zero', () => {
    for (const p of problems) expect(p.terms[1]!).toBeGreaterThanOrEqual(1)
  })
})

describe('level 5 — a pair that makes ten', () => {
  const problems = sample(5)
  const added = problems.filter((p) => p.ops[0] === '+')
  const taken = problems.filter((p) => p.ops[0] === '-')

  it('always three numbers, and the two operations match', () => {
    for (const p of problems) {
      expect(p.terms).toHaveLength(3)
      expect(p.ops).toEqual(p.ops[0] === '+' ? ['+', '+'] : ['-', '-'])
    }
  })

  describe('added — «7 + 8 + 3»', () => {
    it('the outer two always make ten', () => {
      for (const p of added) expect(p.terms[0]! + p.terms[2]!).toBe(10)
    })

    it('the pair is never adjacent — otherwise there is nothing to spot', () => {
      for (const p of added) {
        expect(p.terms[0]! + p.terms[1]!).not.toBe(10)
        expect(p.terms[1]! + p.terms[2]!).not.toBe(10)
      }
    })

    it('the odd term is a digit or a round ten', () => {
      for (const p of added) {
        const other = p.terms[1]!
        expect(other <= 9 || other % 10 === 0).toBe(true)
      }
    })
  })

  describe('taken away — «50 − 7 − 3»', () => {
    it('the two subtrahends make ten', () => {
      for (const p of taken) expect(p.terms[1]! + p.terms[2]!).toBe(10)
    })

    it('there is always a ten to take', () => {
      for (const p of taken) {
        expect(p.terms[0]!).toBeGreaterThanOrEqual(10)
        expect(p.answer).toBe(p.terms[0]! - 10)
      }
    })
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
    const exercise = createArithmeticExercise(5, createRandom(5))
    expect(exercise.id).toMatch(/^math:\d+[+-]\d+[+-]\d+$/)
  })

  it('assembles the whole exercise', () => {
    const exercise = createArithmeticExercise(3, createRandom(42))
    expect(exercise.subject).toBe('math')
    expect(exercise.level).toBe(3)
    expect(exercise.prompt.kind).toBe('arithmetic')
  })

  it('the exercise grammar covers its own answer (A5, T16)', () => {
    const random = createRandom(11)
    for (const level of MATH_LEVELS) {
      for (let i = 0; i < 50; i++) {
        const exercise = createArithmeticExercise(level, random)
        const prompt = exercise.prompt
        if (prompt.kind !== 'arithmetic') throw new Error('expected an arithmetic prompt')

        const answer = evaluate(prompt.terms, prompt.ops)
        const grammar = (exercise.answer as unknown as { grammar: string[] }).grammar

        expect(grammar).toContain(numberToWords(answer))
        // Never a list of one: a single word would be heard in anything (T16).
        expect(grammar.length).toBeGreaterThan(10)
        expect(exercise.answer.check({ kind: 'number', value: answer })).toBe('correct')
        expect(exercise.answer.check({ kind: 'number', value: -1 })).toBe('wrong')
      }
    }
  })

  it('the range comes from the problem, not from the level number', () => {
    // The point of the whole arrangement: a level says how hard, the generator
    // says what may be heard. A second kind of task will declare something else
    // entirely, and nothing here has to know about it.
    expect(sample(1)[0]!.range).toEqual({ min: 0, max: 10 })
    expect(sample(2)[0]!.range).toEqual({ min: 0, max: 20 })
    for (const level of [3, 4, 5]) {
      expect(sample(level)[0]!.range).toEqual({ min: 0, max: 100 })
    }
  })

  it('rejects a level that does not exist', () => {
    expect(() => createArithmeticExercise(99, createRandom(1))).toThrow(RangeError)
  })
})
