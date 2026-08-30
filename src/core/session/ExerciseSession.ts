import type { AnswerAttempt, Exercise, Subject } from '../exercises'
import type { AnswerResult, SessionInfo, SessionObserver, SessionResult } from './SessionObserver'

/** How many real attempts a task gets before we move on. */
const DEFAULT_MAX_ATTEMPTS = 2

export interface SessionConfig {
  readonly subject: Subject
  readonly level: number
  /**
   * How many tasks are in the session. Left out, the session runs until it is
   * stopped through `abandon()`. That is how a battle works: it lasts until
   * somebody wins, and there is no telling in advance how long that takes.
   */
  readonly taskCount?: number
  /**
   * Where tasks come from. Math and reading plug in their own generators —
   * the session knows nothing about the subject at all (A2).
   */
  readonly nextExercise: () => Exercise
  readonly observers?: readonly SessionObserver[]
  readonly now?: () => number
  readonly id?: string
  readonly maxAttempts?: number
}

let counter = 0

/**
 * The engine of a single session: it hands out tasks, takes attempts, tallies
 * the result and broadcasts events (A4).
 *
 * Not a word here about battles, stars, coins or the map — that is for the
 * reactors, which subscribe later and change nothing in this class (G1).
 */
export class ExerciseSession {
  private readonly observers: readonly SessionObserver[]
  private readonly now: () => number
  private readonly maxAttempts: number

  private readonly info: SessionInfo
  private exercise: Exercise | null = null
  private index = -1
  private presented = 0

  private startedAt = 0
  private taskStartedAt = 0
  private attemptsOnTask = 0

  private streakValue = 0
  private unheard = 0
  private solved = 0
  private mistakeCount = 0

  private finishedResult: SessionResult | null = null

  constructor(private readonly config: SessionConfig) {
    if (config.taskCount !== undefined && config.taskCount < 1) {
      throw new RangeError('A session needs at least one task')
    }

    this.observers = config.observers ?? []
    this.now = config.now ?? (() => Date.now())
    this.maxAttempts = config.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

    this.info = {
      sessionId: config.id ?? `s${++counter}-${this.now()}`,
      subject: config.subject,
      level: config.level,
      taskCount: config.taskCount ?? null,
    }
  }

  get sessionId(): string {
    return this.info.sessionId
  }

  get current(): Exercise | null {
    return this.exercise
  }

  /** How many tasks are behind us, the current one included. */
  get position(): number {
    return this.index + 1
  }

  get streak(): number {
    return this.streakValue
  }

  /**
   * How many times in a row the current task went unheard.
   * The interface brings out the fallback input off this counter (T5).
   */
  get unheardInARow(): number {
    return this.unheard
  }

  get finished(): boolean {
    return this.finishedResult !== null
  }

  get result(): SessionResult | null {
    return this.finishedResult
  }

  start(): void {
    if (this.index >= 0) throw new Error('The session has already started')

    this.startedAt = this.now()
    this.notify((observer) => observer.onSessionStarted?.(this.info))
    this.advance()
  }

  submit(attempt: AnswerAttempt): AnswerResult {
    const exercise = this.exercise
    if (!exercise) throw new Error('The session has not started, or is already over')

    const verdict = exercise.answer.check(attempt)
    const elapsedMs = this.now() - this.taskStartedAt

    // C5: not caught means the equipment is at fault, not the child.
    // Streak, mistake count and the attempt counter all stay untouched.
    if (verdict === 'unrecognised') {
      this.unheard++
      return this.report({ exercise, verdict, elapsedMs, streak: this.streakValue, attemptNumber: this.attemptsOnTask })
    }

    this.unheard = 0
    this.attemptsOnTask++

    if (verdict === 'correct') {
      this.streakValue++
      this.solved++
    } else {
      this.streakValue = 0
      this.mistakeCount++
    }

    const result = this.report({
      exercise,
      verdict,
      elapsedMs,
      streak: this.streakValue,
      attemptNumber: this.attemptsOnTask,
    })

    // A task that would not yield within its attempts is simply left behind;
    // it comes back later through the review queue (C3).
    if (verdict === 'correct' || this.attemptsOnTask >= this.maxAttempts) this.advance()

    return result
  }

  /** End the session early — the child is tired, say (P7). */
  abandon(): SessionResult {
    if (this.finishedResult) return this.finishedResult
    return this.finish()
  }

  private advance(): void {
    this.index++

    if (this.info.taskCount !== null && this.index >= this.info.taskCount) {
      this.finish()
      return
    }

    this.presented++
    this.exercise = this.config.nextExercise()
    this.attemptsOnTask = 0
    this.unheard = 0
    this.taskStartedAt = this.now()
    this.notify((observer) => observer.onTaskPresented?.(this.exercise!))
  }

  private finish(): SessionResult {
    this.exercise = null
    const result: SessionResult = {
      sessionId: this.info.sessionId,
      total: this.presented,
      correct: this.solved,
      mistakes: this.mistakeCount,
      stars: starsFor(this.mistakeCount),
      elapsedMs: this.now() - this.startedAt,
    }
    this.finishedResult = result
    this.notify((observer) => observer.onSessionFinished?.(result))
    return result
  }

  private report(result: AnswerResult): AnswerResult {
    this.notify((observer) => observer.onAnswerAccepted?.(result))
    return result
  }

  /**
   * An observer that throws must not take the lesson down with it: a broken
   * battle animation is no reason to cut the child's practice short.
   */
  private notify(action: (observer: SessionObserver) => void): void {
    for (const observer of this.observers) {
      try {
        action(observer)
      } catch (cause) {
        console.error('A session observer threw:', cause)
      }
    }
  }
}

/** 3 ⭐ for a clean run, 2 ⭐ for one or two mistakes, 1 ⭐ for getting there. */
export function starsFor(mistakes: number): 1 | 2 | 3 {
  if (mistakes === 0) return 3
  if (mistakes <= 2) return 2
  return 1
}
