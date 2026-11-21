import { useSyncExternalStore } from 'react'
import { getPicturesNote, watchPicturesNote } from './ai'

/** The reason there are no pictures just now, if a limit is the reason. */
export function usePicturesNote(): string | undefined {
  return useSyncExternalStore(watchPicturesNote, getPicturesNote, () => undefined)
}
