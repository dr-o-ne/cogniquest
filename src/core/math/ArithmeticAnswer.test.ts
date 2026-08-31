import { describe, expect, it } from 'vitest'
import { ArithmeticAnswer } from './ArithmeticAnswer'

const heardUpTo = 20

describe('ArithmeticAnswer', () => {
  const answer = new ArithmeticAnswer(5, heardUpTo)

  it('checks a number', () => {
    expect(answer.check({ kind: 'number', value: 5 })).toBe('correct')
    expect(answer.check({ kind: 'number', value: 6 })).toBe('wrong')
  })

  it('reads voice that arrived as text', () => {
    expect(answer.check({ kind: 'text', value: 'пять' })).toBe('correct')
    expect(answer.check({ kind: 'text', value: 'Пять!' })).toBe('correct')
    expect(answer.check({ kind: 'text', value: 'шесть' })).toBe('wrong')
  })

  it('compound numerals', () => {
    const seventeen = new ArithmeticAnswer(17, heardUpTo)
    expect(seventeen.check({ kind: 'text', value: 'семнадцать' })).toBe('correct')

    const fortySeven = new ArithmeticAnswer(47, 100)
    expect(fortySeven.check({ kind: 'text', value: 'сорок семь' })).toBe('correct')
  })

  describe('C5 — «did not catch that» is not a mistake', () => {
    it('an unrecognised attempt is marked as such', () => {
      expect(answer.check({ kind: 'unrecognised' })).toBe('unrecognised')
    })

    it('text without a number is a miss too, not a mistake', () => {
      expect(answer.check({ kind: 'text', value: '' })).toBe('unrecognised')
      expect(answer.check({ kind: 'text', value: '[unk]' })).toBe('unrecognised')
      expect(answer.check({ kind: 'text', value: 'кхм ну это' })).toBe('unrecognised')
    })

    it('but a wrong number that was heard clearly IS a mistake', () => {
      expect(answer.check({ kind: 'text', value: 'семь' })).toBe('wrong')
    })
  })

  it('answer kinds that are not ours do not count as mistakes', () => {
    expect(answer.check({ kind: 'choice', value: 'больше' })).toBe('unrecognised')
  })

  describe('grammar (A5, T16)', () => {
    it('covers the whole range, not just the correct answer', () => {
      expect(answer.grammar).toHaveLength(21)
      expect(answer.grammar).toContain('пять')
      expect(answer.grammar).toContain('двадцать')
      expect(answer.grammar).toContain('ноль')
    })

    it('a range up to a hundred is a hundred and one phrases', () => {
      expect(new ArithmeticAnswer(47, 100).grammar).toHaveLength(101)
    })

    it('always starts at zero, wherever the answer sits', () => {
      // There is no lower bound to pass and there must not be one. Narrowing
      // the grammar towards the answer looks like an optimisation and is the
      // trap T16 exists to name: with a short list Vosk hears the answer in
      // any sound at all, the child is right whatever they said, and the game
      // stops teaching.
      for (const [value, top] of [
        [0, 10],
        [5, 10],
        [47, 100],
        [100, 100],
      ] as const) {
        const grammar = new ArithmeticAnswer(value, top).grammar
        expect(grammar[0]).toBe('ноль')
        expect(grammar).toHaveLength(top + 1)
      }
    })
  })
})
