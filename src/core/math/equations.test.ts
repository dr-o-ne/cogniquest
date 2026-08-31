import { describe, expect, it } from 'vitest'
import { createRandom } from '../random'
import { createEquationExercise, describeEquation, generateEquation, type Equation } from './equations'
import { evaluate } from './generator'
import { levelsFor, taskChoices } from './kinds'
import { MATH_LEVELS } from './levels'
import { numberToWords } from './numerals'

function sample(levelId: number, count = 500): Equation[] {
  const random = createRandom(levelId * 733 + 17)
  return Array.from({ length: count }, () => generateEquation(levelId, random))
}

describe('missing number — rules that hold on every level', () => {
  for (const level of MATH_LEVELS) {
    describe(`level ${level}`, () => {
      const equations = sample(level)

      it('the answer is the hidden operand', () => {
        for (const eq of equations) expect(eq.answer).toBe(eq.terms[eq.blank])
      })

      it('putting the shown operands back gives the stated result', () => {
        for (const eq of equations) {
          expect(evaluate(eq.terms, eq.ops)).toBe(eq.result)
        }
      })

      it('the answer stays inside what may be heard', () => {
        for (const eq of equations) {
          expect(eq.answer).toBeGreaterThanOrEqual(0)
          expect(eq.answer).toBeLessThanOrEqual(eq.heardUpTo)
        }
      })

      it('one operation fewer than there are terms, and the blank is one of them', () => {
        for (const eq of equations) {
          expect(eq.ops).toHaveLength(eq.terms.length - 1)
          expect(eq.blank).toBeGreaterThanOrEqual(0)
          expect(eq.blank).toBeLessThan(eq.terms.length)
        }
      })

      it('the blank moves around, and both operations show up', () => {
        expect(equations.some((eq) => eq.blank === 0)).toBe(true)
        expect(equations.some((eq) => eq.blank === eq.terms.length - 1)).toBe(true)
        expect(equations.some((eq) => eq.ops.includes('+'))).toBe(true)
        expect(equations.some((eq) => eq.ops.includes('-'))).toBe(true)
      })
    })
  }

  it('never a zero operand, on any level', () => {
    for (const level of MATH_LEVELS) {
      for (const eq of sample(level)) {
        for (const term of eq.terms) expect(term).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('the grammar ceiling widens by rung', () => {
    expect(sample(1)[0]!.heardUpTo).toBe(10)
    expect(sample(2)[0]!.heardUpTo).toBe(10)
    expect(sample(3)[0]!.heardUpTo).toBe(20)
    for (const level of [4, 5]) expect(sample(level)[0]!.heardUpTo).toBe(100)
  })

  it('the sum behind the blank grows by rung', () => {
    // Level 1 stays within five, level 2 within ten.
    for (const eq of sample(1)) for (const n of [...eq.terms, eq.result]) expect(n).toBeLessThanOrEqual(5)
    for (const eq of sample(2)) for (const n of [...eq.terms, eq.result]) expect(n).toBeLessThanOrEqual(10)
    // Level 3 crosses the ten: the plain reading of the two shown-or-hidden
    // operands is a teen answer, never single digits both.
    for (const eq of sample(3)) {
      expect(eq.terms).toHaveLength(2)
      expect(Math.max(...eq.terms, eq.result)).toBeGreaterThan(10)
    }
    // Level 4 is two-digit.
    for (const eq of sample(4)) expect(Math.max(...eq.terms, eq.result)).toBeGreaterThanOrEqual(10)
    // Level 5 keeps all three terms.
    for (const eq of sample(5)) expect(eq.terms).toHaveLength(3)
  })
})

describe('describeEquation', () => {
  it('marks the blank and keeps its position', () => {
    const left: Equation = {
      terms: [3, 2],
      ops: ['+'],
      result: 5,
      blank: 0,
      answer: 3,
      heardUpTo: 10,
    }
    const right: Equation = { ...left, blank: 1, answer: 2 }

    expect(describeEquation(left)).toBe('□+2=5')
    expect(describeEquation(right)).toBe('3+□=5')
    // Different tasks to a child — the review queue (C3) must not merge them,
    // nor merge either with the plain sum.
    expect(describeEquation(left)).not.toBe(describeEquation(right))
    expect(describeEquation(left)).not.toBe('3+2=5')
  })

  it('reads subtraction with a real minus', () => {
    const eq: Equation = { terms: [5, 3], ops: ['-'], result: 2, blank: 1, answer: 3, heardUpTo: 10 }
    expect(describeEquation(eq)).toBe('5-□=2')
  })

  it('carries every link of a three-term equation', () => {
    const eq: Equation = {
      terms: [47, 19, 3],
      ops: ['+', '+'],
      result: 69,
      blank: 1,
      answer: 19,
      heardUpTo: 100,
    }
    expect(describeEquation(eq)).toBe('47+□+3=69')
  })
})

describe('createEquationExercise', () => {
  it('identical draws get an identical id — C3 rests on this', () => {
    const a = createEquationExercise(1, () => 0.0)
    const b = createEquationExercise(1, () => 0.0)
    expect(a.id).toBe(b.id)
    expect(a.id).toMatch(/^math:(□|\d+)([+-](□|\d+))+=\d+$/)
  })

  it('assembles the whole exercise', () => {
    const exercise = createEquationExercise(3, createRandom(42))
    expect(exercise.subject).toBe('math')
    expect(exercise.level).toBe(3)
    expect(exercise.prompt.kind).toBe('equation')
  })

  it('judges the hidden operand right and anything else wrong (A5, T16)', () => {
    const random = createRandom(11)
    for (const level of MATH_LEVELS) {
      for (let i = 0; i < 50; i++) {
        const exercise = createEquationExercise(level, random)
        const prompt = exercise.prompt
        if (prompt.kind !== 'equation') throw new Error('expected an equation prompt')

        const answer = prompt.terms[prompt.blank]!
        const grammar = (exercise.answer as unknown as { grammar: string[] }).grammar

        expect(grammar).toContain(numberToWords(answer))
        expect(grammar.length).toBeGreaterThan(10)
        expect(exercise.answer.check({ kind: 'number', value: answer })).toBe('correct')
        expect(exercise.answer.check({ kind: 'number', value: answer + 1 })).toBe('wrong')
        expect(exercise.answer.check({ kind: 'text', value: 'кхм' })).toBe('unrecognised')
      }
    }
  })
})

describe('the row reaches every level', () => {
  it('including the first', () => {
    expect(levelsFor('missing-number')).toEqual([1, 2, 3, 4, 5])
    expect(taskChoices(['missing-number'], [1])).toEqual([{ kind: 'missing-number', level: 1 }])
  })
})
