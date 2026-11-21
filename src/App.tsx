import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PhotoStep } from './components/PhotoStep'
import { Materials } from './components/Materials'
import { Ideas } from './components/Ideas'
import { CraftSheet } from './components/CraftSheet'
import { MakeScreen } from './components/MakeScreen'
import { Kept } from './components/Kept'
import { HowItWorks, HowSteps, markSeenHow, seenHow } from './components/HowItWorks'
import { Shout } from './components/Shout'
import { GrownUps } from './components/GrownUps'
import { Bits } from './components/HomeArt'
import { ScissorsIcon, StarIcon } from './components/icons'
import * as saved from './lib/saved'
import { drawIdea, explain, findMaterials, openCraftOnce, suggestIdeas, type Craft, type Idea, type Material } from './lib/ai'
import { shrink } from './lib/photo'
import { forget, forgetAllBut, recall, remember } from './lib/store'
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

/**
 * Whether there is a network right now.
 *
 * Thinking of ideas needs one; everything already kept does not. Saying which
 * is which beats letting someone photograph their table and then wait for an
 * answer that was never coming.
 */
function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

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
  const [how, setHow] = useState(() => !seenHow())
  const [grownUps, setGrownUps] = useState(false)
  const online = useOnline()
  const run = useRef(0)
  /* the window no longer scrolls — main does, so that is what we rewind */
  const scroller = useRef<HTMLElement>(null)
  const top = () => scroller.current?.scrollTo({ top: 0 })
  const ideasBox = useRef<HTMLDivElement>(null)

  /*
   * On a phone the ideas land below everything it spotted, a screen further
   * down, and a child who does not scroll never learns they arrived. So when
   * they do, bring them into view. Wider screens show them beside the photo
   * and need no help.
   */
  useEffect(() => {
    if (ideasState !== 'ready' || !window.matchMedia('(max-width: 699px)').matches) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ideasBox.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  }, [ideasState])

  const kept = useSyncExternalStore(saved.subscribe, saved.all, () => [])
  const keptCount = useSyncExternalStore(saved.subscribe, saved.count, () => 0)

  /*
   * The table survives a reload. A photo, what it spotted and the ideas with
   * their pictures are all things that were asked for and paid for; closing
   * the app by accident should not mean asking for them again. Put back only
   * if nothing has been started in the meantime.
   */
  useEffect(() => {
    recall<{ photo: string; materials: Material[]; ideas: Idea[] }>('table').then((was) => {
      if (!was?.photo || !was.ideas?.length || run.current !== 0) return
      setPhoto(was.photo)
      setMaterials(was.materials ?? [])
      setIdeas(was.ideas)
      setIdeasState('ready')
    })
  }, [])

  useEffect(() => {
    if (ideasState !== 'ready' || !photo) return
    void remember('table', { photo, materials, ideas })
    /* and let go of what belonged to ideas that are neither here nor kept */
    void forgetAllBut([...ideas.map((i) => i.id), ...saved.all().map((c) => c.id)])
  }, [ideasState, photo, materials, ideas])

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
      /* the card's picture goes on the shelf with it, whenever it is ready —
         keeping does not wait for it */
      drawIdea(idea).then(async (image) => {
        const stored = saved.find(craft.id)
        if (!image || !stored || stored.drawing) return
        saved.save({ ...stored, drawing: await shrink(image).catch(() => undefined) })
      })
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
    void forget('table')
    top()
  }

  useEffect(() => {
    document.title = making ? `${making.title} — LiliArt` : 'LiliArt'
  }, [making])

  if (how) {
    return <HowItWorks onClose={() => { markSeenHow(); setHow(false) }} />
  }

  if (grownUps) {
    return <GrownUps onClose={() => setGrownUps(false)} />
  }

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
        <Header onHome={() => { setOpen(null); setTab('table') }} onGrownUps={() => setGrownUps(true)} />
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
      <Header onHome={() => { startOver(); setTab('table') }} onGrownUps={() => setGrownUps(true)} />

      {/* the home screen is the table itself, so it gets the table's surface */}
      <main ref={scroller} className={tab === 'table' && !photo ? 'is-table' : undefined}>
        <div className="page">
          {tab === 'table' && (!photo ? (
            <div className="home">
              <div className="home-main">
                <section className="hero">
                  <h1><Shout>What can we make?</Shout></h1>
                  <p>Show it your bits and bobs, and it will think of things you can make.</p>
                  {/* hidden where the steps are already on the page beside it */}
                  <button type="button" className="btn btn-small how-open" onClick={() => setHow(true)}>
                    How it works
                  </button>
                  <Bits />
                </section>

                {online ? <PhotoStep onPhoto={onPhoto} /> : (
                  <div className="empty">
                    <p>
                      There is no internet just now, so it cannot think of anything new.
                      {keptCount > 0
                        ? ' The ones you kept are still here, though.'
                        : ' Come back when the wifi is working.'}
                    </p>
                    {keptCount > 0 && (
                      <button type="button" className="btn" onClick={() => { setTab('kept'); top() }}>
                        <StarIcon filled /> See the {keptCount} you kept
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/*
                * What you made before, one tap from making it again. On a
                * second visit this is the most interesting thing the app has,
                * and it used to be hidden behind a tab while the screen under
                * the camera frame sat empty.
                */}
              {kept.length > 0 && (
                <section className="home-shelf" aria-labelledby="home-shelf-title">
                  <div className="label">
                    <h2 id="home-shelf-title">From your shelf</h2>
                    <button type="button" className="btn btn-small" onClick={() => { setTab('kept'); top() }}>
                      See all {keptCount}
                    </button>
                  </div>
                  <ul className="shelf-row">
                    {kept.slice(0, 4).map((craft) => {
                      const picture = craft.made ?? craft.drawing
                      return (
                        <li key={craft.id}>
                          <button type="button" className="shelf-item" onClick={() => setMaking(craft)}>
                            <span className="shelf-pic">
                              {picture ? <img src={picture} alt="" /> : <StarIcon filled />}
                            </span>
                            <span className="shelf-name">{craft.title}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {/* only where there is room for it: see .home-how */}
              <aside className="home-how" aria-labelledby="home-how-title">
                <h2 id="home-how-title">How it works</h2>
                <HowSteps />
              </aside>
            </div>
          ) : (
            /*
             * Three areas — the photo, what it spotted, the ideas — so a wide
             * screen can lay them side by side instead of in one thin column.
             */
            <div className={`work ${looking || materials.length === 0 ? 'is-alone' : ''}`}>
              <div className="work-photo">
                <div className="label" style={{ marginTop: 0 }}>
                  <span>On the table</span>
                  <button type="button" className="btn btn-small" onClick={startOver}>New photo</button>
                </div>

                {looking ? (
                  <PhotoStep onPhoto={onPhoto} looking={looking} />
                ) : problem && materials.length === 0 ? (
                  /* nothing came of that photo: say why first, with the way to
                     take another straight under it */
                  <>
                    <p className="note err" role="alert" style={{ margin: '0 0 1rem' }}>{problem}</p>
                    <PhotoStep onPhoto={onPhoto} />
                  </>
                ) : (
                  /* the photo stays in view: it is what the list below is a list of */
                  <figure className="shot is-done" style={{ margin: 0 }}>
                    <img src={photo} alt="The photo you took" />
                  </figure>
                )}
              </div>

              {!looking && (
                <>
                  <div className="work-stuff">
                    {problem && materials.length > 0 && (
                      <p className="note err" style={{ marginTop: '1rem' }}>{problem}</p>
                    )}

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
                  </div>

                  <div className="work-ideas" ref={ideasBox}>
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
                  </div>
                </>
              )}
            </div>
          ))}

          {tab === 'kept' && (
            <>
              <section className="hero">
                <h1>Kept</h1>
                <p>The ones you liked and the ones you made. These stay on this device and work without the internet.</p>
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

function Header({ onHome, onGrownUps }: { onHome: () => void; onGrownUps: () => void }) {
  return (
    <header className="top">
      <button type="button" className="brand" onClick={onHome}>
        <img src="/icon.svg" alt="" width="30" height="30" />
        <span>Lili<span className="brand-art">Art</span></span>
      </button>
      {/* quiet, and out of the thumb's way: it is not for the child */}
      <button type="button" className="top-link" onClick={onGrownUps}>For grown-ups</button>
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
    </nav>
  )
}
