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

export function save(craft: Craft): boolean {
  const list = read().filter((c) => c.id !== craft.id)
  const entry = { ...craft, savedAt: new Date().toISOString() }
  if (write([entry, ...list])) return notify(true)
  /* out of room: keep the craft, lose the picture */
  if (write([{ ...entry, photo: undefined }, ...list])) return notify(true)
  /* still no room: drop the oldest photo we are holding and try once more */
  const slimmer = list.map((c, i) => (i === list.length - 1 ? { ...c, photo: undefined } : c))
  return notify(write([{ ...entry, photo: undefined }, ...slimmer]))
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
