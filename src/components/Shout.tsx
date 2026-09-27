import { Fragment } from 'react'

/**
 * A line said out loud: every word in its own colour, tilted a little, and
 * dropping in one after another. Used for the two headings a child reads
 * rather than skims — the front door, and the step they are on.
 *
 * The four colours cycle, so it works for any number of words.
 */
export function Shout({ children, quick = false }: { children: string; quick?: boolean }) {
  const words = children.trim().split(/\s+/)
  /* A heading you meet once can take its time. A step title is an instruction
     someone is waiting to read, so it lands inside 300ms however long it is. */
  const per = quick ? 0.025 : 0.07
  return (
    <span className={`shout ${quick ? 'is-quick' : ''}`}>
      {words.map((w, n) => (
        <Fragment key={`${n}-${w}`}>
          {n > 0 && ' '}
          <span className={`w${n % 4}`} style={{ '--in': `${n * per}s` } as React.CSSProperties}>
            {w}
          </span>
        </Fragment>
      ))}
    </span>
  )
}
