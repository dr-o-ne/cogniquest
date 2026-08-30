import { describe, expect, it } from 'vitest'
import { createRandom } from '../random'
import { createChainExercise, generateChain } from './chains'
import { evaluate, type ArithmeticProblem } from './generator'
import { MATH_LEVELS } from './levels'

function sample(levelId: number, count = 500): ArithmeticProblem[] {
  const random = createRandom(levelId * 313 + 11)
  return Array.from({ length: count }, () => generateChain(levelId, random))
}

/** Every value the child passes through while working left to right. */
function runningTotals(problem: ArithmeticProblem): number[] {
  const totals = [problem.terms[0]!]
  for (const [i, op] of problem.ops.entries()) {
    const previous = totals[totals.length - 1]!
    totals.push(op === '+' ? previous + problem.terms[i + 1]! : previous - problem.terms[i + 1]!)
  }
  return totals
}

describe('chains — rules that hold on every level', () => {
  for (const level of MATH_LEVELS) {
    describe(`level ${level}`, () => {
      const problems = sample(level)

      it('the answer is what the problem says it is', () => {
        for (const p of problems) expect(p.answer).toBe(evaluate(p.terms, p.ops, p.bracket))
      })

      it('the answer stays inside what may be heard', () => {
        for (const p of problems) {
          expect(p.answer).toBeGreaterThanOrEqual(0)
          expect(p.answer).toBeLessThanOrEqual(p.heardUpTo)
        }
      })

      it('one operation fewer than there are numbers', () => {
        for (const p of problems) expect(p.ops).toHaveLength(p.terms.length - 1)
      })

      it('no zero operands', () => {
        for (const p of problems) {
          for (const term of p.terms.slice(1)) expect(term).toBeGreaterThanOrEqual(1)
        }
      })

      it('no step along the way leaves the bounds', () => {
        // The child holds a running total, so the answer fitting is not
        // enough — every value on the way there has to fit as well.
        for (const p of problems) {
          if (p.bracket) continue // a bracket is worked out first, not in order
          for (const total of runningTotals(p)) {
            expect(total).toBeGreaterThanOrEqual(0)
            expect(total).toBeLessThanOrEqual(p.heardUpTo)
          }
        }
      })
    })
  }
})

describe('level 1 — a chain of one', () => {
  const problems = sample(1)

  it('two numbers, one operation, inside twenty', () => {
    for (const p of problems) {
      expect(p.terms).toHaveLength(2)
      expect(p.ops).toHaveLength(1)
      expect(p.heardUpTo).toBe(20)
    }
  })

  it('both signs turn up', () => {
    expect(problems.some((p) => p.ops[0] === '+')).toBe(true)
    expect(problems.some((p) => p.ops[0] === '-')).toBe(true)
  })
})

describe('level 2 — the signs are mixed', () => {
  const problems = sample(2)

  it('three numbers, two operations', () => {
    for (const p of problems) expect(p.terms).toHaveLength(3)
  })

  it('every single problem has both a plus and a minus', () => {
    // Not «usually»: the level exists so the child cannot settle into one
    // operation, and left to chance a quarter of these come out all-plus.
    for (const p of problems) {
      expect(p.ops).toContain('+')
      expect(p.ops).toContain('-')
    }
  })
})

describe('level 3 — longer and bigger', () => {
  const problems = sample(3)

  it('four numbers, three operations, up to a hundred', () => {
    for (const p of problems) {
      expect(p.terms).toHaveLength(4)
      expect(p.ops).toHaveLength(3)
      expect(p.heardUpTo).toBe(100)
    }
  })

  it('still mixed', () => {
    for (const p of problems) {
      expect(p.ops).toContain('+')
      expect(p.ops).toContain('-')
    }
  })

  it('reaches past twenty, or it would be level 2 again', () => {
    expect(problems.some((p) => p.answer > 20)).toBe(true)
  })
})

describe('level 4 — brackets', () => {
  const problems = sample(4)

  it('one bracket, around the last two numbers', () => {
    for (const p of problems) {
      expect(p.terms).toHaveLength(3)
      expect(p.bracket).toEqual({ from: 1, to: 2 })
    }
  })

  it('the bracket always changes the answer', () => {
    // «(20 + 5) − 8» is 17 either way. A bracket that changes nothing teaches
    // that brackets are decoration, which is the opposite of the lesson.
    for (const p of problems) {
      expect(evaluate(p.terms, p.ops)).not.toBe(p.answer)
    }
  })

  it('the numbers are as big as the level below', () => {
    // Unlearning four levels of left-to-right on numbers under twenty would
    // be a rung down, not up.
    for (const p of problems) {
      expect(p.terms[0]!).toBeGreaterThanOrEqual(12)
      expect(p.terms[1]!).toBeGreaterThanOrEqual(10)
    }
  })

  it('what is inside is never nothing, and never more than there is', () => {
    for (const p of problems) {
      const inside = evaluate(p.terms.slice(1), p.ops.slice(1))
      expect(inside).toBeGreaterThanOrEqual(1)
      expect(inside).toBeLessThanOrEqual(p.terms[0]!)
    }
  })
})

describe('level 5 — the order has to be found', () => {
  const problems = sample(5)

  it('four numbers, added, taken away, added', () => {
    for (const p of problems) {
      expect(p.terms).toHaveLength(4)
      expect(p.ops).toEqual(['+', '-', '+'])
    }
  })

  it('the third number cancels the units of the first', () => {
    for (const p of problems) expect(p.terms[2]).toBe(p.terms[0]! % 10)
  })

  it('the pair leaves a round number behind', () => {
    for (const p of problems) expect((p.terms[0]! - p.terms[2]!) % 10).toBe(0)
  })

  it('the other two carry tens — the long way round has to cost something', () => {
    for (const p of problems) {
      expect(p.terms[1]!).toBeGreaterThanOrEqual(10)
      expect(p.terms[3]!).toBeGreaterThanOrEqual(10)
    }
  })
})

describe('createChainExercise', () => {
  it('a bracket reaches the prompt, or the child would see a different problem', () => {
    const exercise = createChainExercise(4, createRandom(7))
    const prompt = exercise.prompt
    if (prompt.kind !== 'arithmetic') throw new Error('expected an arithmetic prompt')

    expect(prompt.bracket).toEqual({ from: 1, to: 2 })
  })

  it('the id carries the bracket — two readings are two problems', () => {
    // «20-(5+3)» is 12 and «20-5+3» is 18. An id that could not tell them
    // apart would have the review queue (C3) treat one as the other.
    const exercise = createChainExercise(4, createRandom(7))
    expect(exercise.id).toMatch(/^math:\d+[+-]\(\d+[+-]\d+\)$/)
  })

  it('a plain chain gets no bracket at all', () => {
    const exercise = createChainExercise(2, createRandom(3))
    const prompt = exercise.prompt
    if (prompt.kind !== 'arithmetic') throw new Error('expected an arithmetic prompt')

    expect(prompt.bracket).toBeUndefined()
    expect(exercise.id).not.toContain('(')
  })

  it('rejects a level that does not exist', () => {
    expect(() => createChainExercise(99, createRandom(1))).toThrow(RangeError)
  })
})
