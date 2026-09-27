import { useEffect, useState } from 'react'
import type { Craft } from '../lib/ai'
import { shrink, toDataUrl } from '../lib/photo'
import * as saved from '../lib/saved'
import { TakePhoto } from './TakePhoto'
import { ArrowLeftIcon, ArrowRightIcon, CameraIcon, GrownUpIcon, PictureIcon, RosetteIcon } from './icons'

interface Props {
  craft: Craft
  onDone: () => void
  onBack: () => void
}

/**
 * One step, as big as the screen. Hands are busy and probably sticky, so there
 * is nothing here but the step you are on and the way forward — plus a row of
 * pips, because "how much more is there?" is the question a seven-year-old
 * asks at step three. The screen is asked to stay awake while it is open.
 */
export function MakeScreen({ craft, onDone, onBack }: Props) {
  const [at, setAt] = useState(0)
  const [finished, setFinished] = useState(false)
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
      if (finished) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        setAt((n) => Math.min(n + 1, craft.steps.length - 1))
      }
      if (e.key === 'ArrowLeft') setAt((n) => Math.max(n - 1, 0))
      if (e.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [craft.steps.length, onBack, finished])

  if (finished) return <Finished craft={craft} onDone={onDone} />

  return (
    <div className="make">
      <div className="make-top">
        <button type="button" className="btn btn-small" onClick={onBack}>
          <ArrowLeftIcon /> Back
        </button>
        <div className="pips" aria-hidden="true">
          {craft.steps.map((_, n) => <i key={n} className={n <= at ? 'is-on' : ''} />)}
        </div>
        <span className="make-count">{at + 1}/{craft.steps.length}</span>
      </div>

      <div className="make-body">
        <div className="make-num">{at + 1}</div>
        <h2 className="make-title">{step.title}</h2>
        <p className="make-text">{step.description}</p>
        {step.grownUp && (
          <span className="grownup"><GrownUpIcon /> A grown-up does this bit</span>
        )}
      </div>

      <div className="make-foot">
        {at > 0 && (
          <button type="button" className="btn" onClick={() => setAt(at - 1)}>
            <ArrowLeftIcon /> Back a step
          </button>
        )}
        {last ? (
          <button type="button" className="btn btn-go" onClick={() => setFinished(true)}>
            I made it!
          </button>
        ) : (
          <button type="button" className="btn btn-go" onClick={() => setAt(at + 1)}>
            Next step <ArrowRightIcon />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * The one celebration in the app, and it is earned: something that did not
 * exist half an hour ago now does. Ribbons are cut paper, which is what the
 * child has been handling.
 */
/**
 * The end of a craft, which until now the app forgot the moment it happened.
 * Photographing the finished thing is what turns Kept from a list of ideas
 * you liked into a shelf of things you actually made — and it costs nothing,
 * because it never goes near the AI.
 */
function Finished({ craft, onDone }: { craft: Craft; onDone: () => void }) {
  const [made, setMade] = useState(craft.made)
  const [problem, setProblem] = useState<string>()
  const ribbons = Array.from({ length: 18 }, (_, n) => ({
    left: `${(n * 5.6 + (n % 4) * 3) % 96}%`,
    delay: `${(n % 6) * 0.14}s`,
  }))

  async function show(file: File) {
    if (!file.type.startsWith('image/')) {
      setProblem('That is not a picture. Try a photo of what you made.')
      return
    }
    setProblem(undefined)
    try {
      const { full } = await toDataUrl(file)
      const small = await shrink(full, 720, 0.82)
      setMade(small)
      /* it is kept from here on whether it was before or not: you made it */
      if (!saved.recordMade(craft, small)) {
        setProblem('Saved, but there was not room for everything.')
      }
    } catch {
      setProblem("Couldn't open that picture. Have another go.")
    }
  }

  return (
    <div className="done">
      <div className="confetti" aria-hidden="true">
        {ribbons.map((r, n) => (
          <i key={n} style={{ left: r.left, animationDelay: r.delay }} />
        ))}
      </div>
      <div className="done-in">
        {made ? (
          <figure className="made">
            <img src={made} alt={`The ${craft.title} you made`} />
            <figcaption>Yours</figcaption>
          </figure>
        ) : (
          <div className="done-mark"><RosetteIcon /></div>
        )}

        <h2>You made it!</h2>
        <p>
          {made
            ? `${craft.title} is on your shelf now. Show someone.`
            : `${craft.title} is finished. Take a photo of it and it will be waiting in Kept.`}
        </p>

        {problem && <p className="note err">{problem}</p>}

        {!made && (
          <div className="done-do">
            <TakePhoto source="camera" className="btn btn-go btn-big" onPhoto={show}>
              <CameraIcon /> Show what you made
            </TakePhoto>
            <TakePhoto source="library" className="btn btn-small" onPhoto={show}>
              <PictureIcon /> Pick a photo
            </TakePhoto>
          </div>
        )}

        <button
          type="button" className={`btn btn-big ${made ? 'btn-go' : ''}`} onClick={onDone}
        >
          Make something else
        </button>
      </div>
    </div>
  )
}
