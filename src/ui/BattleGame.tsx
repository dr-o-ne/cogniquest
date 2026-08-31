import { Fragment, useEffect, useState } from 'react'
import type { Exercise, MathOp } from '@/core/exercises'
import { assertNever } from '@/core/exhaustive'
import { comparisonSign, comparisonWord, COMPARISONS, type Comparison } from '@/core/math'
import { availableMonsters, PLAYER_HEARTS, type Monster } from '@/game'
import { t } from '@/locale'
import { MonsterAvatar } from './MonsterAvatar'
import { Teacher } from './Teacher'
import { useBattle, type GameState } from './useBattle'
import './BattleGame.css'

export function BattleGame() {
  const { state, setName, fight, submitNumber, submitChoice, toSelect, resetAll } = useBattle()

  switch (state.screen) {
    case 'loading':
      return <Splash title={t.app.loadingTitle} note={t.app.loadingNote} />
    case 'error':
      return <Splash title={t.app.errorTitle} note={state.error ?? ''} bad />
    case 'name':
      return <NameScreen onDone={(name) => void setName(name)} />
    case 'select':
      return <SelectScreen state={state} onPick={(m) => void fight(m)} onReset={() => void resetAll()} />
    case 'fight':
      return (
        <FightScreen
          state={state}
          onNumber={submitNumber}
          onChoice={submitChoice}
          onLeave={toSelect}
          onRematch={() => state.monster && void fight(state.monster)}
        />
      )
  }
}

function Splash({ title, note, bad }: { title: string; note: string; bad?: boolean }) {
  return (
    <div className="screen screen--center">
      <h1 className={bad ? 'splash__title splash__title--bad' : 'splash__title'}>{title}</h1>
      <p className="splash__note">{note}</p>
    </div>
  )
}

function NameScreen({ onDone }: { onDone: (name: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <form
      className="screen screen--center"
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim()) onDone(value)
      }}
    >
      <Teacher mood="idle" />
      <h1 className="splash__title">{t.name.question}</h1>
      <input
        className="name-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={12}
        autoFocus
      />
      <button className="big-button" type="submit" disabled={!value.trim()}>
        {t.name.start}
      </button>
    </form>
  )
}

function SelectScreen({
  state,
  onPick,
  onReset,
}: {
  state: GameState
  onPick: (monster: Monster) => void
  onReset: () => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="screen screen--center">
      {/* Wipes everything, hence two steps: a stray click must not clear the
          child's progress. */}
      <div className="reset-corner">
        {confirming ? (
          <>
            <span className="reset__ask">{t.select.wipeAsk}</span>
            <button className="reset__yes" onClick={onReset}>
              {t.select.wipeYes}
            </button>
            <button className="reset__no" onClick={() => setConfirming(false)}>
              {t.select.wipeNo}
            </button>
          </>
        ) : (
          <button className="reset__start" onClick={() => setConfirming(true)}>
            {t.select.newGame}
          </button>
        )}
      </div>

      <h1 className="splash__title">{t.select.title(state.name)}</h1>
      <div className="roster">
        {availableMonsters().map((monster) => {
          const beaten = state.defeated[monster.id] ?? 0

          return (
          <button
            key={monster.id}
            className={beaten > 0 ? 'card card--beaten' : 'card'}
            style={{ '--card': monster.color } as React.CSSProperties}
            onClick={() => onPick(monster)}
          >
            {/* Beaten ones are struck through, but can still be played */}
            {beaten > 0 && (
              <span className="card__badge" title={t.select.wins(beaten)}>
                ✔{beaten > 1 && <span className="card__times">{beaten}</span>}
              </span>
            )}
            <MonsterAvatar monster={monster} size="card" />
            <span className="card__name">{monster.name}</span>
            {/* Every last heart: how many there are IS the main difference
                between monsters, so that number must not be abbreviated. */}
            <span className="card__hearts" style={{ fontSize: `${heartSize(monster.hearts)}rem` }}>
              {'❤'.repeat(monster.hearts)}
            </span>
          </button>
          )
        })}
      </div>
      {state.wins > 0 && <p className="splash__note">{t.select.wins(state.wins)}</p>}
    </div>
  )
}

function FightScreen({
  state,
  onNumber,
  onChoice,
  onLeave,
  onRematch,
}: {
  state: GameState
  onNumber: (value: number) => void
  onChoice: (value: Comparison) => void
  onLeave: () => void
  onRematch: () => void
}) {
  const { battle, monster } = state
  if (!battle || !monster) return null

  const hitClass = state.flash === 'correct' ? 'hit-monster' : state.flash === 'wrong' ? 'hit-player' : ''

  return (
    <div className={`screen fight ${hitClass}`}>
      <header className="hud">
        <Fighter
          name={state.name}
          avatar={<span className="avatar avatar--hud avatar--emoji">🧒</span>}
          hearts={battle.playerHearts}
          max={PLAYER_HEARTS}
          color="#4a7de0"
        />
        <span className="hud__vs">{t.fight.vs}</span>
        <Fighter
          name={monster.name}
          avatar={<MonsterAvatar monster={monster} size="hud" />}
          hearts={battle.monsterHearts}
          max={monster.hearts}
          color={monster.color}
          mirrored
        />
      </header>

      <div className="fight__stage">
        {state.exercise && <Expression exercise={state.exercise} />}
        <MicState state={state} />
        {state.showFallback && state.exercise && (
          <Fallback exercise={state.exercise} onNumber={onNumber} onChoice={onChoice} />
        )}
      </div>

      <footer className="fight__bottom">
        <button className="link" onClick={onLeave} tabIndex={-1}>
          {t.fight.leave}
        </button>
      </footer>

      {battle.winner && (
        <WinnerPopup
          won={battle.winner === 'player'}
          monster={monster}
          name={state.name}
          onRematch={onRematch}
          onLeave={onLeave}
        />
      )}
    </div>
  )
}

/** The more hearts, the smaller they get — a long battle would break the layout. */
function heartSize(count: number): number {
  if (count > 30) return 0.55
  if (count > 12) return 0.72
  return 1
}

/** Wraps at roughly twelve per row whatever the size. */
function heartRowStyle(count: number): React.CSSProperties {
  const size = heartSize(count)
  return { fontSize: `${size}rem`, maxWidth: `${size * 13}rem` }
}

function Fighter({
  name,
  avatar,
  hearts,
  max,
  color,
  mirrored,
}: {
  name: string
  avatar: React.ReactNode
  hearts: number
  max: number
  color: string
  mirrored?: boolean
}) {
  return (
    <div
      className={mirrored ? 'fighter fighter--right' : 'fighter'}
      style={{ '--fighter': color } as React.CSSProperties}
    >
      <span className="fighter__avatar">{avatar}</span>
      <div className="fighter__info">
        <span className="fighter__name">{name}</span>
        {/* Hearts are always drawn one by one: the child has to see how many
            are left without counting in their head. Many of them just means
            smaller, across a few rows. */}
        <span className="fighter__hearts" style={heartRowStyle(max)}>
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className={i < hearts ? 'heart' : 'heart heart--lost'}>
              ❤
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

function WinnerPopup({
  won,
  monster,
  name,
  onRematch,
  onLeave,
}: {
  won: boolean
  monster: Monster
  name: string
  onRematch: () => void
  onLeave: () => void
}) {
  return (
    <div className="popup">
      <div className="popup__box">
        {won ? (
          <span className="avatar avatar--popup avatar--emoji">🏆</span>
        ) : (
          <MonsterAvatar monster={monster} size="popup" />
        )}
        <h2 className="popup__title">
          {won ? t.result.victoryTitle : t.result.defeatTitle(monster.name)}
        </h2>
        <p className="popup__note">
          {won ? t.result.victoryNote(name) : t.result.defeatNote}
        </p>
        <button className="big-button" onClick={onRematch} autoFocus>
          {won ? t.result.fightAgain : t.result.rematch}
        </button>
        <button className="link" onClick={onLeave}>
          {t.result.pickAnother}
        </button>
      </div>
    </div>
  )
}

/**
 * The sign as it is drawn. A real minus, not a hyphen — at this size the
 * difference is plain to see.
 */
function sign(op: MathOp): string {
  switch (op) {
    case '+':
      return '+'
    case '-':
      return '−'
    default:
      return assertNever(op, 'math operation')
  }
}

function Expression({ exercise }: { exercise: Exercise }) {
  const prompt = exercise.prompt

  switch (prompt.kind) {
    case 'arithmetic': {
      // A long chain is set smaller, or «8 − 3 + 2» will not fit a narrow window.
      const long = prompt.terms.length > 2

      return (
        <div className={long ? 'expression expression--long' : 'expression'}>
          {prompt.terms.map((term, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="expression__op">{sign(prompt.ops[i - 1]!)}</span>}
              {prompt.bracket?.from === i && <span className="expression__bracket">(</span>}
              <span>{term}</span>
              {prompt.bracket?.to === i && <span className="expression__bracket">)</span>}
            </Fragment>
          ))}
        </div>
      )
    }

    case 'equation': {
      // «47 + □ + 3 = 69» is five slots wide — set smaller, like a long chain.
      const wide = prompt.terms.length > 2

      return (
        <div className={wide ? 'expression expression--long' : 'expression'}>
          {prompt.terms.map((term, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="expression__op">{sign(prompt.ops[i - 1]!)}</span>}
              {i === prompt.blank ? (
                <span className="expression__blank">?</span>
              ) : (
                <span>{term}</span>
              )}
            </Fragment>
          ))}
          <span className="expression__op">=</span>
          <span>{prompt.result}</span>
        </div>
      )
    }

    case 'comparison':
      return (
        <div className="expression">
          <span>{prompt.left}</span>
          {/* An empty box rather than a «□»: drawn in CSS it is the same size
              whatever font the machine has, and there is no glyph to go
              missing at eight times the body text. */}
          <span className="expression__box" />
          <span>{prompt.right}</span>
        </div>
      )

    default:
      return assertNever(prompt, 'exercise prompt')
  }
}

/**
 * The way in after two misses (T5), matched to what is being asked.
 *
 * A keypad cannot answer «5 □ 7», so the kind of prompt picks the pad. Written
 * as an exhaustive switch for the same reason the drawing above is: a new kind
 * of task must not quietly inherit a pad that cannot answer it.
 */
function Fallback({
  exercise,
  onNumber,
  onChoice,
}: {
  exercise: Exercise
  onNumber: (value: number) => void
  onChoice: (value: Comparison) => void
}) {
  const prompt = exercise.prompt

  switch (prompt.kind) {
    // Both are answered with a number — the sum of a chain, or the operand
    // hidden in an equation.
    case 'arithmetic':
    case 'equation':
      return <NumberPad onSubmit={onNumber} />

    case 'comparison':
      return <ChoicePad onSubmit={onChoice} />

    default:
      return assertNever(prompt, 'exercise prompt')
  }
}

function MicState({ state }: { state: GameState }) {
  if (state.flash === 'correct') {
    return <p className="mic-state mic-state--correct">{state.heard ?? t.mic.correct}</p>
  }
  if (state.flash === 'wrong') {
    return <p className="mic-state mic-state--wrong">{t.mic.heard(state.heard ?? '')}</p>
  }
  if (state.flash === 'unheard') return <p className="mic-state">{t.mic.unheard}</p>
  if (state.mic === 'listening') return <p className="mic-state mic-state--live">{t.mic.listening}</p>
  return <p className="mic-state">&nbsp;</p>
}

/**
 * The three answers to a comparison, sign above word.
 *
 * The sign is there because it is what the box is waiting for: the child says
 * «меньше», and the button shows them the mark that stands for it.
 */
function ChoicePad({ onSubmit }: { onSubmit: (value: Comparison) => void }) {
  return (
    <div className="pad">
      <p className="pad__hint">{t.pad.hint}</p>
      <div className="pad__choices">
        {COMPARISONS.map((value) => (
          <button key={value} className="pad__choice" onClick={() => onSubmit(value)}>
            <span className="pad__choice-sign">{comparisonSign(value)}</span>
            <span className="pad__choice-word">{comparisonWord(value)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function NumberPad({ onSubmit }: { onSubmit: (value: number) => void }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key >= '0' && event.key <= '9') {
        setValue((current) => (current.length >= 3 ? current : current + event.key))
      } else if (event.key === 'Backspace') {
        setValue((current) => current.slice(0, -1))
      } else if (event.key === 'Enter') {
        setValue((current) => {
          if (current !== '') onSubmit(Number(current))
          return ''
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSubmit])

  const send = () => {
    if (value === '') return
    onSubmit(Number(value))
    setValue('')
  }

  return (
    <div className="pad">
      <p className="pad__hint">{t.pad.hint}</p>
      <div className="pad__value">{value || t.pad.empty}</div>
      <div className="pad__keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
          <button
            key={digit}
            className="pad__key"
            onClick={() => setValue((c) => (c.length >= 3 ? c : c + digit))}
          >
            {digit}
          </button>
        ))}
        <button className="pad__key pad__key--wide" onClick={send} disabled={value === ''}>
          {t.pad.submit}
        </button>
      </div>
    </div>
  )
}
