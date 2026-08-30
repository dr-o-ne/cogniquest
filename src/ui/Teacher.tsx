import { t } from '@/locale'
import './Teacher.css'

export type TeacherMood = 'idle' | 'listening' | 'happy' | 'encouraging'

/**
 * The stand-in teacher for phase 3.
 *
 * Deliberately primitive: the real character is phase 5, and investing in art
 * before then is premature. This figure's job is to prove that the moods do
 * switch off session events. When Rive or 3D arrives (G5), only the insides of
 * this component change; the calling code stays as it is (A10).
 */
export function Teacher({ mood }: { mood: TeacherMood }) {
  return (
    <div className={`teacher teacher--${mood}`}>
      {mood === 'listening' && <span className="teacher__ear" aria-hidden />}
      <svg viewBox="0 0 100 100" className="teacher__face" role="img" aria-label={t.teacher.label}>
        <circle cx="50" cy="50" r="42" className="teacher__head" />
        {mood === 'happy' ? (
          <>
            <path d="M28 44 q7 -9 14 0" className="teacher__eye-arc" />
            <path d="M58 44 q7 -9 14 0" className="teacher__eye-arc" />
          </>
        ) : (
          <>
            <circle cx="35" cy="44" r={mood === 'listening' ? 7 : 5.5} className="teacher__eye" />
            <circle cx="65" cy="44" r={mood === 'listening' ? 7 : 5.5} className="teacher__eye" />
          </>
        )}
        {mood === 'happy' && <path d="M32 62 q18 20 36 0" className="teacher__mouth teacher__mouth--wide" />}
        {mood === 'idle' && <path d="M38 65 q12 8 24 0" className="teacher__mouth" />}
        {mood === 'encouraging' && <path d="M38 66 q12 5 24 0" className="teacher__mouth" />}
        {mood === 'listening' && <ellipse cx="50" cy="66" rx="7" ry="9" className="teacher__mouth-o" />}
      </svg>
    </div>
  )
}
