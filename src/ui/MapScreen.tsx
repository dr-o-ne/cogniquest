import { useEffect, useRef, useState } from 'react'
import {
  currentStep,
  isFinished,
  isOpen,
  levelColor,
  MAP_SCREENS,
  regions,
  road,
  type Campaign,
  type Encounter,
  type JourneyNode,
} from '@/game'
import { t } from '@/locale'
import { MonsterAvatar } from './MonsterAvatar'
import type { GameState } from './useBattle'
import './MapScreen.css'

/**
 * THE MAP — one road, and the pockets that hang off it.
 *
 * Eighty-eight medallions on one screen, which is why none of them carries a
 * name: the picture is what the child picks by, and the text came off the
 * opponent cards for the same reason. The composition of a squad is a hover
 * away and a click away; it is not something to read eighty-eight times.
 *
 * The grid the nodes are packed into is never drawn. Positions arrive already
 * nudged off their cells (see journey.ts) and the road is a curve through them,
 * so what shows is a trail rather than a table.
 *
 * One region fills the window and the child scrolls from one to the next, so
 * the map is five screens tall. That is what makes the portraits big enough to
 * be worth looking at, and it turns arriving in a new region into an event
 * rather than a change of stripe.
 */
export function MapScreen({
  state,
  onFight,
  onReset,
  onNewRun,
}: {
  state: GameState
  onFight: (encounter: Encounter) => void
  onReset: () => void
  onNewRun: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const campaign = state.campaign
  if (!campaign) return null

  const reached = currentStep(campaign, state.cleared)
  const taken = isFinished(campaign, state.cleared)

  return (
    <div className="screen map">
      <header className="map__top">
        <h1 className="map__title">{t.map.title(state.name)}</h1>

        <span className="purse" title={t.map.gold(state.gold)}>
          <span className="purse__coin" aria-hidden="true">
            ⛁
          </span>
          {state.gold}
        </span>

        {/* Wipes everything, hence two steps: a stray click must not clear the
            child's progress. */}
        <span className="reset-corner">
          {confirming ? (
            <>
              <span className="reset__ask">{t.map.wipeAsk}</span>
              <button className="reset__yes" onClick={onReset}>
                {t.map.wipeYes}
              </button>
              <button className="reset__no" onClick={() => setConfirming(false)}>
                {t.map.wipeNo}
              </button>
            </>
          ) : (
            <button className="reset__start" onClick={() => setConfirming(true)}>
              {t.map.newGame}
            </button>
          )}
        </span>
      </header>

      <Board campaign={campaign} state={state} reached={reached} onFight={onFight} />

      {taken && (
        <div className="popup">
          <div className="popup__box">
            <span className="avatar avatar--popup avatar--emoji">🏰</span>
            <h2 className="popup__title">{t.map.castleTaken}</h2>
            <p className="popup__note">{t.map.gold(state.gold)}</p>
            <button className="big-button" onClick={onNewRun} autoFocus>
              {t.map.newRun}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Board({
  campaign,
  state,
  reached,
  onFight,
}: {
  campaign: Campaign
  state: GameState
  reached: number
  onFight: (encounter: Encounter) => void
}) {
  const view = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const here = useRef<HTMLButtonElement>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })

  // The frame sizes itself in CSS; this only measures it, and only so the road
  // can be drawn in pixels. A percentage viewBox would have been less code and
  // would have stretched every curve sideways — the frame is five windows tall.
  useEffect(() => {
    const element = frame.current
    if (!element) return

    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight })
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Open the map where the child left off rather than at the bottom of the
  // road: five screens of scrolling to find your own token is a puzzle nobody
  // asked for.
  useEffect(() => {
    here.current?.scrollIntoView({ block: 'center' })
  }, [reached, box.height])

  const steps = road(campaign)
  const points = steps.map((node) => [
    (node.at.x / 100) * box.width,
    (node.at.y / 100) * box.height,
  ] as const)

  return (
    <div className="map__view" ref={view}>
      <div
        className="map__frame"
        ref={frame}
        style={{ '--screens': MAP_SCREENS } as React.CSSProperties}
      >
        {regions().map((region, index) => (
          <div
            key={region.level}
            className="map__band"
            style={{
              '--hue': levelColor(region.level),
              top: `${(index / MAP_SCREENS) * 100}%`,
              height: `${100 / MAP_SCREENS}%`,
            } as React.CSSProperties}
          >
            <span className="map__band-name">{t.map.regions[region.level]}</span>
          </div>
        ))}

        <svg className="map__road" viewBox={`0 0 ${box.width} ${box.height}`} aria-hidden="true">
          <path className="map__road-ahead" d={curve(points.slice(Math.max(0, reached - 1)))} />
          <path className="map__road-walked" d={curve(points.slice(0, reached))} />
        </svg>

        {campaign.nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            done={state.cleared.has(node.id)}
            here={node.step === reached}
            open={isOpen(node, reached)}
            onFight={onFight}
            standing={node.step === reached ? here : undefined}
          />
        ))}
      </div>
    </div>
  )
}

function Node({
  node,
  done,
  here,
  open,
  onFight,
  standing,
}: {
  node: JourneyNode
  done: boolean
  here: boolean
  open: boolean
  onFight: (encounter: Encounter) => void
  /** Set on the node the child is standing at, so the map can scroll to it. */
  standing?: React.RefObject<HTMLButtonElement | null> | undefined
}) {
  const leader = node.encounter.stacks[0]!.monster
  const pocket = node.encounter.kind === 'pocket'
  const siege = node.encounter.kind === 'siege'

  const classes = [
    'node',
    pocket ? 'node--pocket' : '',
    siege ? 'node--siege' : '',
    done ? 'node--done' : here ? 'node--here' : open ? 'node--open' : 'node--shut',
  ]
    .filter(Boolean)
    .join(' ')

  const what = node.encounter.stacks
    .map((stack) => stack.monster.name)
    .filter((name, i, all) => all.indexOf(name) === i)
    .join(', ')

  return (
    <button
      ref={standing}
      className={classes}
      style={{
        '--hue': levelColor(node.region),
        left: `${node.at.x}%`,
        top: `${node.at.y}%`,
      } as React.CSSProperties}
      disabled={!open}
      onClick={() => onFight(node.encounter)}
      title={`${node.siegeName ? `${node.siegeName} — ` : ''}${what}${pocket ? ` · ${t.map.pocket}` : ''}`}
    >
      <MonsterAvatar monster={leader} size="map" />
      <span className="node__count">{t.map.squad(node.encounter.stacks.length)}</span>
      {done && (
        <span className="node__won" aria-hidden="true">
          ✔
        </span>
      )}
      {here && (
        <span className="node__token" aria-hidden="true">
          🧒
        </span>
      )}
    </button>
  )
}

/**
 * A Catmull-Rom spline through the road, written out as beziers.
 *
 * A polyline would have drawn the serpentine the nodes are packed into and
 * given the whole thing away as a table with a line through it. The tension is
 * slack (a seventh rather than the usual sixth) because the turns at the end of
 * a row are sharp, and a tighter curve overshoots them into the frame's edge.
 */
function curve(points: readonly (readonly [number, number])[]): string {
  if (points.length < 2) return ''

  let path = `M${points[0]![0].toFixed(1)},${points[0]![1].toFixed(1)}`

  for (let i = 0; i < points.length - 1; i++) {
    const before = points[i - 1] ?? points[i]!
    const from = points[i]!
    const to = points[i + 1]!
    const after = points[i + 2] ?? points[i + 1]!

    const c1 = [from[0] + (to[0] - before[0]) / 7, from[1] + (to[1] - before[1]) / 7]
    const c2 = [to[0] - (after[0] - from[0]) / 7, to[1] - (after[1] - from[1]) / 7]

    path +=
      ` C${c1[0]!.toFixed(1)},${c1[1]!.toFixed(1)}` +
      ` ${c2[0]!.toFixed(1)},${c2[1]!.toFixed(1)}` +
      ` ${to[0].toFixed(1)},${to[1].toFixed(1)}`
  }

  return path
}
