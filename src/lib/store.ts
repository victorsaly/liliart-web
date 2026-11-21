/*
 * What has already been paid for, kept on the device.
 *
 * Every picture is a real charge and takes several seconds to draw, and the
 * written-out steps are a call too. None of it should be asked for twice: not
 * when a kept craft is opened next week, and not when the page is reloaded
 * halfway through an afternoon. Local storage is far too small for pictures,
 * so this is IndexedDB, used as a plain key-and-value shelf.
 *
 * Keys are `kind:id` or `kind:id:n` — `idea:…`, `sheet:…`, `step:…:3` — so
 * everything belonging to one craft can be found and, when that craft is
 * neither kept nor on the table any more, thrown away.
 *
 * If the browser has no IndexedDB, or blocks it, every call here quietly does
 * nothing and the app behaves as it did before: it just asks again.
 */

const DB = 'liliart'
const SHELF = 'paid-for'

let opened: Promise<IDBDatabase | null> | undefined

function open(): Promise<IDBDatabase | null> {
  opened ??= new Promise((resolve) => {
    try {
      const asking = indexedDB.open(DB, 1)
      asking.onupgradeneeded = () => { asking.result.createObjectStore(SHELF) }
      asking.onsuccess = () => resolve(asking.result)
      asking.onerror = () => resolve(null)
      asking.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return opened
}

function run<T>(mode: IDBTransactionMode, work: (shelf: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return open().then((db) => {
    if (!db) return undefined
    return new Promise<T | undefined>((resolve) => {
      try {
        const asking = work(db.transaction(SHELF, mode).objectStore(SHELF))
        asking.onsuccess = () => resolve(asking.result)
        asking.onerror = () => resolve(undefined)
      } catch {
        resolve(undefined)
      }
    })
  })
}

export function recall<T>(key: string): Promise<T | undefined> {
  return run<T>('readonly', (shelf) => shelf.get(key))
}

export async function remember(key: string, value: unknown): Promise<void> {
  await run('readwrite', (shelf) => shelf.put(value, key))
}

export async function forget(key: string): Promise<void> {
  await run('readwrite', (shelf) => shelf.delete(key))
}

/**
 * Throw away what belongs to crafts nobody has any more: not kept, and not
 * among the ideas on the table. Without this, every photo ever taken would
 * leave four pictures behind for good.
 */
export async function forgetAllBut(ids: Iterable<string>): Promise<void> {
  const live = new Set(ids)
  const keys = (await run<IDBValidKey[]>('readonly', (shelf) => shelf.getAllKeys())) ?? []
  await Promise.all(
    keys
      .filter((key): key is string => typeof key === 'string' && key.includes(':'))
      .filter((key) => !live.has(key.split(':')[1]))
      .map((key) => forget(key)),
  )
}
