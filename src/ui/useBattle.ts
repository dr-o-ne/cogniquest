import { useCallback, useEffect, useRef, useState } from 'react'
import type { AnswerAttempt, Exercise } from '@/core/exercises'
import { createArithmeticExercise, evaluate, numberToWords } from '@/core/math'
import { DifficultyAdapter, Profile, type ProfileData } from '@/core/progression'
import { pick, systemRandom } from '@/core/random'
import { ExerciseSession } from '@/core/session'
import { Battle, type BattleState, type Monster } from '@/game'
import { t } from '@/locale'
import { playCorrect, playFinish, playUnheard, playWrong } from '@/adapters/audio/sfx'
import { VoiceAnswerInput } from '@/adapters/input'
import { RUSSIAN_MODEL_URL, VoskRecognizer, WebSpeechTts } from '@/adapters/speech'
import { BrowserProfileStorage, PROFILE_KEY } from '@/adapters/storage'

/** This many «did not catch that» in a row and out comes the fallback input (T5). */
const UNHEARD_BEFORE_FALLBACK = 2

export type Mic = 'idle' | 'speaking' | 'listening'
export type Flash = 'correct' | 'wrong' | 'unheard' | null
export type Screen = 'loading' | 'error' | 'name' | 'select' | 'fight'

export interface GameState {
  screen: Screen
  error: string | null
  name: string
  monster: Monster | null
  battle: BattleState | null
  exercise: Exercise | null
  mic: Mic
  flash: Flash
  heard: string | null
  showFallback: boolean
  /** Battles won in total. */
  wins: number
  /** monster id → times beaten. Beaten ones are struck through in the list. */
  defeated: Record<string, number>
}

interface Deps {
  readonly recognizer: VoskRecognizer
  readonly tts: WebSpeechTts
  readonly voiceInput: VoiceAnswerInput
  readonly storage: BrowserProfileStorage
  /** Replaced wholesale on «start over». */
  profile: Profile
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

/** The problem as the teacher says it out loud (T12). */
function questionText(exercise: Exercise): string {
  const prompt = exercise.prompt
  if (prompt.kind !== 'arithmetic') return ''

  return prompt.terms.reduce((text, term, i) => {
    if (i === 0) return numberToWords(term)
    const action = prompt.ops[i - 1] === '+' ? t.teacher.plus : t.teacher.minus
    return `${text} ${action} ${numberToWords(term)}`
  }, '')
}

function correctAnswerOf(exercise: Exercise): number | null {
  const prompt = exercise.prompt
  if (prompt.kind !== 'arithmetic') return null
  return evaluate(prompt.terms, prompt.ops)
}

const initial: GameState = {
  screen: 'loading',
  error: null,
  name: '',
  monster: null,
  battle: null,
  exercise: null,
  mic: 'idle',
  flash: null,
  heard: null,
  showFallback: false,
  wins: 0,
  defeated: {},
}

export function useBattle() {
  const [state, setState] = useState<GameState>(initial)
  const deps = useRef<Deps | null>(null)
  const runAbort = useRef<AbortController | null>(null)
  const manualAnswer = useRef<((attempt: AnswerAttempt) => void) | null>(null)

  const patch = useCallback((changes: Partial<GameState>) => {
    setState((previous) => ({ ...previous, ...changes }))
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const recognizer = new VoskRecognizer(RUSSIAN_MODEL_URL)
        const tts = new WebSpeechTts()
        const storage = new BrowserProfileStorage()

        const [saved] = await Promise.all([
          storage.load<ProfileData>(PROFILE_KEY),
          recognizer.load(),
          tts.prepare(),
        ])
        if (cancelled) return

        const profile = Profile.fromJSON(saved)
        deps.current = { recognizer, tts, voiceInput: new VoiceAnswerInput(recognizer), storage, profile }

        patch({
          screen: profile.name ? 'select' : 'name',
          name: profile.name,
          wins: profile.victories,
          defeated: profile.defeated,
        })
      } catch (cause) {
        if (cancelled) return
        patch({ screen: 'error', error: cause instanceof Error ? cause.message : String(cause) })
      }
    })()

    return () => {
      cancelled = true
      runAbort.current?.abort()
      deps.current?.tts.stop()
      deps.current?.recognizer.releaseMicrophone()
    }
  }, [patch])

  const setName = useCallback(
    async (name: string) => {
      const d = deps.current
      if (!d) return
      d.profile.name = name.trim()
      await d.storage.save(PROFILE_KEY, d.profile.toJSON())
      patch({ name: d.profile.name, screen: 'select' })
    },
    [patch],
  )

  const fight = useCallback(
    async (monster: Monster) => {
      const d = deps.current
      if (!d) return

      runAbort.current?.abort()
      const run = new AbortController()
      runAbort.current = run

      const battle = new Battle(monster)
      // Difficulty adjusts within the monster's own pool of levels (C4):
      // going badly, we draw from the easy end; going well, we come back.
      const difficulty = new DifficultyAdapter(Math.max(...monster.levels), Math.min(...monster.levels))

      const session = new ExerciseSession({
        subject: 'math',
        level: Math.max(...monster.levels),
        // No length given: the battle runs until somebody wins.
        nextExercise: () => {
          const affordable = monster.levels.filter((level) => level <= difficulty.current)
          return createArithmeticExercise(pick(systemRandom, affordable), systemRandom)
        },
        observers: [d.profile, battle],
      })

      patch({
        screen: 'fight',
        monster,
        battle: battle.state,
        flash: null,
        heard: null,
        showFallback: false,
      })
      session.start()

      let lastPosition = -1

      while (!battle.finished && !session.finished && !run.signal.aborted) {
        const exercise = session.current
        if (!exercise) break

        const isNewTask = session.position !== lastPosition
        lastPosition = session.position

        patch({ exercise, flash: null, heard: null })
        if (isNewTask) patch({ showFallback: false })

        patch({ mic: 'speaking' })
        await d.tts.speak(isNewTask ? questionText(exercise) : t.teacher.tryAgain, run.signal)
        if (run.signal.aborted) return

        patch({ mic: 'listening' })
        const task = new AbortController()
        const stopTask = () => task.abort()
        run.signal.addEventListener('abort', stopTask, { once: true })

        const manual = deferred<AnswerAttempt>()
        manualAnswer.current = manual.resolve

        const attempt = await Promise.race([
          d.voiceInput.read(exercise.answer, task.signal),
          manual.promise,
        ])

        task.abort()
        manualAnswer.current = null
        run.signal.removeEventListener('abort', stopTask)
        if (run.signal.aborted) return

        patch({ mic: 'idle' })
        const positionBefore = session.position
        const result = session.submit(attempt)
        difficulty.onVerdict(result.verdict)

        const heard = attempt.kind === 'text' ? attempt.value : null

        if (result.verdict === 'correct') {
          playCorrect()
          patch({ flash: 'correct', heard, battle: battle.state })
          await wait(battle.finished ? 400 : 700)
          continue
        }

        if (result.verdict === 'wrong') {
          playWrong()
          patch({ flash: 'wrong', heard, battle: battle.state })

          if (session.position !== positionBefore && !battle.finished) {
            const answer = correctAnswerOf(exercise)
            if (answer !== null) {
              await d.tts.speak(t.teacher.theAnswerIs(numberToWords(answer)), run.signal)
            }
          }
          await wait(battle.finished ? 400 : 700)
          continue
        }

        // C5: not caught — not one heart suffered.
        playUnheard()
        patch({
          flash: 'unheard',
          heard: null,
          showFallback: session.unheardInARow >= UNHEARD_BEFORE_FALLBACK,
        })
        await wait(400)
      }

      if (run.signal.aborted) return

      session.abandon()
      playFinish()

      // A win accumulates in the profile. A loss takes nothing away: the battle
      // can be lost, the progress cannot (P10).
      if (battle.state.winner === 'player') d.profile.recordVictory(monster.id)
      await d.storage.save(PROFILE_KEY, d.profile.toJSON())

      patch({
        battle: battle.state,
        exercise: null,
        mic: 'idle',
        flash: null,
        wins: d.profile.victories,
        defeated: d.profile.defeated,
      })
    },
    [patch],
  )

  const submitNumber = useCallback((value: number) => {
    manualAnswer.current?.({ kind: 'number', value })
  }, [])

  /** Start over: wipe the profile and ask for a name again. */
  const resetAll = useCallback(async () => {
    const d = deps.current
    if (!d) return

    runAbort.current?.abort()
    d.tts.stop()

    await d.storage.remove(PROFILE_KEY)
    d.profile = new Profile()

    patch({
      screen: 'name',
      name: '',
      wins: 0,
      defeated: {},
      monster: null,
      battle: null,
      exercise: null,
      mic: 'idle',
      flash: null,
    })
  }, [patch])

  const toSelect = useCallback(() => {
    runAbort.current?.abort()
    deps.current?.tts.stop()
    patch({ screen: 'select', monster: null, battle: null, exercise: null, mic: 'idle', flash: null })
  }, [patch])

  return { state, setName, fight, submitNumber, toSelect, resetAll }
}
