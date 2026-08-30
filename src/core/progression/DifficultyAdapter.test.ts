import { describe, expect, it } from 'vitest'
import type { Verdict } from '../exercises'
import { DifficultyAdapter } from './DifficultyAdapter'

function feed(adapter: DifficultyAdapter, verdict: Verdict, times: number) {
  for (let i = 0; i < times; i++) adapter.onVerdict(verdict)
}

describe('DifficultyAdapter — the quiet adjustment (C4)', () => {
  it('three mistakes in a row lower the level', () => {
    const adapter = new DifficultyAdapter(3)

    feed(adapter, 'wrong', 2)
    expect(adapter.current).toBe(3)

    adapter.onVerdict('wrong')
    expect(adapter.current).toBe(2)
    expect(adapter.eased).toBe(true)
  })

  it('a correct answer clears the mistake counter', () => {
    const adapter = new DifficultyAdapter(3)
    feed(adapter, 'wrong', 2)
    adapter.onVerdict('correct')
    feed(adapter, 'wrong', 2)

    expect(adapter.current).toBe(3)
  })

  it('five correct in a row bring the level back', () => {
    const adapter = new DifficultyAdapter(3)
    feed(adapter, 'wrong', 3)
    expect(adapter.current).toBe(2)

    feed(adapter, 'correct', 4)
    expect(adapter.current).toBe(2)

    adapter.onVerdict('correct')
    expect(adapter.current).toBe(3)
    expect(adapter.eased).toBe(false)
  })

  it('never climbs above its own level — that is for the map to decide', () => {
    const adapter = new DifficultyAdapter(3)
    feed(adapter, 'correct', 50)
    expect(adapter.current).toBe(3)
  })

  it('never drops below the first level', () => {
    const adapter = new DifficultyAdapter(1)
    feed(adapter, 'wrong', 30)
    expect(adapter.current).toBe(1)
  })

  it('drops one step at a time', () => {
    const adapter = new DifficultyAdapter(5)
    feed(adapter, 'wrong', 3)
    expect(adapter.current).toBe(4)
    feed(adapter, 'wrong', 3)
    expect(adapter.current).toBe(3)
  })

  it('C5: a miss does not touch difficulty', () => {
    const adapter = new DifficultyAdapter(3)
    feed(adapter, 'unrecognised', 20)
    expect(adapter.current).toBe(3)

    feed(adapter, 'wrong', 2)
    feed(adapter, 'unrecognised', 5)
    adapter.onVerdict('wrong')
    // Three mistakes did add up; the misses did not reset them.
    expect(adapter.current).toBe(2)
  })

  it('a level below the floor is a configuration error', () => {
    expect(() => new DifficultyAdapter(1, 2)).toThrow(RangeError)
  })
})
