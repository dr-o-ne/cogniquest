/**
 * Number words 0–100: to words, from words, and into a recognition grammar.
 *
 * Needed for T4/T16: Vosk is handed a closed list of expected phrases, which
 * lifts accuracy on a child's speech far above open-vocabulary recognition.
 *
 * The words themselves come from the text pack (`src/locale`) — this file only
 * knows how a number is built out of them, which happens to hold for Russian
 * as well as for the languages that assemble numerals the same way.
 */
import { t } from '@/locale'

const { units: UNITS, teens: TEENS, tens: TENS, hundred: HUNDRED } = t.numbers
const { normalise } = t

export const MIN_NUMBER = 0
export const MAX_NUMBER = 100

/** Word → its numeric value. Built once. */
const WORD_VALUES: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>()
  UNITS.forEach((word, i) => map.set(word, i))
  TEENS.forEach((word, i) => map.set(word, 10 + i))
  TENS.forEach((word, i) => map.set(word, 20 + i * 10))
  map.set(HUNDRED, 100)
  return map
})()

/**
 * 47 → «сорок семь». Only 0–100: we never need more (C1).
 */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < MIN_NUMBER || n > MAX_NUMBER) {
    throw new RangeError(`Number out of range ${MIN_NUMBER}–${MAX_NUMBER}: ${n}`)
  }
  if (n === 100) return HUNDRED
  if (n < 10) return UNITS[n]!
  if (n < 20) return TEENS[n - 10]!

  const tens = TENS[Math.floor(n / 10) - 2]!
  const unit = n % 10
  return unit === 0 ? tens : `${tens} ${UNITS[unit]!}`
}

/**
 * «сорок семь» → 47. Returns null when it cannot be read as a number.
 *
 * Tolerant of case, punctuation and junk words: recognition can mix in
 * something that was never in the grammar.
 */
export function parseNumber(text: string): number | null {
  const words = normalise(text)
    .split(' ')
    .filter((word) => WORD_VALUES.has(word))

  if (words.length === 0) return null

  let total = 0
  for (const word of words) total += WORD_VALUES.get(word)!

  if (total < MIN_NUMBER || total > MAX_NUMBER) return null

  // Round-tripping weeds out nonsense like «два три», which would otherwise
  // add up to five.
  return numberToWords(total) === words.join(' ') ? total : null
}

/**
 * The phrase list for the recognition grammar — the WHOLE range of the level,
 * not just the correct answer (T16).
 *
 * A single-word list makes Vosk «hear» that word in anything, a cough
 * included, and the child is then always right.
 *
 * The `[unk]` token is not added here: that is a Vosk detail, appended by the
 * adapter in src/adapters/speech.
 */
export function numberGrammar(min: number, max: number): string[] {
  if (min > max) throw new RangeError(`Empty range: ${min}–${max}`)

  const phrases: string[] = []
  for (let n = min; n <= max; n++) phrases.push(numberToWords(n))
  return phrases
}
