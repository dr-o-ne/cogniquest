import { describe, expect, it } from 'vitest'
import { ArithmeticAnswer } from './ArithmeticAnswer'

const range = { min: 0, max: 20 }

describe('ArithmeticAnswer', () => {
  const answer = new ArithmeticAnswer(5, range)

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
    const seventeen = new ArithmeticAnswer(17, range)
    expect(seventeen.check({ kind: 'text', value: 'семнадцать' })).toBe('correct')

    const fortySeven = new ArithmeticAnswer(47, { min: 0, max: 100 })
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
    expect(answer.check({ kind: 'choice', value: 'МА' })).toBe('unrecognised')
    expect(answer.check({ kind: 'sequence', value: ['МА', 'ША'] })).toBe('unrecognised')
  })

  describe('grammar (A5, T16)', () => {
    it('covers the whole range, not just the correct answer', () => {
      expect(answer.grammar).toHaveLength(21)
      expect(answer.grammar).toContain('пять')
      expect(answer.grammar).toContain('двадцать')
      expect(answer.grammar).toContain('ноль')
    })

    it('a range up to a hundred is a hundred and one phrases', () => {
      expect(new ArithmeticAnswer(47, { min: 0, max: 100 }).grammar).toHaveLength(101)
    })
  })
})
