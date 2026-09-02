import { describe, expect, it } from 'vitest'
import { createRandom } from '../random'
import { createEquationExercise, describeEquation, generateEquation, type Equation } from './equations'
import { evaluate } from './generator'
import { levelsFor, taskChoices } from './kinds'
import { numberToWords } from './numerals'

const MISSING_LEVELS = [2, 3]
const CEILING: Record<number, number> = { 2: 5, 3: 10 }

function sample(levelId: number, count = 600): Equation[] {
  const random = createRandom(levelId * 733 + 17)
  return Array.from({ length: count }, () => generateEquation(levelId, random))
}

describe('the row runs two rungs, both under ten', () => {
  it('levels two and three, and nothing else', () => {
    expect(levelsFor('missing-number')).toEqual([2, 3])
  })

  it('a band with no rung for it is paired with nothing', () => {
    expect(taskChoices(['missing-number'], [1])).toEqual([])
    expect(taskChoices(['missing-number'], [4, 5])).toEqual([])
    expect(taskChoices(['missing-number'], [3, 4])).toEqual([{ kind: 'missing-number', level: 3 }])
  })

  it('asking for a rung it does not have is a programming error', () => {
    for (const level of [1, 4, 5]) {
      expect(() => generateEquation(level, createRandom(1))).toThrow(RangeError)
    }
  })
})

describe('missing number — rules that hold on both rungs', () => {
  for (const level of MISSING_LEVELS) {
    describe(`level ${level}`, () => {
      const equations = sample(level)

      it('the answer is the hidden operand', () => {
        for (const eq of equations) expect(eq.answer).toBe(eq.terms[eq.blank])
      })

      it('putting the shown operands back gives the stated result', () => {
        for (const eq of equations) expect(evaluate(eq.terms, eq.ops)).toBe(eq.result)
      })

      it('two operands, one sign, the blank one of the operands', () => {
        for (const eq of equations) {
          expect(eq.terms).toHaveLength(2)
          expect(eq.ops).toHaveLength(1)
          expect(eq.blank === 0 || eq.blank === 1).toBe(true)
        }
      })

      it('every number is at least one and at most the rung ceiling', () => {
        for (const eq of equations) {
          for (const n of [...eq.terms, eq.result]) {
            expect(n).toBeGreaterThanOrEqual(1)
            expect(n).toBeLessThanOrEqual(CEILING[level]!)
          }
        }
      })

      it('the answer stays inside what may be heard', () => {
        for (const eq of equations) {
          expect(eq.answer).toBeGreaterThanOrEqual(0)
          expect(eq.answer).toBeLessThanOrEqual(eq.heardUpTo)
        }
      })

      it('the grammar ceiling is ten', () => {
        for (const eq of equations) expect(eq.heardUpTo).toBe(10)
      })

      it('the blank moves around, and both signs show up', () => {
        expect(equations.some((eq) => eq.blank === 0)).toBe(true)
        expect(equations.some((eq) => eq.blank === 1)).toBe(true)
        expect(equations.some((eq) => eq.ops[0] === '+')).toBe(true)
        expect(equations.some((eq) => eq.ops[0] === '-')).toBe(true)
      })
    })
  }
})

describe('describeEquation', () => {
  it('marks the blank and keeps its position', () => {
    const left: Equation = { terms: [3, 2], ops: ['+'], result: 5, blank: 0, answer: 3, heardUpTo: 10 }
    const right: Equation = { ...left, blank: 1, answer: 2 }

    expect(describeEquation(left)).toBe('□+2=5')
    expect(describeEquation(right)).toBe('3+□=5')
    // Different tasks to a child — the review queue (C3) must not merge them,
    // nor merge either with the plain sum or with a number bond («5=3+□»).
    expect(describeEquation(left)).not.toBe(describeEquation(right))
    expect(describeEquation(left)).not.toBe('3+2=5')
    expect(describeEquation(right)).toMatch(/=\d+$/)
  })

  it('reads subtraction with a real minus', () => {
    const eq: Equation = { terms: [5, 3], ops: ['-'], result: 2, blank: 1, answer: 3, heardUpTo: 10 }
    expect(describeEquation(eq)).toBe('5-□=2')
  })
})

describe('createEquationExercise', () => {
  it('identical draws get an identical id — C3 rests on this', () => {
    const a = createEquationExercise(2, () => 0.0)
    const b = createEquationExercise(2, () => 0.0)
    expect(a.id).toBe(b.id)
    expect(a.id).toMatch(/^math:(□|\d+)[+-](□|\d+)=\d+$/)
  })

  it('assembles the whole exercise', () => {
    const exercise = createEquationExercise(3, createRandom(42))
    expect(exercise.subject).toBe('math')
    expect(exercise.level).toBe(3)
    expect(exercise.prompt.kind).toBe('equation')
  })

  it('judges the hidden operand right and anything else wrong (A5, T16)', () => {
    const random = createRandom(11)
    for (const level of MISSING_LEVELS) {
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
