import { describe, expect, it } from 'vitest'
import type { Exercise } from '../exercises'
import { ArithmeticAnswer } from '../math/ArithmeticAnswer'
import { LAST_LEVEL } from '../math/levels'
import type { AnswerResult, SessionResult } from '../session/SessionObserver'
import { Profile, PROFILE_VERSION } from './Profile'

function exercise(id: string, level = 1): Exercise {
  return {
    id,
    subject: 'math',
    level,
    prompt: { kind: 'arithmetic', terms: [8, 5], ops: ['+'] },
    answer: new ArithmeticAnswer(13, { min: 0, max: 20 }),
  }
}

function answer(id: string, verdict: AnswerResult['verdict'], level = 1): AnswerResult {
  return { exercise: exercise(id, level), verdict, elapsedMs: 1000, streak: 0, attemptNumber: 1 }
}

const sessionResult: SessionResult = {
  sessionId: 's1',
  total: 8,
  correct: 8,
  mistakes: 0,
  stars: 3,
  elapsedMs: 60000,
}

describe('Profile', () => {
  it('a new profile starts at the first level with an empty tally', () => {
    const profile = new Profile()
    expect(profile.levelFor('math')).toBe(1)
    expect(profile.sessionIndex).toBe(0)
    expect(profile.stars).toBe(0)
    expect(profile.review.size).toBe(0)
  })

  it('a mistake puts the task into the review queue (C3)', () => {
    const profile = new Profile()
    profile.onAnswerAccepted(answer('math:8+5', 'wrong', 3))

    expect(profile.mistakes).toBe(1)
    expect(profile.review.size).toBe(1)
    expect(profile.review.due(1)).toHaveLength(1)
  })

  it('C5: a miss goes past the statistics and past the queue', () => {
    const profile = new Profile()
    profile.onAnswerAccepted(answer('math:8+5', 'unrecognised'))

    expect(profile.mistakes).toBe(0)
    expect(profile.solved).toBe(0)
    expect(profile.review.size).toBe(0)
  })

  it('a mistake fixed right away is not a survived repeat', () => {
    const profile = new Profile()
    profile.onAnswerAccepted(answer('math:8+5', 'wrong'))
    profile.onAnswerAccepted(answer('math:8+5', 'correct'))

    // It still has to come back next session, not half a minute later.
    expect(profile.review.size).toBe(1)
    expect(profile.review.toJSON()[0]?.stage).toBe(0)
  })

  it('a correct answer in a new session moves the repeat along', () => {
    const profile = new Profile()
    profile.onAnswerAccepted(answer('math:8+5', 'wrong'))
    profile.onSessionFinished(sessionResult)

    profile.onAnswerAccepted(answer('math:8+5', 'correct'))
    expect(profile.review.toJSON()[0]?.stage).toBe(1)
  })

  it('the end of a session moves the counter and banks the stars', () => {
    const profile = new Profile({}, () => 12345)
    profile.onSessionFinished(sessionResult)
    profile.onSessionFinished({ ...sessionResult, stars: 2 })

    expect(profile.sessionIndex).toBe(2)
    expect(profile.stars).toBe(5)
    expect(profile.lastPlayedAt).toBe(12345)
  })

  describe('beaten opponents', () => {
    it('a new profile has beaten nobody', () => {
      const profile = new Profile()
      expect(profile.victories).toBe(0)
      expect(profile.hasDefeated('goblin')).toBe(false)
      expect(profile.defeated).toEqual({})
    })

    it('victories are remembered per opponent', () => {
      const profile = new Profile()
      profile.recordVictory('goblin')
      profile.recordVictory('goblin')
      profile.recordVictory('zombie')

      expect(profile.hasDefeated('goblin')).toBe(true)
      expect(profile.hasDefeated('zombie')).toBe(true)
      expect(profile.hasDefeated('forest-fairy')).toBe(false)
      expect(profile.defeated).toEqual({ goblin: 2, zombie: 1 })
      expect(profile.victories).toBe(3)
    })

    it('the list of beaten opponents cannot be edited from outside', () => {
      const profile = new Profile()
      profile.recordVictory('goblin')

      const copy = profile.defeated
      copy['goblin'] = 99
      expect(profile.defeated['goblin']).toBe(1)
    })

    it('an old save without the victory list does not break the game', () => {
      const profile = Profile.fromJSON({ version: PROFILE_VERSION, stars: 5 })
      expect(profile.defeated).toEqual({})
      expect(() => profile.recordVictory('goblin')).not.toThrow()
      expect(profile.victories).toBe(1)
    })
  })

  it('promotion runs into the ceiling', () => {
    const profile = new Profile()
    for (let i = 0; i < 20; i++) profile.promote('math')
    expect(profile.levelFor('math')).toBe(LAST_LEVEL)
  })

  it('reading has one level for now — the rest arrive in phase 4', () => {
    const profile = new Profile()
    expect(profile.promote('reading')).toBe(1)
  })

  describe('saving', () => {
    it('survives a write and a read', () => {
      const profile = new Profile()
      profile.name = 'Тимофей'
      profile.promote('math')
      profile.recordVictory('goblin')
      profile.onAnswerAccepted(answer('math:8+5', 'wrong', 3))
      profile.onSessionFinished(sessionResult)

      const restored = Profile.fromJSON(JSON.parse(JSON.stringify(profile.toJSON())))

      expect(restored.name).toBe('Тимофей')
      expect(restored.levelFor('math')).toBe(2)
      expect(restored.sessionIndex).toBe(1)
      expect(restored.stars).toBe(3)
      expect(restored.defeated).toEqual({ goblin: 1 })
      expect(restored.review.toJSON()).toEqual(profile.review.toJSON())
    })

    it('junk and a foreign version start over instead of crashing', () => {
      expect(Profile.fromJSON(null).sessionIndex).toBe(0)
      expect(Profile.fromJSON('nonsense').sessionIndex).toBe(0)
      expect(Profile.fromJSON({ version: 999, stars: 500 }).stars).toBe(0)
      expect(Profile.fromJSON({ version: PROFILE_VERSION, stars: 7 }).stars).toBe(7)
    })
  })
})
