import { QUESTS, type Quest } from '@/game'
import { t } from '@/locale'
import { TopBar } from './TopBar'

/**
 * Picking a path. Each is offered by its own King's Bounty mini-boss, on the
 * same card the arena draws an opponent on — so the screen answers «who is at
 * the end of this?» before it answers anything else.
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
 * One path, as its mini-boss's portrait and name, with a line of progress
 * under it.
 *
 * No rank, no strength — the whole difference from the arena's own card: the
 * child is not sizing up an opponent here, only picking a road by the face
 * at the end of it. The name is kept: unlike a monster fought many times
 * over, a mini-boss is somebody in particular, and «who is this?» deserves
 * an answer.
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
      <img className="avatar avatar--card" src={quest.image} alt={quest.bossName} />
      <span className="card__name">{quest.bossName}</span>
      <span className="card__progress">{t.quest.progress(cleared, quest.nodes.length)}</span>
    </button>
  )
}
