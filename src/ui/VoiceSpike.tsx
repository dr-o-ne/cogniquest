import { useCallback, useEffect, useRef, useState } from 'react'
import { numberGrammar, parseNumber } from '@/core/math/numerals'
import { t } from '@/locale'
import { RUSSIAN_MODEL_URL, VoskRecognizer } from '@/adapters/speech'
import './VoiceSpike.css'

/**
 * The phase 1 rig. Not a game: a measuring instrument.
 *
 * It has one job — to find out whether this particular child's speech gets
 * recognised, before everything else is built on top of voice input. The
 * answer decides the fate of P9.
 */

type Verdict = 'correct' | 'wrong' | 'unrecognised'

interface Task {
  left: number
  op: '+' | '-'
  right: number
  answer: number
}

interface Attempt {
  index: number
  shown: string
  expected: number
  heard: string | null
  parsed: number | null
  verdict: Verdict
  ms: number
}

const RANGES = [10, 20, 100] as const

// The model weighs 44 MB — one instance for the whole application.
let shared: VoskRecognizer | null = null
function recognizer(): VoskRecognizer {
  shared ??= new VoskRecognizer(RUSSIAN_MODEL_URL)
  return shared
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function randomTask(max: number): Task {
  if (Math.random() < 0.5) {
    const left = randomInt(0, max)
    const right = randomInt(0, max - left)
    return { left, op: '+', right, answer: left + right }
  }
  const left = randomInt(0, max)
  const right = randomInt(0, left)
  return { left, op: '-', right, answer: left - right }
}

export function VoiceSpike() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [max, setMax] = useState<number>(10)
  const [task, setTask] = useState<Task>(() => randomTask(10))
  const [listening, setListening] = useState(false)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [last, setLast] = useState<Attempt | null>(null)

  const taskRef = useRef(task)
  taskRef.current = task
  const maxRef = useRef(max)
  maxRef.current = max

  useEffect(() => {
    let cancelled = false
    recognizer()
      .load()
      .then(() => !cancelled && setStatus('ready'))
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : String(cause))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const listen = useCallback(async () => {
    if (status !== 'ready') return
    setListening(true)

    const current = taskRef.current
    const grammar = numberGrammar(0, maxRef.current)
    const controller = new AbortController()
    const startedAt = performance.now()

    try {
      const heard = await recognizer().listenOnce(grammar, controller.signal)
      const parsed = heard === null ? null : parseNumber(heard)
      const verdict: Verdict =
        parsed === null ? 'unrecognised' : parsed === current.answer ? 'correct' : 'wrong'

      const attempt: Omit<Attempt, 'index'> = {
        shown: `${current.left} ${current.op === '-' ? '−' : '+'} ${current.right}`,
        expected: current.answer,
        heard,
        parsed,
        verdict,
        ms: Math.round(performance.now() - startedAt),
      }

      setAttempts((prev) => [{ ...attempt, index: prev.length + 1 }, ...prev])
      setLast({ ...attempt, index: attempts.length + 1 })
      if (verdict === 'correct') setTask(randomTask(maxRef.current))
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setListening(false)
    }
  }, [status, attempts.length])

  // Space instead of the mouse — easier for a child than aiming a cursor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || listening) return
      event.preventDefault()
      void listen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listen, listening])

  const changeRange = (value: number) => {
    setMax(value)
    setTask(randomTask(value))
  }

  const total = attempts.length
  const correct = attempts.filter((a) => a.verdict === 'correct').length
  const wrong = attempts.filter((a) => a.verdict === 'wrong').length
  const unheard = attempts.filter((a) => a.verdict === 'unrecognised').length
  const percent = (value: number) => (total === 0 ? '—' : `${Math.round((value / total) * 100)}%`)

  return (
    <div className="spike">
      <header className="spike__head">
        <h1>{t.spike.title}</h1>
        <p className="spike__sub">{t.spike.subtitle}</p>
      </header>

      {status === 'loading' && <p className="spike__status">{t.spike.loading}</p>}
      {status === 'error' && (
        <p className="spike__status spike__status--bad">{t.spike.error(error ?? '')}</p>
      )}

      {status === 'ready' && (
        <>
          <div className="spike__ranges">
            {RANGES.map((value) => (
              <button
                key={value}
                className={value === max ? 'chip chip--on' : 'chip'}
                onClick={() => changeRange(value)}
                disabled={listening}
              >
                {t.spike.upTo(value)}
                <span className="chip__note">{t.spike.grammarSize(value + 1)}</span>
              </button>
            ))}
          </div>

          <div className="spike__task">
            {task.left} {task.op === '-' ? '−' : '+'} {task.right}
          </div>

          <button className="mic" onClick={() => void listen()} disabled={listening}>
            {listening ? t.spike.listening : t.spike.pressToSpeak}
            <span className="mic__hint">{t.spike.orSpace}</span>
          </button>

          {last && (
            <div className={`verdict verdict--${last.verdict}`}>
              {last.verdict === 'correct' && t.spike.heardCorrect(last.heard ?? '')}
              {last.verdict === 'wrong' &&
                t.spike.heardWrong(last.heard ?? '', last.parsed, last.expected)}
              {last.verdict === 'unrecognised' && t.spike.heardNothing(last.heard)}
              <span className="verdict__ms">{t.spike.ms(last.ms)}</span>
            </div>
          )}

          <div className="stats">
            <div className="stat">
              <b>{total}</b>
              <span>{t.spike.statAttempts}</span>
            </div>
            <div className="stat stat--good">
              <b>{percent(correct)}</b>
              <span>{t.spike.statHit}</span>
            </div>
            <div className="stat stat--warn">
              <b>{percent(wrong)}</b>
              <span>{t.spike.statMiss}</span>
            </div>
            <div className="stat stat--muted">
              <b>{percent(unheard)}</b>
              <span>{t.spike.statUnheard}</span>
            </div>
          </div>

          {total > 0 && (
            <>
              <div className="spike__actions">
                <button
                  className="link"
                  onClick={() => void navigator.clipboard.writeText(JSON.stringify(attempts, null, 2))}
                >
                  {t.spike.copyLog}
                </button>
                <button
                  className="link"
                  onClick={() => {
                    setAttempts([])
                    setLast(null)
                  }}
                >
                  {t.spike.clear}
                </button>
              </div>

              <table className="log">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t.spike.columnTask}</th>
                    <th>{t.spike.columnExpected}</th>
                    <th>{t.spike.columnHeard}</th>
                    <th>{t.spike.columnParsed}</th>
                    <th>{t.spike.columnMs}</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.slice(0, 40).map((a) => (
                    <tr key={a.index} className={`log__row log__row--${a.verdict}`}>
                      <td>{a.index}</td>
                      <td>{a.shown}</td>
                      <td>{a.expected}</td>
                      <td>{a.heard ?? t.spike.empty}</td>
                      <td>{a.parsed ?? t.spike.empty}</td>
                      <td>{a.ms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  )
}
