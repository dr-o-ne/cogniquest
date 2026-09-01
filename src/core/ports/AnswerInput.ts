import type { AnswerAttempt, AnswerSpec } from '../exercises'

/**
 * A way to answer (A3). A port: the interface lives in the core, the
 * implementations in src/adapters/input (voice, keyboard, mouse).
 *
 * Voice is just one of the inputs. Until recognition is ready we play with the
 * keyboard; once it is, we add it to the list without touching the mini-game.
 *
 * What `read` hands back is a reading, not a verdict, and since **T18** the
 * battle treats it as one: it takes the answer out and puts it in the field the
 * child is looking at, where a button press turns it into an attempt. So an
 * implementation may be as wrong as recognition ever is — nothing it returns is
 * scored on its own.
 */
export interface AnswerInput {
  readonly id: string
  canHandle(spec: AnswerSpec): boolean
  /** Waits for an answer. Interrupted through the signal when the task changes. */
  read(spec: AnswerSpec, signal: AbortSignal): Promise<AnswerAttempt>
}
