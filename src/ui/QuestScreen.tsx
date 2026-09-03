import { QUESTS, type Quest } from '@/game'
import { t } from '@/locale'
import { MonsterFace } from './OpponentCard'
import { TopBar } from './TopBar'

/**
 * Picking a path. Each is offered by the mini-boss who ends it, on the same
 * card the child would meet that boss on — so the screen answers «who is at the
 * end of this?» before it answers anything else.
 *
 * The arena's roster and this are two lists of cards, and they are deliberately
 * not one component: what a card stands for differs (an opponent there, a walk
 * here), and a shape shared between two callers on the strength of both being
 * «a list of cards» is the abstraction **A2** already records paying for.
 */
export function QuestScreen({
  name,
  gold,
  progress,
  onOpen,
  onBack,
  onReset,
}: {
  name: string
  gold: number
  /** quest id → stops cleared. */
  progress: Record<string, number>
  onOpen: (questId: string) => void
  onBack: () => void
  onReset: () => void
}) {
  return (
    <div className="screen">
      <TopBar name={name} gold={gold} onReset={onReset} onBack={onBack} />

      <div className="screen--center screen__body">
        <h2 className="roster__title">{t.quest.title}</h2>
        <div className="roster">
          {QUESTS.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              cleared={progress[quest.id] ?? 0}
              onOpen={onOpen}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * One path, as its boss's card with a line of progress under it.
 *
 * A finished path is struck through and still walkable, exactly like a beaten
 * opponent — and for the same reason: nothing in this game is spent by being
 * played (**P10**).
 */
function QuestCard({
  quest,
  cleared,
  onOpen,
}: {
  quest: Quest
  cleared: number
  onOpen: (questId: string) => void
}) {
  const done = cleared >= quest.nodes.length

  return (
    <button
      className={done ? 'card card--beaten' : 'card'}
      style={{ '--card': quest.boss.color } as React.CSSProperties}
      onClick={() => onOpen(quest.id)}
    >
      <MonsterFace monster={quest.boss} />
      <span className="card__progress">{t.quest.progress(cleared, quest.nodes.length)}</span>
    </button>
  )
}
