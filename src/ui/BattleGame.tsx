import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Exercise, MathOp } from '@/core/exercises'
import { assertNever } from '@/core/exhaustive'
import { comparisonSign, comparisonWord, COMPARISONS, type Comparison } from '@/core/math'
import { availableMonsters, PLAYER_HEARTS, SQUADS, type Monster, type Squad } from '@/game'
import { t } from '@/locale'
import { MonsterAvatar } from './MonsterAvatar'
import { Teacher } from './Teacher'
import { useBattle, type Draft, type GameState, type Opposition } from './useBattle'
import './BattleGame.css'

/**
 * The four ways the child touches the pad, in one bundle.
 *
 * They always travel together, two levels down, and nowhere but to the pad — so
 * they arrive as one prop rather than as four that have to be threaded through
 * `FightScreen` one at a time.
 */
interface PadInput {
  readonly digit: (digit: string) => void
  readonly erase: () => void
  readonly choose: (value: Comparison) => void
  readonly send: (draft: Draft) => void
}

export function BattleGame() {
  const { state, setName, fight, typeDigit, eraseDigit, chooseComparison, sendAnswer, toSelect, resetAll } =
    useBattle()

  // Stable, so the pad's keyboard listener is not torn down and rebuilt on
  // every patch the battle loop makes.
  const input = useMemo<PadInput>(
    () => ({ digit: typeDigit, erase: eraseDigit, choose: chooseComparison, send: sendAnswer }),
    [typeDigit, eraseDigit, chooseComparison, sendAnswer],
  )

  switch (state.screen) {
    case 'loading':
      return <Splash title={t.app.loadingTitle} note={t.app.loadingNote} />
    case 'error':
      return <Splash title={t.app.errorTitle} note={state.error ?? ''} bad />
    case 'name':
      return <NameScreen onDone={(name) => void setName(name)} />
    case 'select':
      return (
        <SelectScreen
          state={state}
          onFight={(opposition) => void fight(opposition)}
          onReset={() => void resetAll()}
        />
      )
    case 'fight':
      return (
        <FightScreen
          state={state}
          input={input}
          onLeave={toSelect}
          onRematch={() => state.opposition && void fight(state.opposition)}
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

/**
 * Picking the opposition: a ready-made squad, or one opponent for a duel.
 *
 * Both are one press, and neither has a form to fill in. The squads come from
 * the config (`SQUADS`, **G9**) rather than being assembled on the screen: what
 * makes a squad worth fighting is its mix of rows, which is a thing to compose
 * in a table beside the reason for it, not something to hand a six-year-old a
 * builder for. So the roster card does exactly what it always did.
 */
function SelectScreen({
  state,
  onFight,
  onReset,
}: {
  state: GameState
  onFight: (opposition: Opposition) => void
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

      {/* The squads come first: there are four of them against forty-eight
          cards, and at the foot of the roster nobody would ever meet them. */}
      <h2 className="roster__title">{t.select.squadsTitle}</h2>
      <div className="roster">
        {SQUADS.map((squad) => (
          <SquadCard
            key={squad.id}
            squad={squad}
            beaten={state.squadsBeaten[squad.id] ?? 0}
            onFight={onFight}
          />
        ))}
      </div>

      <h2 className="roster__title">{t.select.duelsTitle}</h2>
      <div className="roster">
        {availableMonsters().map((monster) => {
          const beaten = state.defeated[monster.id] ?? 0

          return (
            <button
              key={monster.id}
              className={beaten > 0 ? 'card card--beaten' : 'card'}
              style={{ '--card': monster.color } as React.CSSProperties}
              onClick={() => onFight({ kind: 'duel', monster })}
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

/**
 * One ready-made squad, as a card the size of two roster cards.
 *
 * It carries the three things that decide what the battle is: the faces, so the
 * child picks the way they pick a monster; how it takes turns, because that
 * changes the battle more than anything else on the card; and every heart of
 * every member, since the total is now the length of the battle and there is no
 * other way to see that a group of four is four times the sitting.
 */
function SquadCard({
  squad,
  beaten,
  onFight,
}: {
  squad: Squad
  /** How many times this squad has been beaten. Struck through like a monster. */
  beaten: number
  onFight: (opposition: Opposition) => void
}) {
  const classes = ['card', 'card--squad']
  if (beaten > 0) classes.push('card--beaten')

  return (
    <button
      className={classes.join(' ')}
      style={{ '--card': squad.color } as React.CSSProperties}
      onClick={() => onFight({ kind: 'squad', squad })}
    >
      {/* Beaten squads are struck through and still playable, exactly as the
          monsters are — and it is the squad's own tally, not its members'. A
          child who beat every one of them separately has not beaten the
          group. */}
      {beaten > 0 && (
        <span className="card__badge" title={t.select.wins(beaten)}>
          ✔{beaten > 1 && <span className="card__times">{beaten}</span>}
        </span>
      )}
      <span className="card__faces">
        {/* Keyed by slot: the same monster may stand in a squad twice. */}
        {squad.monsters.map((monster, slot) => (
          <MonsterAvatar key={slot} monster={monster} size="face" />
        ))}
      </span>
      <span className="card__name">{squad.name}</span>
      <span className="card__mode">
        {squad.shuffle ? t.select.squadShuffled : t.select.squadInTurn}
      </span>
      <span className="card__hearts" style={{ fontSize: `${heartSize(squad.hearts)}rem` }}>
        {'❤'.repeat(squad.hearts)}
      </span>
    </button>
  )
}

function FightScreen({
  state,
  input,
  onLeave,
  onRematch,
}: {
  state: GameState
  input: PadInput
  onLeave: () => void
  onRematch: () => void
}) {
  const { battle } = state
  if (!battle) return null

  const hitClass = state.flash === 'correct' ? 'hit-monster' : state.flash === 'wrong' ? 'hit-player' : ''
  const crowd = battle.foes.length

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
        {/* One row per opponent, the asker brought forward and the beaten ones
            struck through. A squad of one is the single row it always was, which
            is why there is no separate case for it. */}
        <div className={crowd > 1 ? 'hud__foes hud__foes--crowd' : 'hud__foes'}>
          {battle.foes.map((foe, slot) => (
            <Fighter
              key={slot}
              name={foe.monster.name}
              avatar={<MonsterAvatar monster={foe.monster} size="hud" />}
              hearts={foe.hearts}
              max={foe.monster.hearts}
              color={foe.monster.color}
              mirrored
              crowd={crowd}
              asking={slot === battle.asking && foe.hearts > 0}
              beaten={foe.hearts === 0}
              struck={slot === battle.hitFoe}
            />
          ))}
        </div>
      </header>

      <div className="fight__stage">
        {state.exercise && <Expression exercise={state.exercise} />}
        <MicState state={state} />
        {/* A draft means there is an answer to give, which is the only thing
            the pad needs to know — no task, no pad. */}
        {state.draft && <AnswerPad draft={state.draft} input={input} />}
      </div>

      <footer className="fight__bottom">
        {/* Out of the tab order on purpose: the keys belong to the pad, and a
            stray Enter must not walk the child out of a battle. */}
        <button className="fight__leave" onClick={onLeave} tabIndex={-1}>
          <span className="fight__leave-arrow" aria-hidden="true">
            ←
          </span>
          {t.fight.leave}
        </button>
      </footer>

      {battle.winner && (
        <WinnerPopup
          won={battle.winner === 'player'}
          squad={battle.foes.map((foe) => foe.monster)}
          /* Whoever was asking when the last heart went is the one still
             standing, so it is the one that gets its name in the title. */
          victor={battle.foes[battle.asking]!.monster}
          name={state.name}
          onRematch={onRematch}
          onLeave={onLeave}
        />
      )}
    </div>
  )
}

/**
 * The more hearts, the smaller they get — a long battle would break the layout.
 *
 * The bottom rung is for a squad card, where the count is every heart of every
 * member and runs to seventy (**G9**). Still drawn one by one: seventy of them
 * filling the card is exactly the fact the child needs off that card.
 */
function heartSize(count: number): number {
  if (count > 48) return 0.45
  if (count > 30) return 0.55
  if (count > 12) return 0.72
  return 1
}

/**
 * A squad shares one corner of the screen, so its rows shrink as it grows: five
 * opponents of twenty hearts is a hundred of them in the same header, and the
 * hearts are never abbreviated to a number.
 */
const CROWD_SCALE: readonly number[] = [1, 1, 0.82, 0.74, 0.68, 0.62]

/**
 * Wraps at roughly twelve hearts per row on its own, and at twenty-four in a
 * squad — the longest battle in the table is twenty, so a squad member gets one
 * line each, which is what keeps five of them readable at once. The glyph is
 * about a fifth wider than its own font size, hence the numbers.
 */
function heartRowStyle(count: number, crowd: number): React.CSSProperties {
  const size = heartSize(count) * (CROWD_SCALE[crowd] ?? CROWD_SCALE[CROWD_SCALE.length - 1]!)
  return { fontSize: `${size}rem`, maxWidth: `${size * (crowd > 1 ? 24 : 13)}rem` }
}

function Fighter({
  name,
  avatar,
  hearts,
  max,
  color,
  mirrored,
  crowd = 1,
  asking,
  beaten,
  struck,
}: {
  name: string
  avatar: React.ReactNode
  hearts: number
  max: number
  color: string
  mirrored?: boolean
  /** How many fighters share this side of the header. Sets how small it goes. */
  crowd?: number
  /** Whose question is on the screen right now. */
  asking?: boolean
  beaten?: boolean
  /** Took the last hit — this is what the shake hangs off. */
  struck?: boolean
}) {
  // `asking` and `beaten` are marked whatever the crowd; what they look like is
  // the stylesheet's business, and there they only show inside a squad — on its
  // own an opponent is always the asker, and dimming it would be plain wrong.
  const classes = ['fighter']
  if (mirrored) classes.push('fighter--right')
  if (asking) classes.push('fighter--asking')
  if (beaten) classes.push('fighter--beaten')
  if (struck) classes.push('fighter--struck')

  return (
    <div className={classes.join(' ')} style={{ '--fighter': color } as React.CSSProperties}>
      <span className="fighter__avatar">{avatar}</span>
      <div className="fighter__info">
        <span className="fighter__name">{name}</span>
        {/* Hearts are always drawn one by one: the child has to see how many
            are left without counting in their head. Many of them just means
            smaller, across a few rows. */}
        <span className="fighter__hearts" style={heartRowStyle(max, crowd)}>
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
  squad,
  victor,
  name,
  onRematch,
  onLeave,
}: {
  won: boolean
  squad: readonly Monster[]
  /** The opponent left standing. Only ever looked at on a defeat. */
  victor: Monster
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
          <MonsterAvatar monster={victor} size="popup" />
        )}
        <h2 className="popup__title">
          {won ? t.result.victoryTitle : t.result.defeatTitle(victor.name)}
        </h2>
        {/* Beating a squad is worth seeing the squad for. One opponent is
            already the picture above, so the row only appears for a group. */}
        {won && squad.length > 1 && (
          <div className="popup__squad">
            {squad.map((monster, slot) => (
              <MonsterAvatar key={slot} monster={monster} size="chip" />
            ))}
          </div>
        )}
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

    case 'comparison': {
      // «5 □ 7» stays big; «3 + 2 □ 5 − 1» is set smaller so both sides fit.
      const long = prompt.left.ops.length > 0 || prompt.right.ops.length > 0

      return (
        <div className={long ? 'expression expression--long' : 'expression'}>
          <TermRun {...prompt.left} />
          {/* An empty box rather than a «□»: drawn in CSS it is the same size
              whatever font the machine has, and there is no glyph to go
              missing at eight times the body text. */}
          <span className="expression__box" />
          <TermRun {...prompt.right} />
        </div>
      )
    }

    default:
      return assertNever(prompt, 'exercise prompt')
  }
}

/** One side of a comparison — a bare number, or a small sum like «3 + 2». */
function TermRun({ terms, ops }: { terms: readonly number[]; ops: readonly MathOp[] }) {
  return (
    <span className="expression__run">
      {terms.map((term, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="expression__op">{sign(ops[i - 1]!)}</span>}
          <span>{term}</span>
        </Fragment>
      ))}
    </span>
  )
}

/**
 * The way in, always on screen (T18), matched to the answer being built.
 *
 * A keypad cannot answer «5 □ 7», so the draft's shape picks the pad — the
 * draft rather than the prompt, because the draft is what the pad fills and
 * what gets sent. Written as an exhaustive switch for the same reason the
 * drawing above is: a new kind of answer must not quietly inherit a pad that
 * cannot send it.
 */
function AnswerPad({ draft, input }: { draft: Draft; input: PadInput }) {
  switch (draft.kind) {
    case 'number':
      return <NumberPad digits={draft.digits} input={input} />

    case 'choice':
      return <ChoicePad value={draft.value} input={input} />

    default:
      return assertNever(draft, 'answer draft')
  }
}

/**
 * One line above the pad, and the freshest news wins it.
 *
 * The verdict comes first, then a miss, then what recognition made of what was
 * said. That last one is worth the space now the voice no longer answers: the
 * digits in the field cannot show a mishearing, and «семь» heard as «семнадцать»
 * is precisely what the child needs to see to know to fix it (T18).
 */
function MicState({ state }: { state: GameState }) {
  if (state.flash === 'correct') return <p className="mic-state mic-state--correct">{t.mic.correct}</p>
  if (state.flash === 'wrong') return <p className="mic-state mic-state--wrong">{t.mic.wrong}</p>
  if (state.flash === 'unheard') return <p className="mic-state">{t.mic.unheard}</p>
  if (state.heard !== null) return <p className="mic-state">{t.mic.heard(state.heard)}</p>
  if (state.mic === 'listening') return <p className="mic-state mic-state--live">{t.mic.listening}</p>
  return <p className="mic-state">&nbsp;</p>
}

/**
 * The three answers to a comparison, sign above word.
 *
 * The sign is there because it is what the box is waiting for: the child says
 * «меньше», and the button shows them the mark that stands for it.
 *
 * Picking one no longer sends it (T18). Three buttons and one more press is a
 * step this pad does not need for itself — it is here so that there is one rule
 * for both pads, and so that a sign the voice picked can be looked at before it
 * counts, exactly like a number.
 */
function ChoicePad({ value, input }: { value: Comparison | null; input: PadInput }) {
  return (
    <div className="pad">
      <p className="pad__hint">{t.pad.hint}</p>
      <div className="pad__choices">
        {COMPARISONS.map((option) => (
          <button
            key={option}
            className={option === value ? 'pad__choice pad__choice--picked' : 'pad__choice'}
            onClick={() => input.choose(option)}
          >
            <span className="pad__choice-sign">{comparisonSign(option)}</span>
            <span className="pad__choice-word">{comparisonWord(option)}</span>
          </button>
        ))}
      </div>
      <SendButton onClick={() => input.send({ kind: 'choice', value })} disabled={value === null} />
    </div>
  )
}

/**
 * The blow. The only button that answers (T18), so the only one that looks like
 * it — and the sword says which of the two things on screen it is: the pad fills
 * a field, this lands a hit (G6).
 *
 * An emoji rather than a file, the same way the child, the trophy and the hearts
 * are. A sword is one glyph the system already has, and a battle screen is a
 * poor place to be waiting on an image to load.
 */
function SendButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button className="pad__send" onClick={onClick} disabled={disabled}>
      <span className="pad__send-icon" aria-hidden="true">
        ⚔️
      </span>
      {t.pad.submit}
    </button>
  )
}

function NumberPad({ digits, input }: { digits: string; input: PadInput }) {
  const send = () => input.send({ kind: 'number', digits })

  // The physical keyboard drives the same pad, which is how a grown-up tests a
  // battle without reaching for the mouse. It belongs here rather than in the
  // hook: a key is an input device, not a rule of the game.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key >= '0' && event.key <= '9') input.digit(event.key)
      else if (event.key === 'Backspace') input.erase()
      else if (event.key === 'Enter') send()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // `send` is rebuilt every render, but nothing is in it except `digits` and
    // `input` — so re-subscribing when those change is exactly often enough.
  }, [digits, input])

  return (
    <div className="pad">
      <p className="pad__hint">{t.pad.hint}</p>
      <div className="pad__value">{digits || t.pad.empty}</div>
      <div className="pad__keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
          <button key={digit} className="pad__key" onClick={() => input.digit(digit)}>
            {digit}
          </button>
        ))}
        {/* Erase earns its place now the voice writes here too: a misheard
            number has to be got rid of without the child hunting for a key. */}
        <button
          className="pad__key pad__key--erase"
          onClick={input.erase}
          disabled={digits === ''}
          aria-label={t.pad.erase}
        >
          ⌫
        </button>
        <SendButton onClick={send} disabled={digits === ''} />
      </div>
    </div>
  )
}
