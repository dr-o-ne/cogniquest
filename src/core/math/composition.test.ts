import { describe, expect, it } from 'vitest'
import { createRandom } from '../random'
import {
  createCompositionExercise,
  describeComposition,
  generateComposition,
  MAKING_LEVELS,
  type Composition,
} from './composition'
import { createMathExercise, levelsFor, taskChoices } from './kinds'

function sample(levelId: number, count = 3000): Composition[] {
  const random = createRandom(levelId * 811 + 29)
  return Array.from({ length: count }, () => generateComposition(levelId, random))
}

const known = (c: Composition) => c.parts.find((part): part is number => part !== null)!
const share = (cs: Composition[], match: (c: Composition) => boolean) =>
  cs.filter(match).length / cs.length

describe('the row runs four rungs', () => {
  it('one to four, and no fifth', () => {
    expect(MAKING_LEVELS).toEqual([1, 2, 3, 4])
    expect(levelsFor('making-a-number')).toEqual([1, 2, 3, 4])
  })

  it('a band-5 opponent is asked only the top rung it reaches', () => {
    expect(taskChoices(['making-a-number'], [4, 5])).toEqual([{ kind: 'making-a-number', level: 4 }])
  })

  it('asking for a rung that does not exist is a programming error', () => {
    expect(() => generateComposition(5, createRandom(1))).toThrow(RangeError)
  })
})

describe('composition — rules that hold on every rung', () => {
  for (const level of MAKING_LEVELS) {
    describe(`level ${level}`, () => {
      const bonds = sample(level)

      it('the two parts make the whole', () => {
        for (const c of bonds) {
          const [left, right] = c.parts
          expect((left ?? c.answer) + (right ?? c.answer)).toBe(c.whole)
        }
      })

      it('exactly one part is hidden, and it is never the whole', () => {
        for (const c of bonds) {
          expect(c.parts.filter((part) => part === null)).toHaveLength(1)
          expect(c.answer).toBe(c.whole - known(c))
          expect(c.answer).toBeGreaterThanOrEqual(0)
          expect(c.answer).toBeLessThan(c.whole)
        }
      })

      it('the answer stays inside what may be heard', () => {
        for (const c of bonds) {
          expect(c.answer).toBeLessThanOrEqual(c.heardUpTo)
        }
      })

      it('either box is the blank', () => {
        expect(bonds.some((c) => c.parts[0] === null)).toBe(true)
        expect(bonds.some((c) => c.parts[1] === null)).toBe(true)
      })
    })
  }
})

describe('level 1 — bonds within five', () => {
  const bonds = sample(1)
  it('the whole is two to five, every part at least one', () => {
    for (const c of bonds) {
      expect(c.whole).toBeGreaterThanOrEqual(2)
      expect(c.whole).toBeLessThanOrEqual(5)
      expect(known(c)).toBeGreaterThanOrEqual(1)
      expect(c.answer).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('level 2 — bonds within ten, clear of level one', () => {
  const bonds = sample(2)
  it('the whole is six to ten', () => {
    for (const c of bonds) {
      expect(c.whole).toBeGreaterThanOrEqual(6)
      expect(c.whole).toBeLessThanOrEqual(10)
      expect(known(c)).toBeGreaterThanOrEqual(1)
      expect(c.answer).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('level 3 — the ten and the units', () => {
  const bonds = sample(3)
  it('the whole is a teen, and one part is always ten', () => {
    for (const c of bonds) {
      expect(c.whole).toBeGreaterThanOrEqual(11)
      expect(c.whole).toBeLessThanOrEqual(19)
      const parts = [known(c), c.answer]
      expect(parts).toContain(10)
      expect(parts).toContain(c.whole - 10)
    }
  })
  it('sometimes the ten is named, sometimes the units', () => {
    expect(share(bonds, (c) => c.answer === 10)).toBeGreaterThan(0.3)
    expect(share(bonds, (c) => c.answer !== 10)).toBeGreaterThan(0.3)
  })
})

describe('level 4 — round tens and units', () => {
  const bonds = sample(4)
  it('the whole is two-digit, one part round tens, the other one to nine', () => {
    for (const c of bonds) {
      expect(c.whole).toBeGreaterThanOrEqual(21)
      expect(c.whole).toBeLessThanOrEqual(99)
      const parts = [known(c), c.answer]
      const round = parts.find((p) => p % 10 === 0)!
      const units = parts.find((p) => p % 10 !== 0)!
      expect(round).toBe(c.whole - (c.whole % 10))
      expect(units).toBe(c.whole % 10)
      expect(units).toBeGreaterThanOrEqual(1)
      expect(units).toBeLessThanOrEqual(9)
    }
  })
})

describe('describeComposition', () => {
  it('whole first, blank side kept', () => {
    const left: Composition = { whole: 5, parts: [null, 3], answer: 2, heardUpTo: 10 }
    const right: Composition = { whole: 5, parts: [2, null], answer: 3, heardUpTo: 10 }
    expect(describeComposition(left)).toBe('5=□+3')
    expect(describeComposition(right)).toBe('5=2+□')
    // Not a missing-number id («…=5») and not a plain addition one («2+3»).
    expect(describeComposition(left)).not.toBe(describeComposition(right))
    expect(describeComposition(right)).toMatch(/^\d+=/)
  })
})

describe('createCompositionExercise', () => {
  it('identical draws get an identical id — C3 rests on this', () => {
    const a = createCompositionExercise(1, () => 0.4)
    const b = createCompositionExercise(1, () => 0.4)
    expect(a.id).toBe(b.id)
    expect(a.id).toMatch(/^math:\d+=(□|\d+)\+(□|\d+)$/)
  })

  it('carries the bond to the screen', () => {
    const exercise = createCompositionExercise(4, createRandom(7))
    const prompt = exercise.prompt
    if (prompt.kind !== 'composition') throw new Error('expected a composition prompt')
    expect(prompt.whole).toBeGreaterThan(0)
    expect(prompt.parts.filter((p) => p === null)).toHaveLength(1)
  })

  it('judges the missing part right and anything else wrong (A5, T16)', () => {
    const random = createRandom(13)
    for (const level of MAKING_LEVELS) {
      for (let i = 0; i < 50; i++) {
        const exercise = createMathExercise('making-a-number', level, random)
        const prompt = exercise.prompt
        if (prompt.kind !== 'composition') throw new Error('expected a composition prompt')

        const shown = prompt.parts.find((p): p is number => p !== null)!
        const answer = prompt.whole - shown
        const grammar = (exercise.answer as unknown as { grammar: string[] }).grammar

        expect(grammar.length).toBeGreaterThan(10)
        expect(exercise.answer.check({ kind: 'number', value: answer })).toBe('correct')
        expect(exercise.answer.check({ kind: 'number', value: answer + 1 })).toBe('wrong')
        expect(exercise.answer.check({ kind: 'text', value: 'кхм' })).toBe('unrecognised')
      }
    }
  })
})
