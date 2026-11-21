/**
 * Which step of a craft you were on.
 *
 * Leaving Make mode used to put you back at step one, so a mis-tap on step
 * five cost a child her place. It is written down per craft, on the device,
 * and forgotten when the craft is finished. If storage is blocked it simply
 * does not remember, which is how it behaved before.
 */
const KEY = 'liliart-place'

function read(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {} } catch { return {} }
}
function write(all: Record<string, number>): void {
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* nothing to do about it */ }
}

export function placeIn(id: string, steps: number): number {
  const at = Number(read()[id])
  return Number.isInteger(at) && at > 0 && at < steps ? at : 0
}

export function keepPlace(id: string, at: number): void {
  const all = read()
  delete all[id]
  if (at > 0) all[id] = at
  /* ideas that were never kept leave a place behind; keep only the newest few */
  const ids = Object.keys(all)
  for (const old of ids.slice(0, Math.max(0, ids.length - 20))) delete all[old]
  write(all)
}
