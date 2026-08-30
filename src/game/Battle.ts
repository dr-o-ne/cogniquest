import type { SessionObserver } from '@/core/session'
import type { AnswerResult } from '@/core/session'
import type { Monster } from './monsters'
import { PLAYER_HEARTS } from './monsters'

export type Winner = 'player' | 'monster' | null

export interface BattleState {
  readonly playerHearts: number
  readonly monsterHearts: number
  readonly winner: Winner
  /** What happened on the last answer — animations hang off this. */
  readonly lastHit: 'monster' | 'player' | null
}

/**
 * The battle (G1). It plugs into a session as an ordinary SessionObserver —
 * that is, through the A4 seam it was conceived for.
 *
 * The mini-game does not know battles exist: delete this class and the math
 * carries on exactly as before.
 */
export class Battle implements SessionObserver {
  private player: number
  private monsterHp: number
  private winnerValue: Winner = null
  private hit: 'monster' | 'player' | null = null

  constructor(
    readonly monster: Monster,
    playerHearts: number = PLAYER_HEARTS,
  ) {
    if (playerHearts < 1) throw new RangeError('The player needs at least one heart')
    if (monster.hearts < 1) throw new RangeError('The monster needs at least one heart')
    this.player = playerHearts
    this.monsterHp = monster.hearts
  }

  get state(): BattleState {
    return {
      playerHearts: this.player,
      monsterHearts: this.monsterHp,
      winner: this.winnerValue,
      lastHit: this.hit,
    }
  }

  get finished(): boolean {
    return this.winnerValue !== null
  }

  onAnswerAccepted(result: AnswerResult): void {
    if (this.finished) return

    // C5: not catching an answer is about the microphone, not about the sums.
    // Not one heart may suffer for it.
    if (result.verdict === 'unrecognised') {
      this.hit = null
      return
    }

    if (result.verdict === 'correct') {
      this.monsterHp = Math.max(0, this.monsterHp - 1)
      this.hit = 'monster'
      if (this.monsterHp === 0) this.winnerValue = 'player'
      return
    }

    this.player = Math.max(0, this.player - 1)
    this.hit = 'player'
    if (this.player === 0) this.winnerValue = 'monster'
  }
}
