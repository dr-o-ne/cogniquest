import { describe, expect, it } from 'vitest'
import type { Exercise } from '../exercises'
import { ArithmeticAnswer } from '../math/ArithmeticAnswer'
import type { AnswerResult, SessionResult } from '../session/SessionObserver'
import { Profile, PROFILE_VERSION } from './Profile'

function exercise(id: string, level = 1): Exercise {
  return {
    id,
    subject: 'math',
    level,
    prompt: { kind: 'arithmetic', terms: [8, 5], ops: ['+'] },
    answer: new ArithmeticAnswer(13, 20),
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
  it('a new profile starts with an empty tally', () => {
    const profile = new Profile()
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
      expect(profile.squadsBeaten).toEqual({})
    })

    it('victories are remembered per opponent', () => {
      const profile = new Profile()
      profile.recordVictory(['goblin'])
      profile.recordVictory(['goblin'])
      profile.recordVictory(['zombie'])

      expect(profile.hasDefeated('goblin')).toBe(true)
      expect(profile.hasDefeated('zombie')).toBe(true)
      expect(profile.hasDefeated('forest-fairy')).toBe(false)
      expect(profile.defeated).toEqual({ goblin: 2, zombie: 1 })
      expect(profile.victories).toBe(3)
    })

    it('a squad is one victory and a tick against each of them (G9)', () => {
      const profile = new Profile()
      profile.recordVictory(['goblin', 'zombie', 'wolf'], 'beast-pack')

      expect(profile.defeated).toEqual({ goblin: 1, zombie: 1, wolf: 1 })
      expect(profile.squadsBeaten).toEqual({ 'beast-pack': 1 })
      // Not three, and not four. «Побед» counts battles, and that was one.
      expect(profile.victories).toBe(1)
    })

    it('beating the members one by one does not beat the squad', () => {
      // The squad's card is struck through for its own tally alone: three
      // duels are three battles won and no group faced.
      const profile = new Profile()
      profile.recordVictory(['goblin'])
      profile.recordVictory(['zombie'])
      profile.recordVictory(['wolf'])

      expect(profile.defeated).toEqual({ goblin: 1, zombie: 1, wolf: 1 })
      expect(profile.squadsBeaten).toEqual({})
      expect(profile.victories).toBe(3)
    })

    it('a win banks the gold every opponent it beat was worth', () => {
      const profile = new Profile()
      profile.recordVictory(['goblin'], undefined, 3)
      profile.recordVictory(['zombie', 'wolf'], 'beast-pack', 5)

      expect(profile.gold).toBe(8)
    })

    it('an old save without gold does not break the game', () => {
      const profile = Profile.fromJSON({ version: PROFILE_VERSION, stars: 5 })
      expect(profile.gold).toBe(0)
      profile.recordVictory(['goblin'], undefined, 2)
      expect(profile.gold).toBe(2)
    })

    it('a squad beaten twice counts twice', () => {
      const profile = new Profile()
      profile.recordVictory(['peasant', 'robber'], 'two-on-the-path')
      profile.recordVictory(['peasant', 'robber'], 'two-on-the-path')

      expect(profile.squadsBeaten).toEqual({ 'two-on-the-path': 2 })
      expect(profile.defeated).toEqual({ peasant: 2, robber: 2 })
      expect(profile.victories).toBe(2)
    })

    it('the list of beaten squads cannot be edited from outside', () => {
      const profile = new Profile()
      profile.recordVictory(['peasant', 'robber'], 'two-on-the-path')

      const copy = profile.squadsBeaten
      copy['two-on-the-path'] = 99
      expect(profile.squadsBeaten['two-on-the-path']).toBe(1)
    })

    it('an opponent standing in a squad twice is beaten once', () => {
      const profile = new Profile()
      profile.recordVictory(['peasant', 'peasant', 'peasant'])

      expect(profile.defeated).toEqual({ peasant: 1 })
      expect(profile.victories).toBe(1)
    })

    it('the list of beaten opponents cannot be edited from outside', () => {
      const profile = new Profile()
      profile.recordVictory(['goblin'])

      const copy = profile.defeated
      copy['goblin'] = 99
      expect(profile.defeated['goblin']).toBe(1)
    })

    it('an old save without the victory list does not break the game', () => {
      const profile = Profile.fromJSON({ version: PROFILE_VERSION, stars: 5 })
      expect(profile.defeated).toEqual({})
      expect(() => profile.recordVictory(['goblin'])).not.toThrow()
      expect(profile.victories).toBe(1)
    })

    it('a save from before squads keeps its count instead of starting over', () => {
      // Written when a battle was one opponent, so the per-opponent tally is
      // the number of battles won. Read that way rather than reset to nought —
      // which is what a PROFILE_VERSION bump would have cost the child.
      const profile = Profile.fromJSON({
        version: PROFILE_VERSION,
        defeated: { goblin: 2, zombie: 1 },
      })

      expect(profile.victories).toBe(3)

      // And a squad won after the migration adds one, not three.
      profile.recordVictory(['wolf', 'bear', 'griffin'])
      expect(profile.victories).toBe(4)
    })
  })

  describe('walking a quest (G10)', () => {
    it('a new profile has walked nowhere', () => {
      expect(new Profile().questProgress).toEqual({})
    })

    it('a stop cleared is remembered per quest', () => {
      const profile = new Profile()
      profile.recordQuestStep('first-path', 1)
      profile.recordQuestStep('first-path', 2)
      profile.recordQuestStep('other-path', 1)

      expect(profile.questProgress).toEqual({ 'first-path': 2, 'other-path': 1 })
    })

    it('a walk never goes backwards', () => {
      // Replaying a finished path, or an earlier stop of one, must not undo
      // what is already walked — and it makes the call safe to repeat.
      const profile = new Profile()
      profile.recordQuestStep('first-path', 7)
      profile.recordQuestStep('first-path', 3)

      expect(profile.questProgress['first-path']).toBe(7)
    })

    it('the walk cannot be edited from outside', () => {
      const profile = new Profile()
      profile.recordQuestStep('first-path', 1)

      const copy = profile.questProgress
      copy['first-path'] = 99
      expect(profile.questProgress['first-path']).toBe(1)
    })

    it('a save from before quests reads as none walked', () => {
      // Same treatment every added field has had: absorbed by the constructor
      // rather than paid for with a PROFILE_VERSION bump, which wipes.
      const profile = Profile.fromJSON({ version: PROFILE_VERSION, stars: 5 })

      expect(profile.questProgress).toEqual({})
      expect(() => profile.recordQuestStep('first-path', 1)).not.toThrow()
    })

    it('junk in place of the map does not break the game', () => {
      const profile = Profile.fromJSON({
        version: PROFILE_VERSION,
        questProgress: null,
      } as never)

      expect(profile.questProgress).toEqual({})
    })
  })

  describe('saving', () => {
    it('survives a write and a read', () => {
      const profile = new Profile()
      profile.name = 'Тимофей'
      profile.recordVictory(['goblin'], undefined, 2)
      profile.recordVictory(['peasant', 'robber'], 'two-on-the-path', 2)
      profile.recordQuestStep('first-path', 4)
      profile.onAnswerAccepted(answer('math:8+5', 'wrong', 3))
      profile.onSessionFinished(sessionResult)

      const restored = Profile.fromJSON(JSON.parse(JSON.stringify(profile.toJSON())))

      expect(restored.name).toBe('Тимофей')
      expect(restored.sessionIndex).toBe(1)
      expect(restored.stars).toBe(3)
      expect(restored.defeated).toEqual({ goblin: 1, peasant: 1, robber: 1 })
      expect(restored.squadsBeaten).toEqual({ 'two-on-the-path': 1 })
      expect(restored.questProgress).toEqual({ 'first-path': 4 })
      expect(restored.victories).toBe(2)
      expect(restored.gold).toBe(4)
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
