/**
 * Everything the app asks the AI, which it asks through our own worker —
 * the OpenAI key stays there and never reaches the browser.
 */

import { shrink } from './photo'
import { recall, remember } from './store'

const API = import.meta.env.VITE_LILIART_API ?? 'https://liliart-api.still-union-ef8a.workers.dev'

export interface Material {
  name: string
  amount?: string
}

export interface Idea {
  id: string
  title: string
  blurb: string
  minutes: number
  uses: string[]
  alsoNeed: string[]
  mess: Mess
}

export type Mess = 'low' | 'medium' | 'high'

export interface Tool {
  tool: string
  note?: string
}

export interface Step {
  title: string
  description: string
  /** the bits a grown-up does: scissors, glue guns, anything hot or sharp */
  grownUp?: boolean
}

export interface Craft {
  id: string
  title: string
  summary: string
  minutes: number
  mess: Mess
  tools: Tool[]
  steps: Step[]
  tips: string[]
  /** a description of the finished thing — used as the caption, and later as
   *  the prompt if we ever draw it */
  picture: string
  /** the photo it came from, kept with a saved craft */
  photo?: string
  /** a drawing of the finished thing, shrunk before it is kept */
  drawing?: string
  /** a photo of the one you actually made, taken when you finished it */
  made?: string
  madeAt?: string
  savedAt?: string
}

export class AiError extends Error {
  /** the HTTP status, when the worker answered at all */
  status?: number
}

/** What to tell a child when a call fails. Never a status code. */
export function explain(err: unknown, fallback: string): string {
  return err instanceof AiError ? err.message : fallback
}

/** The worker writes its reasons in lower case; on screen they are sentences. */
function sentence(reason: unknown): string | undefined {
  if (typeof reason !== 'string' || !reason.trim()) return undefined
  const text = reason.trim()
  return text[0].toUpperCase() + text.slice(1) + (/[.!?…]$/.test(text) ? '' : '.')
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AiError("Couldn't reach the internet. Have a look at the wifi and try again.")
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new AiError(sentence(data?.error) ?? 'That did not work. Try again in a moment.')
    err.status = res.status
    throw err
  }
  return data as T
}

/*
 * Why there are no pictures, when the reason is a limit.
 *
 * A picture that cannot be drawn is not worth an error: the craft still
 * works without it. But "no more pictures today" is worth saying once, in
 * plain words, or the child is left looking at empty frames and wondering.
 * The worker says so with a 429; the note it sends is kept here and cleared
 * by the next picture that does arrive.
 */
let picturesNote: string | undefined
const noteWatchers = new Set<() => void>()

function setPicturesNote(note: string | undefined): void {
  if (note === picturesNote) return
  picturesNote = note
  noteWatchers.forEach((tell) => tell())
}

export const getPicturesNote = (): string | undefined => picturesNote
export function watchPicturesNote(tell: () => void): () => void {
  noteWatchers.add(tell)
  return () => { noteWatchers.delete(tell) }
}

/** Ask for one picture. Null when there is none, with the note set if a limit is why. */
async function picture(body: unknown): Promise<string | null> {
  try {
    const { image } = await post<{ image: string }>('/v1/ai/picture', body)
    if (image) setPicturesNote(undefined)
    return image ?? null
  } catch (err) {
    if (err instanceof AiError && err.status === 429) setPicturesNote(err.message)
    return null
  }
}

/**
 * A picture that is drawn once and then kept on the device. Looked for there
 * first; drawn only if it is not; and put away, shrunk, when it arrives. The
 * shrinking matters: these come back at a megabyte or so, and a tablet's
 * worth of pixels is a twentieth of that.
 */
async function kept(key: string, body: unknown): Promise<string | null> {
  const have = await recall<string>(key)
  if (have) return have
  const image = await picture(body)
  if (!image) return null
  const small = await shrink(image, 768, 0.8).catch(() => image)
  void remember(key, small)
  return small
}

export async function isReady(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/v1/ai`, { cache: 'no-store' })
    return res.ok && (await res.json()).ready === true
  } catch {
    return false
  }
}

/** A photo in, a list of what we could use out. */
export async function findMaterials(dataUrl: string): Promise<Material[]> {
  const { materials } = await post<{ materials: Material[] }>('/v1/ai/materials', { image: dataUrl })
  return (materials ?? [])
    .filter((m) => m && typeof m.name === 'string' && m.name.trim())
    .map((m) => ({ name: m.name.trim().toLowerCase(), amount: m.amount }))
}

export async function suggestIdeas(materials: Material[]): Promise<Idea[]> {
  /* name and amount both go: six tubes is a different craft from one */
  const { ideas } = await post<{ ideas: Omit<Idea, 'id'>[] }>('/v1/ai/ideas', { materials })
  return (ideas ?? []).map((idea, n) => ({
    ...idea,
    id: `idea-${Date.now()}-${n}`,
    minutes: Number(idea.minutes) || 30,
    uses: Array.isArray(idea.uses) ? idea.uses : [],
    alsoNeed: Array.isArray(idea.alsoNeed) ? idea.alsoNeed : [],
    mess: (['low', 'medium', 'high'] as const).includes(idea.mess) ? idea.mess : 'medium',
  }))
}

export async function openCraft(idea: Idea, materials: Material[]): Promise<Craft> {
  /* written out once, ever: an idea opened again after a reload reads the
     same steps it did before, and nobody is asked to write them twice */
  const asked = writing.get(idea.id)
  if (asked) return asked
  const wanted = (async () => {
    const have = await recall<Craft>(`sheet:${idea.id}`)
    if (have) return have
    const body = { title: idea.title, blurb: idea.blurb, materials }
    const written = await post<Omit<Craft, 'id' | 'title'>>('/v1/ai/craft', body)
    const craft = { ...written, id: idea.id, title: idea.title }
    void remember(`sheet:${idea.id}`, craft)
    return craft
  })()
  writing.set(idea.id, wanted)
  /* a failure is forgotten, so that it can be asked for again */
  wanted.catch(() => writing.delete(idea.id))
  return wanted
}

/** Crafts being written out right now, so two askers share the one request. */
const writing = new Map<string, Promise<Craft>>()

/**
 * Written out once per idea and held for the session, so keeping one from the
 * list and then opening it does not pay for the same craft twice.
 */
const sheets = new Map<string, Craft>()

export async function openCraftOnce(idea: Idea, materials: Material[]): Promise<Craft> {
  const have = sheets.get(idea.id)
  if (have) return have
  const craft = await openCraft(idea, materials)
  sheets.set(idea.id, craft)
  return craft
}

export const rememberCraft = (craft: Craft): void => { sheets.set(craft.id, craft) }

/**
 * A drawing of the finished thing. One per craft that is actually opened, not
 * one per idea: each of these is a real charge on the key.
 */
export async function drawCraft(craft: Craft, materials: Material[]): Promise<string | null> {
  /* the picture on the idea's card is the picture of this craft: the child
     chose it by looking at it, so the sheet shows the same one, and it is
     not paid for twice */
  const onCard = (await ideaArt.get(craft.id)) ?? (await recall<string>(`idea:${craft.id}`))
  if (onCard) return onCard
  /* the craft is the point; a missing picture is not worth an error */
  return kept(`craft:${craft.id}`, { what: craft.picture || `${craft.title}. ${craft.summary}`, materials })
}

/**
 * A picture for an idea's card, so four ideas can be told apart without
 * reading four paragraphs. Drawn from the title and the one-line blurb, which
 * is all an idea is until it is opened. Held for the session; a failure is
 * forgotten so that it can be asked for again.
 */
const ideaArt = new Map<string, Promise<string | null>>()

export function drawIdea(idea: Idea): Promise<string | null> {
  const have = ideaArt.get(idea.id)
  if (have) return have
  const wanted = kept(`idea:${idea.id}`, {
    what: `${idea.title}. ${idea.blurb}`,
    materials: idea.uses.map((name) => ({ name })),
  }).then((image) => {
    if (!image) ideaArt.delete(idea.id)
    return image
  })
  ideaArt.set(idea.id, wanted)
  return wanted
}

/**
 * A picture of one step being done.
 *
 * Kept on the device once drawn, so a craft opened again next week shows the
 * same pictures without paying for them twice. Two callers asking for the same
 * step share one request, because the screen asks for the step you are on and
 * the one after it.
 */
const stepArt = new Map<string, Promise<string | null>>()

export function drawStep(craft: Craft, n: number, materials: Material[]): Promise<string | null> {
  const key = `${craft.id}:${n}`
  const have = stepArt.get(key)
  if (have) return have

  const step = craft.steps[n]
  if (!step) return Promise.resolve(null)

  const wanted = kept(`step:${craft.id}:${n}`, {
    kind: 'step',
    of: craft.title,
    what: `${step.title}. ${step.description}`,
    grownUp: step.grownUp === true,
    materials,
  }).then((image) => {
    /* let it be asked for again later — a limit today is not a limit forever */
    if (!image) stepArt.delete(key)
    return image
  })

  stepArt.set(key, wanted)
  return wanted
}
