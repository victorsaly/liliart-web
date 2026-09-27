/**
 * Everything the app asks the AI, which it asks through our own worker —
 * the OpenAI key stays there and never reaches the browser.
 */

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

export class AiError extends Error {}

/** What to tell a child when a call fails. Never a status code. */
export function explain(err: unknown, fallback: string): string {
  return err instanceof AiError ? err.message : fallback
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
  if (!res.ok) throw new AiError(data?.error ?? 'That did not work. Try again in a moment.')
  return data as T
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
  const body = { title: idea.title, blurb: idea.blurb, materials }
  const craft = await post<Omit<Craft, 'id' | 'title'>>('/v1/ai/craft', body)
  return { ...craft, id: idea.id, title: idea.title }
}

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
  try {
    const { image } = await post<{ image: string }>('/v1/ai/picture', {
      what: craft.picture || `${craft.title}. ${craft.summary}`,
      materials,
    })
    return image ?? null
  } catch {
    /* the craft is the point; a missing picture is not worth an error */
    return null
  }
}
