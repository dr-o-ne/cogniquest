import { useState } from 'react'
import { t } from '@/locale'
import { BattleGame } from './ui/BattleGame'
import { VoiceSpike } from './ui/VoiceSpike'

/**
 * Two screens for now: the game and the phase 1 measuring rig. The rig is kept
 * on purpose — if voice starts missing, measuring on it beats guessing from
 * how a battle felt.
 */
export function App() {
  const [screen, setScreen] = useState<'game' | 'spike'>('game')

  return (
    <>
      {screen === 'game' ? <BattleGame /> : <VoiceSpike />}
      <button
        className="dev-switch"
        onClick={() => setScreen(screen === 'game' ? 'spike' : 'game')}
        tabIndex={-1}
      >
        {screen === 'game' ? t.app.switchToSpike : t.app.switchToGame}
      </button>
    </>
  )
}
