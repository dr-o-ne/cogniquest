import { describe, expect, it } from 'vitest'
import { t } from '@/locale'
import {
  compare,
  ComparisonAnswer,
  comparisonSign,
  comparisonWord,
  COMPARISONS,
  parseComparison,
} from './ComparisonAnswer'

describe('compare', () => {
  it('reads left to right', () => {
    expect(compare(5, 7)).toBe('less')
    expect(compare(7, 5)).toBe('greater')
    expect(compare(7, 7)).toBe('equal')
  })
})

describe('the three answers', () => {
  it('each has its own word and its own sign', () => {
    expect(new Set(COMPARISONS.map(comparisonWord)).size).toBe(3)
    expect(COMPARISONS.map(comparisonSign)).toEqual(['<', '=', '>'])
  })

  it('the words come from the text pack, not from the code', () => {
    expect(comparisonWord('less')).toBe(t.comparison.less)
    expect(comparisonWord('greater')).toBe(t.comparison.greater)
  })
})

describe('parseComparison', () => {
  it('reads the plain word', () => {
    expect(parseComparison('больше')).toBe('greater')
    expect(parseComparison('меньше')).toBe('less')
    expect(parseComparison('равно')).toBe('equal')
  })

  it('forgives what recognition does to it', () => {
    expect(parseComparison('  Больше!  ')).toBe('greater')
    expect(parseComparison('ну меньше наверное')).toBe('less')
  })

  it('two of them at once is not an answer', () => {
    // Vosk can stitch two grammar words onto one sound. Guessing which was
    // meant would mark the child against our guess.
    expect(parseComparison('больше меньше')).toBeNull()
  })

  it('anything else is not an answer either', () => {
    expect(parseComparison('')).toBeNull()
    expect(parseComparison('[unk]')).toBeNull()
    expect(parseComparison('семь')).toBeNull()
  })
})

describe('ComparisonAnswer', () => {
  const spec = new ComparisonAnswer('less')

  it('offers all three words to recognition, right one or not', () => {
    // A grammar narrowed towards the correct answer makes Vosk hear that answer
    // in any sound at all, and the child is then right whatever they said (T16).
    expect([...spec.grammar].sort()).toEqual(
      [t.comparison.less, t.comparison.equal, t.comparison.greater].sort(),
    )
  })

  it('judges a word said out loud', () => {
    expect(spec.check({ kind: 'text', value: 'меньше' })).toBe('correct')
    expect(spec.check({ kind: 'text', value: 'больше' })).toBe('wrong')
  })

  it('judges a sign picked on the pad', () => {
    expect(spec.check({ kind: 'choice', value: 'less' })).toBe('correct')
    expect(spec.check({ kind: 'choice', value: 'equal' })).toBe('wrong')
  })

  it('not being heard is nobody’s mistake', () => {
    // C5: a miss costs no heart and never enters the review queue, so it must
    // not come back as «wrong».
    expect(spec.check({ kind: 'unrecognised' })).toBe('unrecognised')
    expect(spec.check({ kind: 'text', value: 'кхм' })).toBe('unrecognised')
  })

  it('an answer of another kind is not ours to judge', () => {
    expect(spec.check({ kind: 'number', value: 5 })).toBe('unrecognised')
  })
})
