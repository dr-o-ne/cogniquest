/**
 * The five math levels (C1).
 *
 * Only the rules live here. What a level is called, and any «Ten Meadow»
 * geography, is presentation: it belongs to the text pack and the theme (A6).
 */

export interface MathLevel {
  readonly id: number
  /**
   * Bounds of a possible answer. The recognition grammar is built from this:
   * the whole range, not just the correct answer (T16).
   */
  readonly answerRange: { readonly min: number; readonly max: number }
}

export const MATH_LEVELS: readonly MathLevel[] = [
  { id: 1, answerRange: { min: 0, max: 10 } },
  { id: 2, answerRange: { min: 0, max: 10 } },
  { id: 3, answerRange: { min: 0, max: 20 } },
  { id: 4, answerRange: { min: 0, max: 100 } },
  { id: 5, answerRange: { min: 0, max: 100 } },
]

export const FIRST_LEVEL = 1
export const LAST_LEVEL = MATH_LEVELS.length

export function mathLevel(id: number): MathLevel {
  const level = MATH_LEVELS.find((candidate) => candidate.id === id)
  if (!level) throw new RangeError(`No such math level: ${id}`)
  return level
}
