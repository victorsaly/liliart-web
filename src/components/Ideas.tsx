import { useEffect, useState } from 'react'
import { drawIdea, type Idea, type Mess } from '../lib/ai'
import { usePicturesNote } from '../lib/usePicturesNote'
import { Swipe } from './Swipe'
import { ArrowRightIcon, HideIcon, StarIcon } from './icons'

const MESS: Record<Mess, string> = { low: 'Tidy', medium: 'A bit messy', high: 'Messy!' }

interface Props {
  ideas: Idea[]
  state: 'idle' | 'thinking' | 'ready' | 'stale' | 'error'
  error?: string
  onOpen: (idea: Idea) => void
  onAgain: () => void
  /** keep this one, or un-keep it if it is already kept */
  onKeep: (idea: Idea) => void
  /** take it off the list — nothing is written down */
  onHide: (idea: Idea) => void
  keptIds: Set<string>
  /** the ones being written out right now, so Keep can say so */
  keeping: Set<string>
}

export function Ideas({ ideas, state, error, onOpen, onAgain, onKeep, onHide, keptIds, keeping }: Props) {
  const picturesNote = usePicturesNote()
  if (state === 'idle') return null

  if (state === 'thinking') {
    return (
      <>
        <p className="label">Thinking of things to make…</p>
        <div className="ideas">
          {[0, 1, 2, 3].map((n) => (
            <div className="skel" key={n} aria-hidden="true">
              <span style={{ width: '55%', height: '1.3rem' }} />
              <span style={{ width: '90%' }} />
              <span style={{ width: '70%' }} />
            </div>
          ))}
        </div>
      </>
    )
  }

  if (state === 'error') {
    return (
      <div className="empty" style={{ marginTop: '1.5rem' }}>
        <p>{error ?? 'That did not work.'}</p>
        <button type="button" className="btn" onClick={onAgain}>Try again</button>
      </div>
    )
  }

  return (
    <>
      <p className="label">
        <span>{state === 'stale' ? 'From what you had before' : 'You could make'}</span>
        <button type="button" className="btn btn-small" onClick={onAgain}>
          {state === 'stale' ? 'Think again' : 'More ideas'}
        </button>
      </p>

      <p className="swipe-hint">Slide a card right to keep it, left to hide it.</p>
      {picturesNote && <p className="note no-pictures">{picturesNote} You can still make these.</p>}

      <div className="ideas" style={state === 'stale' ? { opacity: .55 } : undefined}>
        {ideas.map((idea) => {
          const kept = keptIds.has(idea.id)
          const busy = keeping.has(idea.id)
          return (
            <Swipe
              key={idea.id}
              right={{
                label: kept ? 'Kept' : 'Keep', tone: 'go',
                icon: <StarIcon filled={kept} />, run: () => onKeep(idea),
              }}
              left={{ label: 'Hide', tone: 'bin', icon: <HideIcon />, run: () => onHide(idea) }}
            >
              <div className={`idea ${kept ? 'is-kept' : ''}`}>
                <button type="button" className="idea-body has-art" onClick={() => onOpen(idea)}>
                  {/* keyed, so a new idea starts with an empty frame */}
                  <IdeaArt key={idea.id} idea={idea} />
                  <span className="idea-title">{idea.title}</span>
                  <span className="idea-blurb">{idea.blurb}</span>
                  <span className="idea-meta">
                    <span className="chip chip-accent">{idea.minutes} min</span>
                    <span className="chip">{MESS[idea.mess]}</span>
                    {idea.alsoNeed.length > 0 && (
                      <span className="chip chip-need">also need: {idea.alsoNeed.join(', ')}</span>
                    )}
                  </span>
                </button>

                {/* Two things to do with an idea, and the one that moves you
                    on is the one that looks like the way forward. Before this
                    row, Keep was the only button on the card, so it was the
                    one that got pressed. */}
                <div className="idea-do">
                  <button
                    type="button"
                    className={`keep ${kept ? 'is-on' : ''}`}
                    onClick={() => onKeep(idea)}
                    aria-pressed={kept}
                    disabled={busy}
                  >
                    <StarIcon filled={kept} />
                    <span>{busy ? 'Keeping…' : kept ? 'Kept' : 'Keep'}</span>
                  </button>
                  <button type="button" className="go" onClick={() => onOpen(idea)}>
                    <span>Make this</span> <ArrowRightIcon />
                  </button>
                </div>
              </div>
            </Swipe>
          )
        })}
      </div>
    </>
  )
}

/**
 * The picture on a card. It arrives after the words do, so the card is
 * readable straight away and the picture lands in a space already held for
 * it. If it cannot be drawn the space stays a plain tint: the card still
 * works, and an error here would be noise.
 */
function IdeaArt({ idea }: { idea: Idea }) {
  const [art, setArt] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(true)

  useEffect(() => {
    let live = true
    drawIdea(idea).then((image) => {
      if (!live) return
      setArt(image)
      setWaiting(false)
    })
    return () => { live = false }
  }, [idea])

  return (
    <span className="idea-art">
      {/* the title beside it says what this is */}
      {art ? <img src={art} alt="" /> : waiting ? <i aria-hidden="true" /> : null}
    </span>
  )
}
