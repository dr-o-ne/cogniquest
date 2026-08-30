import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Exercise } from '../exercises'
import { ArithmeticAnswer } from '../math/ArithmeticAnswer'
import { ExerciseSession, starsFor } from './ExerciseSession'
import type { AnswerResult, SessionObserver, SessionResult } from './SessionObserver'

function exercise(answer: number): Exercise {
  return {
    id: `math:${answer}`,
    subject: 'math',
    level: 1,
    prompt: { kind: 'arithmetic', terms: [answer, 0], ops: ['+'] },
    answer: new ArithmeticAnswer(answer, { min: 0, max: 10 }),
  }
}

/** An observer that writes down everything it hears. */
function recorder() {
  const presented: Exercise[] = []
  const answers: AnswerResult[] = []
  let finished: SessionResult | null = null
  let started = 0

  const observer: SessionObserver = {
    onSessionStarted: () => started++,
    onTaskPresented: (e) => presented.push(e),
    onAnswerAccepted: (r) => answers.push(r),
    onSessionFinished: (r) => {
      finished = r
    },
  }

  return {
    observer,
    presented,
    answers,
    get started() {
      return started
    },
    get finished() {
      return finished as SessionResult | null
    },
  }
}

describe('ExerciseSession', () => {
  let clock = 0
  const now = () => clock

  beforeEach(() => {
    clock = 0
  })

  function session(answers: number[], options: { maxAttempts?: number; observer?: SessionObserver } = {}) {
    const queue = [...answers]
    return new ExerciseSession({
      subject: 'math',
      level: 1,
      taskCount: answers.length,
      nextExercise: () => exercise(queue.shift() ?? 0),
      observers: options.observer ? [options.observer] : [],
      now,
      ...(options.maxAttempts !== undefined ? { maxAttempts: options.maxAttempts } : {}),
    })
  }

  it('announces the session and shows the first task on start', () => {
    const log = recorder()
    const s = session([3, 4], { observer: log.observer })
    s.start()

    expect(log.started).toBe(1)
    expect(log.presented).toHaveLength(1)
    expect(s.current?.id).toBe('math:3')
    expect(s.position).toBe(1)
  })

  it('cannot be started twice', () => {
    const s = session([3])
    s.start()
    expect(() => s.start()).toThrow()
  })

  it('a correct answer moves on and grows the streak', () => {
    const s = session([3, 4])
    s.start()

    expect(s.submit({ kind: 'number', value: 3 }).verdict).toBe('correct')
    expect(s.streak).toBe(1)
    expect(s.current?.id).toBe('math:4')

    s.submit({ kind: 'number', value: 4 })
    expect(s.streak).toBe(2)
  })

  it('a mistake keeps the same task and resets the streak', () => {
    const s = session([3, 4])
    s.start()
    s.submit({ kind: 'number', value: 3 })
    expect(s.streak).toBe(1)

    const result = s.submit({ kind: 'number', value: 99 })
    expect(result.verdict).toBe('wrong')
    expect(result.attemptNumber).toBe(1)
    expect(s.streak).toBe(0)
    expect(s.current?.id).toBe('math:4')
  })

  it('a task that will not yield within its attempts is left behind anyway', () => {
    const s = session([3, 4], { maxAttempts: 2 })
    s.start()

    s.submit({ kind: 'number', value: 99 })
    expect(s.current?.id).toBe('math:3')

    s.submit({ kind: 'number', value: 98 })
    expect(s.current?.id).toBe('math:4')
  })

  describe('C5 — «did not catch that» costs nothing', () => {
    it('leaves streak, attempts and statistics alone', () => {
      const s = session([3, 4])
      s.start()
      s.submit({ kind: 'number', value: 3 })
      expect(s.streak).toBe(1)

      const result = s.submit({ kind: 'unrecognised' })
      expect(result.verdict).toBe('unrecognised')
      expect(result.streak).toBe(1)
      expect(result.attemptNumber).toBe(0)
      expect(s.streak).toBe(1)
      expect(s.current?.id).toBe('math:4')
    })

    it('does not eat an attempt — the task is not skipped past', () => {
      const s = session([3, 4], { maxAttempts: 2 })
      s.start()
      for (let i = 0; i < 10; i++) s.submit({ kind: 'unrecognised' })
      expect(s.current?.id).toBe('math:3')
    })

    it('counts consecutive misses for T5', () => {
      const s = session([3])
      s.start()
      expect(s.unheardInARow).toBe(0)

      s.submit({ kind: 'unrecognised' })
      s.submit({ kind: 'text', value: 'кхм' })
      expect(s.unheardInARow).toBe(2)

      s.submit({ kind: 'number', value: 99 })
      expect(s.unheardInARow).toBe(0)
    })

    it('never reaches the mistake count of the result', () => {
      const s = session([3])
      s.start()
      s.submit({ kind: 'unrecognised' })
      s.submit({ kind: 'number', value: 3 })
      expect(s.result?.mistakes).toBe(0)
      expect(s.result?.stars).toBe(3)
    })
  })

  it('measures answer time (A7)', () => {
    const s = session([3])
    s.start()
    clock = 1500
    expect(s.submit({ kind: 'number', value: 3 }).elapsedMs).toBe(1500)
  })

  it('ends by itself and announces the result', () => {
    const log = recorder()
    const s = session([3, 4], { observer: log.observer })
    s.start()
    s.submit({ kind: 'number', value: 3 })
    clock = 9000
    s.submit({ kind: 'number', value: 4 })

    expect(s.finished).toBe(true)
    expect(s.current).toBeNull()
    expect(log.finished).toMatchObject({ total: 2, correct: 2, mistakes: 0, stars: 3, elapsedMs: 9000 })
  })

  it('there is nowhere to answer once it is over', () => {
    const s = session([3])
    s.start()
    s.submit({ kind: 'number', value: 3 })
    expect(() => s.submit({ kind: 'number', value: 3 })).toThrow()
  })

  it('can be abandoned early (P7)', () => {
    const s = session([3, 4, 5])
    s.start()
    s.submit({ kind: 'number', value: 3 })
    const result = s.abandon()

    expect(s.finished).toBe(true)
    expect(result.correct).toBe(1)
    expect(s.abandon()).toBe(result)
  })

  it('an observer that throws does not take the lesson down', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken: SessionObserver = {
      onAnswerAccepted: () => {
        throw new Error('the battle reactor broke')
      },
    }
    const s = new ExerciseSession({
      subject: 'math',
      level: 1,
      taskCount: 1,
      nextExercise: () => exercise(3),
      observers: [broken],
      now,
    })

    s.start()
    expect(() => s.submit({ kind: 'number', value: 3 })).not.toThrow()
    expect(s.finished).toBe(true)
    spy.mockRestore()
  })

  it('an empty session makes no sense', () => {
    expect(
      () =>
        new ExerciseSession({
          subject: 'math',
          level: 1,
          taskCount: 0,
          nextExercise: () => exercise(1),
        }),
    ).toThrow(RangeError)
  })

  describe('a session with no known length — that is how a battle works', () => {
    function endless() {
      let next = 0
      return new ExerciseSession({
        subject: 'math',
        level: 1,
        nextExercise: () => exercise(next++),
        now,
      })
    }

    it('never ends by itself, however much is answered', () => {
      const s = endless()
      s.start()

      for (let i = 0; i < 50; i++) {
        expect(s.finished).toBe(false)
        s.submit({ kind: 'number', value: i })
      }
      expect(s.current).not.toBeNull()
    })

    it('stops from outside and counts what was shown', () => {
      const s = endless()
      s.start()
      s.submit({ kind: 'number', value: 0 })
      s.submit({ kind: 'number', value: 1 })

      const result = s.abandon()
      expect(result.correct).toBe(2)
      // Two solved plus the third one that we got to show.
      expect(result.total).toBe(3)
    })
  })
})

describe('starsFor', () => {
  it('3 ⭐ for a clean run, 2 ⭐ for one or two, 1 ⭐ after that', () => {
    expect(starsFor(0)).toBe(3)
    expect(starsFor(1)).toBe(2)
    expect(starsFor(2)).toBe(2)
    expect(starsFor(3)).toBe(1)
    expect(starsFor(10)).toBe(1)
  })
})
