import { pick, systemRandom, type Random } from '@/core/random'
import type { SessionObserver } from '@/core/session'
import type { AnswerResult } from '@/core/session'
import type { Monster } from './monsters'
import { PLAYER_HEARTS } from './monsters'

export type Winner = 'player' | 'monster' | null

/**
 * How many opponents may stand on the other side at once.
 *
 * Five is where the header runs out of room, not where the code does: the HUD
 * draws every heart of every opponent one by one, and a sixth row of them stops
 * being countable at a glance.
 */
export const MAX_SQUAD = 5

/** One opponent of the squad, as the screen needs it. */
export interface Foe {
  readonly monster: Monster
  /** Hearts left. Zero means beaten and out of the fight for good. */
  readonly hearts: number
}

export interface BattleState {
  readonly playerHearts: number
  /** The whole squad, in the order it was picked. Beaten ones stay in the list. */
  readonly foes: readonly Foe[]
  /** Who is asking — an index into `foes`. */
  readonly asking: number
  readonly winner: Winner
  /** What happened on the last answer — animations hang off this. */
  readonly lastHit: 'monster' | 'player' | null
  /** Which foe the last hit landed on. Null when the child took it instead. */
  readonly hitFoe: number | null
}

export interface BattleConfig {
  /**
   * How the squad takes turns.
   *
   * `false` — one opponent holds the arena until it is beaten, then the next
   * steps up. A squad is then a gauntlet of runs, each of them a run of one row
   * of the grid (**G8**), which is what a single battle already was.
   *
   * `true` — the next question comes from whichever survivor is drawn, so the
   * rows come mixed within the one battle.
   */
  readonly shuffle?: boolean
  readonly playerHearts?: number
  /** Only consulted when shuffled. Passed in so tests can fix the order. */
  readonly random?: Random
}

/**
 * The battle (G1). It plugs into a session as an ordinary SessionObserver —
 * that is, through the A4 seam it was conceived for.
 *
 * The mini-game does not know battles exist: delete this class and the math
 * carries on exactly as before.
 *
 * One to five opponents (**MAX_SQUAD**) stand on the other side, and the same
 * monster may stand there twice — a squad is a list, not a set, so five peasants
 * is a legal squad of five separate opponents. Each keeps its own hearts, so a
 * squad is as long as its members added up; the child's six do not grow with it.
 */
export class Battle implements SessionObserver {
  /** Hearts left, one per squad slot. Parallel to `squad`. */
  private readonly hearts: number[]
  private readonly shuffle: boolean
  private readonly random: Random
  private player: number
  private askingIndex = 0
  private winnerValue: Winner = null
  private hit: 'monster' | 'player' | null = null
  private hitIndex: number | null = null

  constructor(
    readonly squad: readonly Monster[],
    config: BattleConfig = {},
  ) {
    const playerHearts = config.playerHearts ?? PLAYER_HEARTS

    if (squad.length < 1) throw new RangeError('A battle needs at least one opponent')
    if (squad.length > MAX_SQUAD) throw new RangeError(`A squad is at most ${MAX_SQUAD} strong`)
    if (playerHearts < 1) throw new RangeError('The player needs at least one heart')
    for (const monster of squad) {
      if (monster.hearts < 1) throw new RangeError(`${monster.id} needs at least one heart`)
    }

    this.hearts = squad.map((monster) => monster.hearts)
    this.shuffle = config.shuffle ?? false
    this.random = config.random ?? systemRandom
    this.player = playerHearts
  }

  get state(): BattleState {
    return {
      playerHearts: this.player,
      foes: this.squad.map((monster, slot) => ({ monster, hearts: this.hearts[slot]! })),
      asking: this.askingIndex,
      winner: this.winnerValue,
      lastHit: this.hit,
      hitFoe: this.hitIndex,
    }
  }

  get finished(): boolean {
    return this.winnerValue !== null
  }

  /** Whoever is holding the arena right now. */
  get asker(): Monster {
    return this.squad[this.askingIndex]!
  }

  /**
   * Whose turn it is to ask, decided afresh for every question — so the task
   * generator has to come through here before it draws anything.
   *
   * Once the squad is beaten there is nobody left to ask and the pick stands as
   * it was: the session generates one more task after the last heart goes, and
   * that task is never put to the child.
   */
  nextAsker(): Monster {
    const alive = this.hearts.flatMap((left, slot) => (left > 0 ? [slot] : []))

    if (alive.length > 0) {
      this.askingIndex = this.shuffle ? pick(this.random, alive) : alive[0]!
    }

    return this.asker
  }

  onAnswerAccepted(result: AnswerResult): void {
    if (this.finished) return

    // C5: not catching an answer is about the microphone, not about the sums.
    // Not one heart may suffer for it.
    if (result.verdict === 'unrecognised') {
      this.hit = null
      this.hitIndex = null
      return
    }

    if (result.verdict === 'correct') {
      // The heart comes off whoever asked, never off the front of the squad —
      // in a shuffled battle that is the whole of the mode.
      const slot = this.askingIndex
      this.hearts[slot] = Math.max(0, this.hearts[slot]! - 1)
      this.hit = 'monster'
      this.hitIndex = slot
      if (this.hearts.every((left) => left === 0)) this.winnerValue = 'player'
      return
    }

    this.player = Math.max(0, this.player - 1)
    this.hit = 'player'
    this.hitIndex = null
    if (this.player === 0) this.winnerValue = 'monster'
  }
}
