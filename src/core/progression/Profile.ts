import type { AnswerResult, SessionObserver, SessionResult } from '../session/SessionObserver'
import { ReviewQueue, type ReviewItem } from './ReviewQueue'

export const PROFILE_VERSION = 1

export interface ProfileData {
  version: number
  name: string
  /** How many sessions there have been. Review intervals count off it (C3). */
  sessionIndex: number
  review: ReviewItem[]
  /** monster id → how many times it has been beaten. */
  defeated: Record<string, number>
  /**
   * squad id → how many times that squad has been beaten (**G9**).
   *
   * Its own map rather than more entries in `defeated`, which is keyed by
   * roster id: a squad is not an opponent on the roster, and beating one is
   * not the same event as beating each of its members — both are recorded,
   * and only one of them is what a squad card is struck through for.
   */
  squadsBeaten: Record<string, number>
  /**
   * quest id → how many of its stops are cleared, counted from the start of
   * the path. Equal to the path's length means the quest is finished.
   *
   * A count and not a set, because a path is walked in order: the third stop
   * is reachable only through the first two, so which ones are done is the
   * same fact as how many. A loss does not move it — the child stays on the
   * node they lost, tries again, and keeps everything behind them (**P10**).
   */
  questProgress: Record<string, number>
  /**
   * Battles won. Counted apart from `defeated` since a battle can be fought
   * against a squad (**G9**): four opponents beaten at once is four entries
   * there and one victory here.
   */
  battles: number
  stars: number
  solved: number
  mistakes: number
  lastPlayedAt: number | null
}

function defaults(): ProfileData {
  return {
    version: PROFILE_VERSION,
    name: '',
    sessionIndex: 0,
    review: [],
    defeated: {},
    squadsBeaten: {},
    questProgress: {},
    battles: 0,
    stars: 0,
    solved: 0,
    mistakes: 0,
    lastPlayedAt: null,
  }
}

/**
 * Everything that outlives quitting the game: level, tally, review queue.
 *
 * The profile subscribes to the session itself (A4) — that is, it works
 * through the very seam gamification will later plug into. Which doubles as
 * proof that the seam is real and not merely drawn.
 */
export class Profile implements SessionObserver {
  private readonly data: ProfileData
  private readonly queue: ReviewQueue
  private readonly now: () => number

  /**
   * Tasks stumbled on right now. They keep a mistake fixed on the second
   * attempt from counting as a survived repeat: the repeat belongs in the next
   * session, not half a minute later.
   */
  private readonly stumbledNow = new Set<string>()

  constructor(data: Partial<ProfileData> = {}, now: () => number = () => Date.now()) {
    this.data = { ...defaults(), ...data }
    // The save could come from an older version, or be corrupted.
    if (typeof this.data.defeated !== 'object' || this.data.defeated === null) {
      this.data.defeated = {}
    }
    // A save from before squads existed has no such map, which reads correctly
    // as «no squad has been beaten yet» — there were none to beat.
    if (typeof this.data.squadsBeaten !== 'object' || this.data.squadsBeaten === null) {
      this.data.squadsBeaten = {}
    }
    // A save from before quests existed has no such map, which reads
    // correctly as «no path has been walked yet» — there were none to walk.
    if (typeof this.data.questProgress !== 'object' || this.data.questProgress === null) {
      this.data.questProgress = {}
    }
    // A save written before squads existed carries no battle count and needs
    // none: a battle was one opponent then, so the per-opponent tally IS the
    // count. Read that way rather than started at nought, which is what
    // bumping PROFILE_VERSION would have cost the child.
    if (data.battles === undefined) {
      this.data.battles = Object.values(this.data.defeated).reduce((sum, count) => sum + count, 0)
    }
    this.queue = new ReviewQueue(this.data.review)
    this.now = now
  }

  /** Reads a save. Junk or a foreign version: start over, never crash. */
  static fromJSON(raw: unknown, now?: () => number): Profile {
    if (raw === null || typeof raw !== 'object') return new Profile({}, now)
    const candidate = raw as Partial<ProfileData>
    if (candidate.version !== PROFILE_VERSION) return new Profile({}, now)
    return new Profile(candidate, now)
  }

  get name(): string {
    return this.data.name
  }

  set name(value: string) {
    this.data.name = value
  }

  get sessionIndex(): number {
    return this.data.sessionIndex
  }

  get stars(): number {
    return this.data.stars
  }

  get solved(): number {
    return this.data.solved
  }

  get mistakes(): number {
    return this.data.mistakes
  }

  get lastPlayedAt(): number | null {
    return this.data.lastPlayedAt
  }

  get review(): ReviewQueue {
    return this.queue
  }

  /** Who has been beaten, and how often. A copy, so nobody edits it from outside. */
  get defeated(): Record<string, number> {
    return { ...this.data.defeated }
  }

  /** Which squads have been beaten, and how often (**G9**). Also a copy. */
  get squadsBeaten(): Record<string, number> {
    return { ...this.data.squadsBeaten }
  }

  /** How far along each path the child has walked. A copy, like the others. */
  get questProgress(): Record<string, number> {
    return { ...this.data.questProgress }
  }

  /**
   * A stop on a path cleared.
   *
   * Never goes backwards: replaying a finished quest, or a node behind the
   * furthest one reached, must not undo what is already walked. So the higher
   * of the two stands — which also makes the call safe to repeat.
   */
  recordQuestStep(questId: string, cleared: number): void {
    this.data.questProgress[questId] = Math.max(this.data.questProgress[questId] ?? 0, cleared)
  }

  /** Battles won in total — one per battle, whatever stood on the other side. */
  get victories(): number {
    return this.data.battles
  }

  hasDefeated(monsterId: string): boolean {
    return (this.data.defeated[monsterId] ?? 0) > 0
  }

  /**
   * A battle won, against everyone named — and against the squad they stood
   * in, when they stood in one from the config (**G9**).
   *
   * Everything goes in at once rather than one call per thing beaten, because
   * the three tallies must not drift: one victory, one tick against each
   * opponent who stood in it (each of them once, however many slots it filled),
   * and one against the squad itself.
   */
  recordVictory(monsterIds: readonly string[], squadId?: string): void {
    this.data.battles++

    for (const id of new Set(monsterIds)) {
      this.data.defeated[id] = (this.data.defeated[id] ?? 0) + 1
    }

    if (squadId !== undefined) {
      this.data.squadsBeaten[squadId] = (this.data.squadsBeaten[squadId] ?? 0) + 1
    }
  }

  // --- SessionObserver ---

  onAnswerAccepted(result: AnswerResult): void {
    // C5: not caught means the equipment is at fault, not the child. Skip it.
    if (result.verdict === 'unrecognised') return

    const { id, level } = result.exercise

    if (result.verdict === 'wrong') {
      this.data.mistakes++
      this.stumbledNow.add(id)
      this.queue.recordMistake(id, level, this.data.sessionIndex)
      return
    }

    this.data.solved++
    // Fixed on the second attempt — that is not a survived repeat.
    if (!this.stumbledNow.has(id)) this.queue.recordSuccess(id, this.data.sessionIndex)
  }

  onSessionFinished(result: SessionResult): void {
    this.data.sessionIndex++
    this.data.stars += result.stars
    this.data.lastPlayedAt = this.now()
    this.stumbledNow.clear()
  }

  toJSON(): ProfileData {
    return {
      ...this.data,
      review: this.queue.toJSON(),
      defeated: { ...this.data.defeated },
      squadsBeaten: { ...this.data.squadsBeaten },
      questProgress: { ...this.data.questProgress },
    }
  }
}
