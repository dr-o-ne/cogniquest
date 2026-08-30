import type { Exercise, Subject, Verdict } from '../exercises'

export interface SessionInfo {
  readonly sessionId: string
  readonly subject: Subject
  readonly level: number
  /** null — a session with no known length: it runs until stopped from outside. */
  readonly taskCount: number | null
}

export interface AnswerResult {
  readonly exercise: Exercise
  readonly verdict: Verdict
  /**
   * Answer time is ALWAYS measured (A7). The core only counts it. Whether to
   * reward speed, punish slowness or ignore both is for the gamification layer
   * to decide.
   */
  readonly elapsedMs: number
  /** Correct answers in a row as of now. Reset by a mistake, not by a miss. */
  readonly streak: number
  /** Which attempt on this task this was, counting from 1. */
  readonly attemptNumber: number
}

export type HintKind = 'fingers' | 'numberLine' | 'sound' | 'text'

export interface Hint {
  readonly kind: HintKind
  readonly text?: string
}

export interface SessionResult {
  readonly sessionId: string
  /** How many tasks we got to show. */
  readonly total: number
  readonly correct: number
  readonly mistakes: number
  readonly stars: 1 | 2 | 3
  readonly elapsedMs: number
}

/**
 * The seam gamification plugs into (A4).
 *
 * Today there is one subscriber — the «3 of 8» bar. Tomorrow BattleReactor,
 * CoinReactor and StarReactor stand beside it and the mini-game does not
 * change by a line. Every method is optional: a reactor implements only what
 * it cares about.
 */
export interface SessionObserver {
  onSessionStarted?(info: SessionInfo): void
  onTaskPresented?(exercise: Exercise): void
  onAnswerAccepted?(result: AnswerResult): void
  onHintShown?(hint: Hint): void
  onSessionFinished?(result: SessionResult): void
}
