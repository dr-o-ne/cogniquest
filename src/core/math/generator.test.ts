import { describe, expect, it } from 'vitest'
import type { MathOp } from '../exercises'
import { createRandom } from '../random'
import {
  evaluate,
  generateProblem,
  type ArithmeticProblem,
} from './generator'
import { createMathExercise } from './kinds'
import { MATH_LEVELS } from './levels'
import { numberToWords } from './numerals'

/** Many seeds are run through: the rule of the level must hold on every one. */
function sample(levelId: number, count = 400): ArithmeticProblem[] {
  const random = createRandom(levelId * 1000 + 7)
  return Array.from({ length: count }, () =>
    generateProblem(levelId, random, random() < 0.5 ? '+' : '-'),
  )
}

const added = (problems: ArithmeticProblem[]) => problems.filter((p) => p.ops[0] === '+')
const taken = (problems: ArithmeticProblem[]) => problems.filter((p) => p.ops[0] === '-')

const units = (n: number) => n % 10
const tens = (n: number) => Math.floor(n / 10)

describe('generateProblem — rules that hold everywhere', () => {
  for (const level of MATH_LEVELS) {
    describe(`level ${level}`, () => {
      const problems = sample(level)

      it('the answer stays inside the range the problem declares', () => {
        for (const p of problems) {
          expect(p.answer).toBeGreaterThanOrEqual(0)
          expect(p.answer).toBeLessThanOrEqual(p.heardUpTo)
        }
      })

      it('the arithmetic adds up', () => {
        for (const p of problems) expect(p.answer).toBe(evaluate(p.terms, p.ops))
      })

      it('two numbers and one operation', () => {
        for (const p of problems) {
          expect(p.terms).toHaveLength(2)
          expect(p.ops).toHaveLength(1)
        }
      })

      // Level 1 is the exception, and a deliberate one — see «zero» below.
      if (level > 1) {
        it('no zero operands', () => {
          for (const p of problems) {
            for (const term of p.terms) expect(term).toBeGreaterThanOrEqual(1)
          }
        })

        it('every subtraction leaves something behind', () => {
          // «a − a» used to be 29% of everything level 1 asked: subtrahends
          // were drawn from [1, a], so hitting a exactly had odds of 1/a.
          // Above the first rung it may not happen at all.
          for (const p of taken(problems)) {
            expect(p.answer).toBeGreaterThanOrEqual(1)
            expect(p.terms[0]).not.toBe(p.terms[1])
          }
        })
      }
    })
  }

  for (const level of MATH_LEVELS) {
    it(`level ${level}: both operations show up`, () => {
      const problems = sample(level)
      expect(problems.some((p) => p.ops.includes('+'))).toBe(true)
      expect(problems.some((p) => p.ops.includes('-'))).toBe(true)
    })
  }

  it('rejects a level the ladder does not have', () => {
    // The ladder grows upwards, so this is «not yet», not «never» — but until
    // the rung exists, asking for it is a programming error and says so.
    expect(() => generateProblem(6, createRandom(1), '+')).toThrow(RangeError)
  })
})

describe('level 1 — the bonds within five', () => {
  const problems = sample(1)

  it('every number in the problem comes from one to five, or is the zero dose', () => {
    for (const p of problems) {
      expect(p.terms[0]!).toBeGreaterThanOrEqual(1)
      expect(p.terms[0]!).toBeLessThanOrEqual(5)
      expect(p.terms[1]!).toBeGreaterThanOrEqual(0)
      expect(p.terms[1]!).toBeLessThanOrEqual(5)
    }
  })

  it('the answer never passes ten', () => {
    for (const p of problems) expect(p.answer).toBeLessThanOrEqual(10)
  })

  it('the fives themselves turn up — «5 + 5», «5 − 3»', () => {
    expect(added(problems).some((p) => p.terms[0] === 5 && p.terms[1] === 5)).toBe(true)
    expect(taken(problems).some((p) => p.terms[0] === 5)).toBe(true)
  })
})

describe('zero — level 1 only, and one problem in twenty', () => {
  const problems = sample(1, 4000)
  const zeros = problems.filter((p) => p.terms.includes(0) || p.answer === 0)

  it('all three facts turn up: «4 + 0», «4 − 0», «4 − 4»', () => {
    expect(problems.some((p) => p.ops[0] === '+' && p.terms[1] === 0)).toBe(true)
    expect(problems.some((p) => p.ops[0] === '-' && p.terms[1] === 0)).toBe(true)
    expect(problems.some((p) => p.ops[0] === '-' && p.answer === 0)).toBe(true)
  })

  it('the level does not drown in it', () => {
    // The dosage is the whole point: met often enough to be learned, rare
    // enough that «zero» is never a way of answering without counting.
    const share = zeros.length / problems.length
    expect(share).toBeGreaterThan(0.02)
    expect(share).toBeLessThan(0.09)
  })

  it('«0 + 0» is not a fact about zero and never appears', () => {
    for (const p of problems) expect(p.terms.every((term) => term === 0)).toBe(false)
  })

  it('no rung above the first has a zero anywhere in it', () => {
    for (const level of MATH_LEVELS.filter((candidate) => candidate > 1)) {
      for (const p of sample(level)) {
        expect(p.terms).not.toContain(0)
        expect(p.answer).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

describe('level 2 — up to ten, the ten not crossed', () => {
  const problems = sample(2)

  it('nothing goes past ten, in the numbers or in the answer', () => {
    for (const p of problems) {
      for (const term of p.terms) expect(term).toBeLessThanOrEqual(10)
      expect(p.answer).toBeLessThanOrEqual(10)
    }
  })

  it('always reaches past five, or it is level 1 again', () => {
    // The new difficulty of this rung is the second five. Left to chance, a
    // good half of it would be problems level 1 already asks.
    for (const p of added(problems)) expect(Math.max(...p.terms)).toBeGreaterThanOrEqual(6)
    for (const p of taken(problems)) expect(p.terms[0]!).toBeGreaterThanOrEqual(6)
  })

  it('the sum never crosses the ten', () => {
    for (const p of added(problems)) expect(p.terms[0]! + p.terms[1]!).toBeLessThanOrEqual(10)
  })

  it('the pairs that fill the ten are among them — «6 + 4», «8 + 2»', () => {
    expect(added(problems).some((p) => p.answer === 10)).toBe(true)
  })
})

describe('level 3 — the ten, crossed or counted whole', () => {
  const problems = sample(3)
  const round = (p: ArithmeticProblem) => p.terms.every((term) => term % 10 === 0)

  it('both shapes turn up, and neither one becomes the level', () => {
    const share = problems.filter(round).length / problems.length
    expect(share).toBeGreaterThan(0.3)
    expect(share).toBeLessThan(0.7)
  })

  it('across the ten: the sum crosses it, and stops at twenty', () => {
    for (const p of added(problems).filter((x) => !round(x))) {
      expect(units(p.terms[0]!) + p.terms[1]!).toBeGreaterThan(9)
      expect(p.answer).toBeGreaterThan(10)
      expect(p.answer).toBeLessThanOrEqual(20)
      expect(p.heardUpTo).toBe(20)
    }
  })

  it('across the ten: the subtraction has to borrow', () => {
    for (const p of taken(problems).filter((x) => !round(x))) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(left).toBeGreaterThan(10)
      expect(left).toBeLessThanOrEqual(20)
      expect(units(left)).toBeLessThan(right)
    }
  })

  it('whole tens: nothing but tens, up to a hundred', () => {
    for (const p of problems.filter(round)) {
      for (const term of p.terms) expect(term).toBeGreaterThanOrEqual(10)
      expect(p.answer % 10).toBe(0)
      expect(p.answer).toBeLessThanOrEqual(100)
      expect(p.heardUpTo).toBe(100)
    }
  })

  it('whole tens reach the hundred — the top of what can be said (T16)', () => {
    expect(problems.some((p) => Math.max(p.answer, ...p.terms) === 100)).toBe(true)
  })
})

describe('level 4 — two-digit, digit by digit', () => {
  const problems = sample(4)

  it('the first number is two-digit', () => {
    for (const p of problems) {
      expect(p.terms[0]!).toBeGreaterThanOrEqual(10)
      expect(p.terms[0]!).toBeLessThanOrEqual(99)
    }
  })

  it('addition never carries', () => {
    for (const p of added(problems)) {
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

  it('never two round numbers — that is the rung below', () => {
    // «30 + 40» obeys every rule of this level and is a level 3 problem all
    // the same. A rung that can draw the rung below it sometimes teaches
    // nothing new.
    for (const p of problems) {
      expect(p.terms.every((term) => term % 10 === 0)).toBe(false)
    }
  })
})

describe('level 5 — two-digit, and the units overflow', () => {
  const problems = sample(5)

  it('two numbers, and the first one has at least a ten', () => {
    for (const p of problems) {
      expect(p.terms[0]!).toBeGreaterThanOrEqual(10)
      expect(p.terms[0]!).toBeLessThanOrEqual(99)
    }
  })

  it('addition always carries', () => {
    for (const p of added(problems)) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(units(left) + units(right)).toBeGreaterThanOrEqual(10)
      expect(p.answer).toBeLessThanOrEqual(100)
    }
  })

  it('subtraction always borrows', () => {
    for (const p of taken(problems)) {
      const [left, right] = [p.terms[0]!, p.terms[1]!]
      expect(units(right)).toBeGreaterThan(units(left))
      // Twenty and up, or this would be level 3 again under another name.
      expect(left).toBeGreaterThanOrEqual(20)
    }
  })
})

describe('evaluate', () => {
  it('counts left to right', () => {
    expect(evaluate([8, 3, 2], ['-', '+'])).toBe(7)
    expect(evaluate([2, 3, 4], ['+', '+'])).toBe(9)
    expect(evaluate([2, 3], ['+'])).toBe(5)
  })

  it('refuses a chain of the wrong shape instead of returning nonsense', () => {
    // «8 +» used to evaluate to NaN, and NaN as an answer marks every reply
    // the child gives as wrong, forever. Better to fall over at the seam.
    expect(() => evaluate([8], ['+'])).toThrow(RangeError)
    expect(() => evaluate([1, 2, 3], ['+'])).toThrow(RangeError)
    expect(() => evaluate([], [])).toThrow(RangeError)
    expect(() => evaluate([5], [])).not.toThrow()
  })

  it('a lone number is a chain of one and evaluates to itself', () => {
    expect(evaluate([5], [])).toBe(5)
  })

  it('refuses an operation it has never heard of', () => {
    // The compiler stops this at the three places that branch on MathOp; the
    // cast is here to prove the runtime does not shrug either. Treating an
    // unknown sign as a minus would be the quiet kind of wrong.
    expect(() => evaluate([6, 7], ['×' as MathOp])).toThrow()
  })
})

describe('createMathExercise', () => {
  it('identical problems get an identical id — C3 rests on this', () => {
    const a = createMathExercise('addition', 1, () => 0.0)
    const b = createMathExercise('addition', 1, () => 0.0)
    expect(a.id).toBe(b.id)
    expect(a.id).toMatch(/^math:\d+[+-]\d+$/)
  })

  it('assembles the whole exercise', () => {
    const exercise = createMathExercise('addition', 3, createRandom(42))
    expect(exercise.subject).toBe('math')
    expect(exercise.level).toBe(3)
    expect(exercise.prompt.kind).toBe('arithmetic')
  })

  it('the exercise grammar covers its own answer (A5, T16)', () => {
    const random = createRandom(11)
    for (const level of MATH_LEVELS) {
      for (let i = 0; i < 50; i++) {
        const exercise = createMathExercise('addition', level, random)
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
    // says what may be heard. Level 3 is the proof — one rung, two shapes, two
    // ceilings — and a second kind of task will declare something else again.
    for (const level of [1, 2]) expect(sample(level)[0]!.heardUpTo).toBe(10)
    for (const p of sample(3)) {
      expect(p.heardUpTo).toBe(p.terms.every((term) => term % 10 === 0) ? 100 : 20)
    }
    for (const level of [4, 5]) expect(sample(level)[0]!.heardUpTo).toBe(100)
  })

  it('rejects a level that does not exist', () => {
    expect(() => createMathExercise('addition', 99, createRandom(1))).toThrow(RangeError)
  })
})
