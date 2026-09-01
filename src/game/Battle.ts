import type { SessionObserver } from '@/core/session'
import type { AnswerResult } from '@/core/session'
import { playerHeartsFor, type Encounter } from './encounter'

export type Winner = 'player' | 'monster' | null

/** One enemy stack as the screen sees it. */
export interface StackState {
  readonly hearts: number
  readonly max: number
}

export interface BattleState {
  readonly playerHearts: number
  /** How many the child started with — the row of hearts is drawn to this. */
  readonly playerMax: number
  /** Every stack, in the order they are fought. */
  readonly stacks: readonly StackState[]
  /**
   * Which stack the next correct answer hits. Past the end of the list once
   * they have all fallen, which is also when the battle is won.
   */
  readonly target: number
  readonly winner: Winner
  /** What happened on the last answer — animations hang off this. */
  readonly lastHit: 'monster' | 'player' | null
  /** The stack the last answer finished off, if it finished one. */
  readonly felled: number | null
}

/**
 * The battle (G1). It plugs into a session as an ordinary SessionObserver —
 * that is, through the A4 seam it was conceived for.
 *
 * A squad is fought one stack at a time, front to back: every correct answer
 * takes a heart off the stack in front, and when that one falls the next steps
 * up. Which is the point of squads — a win every four or five tasks instead of
 * one at the end of twenty.
 *
 * The mini-game does not know battles exist: delete this class and the math
 * carries on exactly as before.
 */
export class Battle implements SessionObserver {
  private player: number
  private readonly hearts: number[]
  private targetIndex = 0
  private winnerValue: Winner = null
  private hit: 'monster' | 'player' | null = null
  private felledNow: number | null = null

  constructor(
    readonly encounter: Encounter,
    readonly playerMax: number = playerHeartsFor(encounter),
  ) {
    const playerHearts = playerMax
    if (playerHearts < 1) throw new RangeError('The player needs at least one heart')
    if (encounter.stacks.length === 0) throw new RangeError('An encounter needs at least one stack')
    if (encounter.stacks.some((stack) => stack.hearts < 1)) {
      throw new RangeError('Every stack needs at least one heart')
    }

    this.player = playerHearts
    this.hearts = encounter.stacks.map((stack) => stack.hearts)
  }

  get state(): BattleState {
    return {
      playerHearts: this.player,
      playerMax: this.playerMax,
      stacks: this.hearts.map((hearts, i) => ({ hearts, max: this.encounter.stacks[i]!.hearts })),
      target: this.targetIndex,
      winner: this.winnerValue,
      lastHit: this.hit,
      felled: this.felledNow,
    }
  }

  get finished(): boolean {
    return this.winnerValue !== null
  }

  onAnswerAccepted(result: AnswerResult): void {
    if (this.finished) return

    this.felledNow = null

    // C5: not catching an answer is about the microphone, not about the sums.
    // Not one heart may suffer for it.
    if (result.verdict === 'unrecognised') {
      this.hit = null
      return
    }

    if (result.verdict === 'correct') {
      const target = this.targetIndex
      this.hearts[target] = Math.max(0, this.hearts[target]! - 1)
      this.hit = 'monster'

      if (this.hearts[target] === 0) {
        this.felledNow = target
        this.targetIndex++
        if (this.targetIndex >= this.hearts.length) this.winnerValue = 'player'
      }
      return
    }

    this.player = Math.max(0, this.player - 1)
    this.hit = 'player'
    if (this.player === 0) this.winnerValue = 'monster'
  }
}
