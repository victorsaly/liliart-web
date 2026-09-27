import { useEffect, useState } from 'react'
import type { Craft } from '../lib/ai'

interface Props {
  craft: Craft
  onDone: () => void
  onBack: () => void
}

/**
 * One step, as big as the screen. Hands are busy and probably sticky, so
 * there is nothing on this screen but the step you are on and the way
 * forward — and the screen is asked to stay awake while it is open.
 */
export function MakeScreen({ craft, onDone, onBack }: Props) {
  const [at, setAt] = useState(0)
  const step = craft.steps[at]
  const last = at === craft.steps.length - 1

  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let dropped = false
    navigator.wakeLock?.request('screen').then((l) => {
      if (dropped) { l.release().catch(() => {}); return }
      lock = l
    }).catch(() => { /* not available, or refused — the steps still work */ })
    return () => { dropped = true; lock?.release().catch(() => {}) }
  }, [])

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setAt((n) => Math.min(n + 1, craft.steps.length - 1)) }
      if (e.key === 'ArrowLeft') setAt((n) => Math.max(n - 1, 0))
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [craft.steps.length, onBack])

  return (
    <div className="make">
      <div className="make-top">
        <button type="button" className="btn btn-small" onClick={onBack}>← Back</button>
        <span className="make-count">Step {at + 1} of {craft.steps.length}</span>
      </div>

      <div className="make-body">
        <div className="make-num">{at + 1}</div>
        <h2 className="make-title">{step.title}</h2>
        <p className="make-text">{step.description}</p>
        {step.grownUp && <span className="grownup">🧑 A grown-up does this bit</span>}
      </div>

      <div className="make-foot">
        {at > 0 && (
          <button type="button" className="btn" onClick={() => setAt(at - 1)}>← Back a step</button>
        )}
        {last ? (
          <button type="button" className="btn btn-go" onClick={onDone}>🎉 All done!</button>
        ) : (
          <button type="button" className="btn btn-go" onClick={() => setAt(at + 1)}>Next step →</button>
        )}
      </div>
    </div>
  )
}
