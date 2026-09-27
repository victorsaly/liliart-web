import type { Idea, Mess } from '../lib/ai'
import { Swipe } from './Swipe'
import { HideIcon, StarIcon } from './icons'

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
  if (state === 'idle') return null

  if (state === 'thinking') {
    return (
      <>
        <p className="label">Thinking of things to make…</p>
        <div className="ideas">
          {[0, 1, 2].map((n) => (
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
                <button type="button" className="idea-body" onClick={() => onOpen(idea)}>
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
              </div>
            </Swipe>
          )
        })}
      </div>
    </>
  )
}
