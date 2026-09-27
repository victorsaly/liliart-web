import type { Craft } from '../lib/ai'
import * as saved from '../lib/saved'

interface Props {
  crafts: Craft[]
  onOpen: (craft: Craft) => void
}

export function Kept({ crafts, onOpen }: Props) {
  if (crafts.length === 0) {
    return (
      <div className="empty">
        <p>Nothing kept yet. When you find one you like, press <b>Keep it</b> and it will wait here — even with the wifi off.</p>
      </div>
    )
  }

  return (
    <div className="ideas">
      {crafts.map((craft) => (
        <div className="idea" key={craft.id} style={{ display: 'grid', gap: '.45rem' }}>
          <button
            type="button"
            onClick={() => onOpen(craft)}
            style={{ display: 'grid', gap: '.3rem', textAlign: 'left', padding: 0 }}
          >
            <span className="idea-title">{craft.title}</span>
            <span className="idea-blurb">{craft.summary}</span>
            <span className="idea-meta">
              <span className="chip chip-accent">{craft.minutes} min</span>
              <span className="chip">{craft.steps.length} steps</span>
            </span>
          </button>
          <div>
            <button
              type="button" className="btn btn-small"
              onClick={() => saved.remove(craft.id)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
