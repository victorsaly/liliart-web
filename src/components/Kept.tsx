import { useEffect, useRef, useState } from 'react'
import type { Craft } from '../lib/ai'
import * as saved from '../lib/saved'
import { Swipe } from './Swipe'
import { ArrowRightIcon, BinIcon } from './icons'

interface Props {
  crafts: Craft[]
  onOpen: (craft: Craft) => void
}

export function Kept({ crafts, onOpen }: Props) {
  /* the last one removed, held just long enough to put it back */
  const [undo, setUndo] = useState<Craft | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function drop(craft: Craft) {
    saved.remove(craft.id)
    setUndo(craft)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setUndo(null), 7000)
  }

  function putBack() {
    if (!undo) return
    saved.restore(undo)
    setUndo(null)
    window.clearTimeout(timer.current)
  }

  if (crafts.length === 0) {
    return (
      <>
        <div className="empty">
          <p>Nothing kept yet. When you find one you like, press <b>Keep it</b> and it will wait here — even with the wifi off.</p>
        </div>
        {undo && <Undo craft={undo} onUndo={putBack} />}
      </>
    )
  }

  return (
    <>
      <p className="swipe-hint">Slide a card left to remove it, right to start making it.</p>

      <div className="ideas">
        {crafts.map((craft) => (
          <Swipe
            key={craft.id}
            left={{ label: 'Remove', tone: 'bin', icon: <BinIcon />, run: () => drop(craft) }}
            right={{ label: 'Make it', tone: 'go', icon: <ArrowRightIcon />, run: () => onOpen(craft) }}
          >
            <div className="idea">
              <button type="button" className="idea-body" onClick={() => onOpen(craft)}>
                <span className="idea-title">{craft.title}</span>
                <span className="idea-blurb">{craft.summary}</span>
                <span className="idea-meta">
                  <span className="chip chip-accent">{craft.minutes} min</span>
                  <span className="chip">{craft.steps.length} steps</span>
                </span>
              </button>

              <button type="button" className="keep is-bin" onClick={() => drop(craft)}>
                <BinIcon />
                <span>Remove</span>
              </button>
            </div>
          </Swipe>
        ))}
      </div>

      {undo && <Undo craft={undo} onUndo={putBack} />}
    </>
  )
}

function Undo({ craft, onUndo }: { craft: Craft; onUndo: () => void }) {
  return (
    <div className="undo" role="status">
      <span>Removed <b>{craft.title}</b>.</span>
      <button type="button" className="btn btn-small" onClick={onUndo}>Put it back</button>
    </div>
  )
}
