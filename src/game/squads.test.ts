import { describe, expect, it } from 'vitest'
import type { TaskKind } from '@/core/math'
import { taskChoices } from '@/core/math'
import { t } from '@/locale'
import { MAX_SQUAD } from './Battle'
import { availableMonsters, monsterById, type Monster } from './monsters'
import { SQUADS, squadById } from './squads'

/**
 * The ready-made squads (**G9**).
 *
 * The table itself is four lines, and most of what could go wrong with it is
 * arithmetic nobody would notice: a group of one, a member who never appears on
 * the selection screen, a lineup that asks the same row three times over and is
 * therefore not a mix of anything. So the rules the table is written to are
 * here, measured off the built squads rather than off the lineups.
 */
describe('the ready-made squads', () => {
  const rows = (monster: Monster) => monster.tasks

  it('there are some, and every id is unique', () => {
    expect(SQUADS.length).toBeGreaterThan(0)
    const ids = SQUADS.map((squad) => squad.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('the sizes and levels asked for: 2×1, 3×2, 4×3, and four mixed', () => {
    expect(SQUADS.map((squad) => squad.monsters.length)).toEqual([2, 3, 4, 4])
    expect(SQUADS.map((squad) => squad.levels)).toEqual([
      [1],
      [1, 2],
      [2, 3],
      // The mixed one, drawn from bands 1, 2, 3 and 3 — every rung its members
      // reach, which is the whole ladder up to the third band.
      [1, 2, 3],
    ])
  })

  it('a group is two to five strong', () => {
    for (const squad of SQUADS) {
      expect(squad.monsters.length, `${squad.id} is not a group`).toBeGreaterThanOrEqual(2)
      expect(squad.monsters.length, `${squad.id} is too big`).toBeLessThanOrEqual(MAX_SQUAD)
    }
  })

  it('every squad has a name in the text pack', () => {
    for (const squad of SQUADS) {
      expect(t.squads[squad.id], `no name for ${squad.id}`).toBeDefined()
      expect(squad.name).not.toBe(squad.id)
    }
  })

  it('every member is a unit the child could also meet on its own', () => {
    // A squad puts its members on the screen, so the roster's own rule holds:
    // no picture, no appearance. `build` throws for it, so this pins the rule
    // rather than catching a slip — but the rule is the reason for the throw.
    const shown = new Set(availableMonsters().map((monster) => monster.id))
    for (const squad of SQUADS) {
      for (const monster of squad.monsters) {
        expect(shown.has(monster.id), `${squad.id} fields ${monster.id}, who is not shown`).toBe(true)
      }
    }
  })

  /**
   * The rule the table exists for. A battle is a run of one row by default
   * (**G8**); a shuffled squad is what puts «mixed, not blocked» back, and it
   * can only do that if its members ask different rows. Three members asking
   * addition would be a squad in name and a single opponent in effect.
   */
  it('a squad mixes as many rows of the grid as it has room for', () => {
    const allRows = new Set(availableMonsters().flatMap(rows))

    for (const squad of SQUADS) {
      const mixed = new Set(squad.monsters.flatMap(rows))
      const possible = Math.min(squad.monsters.length, allRows.size)

      expect(mixed.size, `${squad.id} mixes only ${[...mixed].join(', ')}`).toBe(possible)
    }
  })

  it('every member has a question it can actually be asked', () => {
    for (const squad of SQUADS) {
      for (const monster of squad.monsters) {
        const choices = taskChoices(monster.tasks, monster.levels)
        expect(choices.length, `nothing to ask for ${monster.id} in ${squad.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('the table runs easiest first, the way the roster does', () => {
    for (let i = 1; i < SQUADS.length; i++) {
      const before = Math.max(...SQUADS[i - 1]!.levels)
      const now = Math.max(...SQUADS[i]!.levels)
      expect(now, `${SQUADS[i]!.id} is easier than the squad above it`).toBeGreaterThanOrEqual(before)
    }
  })

  describe('what is read off the members', () => {
    it('the hearts are every heart of every member — the length of the battle', () => {
      for (const squad of SQUADS) {
        const total = squad.monsters.reduce((sum, monster) => sum + monster.hearts, 0)
        expect(squad.hearts).toBe(total)
      }

      // Deliberately not divided by the squad's size (**G9**), so the numbers
      // are large and the table above is where they are decided.
      expect(squadById('two-on-the-path').hearts).toBe(40)
      expect(squadById('beast-pack').hearts).toBe(54)
      expect(squadById('sky-watch').hearts).toBe(64)
      expect(squadById('motley-band').hearts).toBe(70)
    })

    it('the level and the colour come from the strongest member', () => {
      for (const squad of SQUADS) {
        const levels = squad.monsters.map((monster) => monster.level)
        expect(squad.level, squad.id).toBe(Math.max(...levels))

        const hardest = squad.monsters.find((monster) => monster.level === squad.level)!
        expect(squad.color, squad.id).toBe(hardest.color)
      }
    })

    it('a mixed group is as strong as its worst member, not its average', () => {
      // Bands 1, 2, 3 and 3. An average would call it a level 2 fight and
      // promise the child something easier than the two members they will
      // actually meet.
      const motley = squadById('motley-band')
      expect(motley.monsters.map((monster) => monster.level)).toEqual([1, 2, 3, 3])
      expect(motley.level).toBe(3)
    })

    it('the level of every squad has a strength in the text pack', () => {
      for (const squad of SQUADS) {
        expect(t.strength[squad.level], `no strength for ${squad.id}`).toBeDefined()
      }
    })

    it('the same monster is the same battle whether met alone or in a squad', () => {
      // The squad carries the monsters themselves, not copies with their own
      // numbers — so nothing about a unit can be tuned by putting it in a group.
      for (const squad of SQUADS) {
        for (const monster of squad.monsters) {
          expect(monster).toBe(monsterById(monster.id))
        }
      }
    })
  })

  it('all four are shuffled today, and the flag is real either way', () => {
    for (const squad of SQUADS) expect(squad.shuffle).toBe(true)
  })

  it('an unknown squad is an error', () => {
    expect(() => squadById('the-avengers')).toThrow(RangeError)
  })
})

/** Kept honest by the compiler: the row names below have to exist. */
const ROWS: readonly TaskKind[] = [
  'addition',
  'subtraction',
  'comparing-numbers',
  'making-a-number',
]

describe('which rows each squad actually asks', () => {
  // Spelled out one squad at a time, because the mix is the reason the lineups
  // are grouped the way they are, and a rewrite that keeps the sizes while
  // losing the mix would pass every assertion above except the one it should.
  const asked = (id: string) => new Set(squadById(id).monsters.flatMap((monster) => monster.tasks))

  it('two on the path — the two operations', () => {
    expect(asked('two-on-the-path')).toEqual(new Set(['addition', 'subtraction']))
  })

  it('the beast pack — three of the four rows', () => {
    expect(asked('beast-pack')).toEqual(
      new Set(['addition', 'subtraction', 'comparing-numbers']),
    )
  })

  it('the sky watch and the motley band — every row of the grid', () => {
    for (const id of ['sky-watch', 'motley-band']) {
      expect(asked(id), id).toEqual(new Set(ROWS))
    }
  })
})
