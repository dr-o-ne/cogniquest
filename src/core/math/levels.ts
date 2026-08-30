/**
 * The rungs of the math ladder (C1).
 *
 * Nothing but the rungs. What a level generates lives with the generators, and
 * what the child might plausibly be heard saying travels with the exercise
 * itself. A level number means one thing only: how hard it is.
 *
 * It used to carry the answer range as well, and that range became the
 * recognition grammar (T16). That held while every exercise was arithmetic and
 * a level number meant one thing. It stops holding the moment a second kind of
 * task arrives: the answer to a comparison is a word, not a number in a range,
 * and its level 2 is a different level 2 altogether.
 */
export const FIRST_LEVEL = 1
export const LAST_LEVEL = 5

/** Every rung, for walking the ladder. */
export const MATH_LEVELS: readonly number[] = [1, 2, 3, 4, 5]
