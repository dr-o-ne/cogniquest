import { describe, expect, it } from 'vitest'
import { ReviewQueue } from './ReviewQueue'

describe('ReviewQueue — spaced review (C3)', () => {
  it('a mistake brings the task back in the very next session', () => {
    const queue = new ReviewQueue()
    queue.recordMistake('math:8+5', 3, 10)

    expect(queue.due(10)).toHaveLength(0)
    expect(queue.due(11)).toHaveLength(1)
  })

  it('each survived repeat pushes the next one further: 1 → 3 → 7', () => {
    const queue = new ReviewQueue()
    queue.recordMistake('math:8+5', 3, 0)
    expect(queue.toJSON()[0]?.dueAtSession).toBe(1)

    queue.recordSuccess('math:8+5', 1)
    expect(queue.toJSON()[0]?.dueAtSession).toBe(4)

    queue.recordSuccess('math:8+5', 4)
    expect(queue.toJSON()[0]?.dueAtSession).toBe(11)
  })

  it('survived all three repeats — count it as learned', () => {
    const queue = new ReviewQueue()
    queue.recordMistake('math:8+5', 3, 0)
    queue.recordSuccess('math:8+5', 1)
    queue.recordSuccess('math:8+5', 4)
    queue.recordSuccess('math:8+5', 11)

    expect(queue.size).toBe(0)
  })

  it('a new mistake throws progress back to the start', () => {
    const queue = new ReviewQueue()
    queue.recordMistake('math:8+5', 3, 0)
    queue.recordSuccess('math:8+5', 1)
    expect(queue.toJSON()[0]?.stage).toBe(1)

    queue.recordMistake('math:8+5', 3, 5)
    expect(queue.toJSON()[0]?.stage).toBe(0)
    expect(queue.toJSON()[0]?.dueAtSession).toBe(6)
  })

  it('success on an unknown task breaks nothing', () => {
    const queue = new ReviewQueue()
    expect(() => queue.recordSuccess('math:1+1', 3)).not.toThrow()
    expect(queue.size).toBe(0)
  })

  it('can be asked about one level only', () => {
    const queue = new ReviewQueue()
    queue.recordMistake('math:8+5', 3, 0)
    queue.recordMistake('math:30+40', 4, 0)

    expect(queue.due(5)).toHaveLength(2)
    expect(queue.due(5, 3)).toHaveLength(1)
    expect(queue.due(5, 4)[0]?.exerciseId).toBe('math:30+40')
  })

  it('the longest overdue comes first', () => {
    const queue = new ReviewQueue()
    queue.recordMistake('math:late', 1, 5)
    queue.recordMistake('math:early', 1, 0)

    expect(queue.due(10).map((item) => item.exerciseId)).toEqual(['math:early', 'math:late'])
  })

  it('survives a save and a load', () => {
    const queue = new ReviewQueue()
    queue.recordMistake('math:8+5', 3, 0)
    queue.recordSuccess('math:8+5', 1)

    const restored = new ReviewQueue(JSON.parse(JSON.stringify(queue.toJSON())))
    expect(restored.toJSON()).toEqual(queue.toJSON())
  })
})
