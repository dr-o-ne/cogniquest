import type { Verdict } from '../exercises'
import { FIRST_LEVEL } from '../math/levels'

/** Three mistakes in a row and the level quietly drops a step (C4). */
const MISTAKES_BEFORE_EASING = 3
/** Five correct in a row and we climb back. */
const CORRECT_BEFORE_RESTORING = 5

/**
 * The invisible difficulty adjustment (C4).
 *
 * The child is told none of it: no message, no «level lowered». The teacher
 * simply offers «let's warm up on an easier one».
 *
 * It can only go below the child's own level, and only for a while — moving up
 * to a new level is a different story altogether, one about the map and about
 * progress.
 */
export class DifficultyAdapter {
  private level: number
  private wrongInARow = 0
  private correctInARow = 0

  constructor(
    readonly baseLevel: number,
    private readonly floor: number = FIRST_LEVEL,
  ) {
    if (baseLevel < floor) throw new RangeError(`Level ${baseLevel} is below the floor ${floor}`)
    this.level = baseLevel
  }

  get current(): number {
    return this.level
  }

  /** Whether we are currently eased down. For the parent screen only. */
  get eased(): boolean {
    return this.level < this.baseLevel
  }

  onVerdict(verdict: Verdict): void {
    // C5: «did not catch that» is about the microphone, not about the sums.
    // It must move neither the streak nor the difficulty.
    if (verdict === 'unrecognised') return

    if (verdict === 'wrong') {
      this.correctInARow = 0
      this.wrongInARow++

      if (this.wrongInARow >= MISTAKES_BEFORE_EASING && this.level > this.floor) {
        this.level--
        this.wrongInARow = 0
      }
      return
    }

    this.wrongInARow = 0
    this.correctInARow++

    if (this.correctInARow >= CORRECT_BEFORE_RESTORING && this.level < this.baseLevel) {
      this.level++
      this.correctInARow = 0
    }
  }
}
