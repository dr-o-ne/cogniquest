/**
 * Spaced review of mistakes (C3): a task that tripped the child up comes back
 * after 1, then 3, then 7 sessions. Survive all three and we call it learned
 * and forget it.
 */
const REVIEW_INTERVALS = [1, 3, 7] as const

export interface ReviewItem {
  readonly exerciseId: string
  readonly level: number
  /** Index into REVIEW_INTERVALS: how many repeats have been survived. */
  readonly stage: number
  readonly dueAtSession: number
}

export class ReviewQueue {
  private readonly items = new Map<string, ReviewItem>()

  constructor(items: readonly ReviewItem[] = []) {
    for (const item of items) this.items.set(item.exerciseId, item)
  }

  get size(): number {
    return this.items.size
  }

  /** Got it wrong — bring it back soon and start the count over. */
  recordMistake(exerciseId: string, level: number, currentSession: number): void {
    this.items.set(exerciseId, {
      exerciseId,
      level,
      stage: 0,
      dueAtSession: currentSession + REVIEW_INTERVALS[0]!,
    })
  }

  /** Survived a repeat — the next interval is longer. Past the last one, drop it. */
  recordSuccess(exerciseId: string, currentSession: number): void {
    const item = this.items.get(exerciseId)
    if (!item) return

    const nextStage = item.stage + 1
    const interval = REVIEW_INTERVALS[nextStage]

    if (interval === undefined) {
      this.items.delete(exerciseId)
      return
    }

    this.items.set(exerciseId, {
      ...item,
      stage: nextStage,
      dueAtSession: currentSession + interval,
    })
  }

  /** What is due this session. Can be narrowed to a single level. */
  due(sessionIndex: number, level?: number): ReviewItem[] {
    return [...this.items.values()]
      .filter((item) => item.dueAtSession <= sessionIndex)
      .filter((item) => level === undefined || item.level === level)
      .sort((a, b) => a.dueAtSession - b.dueAtSession)
  }

  toJSON(): ReviewItem[] {
    return [...this.items.values()]
  }
}
