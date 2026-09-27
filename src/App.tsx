import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PhotoStep } from './components/PhotoStep'
import { Materials } from './components/Materials'
import { Ideas } from './components/Ideas'
import { CraftSheet } from './components/CraftSheet'
import { MakeScreen } from './components/MakeScreen'
import { Kept } from './components/Kept'
import { BookIcon, ScissorsIcon, StarIcon } from './components/icons'
import * as saved from './lib/saved'
import { explain, findMaterials, openCraftOnce, suggestIdeas, type Craft, type Idea, type Material } from './lib/ai'
import './styles/make.css'

/*
 * One page, two tabs, and one full-screen stage on top of them.
 *
 * Table — the flow: photograph your stuff, fix the list, pick an idea.
 * Kept  — what you saved, which works with the wifi off.
 * Make  — one step at a time, hiding everything else while you make it.
 *
 * The table's state survives a tab switch, so wandering off to look at a kept
 * craft does not throw away the photo you just took.
 */

type Tab = 'table' | 'kept'
type IdeasState = 'idle' | 'thinking' | 'ready' | 'stale' | 'error'

export default function App() {
  const [tab, setTab] = useState<Tab>('table')
  const [photo, setPhoto] = useState<string>()
  const [looking, setLooking] = useState<string>()
  const [materials, setMaterials] = useState<Material[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideasState, setIdeasState] = useState<IdeasState>('idle')
  const [ideasError, setIdeasError] = useState<string>()
  const [problem, setProblem] = useState<string>()
  const [open, setOpen] = useState<Idea | null>(null)
  const [making, setMaking] = useState<Craft | null>(null)
  const run = useRef(0)
  /* the window no longer scrolls — main does, so that is what we rewind */
  const scroller = useRef<HTMLElement>(null)
  const top = () => scroller.current?.scrollTo({ top: 0 })

  const kept = useSyncExternalStore(saved.subscribe, saved.all, () => [])
  const keptCount = useSyncExternalStore(saved.subscribe, saved.count, () => 0)

  async function onPhoto(full: string, small: string) {
    const id = ++run.current
    setPhoto(full)
    setLooking(full)
    setProblem(undefined)
    setIdeas([])
    setIdeasState('idle')
    try {
      const found = await findMaterials(small)
      if (id !== run.current) return
      /* Done looking, so say so here — not in a `finally` guarded on the run
         id, because think() takes the next id and that guard would never
         pass, leaving the whole page stuck behind the looking state. */
      setLooking(undefined)
      setMaterials(found)
      if (found.length === 0) {
        setProblem("It couldn't see anything to make with. Try again with more light, or spread things out a bit.")
      } else {
        think(found)
      }
    } catch (err) {
      if (id !== run.current) return
      setLooking(undefined)
      setProblem(explain(err, "Couldn't look at that photo. Check the wifi and try again."))
    }
  }

  async function think(from: Material[]) {
    const id = ++run.current
    setIdeasState('thinking')
    setIdeasError(undefined)
    try {
      const got = await suggestIdeas(from)
      if (id !== run.current) return
      setIdeas(got)
      setIdeasState('ready')
    } catch (err) {
      if (id !== run.current) return
      setIdeasError(explain(err, "Couldn't think of anything just now. Try again in a moment."))
      setIdeasState('error')
    }
  }

  /**
   * Keep an idea straight off the list. The steps have to be written out
   * before there is anything to save, so this can take a moment — the card
   * says "Keeping…" while it does, and the sheet reuses the same write-up.
   */
  const [keeping, setKeeping] = useState<Set<string>>(new Set())
  const keptIds = new Set(kept.map((c) => c.id))

  async function keepIdea(idea: Idea) {
    if (keptIds.has(idea.id)) { saved.remove(idea.id); return }
    if (keeping.has(idea.id)) return
    setKeeping((s) => new Set(s).add(idea.id))
    try {
      const craft = await openCraftOnce(idea, materials)
      if (!saved.save({ ...craft, photo })) setProblem('Kept, but there was no room for the photo.')
    } catch (err) {
      setProblem(explain(err, "Couldn't keep that one. Try again in a moment."))
    } finally {
      setKeeping((s) => { const n = new Set(s); n.delete(idea.id); return n })
    }
  }

  function hideIdea(idea: Idea) {
    setIdeas((list) => list.filter((i) => i.id !== idea.id))
  }

  function editMaterials(next: Material[]) {
    setMaterials(next)
    /* the ideas were for the old list — say so rather than quietly lying */
    if (next.length === 0) setIdeasState('idle')
    else if (ideasState === 'ready') setIdeasState('stale')
  }

  function startOver() {
    run.current++
    setPhoto(undefined)
    setLooking(undefined)
    setMaterials([])
    setIdeas([])
    setIdeasState('idle')
    setProblem(undefined)
    top()
  }

  useEffect(() => {
    document.title = making ? `${making.title} — LiliArt` : 'LiliArt'
  }, [making])

  if (making) {
    return (
      <MakeScreen
        craft={making}
        onBack={() => setMaking(null)}
        onDone={() => { setMaking(null); setOpen(null) }}
      />
    )
  }

  if (open) {
    return (
      <div className="app">
        <Header onHome={() => { setOpen(null); setTab('table') }} />
        <main>
          <CraftSheet
            idea={open}
            materials={materials}
            photo={photo}
            onClose={() => setOpen(null)}
            onMake={(craft) => setMaking(craft)}
          />
        </main>
        <Tabs tab={tab} keptCount={keptCount} onChange={(t) => { setOpen(null); setTab(t) }} />
      </div>
    )
  }

  return (
    <div className="app">
      <Header onHome={() => { startOver(); setTab('table') }} />

      <main ref={scroller}>
        <div className="page">
          {tab === 'table' && (!photo ? (
            <>
              <section className="hero">
                <h1>What can we make?</h1>
                <p>Photograph the odds and ends you have, and it will think of things to make with them.</p>
              </section>
              <PhotoStep onPhoto={onPhoto} />
            </>
          ) : (
            <>
              <div className="label" style={{ marginTop: 0 }}>
                <span>On the table</span>
                <button type="button" className="btn btn-small" onClick={startOver}>New photo</button>
              </div>

              <PhotoStep onPhoto={onPhoto} looking={looking} />

              {!looking && (
                <>
                  {problem && <p className="note err" style={{ marginTop: '1rem' }}>{problem}</p>}

                  {materials.length > 0 && (
                    <>
                      <p className="label">
                        <span>{materials.length} thing{materials.length === 1 ? '' : 's'} it spotted</span>
                      </p>
                      <Materials items={materials} onChange={editMaterials} />
                    </>
                  )}

                  {ideasState === 'stale' && (
                    <button
                      type="button" className="btn btn-big" style={{ marginTop: '1rem' }}
                      onClick={() => think(materials)}
                    >
                      Think again with this list
                    </button>
                  )}

                  <Ideas
                    ideas={ideas}
                    state={ideasState}
                    error={ideasError}
                    onOpen={setOpen}
                    onAgain={() => think(materials)}
                    onKeep={keepIdea}
                    onHide={hideIdea}
                    keptIds={keptIds}
                    keeping={keeping}
                  />
                </>
              )}
            </>
          ))}

          {tab === 'kept' && (
            <>
              <section className="hero">
                <h1>Kept</h1>
                <p>The ones you liked. These stay on this device and work without the internet.</p>
              </section>
              <Kept crafts={kept} onOpen={(craft) => setMaking(craft)} />
            </>
          )}
        </div>
      </main>

      <Tabs tab={tab} keptCount={keptCount} onChange={(t) => { setTab(t); top() }} />
    </div>
  )
}

function Header({ onHome }: { onHome: () => void }) {
  return (
    <header className="top">
      <button type="button" className="brand" onClick={onHome}>
        <img src="/icon.svg" alt="" width="30" height="30" />
        <span>Lili<span className="brand-art">Art</span></span>
      </button>
    </header>
  )
}

function Tabs({ tab, keptCount, onChange }: { tab: Tab; keptCount: number; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabs" aria-label="Sections">
      <button
        type="button" className={`tab ${tab === 'table' ? 'is-on' : ''}`}
        aria-current={tab === 'table' ? 'page' : undefined}
        onClick={() => onChange('table')}
      >
        <span className="tab-icon"><ScissorsIcon /></span>
        <span>Table</span>
      </button>
      <button
        type="button" className={`tab ${tab === 'kept' ? 'is-on' : ''}`}
        aria-current={tab === 'kept' ? 'page' : undefined}
        onClick={() => onChange('kept')}
      >
        <span className="tab-icon">
          <StarIcon filled={keptCount > 0} />
          {keptCount > 0 && <span className="tab-badge">{keptCount}</span>}
        </span>
        <span>Kept</span>
      </button>
      <a className="tab" href="https://victorsaly.github.io/LilianaBlog/" target="_blank" rel="noopener noreferrer">
        <span className="tab-icon"><BookIcon /></span>
        <span>Lili's stories</span>
      </a>
    </nav>
  )
}
