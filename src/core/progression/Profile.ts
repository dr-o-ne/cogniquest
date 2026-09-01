import type { AnswerResult, SessionObserver, SessionResult } from '../session/SessionObserver'
import { ReviewQueue, type ReviewItem } from './ReviewQueue'

export const PROFILE_VERSION = 1

/**
 * The campaign in progress: which one, and how much of it is behind us.
 *
 * The map itself is not stored. It is generated from the seed, so the save
 * stays a handful of bytes and the road is identical every time it is drawn.
 */
export interface CampaignData {
  seed: number
  /** Node ids already beaten. Pockets and road nodes alike. */
  cleared: string[]
}

export interface ProfileData {
  version: number
  name: string
  /** How many sessions there have been. Review intervals count off it (C3). */
  sessionIndex: number
  review: ReviewItem[]
  /** monster id → how many times it has been beaten. */
  defeated: Record<string, number>
  stars: number
  solved: number
  mistakes: number
  lastPlayedAt: number | null
  /** The purse. It carries across campaigns; nothing spends it yet (G10). */
  gold: number
  campaign: CampaignData | null
}

function defaults(): ProfileData {
  return {
    version: PROFILE_VERSION,
    name: '',
    sessionIndex: 0,
    review: [],
    defeated: {},
    stars: 0,
    solved: 0,
    mistakes: 0,
    lastPlayedAt: null,
    gold: 0,
    campaign: null,
  }
}

function isCampaign(value: unknown): value is CampaignData {
  if (value === null || typeof value !== 'object') return false
  const campaign = value as Partial<CampaignData>
  return typeof campaign.seed === 'number' && Array.isArray(campaign.cleared)
}

/**
 * Everything that outlives quitting the game: the purse, the campaign, the
 * tally, the review queue.
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
    // The save could come from an older version, or be corrupted. Every field
    // added after the fact is checked here rather than trusted: a save written
    // before it existed is the normal case, not the exception, because
    // PROFILE_VERSION is deliberately not bumped for an addition (bumping it
    // would wipe the child's progress to tidy a key nothing reads).
    if (typeof this.data.defeated !== 'object' || this.data.defeated === null) {
      this.data.defeated = {}
    }
    if (typeof this.data.gold !== 'number' || !Number.isFinite(this.data.gold)) {
      this.data.gold = 0
    }
    if (!isCampaign(this.data.campaign)) {
      this.data.campaign = null
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

  /** Battles won in total. */
  get victories(): number {
    return Object.values(this.data.defeated).reduce((sum, count) => sum + count, 0)
  }

  // --- the journey ---

  get gold(): number {
    return this.data.gold
  }

  /** What the child is walking, or null before the first campaign is drawn. */
  get campaign(): CampaignData | null {
    const campaign = this.data.campaign
    return campaign === null ? null : { seed: campaign.seed, cleared: [...campaign.cleared] }
  }

  /** What has been beaten in the campaign in progress. */
  get cleared(): ReadonlySet<string> {
    return new Set(this.data.campaign?.cleared ?? [])
  }

  /** A fresh road. The purse is deliberately left alone — it is the one thing that carries. */
  startCampaign(seed: number): void {
    this.data.campaign = { seed, cleared: [] }
  }

  /** A node taken. Beating it a second time changes nothing. */
  clearNode(nodeId: string): void {
    const campaign = this.data.campaign
    if (!campaign) return
    if (!campaign.cleared.includes(nodeId)) campaign.cleared.push(nodeId)
  }

  earn(amount: number): void {
    if (amount > 0) this.data.gold += Math.round(amount)
  }

  hasDefeated(monsterId: string): boolean {
    return (this.data.defeated[monsterId] ?? 0) > 0
  }

  recordVictory(monsterId: string): void {
    this.data.defeated[monsterId] = (this.data.defeated[monsterId] ?? 0) + 1
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
      campaign: this.campaign,
    }
  }
}
