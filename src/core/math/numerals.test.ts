import { describe, expect, it } from 'vitest'
import { MAX_NUMBER, MIN_NUMBER, numberGrammar, numberToWords, parseNumber } from './numerals'

describe('numberToWords', () => {
  it('units', () => {
    expect(numberToWords(0)).toBe('ноль')
    expect(numberToWords(1)).toBe('один')
    expect(numberToWords(5)).toBe('пять')
    expect(numberToWords(9)).toBe('девять')
  })

  it('teens', () => {
    expect(numberToWords(10)).toBe('десять')
    expect(numberToWords(11)).toBe('одиннадцать')
    expect(numberToWords(14)).toBe('четырнадцать')
    expect(numberToWords(19)).toBe('девятнадцать')
  })

  it('round tens', () => {
    expect(numberToWords(20)).toBe('двадцать')
    expect(numberToWords(40)).toBe('сорок')
    expect(numberToWords(50)).toBe('пятьдесят')
    expect(numberToWords(90)).toBe('девяносто')
    expect(numberToWords(100)).toBe('сто')
  })

  it('compound numbers', () => {
    expect(numberToWords(21)).toBe('двадцать один')
    expect(numberToWords(47)).toBe('сорок семь')
    expect(numberToWords(99)).toBe('девяносто девять')
  })

  it('rejects anything outside 0–100', () => {
    expect(() => numberToWords(-1)).toThrow(RangeError)
    expect(() => numberToWords(101)).toThrow(RangeError)
    expect(() => numberToWords(3.5)).toThrow(RangeError)
  })
})

describe('parseNumber', () => {
  it('reads back everything it can produce — the whole range', () => {
    for (let n = MIN_NUMBER; n <= MAX_NUMBER; n++) {
      expect(parseNumber(numberToWords(n))).toBe(n)
    }
  })

  it('tolerates case, «ё», punctuation and extra spaces', () => {
    expect(parseNumber('Пять')).toBe(5)
    expect(parseNumber('  сорок   семь  ')).toBe(47)
    expect(parseNumber('семь!')).toBe(7)
    expect(parseNumber('ЧЕТЫРЕ')).toBe(4)
  })

  it('skips words outside the grammar', () => {
    expect(parseNumber('будет пять')).toBe(5)
    expect(parseNumber('эм... сорок семь наверное')).toBe(47)
  })

  it('returns null when there is no number', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('не знаю')).toBeNull()
    expect(parseNumber('[unk]')).toBeNull()
  })

  it('does not add up numbers said one after another', () => {
    // «два три» must not turn into five
    expect(parseNumber('два три')).toBeNull()
    expect(parseNumber('пять пять')).toBeNull()
    expect(parseNumber('один два три')).toBeNull()
  })

  it('rejects anything past a hundred', () => {
    expect(parseNumber('сто один')).toBeNull()
    expect(parseNumber('сто сто')).toBeNull()
  })
})

describe('numberGrammar', () => {
  it('covers the whole range, not just the correct answer (T16)', () => {
    const grammar = numberGrammar(0, 10)
    expect(grammar).toHaveLength(11)
    expect(grammar).toContain('ноль')
    expect(grammar).toContain('десять')
  })

  it('the widest level is a hundred and one options', () => {
    expect(numberGrammar(0, 100)).toHaveLength(101)
  })

  it('every phrase reads back', () => {
    for (const phrase of numberGrammar(0, 100)) {
      expect(parseNumber(phrase)).not.toBeNull()
    }
  })

  it('rejects an empty range', () => {
    expect(() => numberGrammar(10, 5)).toThrow(RangeError)
  })
})
