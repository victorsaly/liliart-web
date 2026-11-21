import { useEffect, useState } from 'react'
import { drawStep, type Craft } from '../lib/ai'
import { shrink, toDataUrl } from '../lib/photo'
import * as saved from '../lib/saved'
import { keepPlace, placeIn } from '../lib/place'
import { useSpeak } from '../lib/speak'
import { usePicturesNote } from '../lib/usePicturesNote'
import { Shout } from './Shout'
import { TakePhoto } from './TakePhoto'
import { ArrowLeftIcon, ArrowRightIcon, CameraIcon, CloseIcon, GrownUpIcon, PictureIcon, RosetteIcon, SpeakerIcon } from './icons'

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
  /* pick up where this craft was left, not at the beginning */
  const [at, setAt] = useState(() => placeIn(craft.id, craft.steps.length))
  const [finished, setFinished] = useState(false)
  const [art, setArt] = useState<Record<number, string>>({})
  /* steps whose picture could not be drawn: no wifi, or today's limit */
  const [noArt, setNoArt] = useState<Record<number, boolean>>({})
  const [again, setAgain] = useState(0)
  const { can: canSpeak, speaking, say, hush } = useSpeak()
  const picturesNote = usePicturesNote()
  const step = craft.steps[at]
  const last = at === craft.steps.length - 1

  /*
   * A picture of the step you are on, and quietly the one after it, so that
   * tapping Next does not mean waiting. Nothing here is fetched for a step
   * that is never reached: a craft abandoned at step two pays for three
   * pictures, not for all of them. What the craft is made of comes from its
   * own tool list, so this works for a kept craft reopened weeks later.
   */
  useEffect(() => {
    let live = true
    const stuff = craft.tools.map((t) => ({ name: t.tool }))
    const fetchOne = (n: number) => {
      if (n < 0 || n >= craft.steps.length) return
      drawStep(craft, n, stuff).then((image) => {
        if (!live) return
        if (image) setArt((a) => (a[n] ? a : { ...a, [n]: image }))
        /* say so, so the frame can get out of the way instead of spinning
           for ever — a failed picture used to look exactly like a slow one */
        setNoArt((f) => (f[n] === !image ? f : { ...f, [n]: !image }))
      })
    }
    fetchOne(at)
    fetchOne(at + 1)
    return () => { live = false }
  }, [at, craft, again])

  /* the wifi coming back is a reason to ask for the picture again */
  useEffect(() => {
    const back = () => setAgain((n) => n + 1)
    window.addEventListener('online', back)
    return () => window.removeEventListener('online', back)
  }, [])

  /* remember the step, and stop reading the old one when it changes */
  useEffect(() => {
    keepPlace(craft.id, at)
    hush()
  }, [craft.id, at, hush])

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
        {/* "Close", not "Back": the button at the foot goes back a step, and
            two buttons with one name did two different things */}
        <button type="button" className="btn btn-small" onClick={onBack}>
          <CloseIcon /> Close
        </button>
        <div className="pips" aria-hidden="true">
          {craft.steps.map((_, n) => <i key={n} className={n <= at ? 'is-on' : ''} />)}
        </div>
        <span className="make-count">{at + 1}/{craft.steps.length}</span>
      </div>

      <div className="make-body">
        {/* with no picture to show, the frame goes and the words take the room */}
        {(art[at] || !noArt[at]) && (
          <figure className={`make-art ${step.grownUp ? 'is-grownup' : ''}`}>
            {art[at]
              ? <img src={art[at]} alt={`Someone doing this step: ${step.title}`} />
              : <div className="make-art-wait"><span /><p>Drawing this step…</p></div>}
          </figure>
        )}
        {/* no frame, and a limit is why: say so once, quietly, and carry on */}
        {!art[at] && noArt[at] && picturesNote && (
          <p className="note no-pictures">{picturesNote} The steps still work.</p>
        )}

        <div className="make-words">
        {/* said before the step is read, not after: this is the app's one
            safety signal, and it used to be the smallest text on the screen */}
        {step.grownUp && (
          <p className="handover"><GrownUpIcon /> <span>Pass this one to your grown-up</span></p>
        )}
        <div className="make-num">{at + 1}</div>
        {/* keyed on the step so the words drop in again each time it changes */}
        <h2 className="make-title" key={at}><Shout quick>{step.title}</Shout></h2>
        <p className="make-text">{step.description}</p>
        {canSpeak && (
          <button
            type="button" className={`btn read ${speaking ? 'is-on' : ''}`} aria-pressed={speaking}
            onClick={() => (speaking ? hush() : say(
              `${step.grownUp ? 'Pass this one to your grown-up. ' : ''}Step ${at + 1}. ${step.title}. ${step.description}`,
            ))}
          >
            <SpeakerIcon /> {speaking ? 'Stop reading' : 'Read it to me'}
          </button>
        )}
        </div>
      </div>

      <div className="make-foot">
        {at > 0 && (
          <button type="button" className="btn" onClick={() => setAt(at - 1)}>
            <ArrowLeftIcon /> Back
          </button>
        )}
        {last ? (
          <button type="button" className="btn btn-go" onClick={() => { keepPlace(craft.id, 0); setFinished(true) }}>
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
 *
 * It is also the end the app used to forget the moment it happened.
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
        ) : craft.drawing ? (
          /* what they were aiming at, where their own photo is about to go */
          <figure className="made is-idea">
            <img src={craft.drawing} alt={`A drawing of the ${craft.title}`} />
            <figcaption>The idea</figcaption>
          </figure>
        ) : (
          <div className="done-mark"><RosetteIcon /></div>
        )}

        <h2><Shout>You made it!</Shout></h2>
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
