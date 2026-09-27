import { useEffect, useRef, useState } from 'react'
import type { Craft, Idea, Material, Mess } from '../lib/ai'
import { drawCraft, explain, openCraft } from '../lib/ai'
import { shrink } from '../lib/photo'
import * as saved from '../lib/saved'
import { ArrowLeftIcon, ArrowRightIcon, GrownUpIcon, StarIcon } from './icons'

const MESS: Record<Mess, string> = { low: 'Tidy', medium: 'A bit messy', high: 'Messy!' }

interface Props {
  idea: Idea | null
  materials: Material[]
  photo?: string
  onClose: () => void
  onMake: (craft: Craft) => void
}

/** Written out once and kept, so going back into it is instant. */
const cache = new Map<string, Craft>()

export function CraftSheet({ idea, materials, photo, onClose, onMake }: Props) {
  const [craft, setCraft] = useState<Craft | null>(null)
  const [problem, setProblem] = useState<string>()
  const [kept, setKept] = useState(false)
  const [drawing, setDrawing] = useState<string | null>(null)
  /* which craft we have already asked for a drawing of. A ref, not state:
     as a dependency it would re-run this effect and cancel its own request. */
  const asked = useRef<string | undefined>(undefined)
  const latest = useRef(materials)
  latest.current = materials

  useEffect(() => {
    if (!idea) { setCraft(null); setProblem(undefined); return }
    let live = true
    setCraft(null)
    setProblem(undefined)
    setDrawing(null)

    const have = cache.get(idea.id)
    if (have) {
      setCraft(have)
      setKept(saved.isSaved(have.id))
      return
    }

    openCraft(idea, materials)
      .then((c) => {
        if (!live) return
        cache.set(idea.id, c)
        setCraft(c)
        setKept(saved.isSaved(c.id))
      })
      .catch((err) => live && setProblem(explain(err, "Couldn't write this one out. Close it and try again.")))
    return () => { live = false }
  }, [idea, materials])

  /* the drawing follows the craft, once per craft, and never blocks reading it */
  const craftId = craft?.id
  useEffect(() => {
    if (!craft || !craftId) return
    if (craft.drawing) { setDrawing(craft.drawing); return }
    if (asked.current === craftId) return
    asked.current = craftId

    let live = true
    drawCraft(craft, latest.current).then(async (image) => {
      if (!live || !image) return
      const small = await shrink(image).catch(() => image)
      setDrawing(small)
      const withArt = { ...craft, drawing: small }
      cache.set(craftId, withArt)
      setCraft(withArt)
    })
    return () => { live = false }
    /* keyed by id: setCraft below changes the object but not which craft it is */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [craftId])

  if (!idea) return null

  function keep() {
    if (!craft) return
    if (kept) { saved.remove(craft.id); setKept(false); return }
    const ok = saved.save({ ...craft, photo })
    setKept(true)
    if (!ok) setProblem('Saved, but there was no room for the photo.')
  }

  return (
    <div className="page">
      <button type="button" className="btn btn-small" onClick={onClose} style={{ marginBottom: '1rem' }}>
        <ArrowLeftIcon /> Back to ideas
      </button>

      <div className="sheet">
        <h2>{idea.title}</h2>

        {problem && <p className="note err">{problem}</p>}

        {!craft && !problem && (
          <>
            <div className="skel" aria-label="Writing it out">
              <span style={{ width: '90%' }} /><span style={{ width: '75%' }} />
            </div>
            <div className="skel" aria-hidden="true">
              <span style={{ width: '40%', height: '1.1rem' }} />
              <span /><span style={{ width: '80%' }} /><span style={{ width: '60%' }} />
            </div>
          </>
        )}

        {craft && (
          <>
            <figure className="craft-art">
              {drawing
                ? <img src={drawing} alt={`A drawing of the finished ${craft.title}`} />
                : <div className="craft-art-wait"><span /><p>Drawing what it might look like…</p></div>}
              {drawing && <figcaption>Roughly how yours might turn out</figcaption>}
            </figure>

            <p className="sheet-summary">{craft.summary}</p>
            <div className="idea-meta">
              <span className="chip chip-accent">{craft.minutes} min</span>
              <span className="chip">{MESS[craft.mess]}</span>
              <span className="chip">{craft.steps.length} steps</span>
            </div>

            {craft.tools.length > 0 && (
              <div className="sheet-block">
                <h3>What you need</h3>
                <ul className="tools">
                  {craft.tools.map((t, n) => (
                    <li key={n}>
                      <span className="dot" aria-hidden="true" />
                      <span><b>{t.tool}</b>{t.note ? <span> — {t.note}</span> : null}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="sheet-block">
              <h3>How to make it</h3>
              <ol className="steps">
                {craft.steps.map((s, n) => (
                  <li key={n}>
                    <div>
                      <div className="step-title">{s.title}</div>
                      <div className="step-text">{s.description}</div>
                      {s.grownUp && <span className="grownup"><GrownUpIcon /> A grown-up does this bit</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {craft.tips.length > 0 && (
              <div className="sheet-block">
                <h3>Good to know</h3>
                <ul className="tips">{craft.tips.map((t, n) => <li key={n}>{t}</li>)}</ul>
              </div>
            )}

            <div style={{ display: 'flex', gap: '.7rem' }}>
              <button type="button" className="btn" onClick={keep} aria-pressed={kept}>
                <StarIcon filled={kept} /> {kept ? 'Kept' : 'Keep it'}
              </button>
              <button type="button" className="btn btn-go" style={{ flex: 1 }} onClick={() => onMake(craft)}>
                Let's make it <ArrowRightIcon />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
