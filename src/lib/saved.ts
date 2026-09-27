/**
 * Kept crafts, in this browser only. No account, nothing leaves the device —
 * which is the right default for an app a child uses, and means the whole
 * thing works with the wifi off once a craft is saved.
 *
 * Photos are the heavy part, so a save that would blow the quota drops the
 * photo rather than failing: the craft itself is what you came back for.
 */

import type { Craft } from './ai'

const KEY = 'liliart-saved'
const EVENT = 'liliart-saved-change'

function read(): Craft[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list: Craft[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

/**
 * The list React sees, cached.
 *
 * `useSyncExternalStore` compares snapshots by identity, so handing back a
 * freshly parsed array on every call is an infinite render loop. This holds
 * one array and only builds a new one when something has actually changed.
 */
let snapshot: Craft[] | null = null

export function all(): Craft[] {
  if (snapshot === null) {
    snapshot = read().sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''))
  }
  return snapshot
}

export const count = (): number => all().length
export const isSaved = (id: string): boolean => read().some((c) => c.id === id)

export const find = (id: string): Craft | undefined => read().find((c) => c.id === id)

export function save(craft: Craft): boolean {
  const list = read().filter((c) => c.id !== craft.id)
  const entry = { ...craft, savedAt: new Date().toISOString() }

  /*
   * Pictures are what fills the quota, so give them up in the order we can
   * best afford to: first the photo of the table, then the drawing of what it
   * might look like. The photo of the one actually made is never dropped —
   * it is the only thing here that cannot be made again.
   */
  const shrinking = [
    entry,
    { ...entry, photo: undefined },
    { ...entry, photo: undefined, drawing: undefined },
  ]
  for (const attempt of shrinking) {
    if (write([attempt, ...list])) return notify(true)
  }
  /* still no room: ask the older ones for their pictures too */
  const lean = list.map((c) => ({ ...c, photo: undefined, drawing: undefined }))
  return notify(write([{ ...entry, photo: undefined, drawing: undefined }, ...lean]))
}

/**
 * Record that this one got made, keeping it if it was not kept already.
 * Merged onto whatever is stored, so finishing a craft opened from the ideas
 * list does not throw away the table photo a kept copy was holding.
 */
export function recordMade(craft: Craft, made: string): boolean {
  return save({ ...find(craft.id), ...craft, made, madeAt: new Date().toISOString() })
}

export function remove(id: string): boolean {
  return notify(write(read().filter((c) => c.id !== id)))
}

/**
 * Put one back exactly as it was, keeping its original `savedAt` so an undone
 * removal lands where it was in the list rather than jumping to the top.
 */
export function restore(craft: Craft): boolean {
  const list = read().filter((c) => c.id !== craft.id)
  return notify(write([craft, ...list]))
}

function notify(ok: boolean): boolean {
  snapshot = null
  window.dispatchEvent(new Event(EVENT))
  return ok
}

export function subscribe(cb: () => void): () => void {
  /* another tab's write reaches us as `storage`, and it invalidates the
     snapshot the same way our own write does */
  const handler = () => { snapshot = null; cb() }
  window.addEventListener(EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}
