import type { AnswerAttempt, AnswerSpec } from '../exercises'

/**
 * A way to answer (A3). A port: the interface lives in the core, the
 * implementations in src/adapters/input (voice, keyboard, mouse).
 *
 * Voice is just one of the inputs. Until recognition is ready we play with the
 * keyboard; once it is, we add it to the list without touching the mini-game.
 * And the other way round: two «did not catch that» in a row and the session
 * brings out the fallback input itself.
 */
export interface AnswerInput {
  readonly id: string
  canHandle(spec: AnswerSpec): boolean
  /** Waits for an answer. Interrupted through the signal when the task changes. */
  read(spec: AnswerSpec, signal: AbortSignal): Promise<AnswerAttempt>
}
