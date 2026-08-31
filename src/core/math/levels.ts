/**
 * The rungs of the math ladder (C1).
 *
 * Nothing but the rungs. What a level generates lives with the generators, and
 * what the child might plausibly be heard saying travels with the exercise
 * itself. A level number means one thing only: how hard it is.
 *
 * **Five today, and five is not a promise.** The ladder is a list that grows:
 * two-digit work is where grades 1–2 stop, not where counting does, and the
 * rungs above it — multiplication, three-digit numbers, the olympiad tricks
 * that have no number here yet — are added by appending to this list. So the
 * list is the single source and the two ends are read off it, rather than
 * written down beside it where they could disagree with it. Nothing anywhere
 * may assume the last rung is five: `LAST_LEVEL` is the name for it.
 *
 * It used to carry the answer range as well, and that range became the
 * recognition grammar (T16). That held while every exercise was arithmetic and
 * a level number meant one thing. It stops holding the moment a second kind of
 * task arrives: the answer to a comparison is a word, not a number in a range,
 * and its level 2 is a different level 2 altogether.
 */
export const MATH_LEVELS: readonly number[] = [1, 2, 3, 4, 5]

/** Where the ladder starts — the floor the difficulty adapter (C4) eases to. */
export const FIRST_LEVEL = MATH_LEVELS[0]!

/** Where it stops today. Reads off the list, so it moves when the list does. */
export const LAST_LEVEL = MATH_LEVELS[MATH_LEVELS.length - 1]!
