import { questById, type QuestNode } from '@/game'
import { t } from '@/locale'
import { MonsterFace, SquadHand } from './OpponentCard'
import { TopBar } from './TopBar'

/**
 * How wide the switchback is, and where a stop lands on it.
 *
 * Three of them, and the number is measured rather than chosen: at the size the
 * arena draws a card, a squad of three fans out to 331px, so a lane has to be
 * wider than that. Three lanes of a 68rem path are 362px each; four would be
 * 272 and a hand would lie across its neighbours.
 *
 * A serpentine is a road that crosses and comes back as it descends, so the
 * stops run left to right along one row, right to left along the next, and so
 * on down. Neighbours are therefore either side by side in a row, or one
 * directly under the other where the road turns — which is the whole of what
 * the trail between them has to draw.
 *
 * Worked out here rather than in the stylesheet: CSS can do it, but only with
 * `round()`, which Chromium learned late enough to be a real risk on a machine
 * that has not updated — and an invalid `grid-column` fails silently, leaving
 * every stop in one column with nothing to say why.
 */
const LANES = 3

const rowOf = (index: number) => Math.floor(index / LANES)

function laneOf(index: number): number {
  const along = index % LANES
  return rowOf(index) % 2 === 0 ? along : LANES - 1 - along
}

/**
 * The road, as one curve running through the middle of every stop.
 *
 * Drawn in lane-and-row units — a stop sits at the centre of its cell, so its
 * centre is `lane + 0.5, row + 0.5` — and stretched over the grid by the SVG,
 * which is why the rows have to be of one height: the curve is computed rather
 * than measured, and a row that grew to fit a taller stop would pull the road
 * off it.
 *
 * The bends come out of the smoothing rather than being placed. A Catmull-Rom
 * spline passes through every point it is given, so the road cannot miss a stop
 * — and where the path turns down at the end of a row, the same smoothing swings
 * it wide, which is exactly the switchback a mountain road makes.
 */
function road(count: number): string {
  const at = (index: number) => [laneOf(index) + 0.5, rowOf(index) + 0.5] as const
  const points = Array.from({ length: count }, (_, index) => at(index))
  // The ends are doubled so the first and last segments bend like the rest.
  const guard = (index: number) => points[Math.min(Math.max(index, 0), count - 1)]!

  const [x0, y0] = points[0]!
  let d = `M ${x0} ${y0}`

  for (let i = 0; i < count - 1; i++) {
    const [px, py] = guard(i - 1)
    const [x1, y1] = guard(i)
    const [x2, y2] = guard(i + 1)
    const [nx, ny] = guard(i + 2)

    // Catmull-Rom through the stops, written as the cubic SVG can draw.
    const c1 = [x1 + (x2 - px) / 6, y1 + (y2 - py) / 6]
    const c2 = [x2 - (nx - x1) / 6, y2 - (ny - y1) / 6]

    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${x2} ${y2}`
  }

  return d
}

/**
 * The path: every stop of a quest, from the top of the screen down, walked in
 * order. Behind the child it is cleared, ahead of them it is locked, and the one
 * they are standing on is the only thing that can be pressed.
 *
 * That is the whole difference from the arena, where any card may be picked at
 * any time. A path is a sequence somebody else chose — today by hand in
 * `quests.ts`, tomorrow by a generator from what a parent asked for.
 *
 * A longer path than today's thirteen stops will run off the bottom, and nothing
 * here has to do anything about it: `.screen` is a min-height, the page is the
 * scroll container, and the top bar is already sticky.
 */
export function PathScreen({
  name,
  questId,
  at,
  onFight,
  onBack,
  onReset,
}: {
  name: string
  questId: string
  /** Which stop the child is standing on. */
  at: number
  onFight: () => void
  onBack: () => void
  onReset: () => void
}) {
  const quest = questById(questId)
  const rows = Math.ceil(quest.nodes.length / LANES)

  return (
    <div className="screen">
      <TopBar name={name} onReset={onReset} onBack={onBack} />

      <div className="screen--center screen__body">
        <h2 className="roster__title">{quest.name}</h2>

        <ol
          className="path"
          style={{ '--lanes': LANES, '--rows': rows } as React.CSSProperties}
        >
          {/* Behind the stops, and no part of the list: it is one drawing of
              where the road goes, not a thing at any stop on it. */}
          <svg
            className="path__road"
            viewBox={`0 0 ${LANES} ${rows}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={road(quest.nodes.length)} />
          </svg>

          {quest.nodes.map((node, index) => (
            <Stop
              key={index}
              node={node}
              lane={laneOf(index)}
              row={rowOf(index)}
              cleared={index < at}
              standing={index === at}
              onFight={onFight}
            />
          ))}
        </ol>
      </div>
    </div>
  )
}

/**
 * One stop, drawn as the very card the opponent would be met on — a monster's
 * card, or a squad's fanned hand — at the size the arena draws it. Thirteen of
 * them run past the bottom of the screen, and scrolling to them is what walking
 * a path looks like.
 *
 * Three states, and only one of them is a button: pressing a stop the child has
 * not reached would jump the queue, and pressing one behind them would replay a
 * fight the path has already taken from them.
 */
function Stop({
  node,
  lane,
  row,
  cleared,
  standing,
  onFight,
}: {
  node: QuestNode
  lane: number
  row: number
  cleared: boolean
  standing: boolean
  onFight: () => void
}) {
  const classes = ['path__stop']
  if (node.boss) classes.push('path__stop--boss')
  if (cleared) classes.push('path__stop--cleared')
  else if (standing) classes.push('path__stop--standing')
  else classes.push('path__stop--locked')

  const { opposition } = node
  const colour =
    opposition.kind === 'duel' ? opposition.monster.color : opposition.squad.color

  // Beaten is the arena's own state, said with the arena's own class, so the
  // stroke through a cleared stop is the same stroke the roster draws.
  const inside =
    opposition.kind === 'duel' ? (
      <span
        className={cleared ? 'card card--beaten' : 'card'}
        style={{ '--card': colour } as React.CSSProperties}
      >
        <MonsterFace monster={opposition.monster} />
      </span>
    ) : (
      <span
        className={cleared ? 'hand hand--beaten' : 'hand'}
        style={{ '--card': colour } as React.CSSProperties}
      >
        <SquadHand squad={opposition.squad} />
      </span>
    )

  return (
    <li className={classes.join(' ')} style={{ '--lane': lane, '--row': row } as React.CSSProperties}>
      {standing ? (
        <button className="path__go" onClick={onFight} aria-label={t.quest.fight}>
          {inside}
        </button>
      ) : (
        <span className="path__go" aria-disabled="true">
          {inside}
        </span>
      )}
    </li>
  )
}
