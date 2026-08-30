/**
 * An attempted answer — whatever came in from any kind of input.
 * The core does not know whether it was voice, keyboard or mouse (A3).
 */
export type AnswerAttempt =
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'choice'; readonly value: string }
  | { readonly kind: 'sequence'; readonly value: readonly string[] }
  /**
   * Recognition did not manage: silence, noise, a word outside the grammar.
   * THE KEY POINT: this is not the child's mistake (C5). It costs no star,
   * never enters the review queue, never counts as an error.
   */
  | { readonly kind: 'unrecognised'; readonly heard?: string }
