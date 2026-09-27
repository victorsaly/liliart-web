import { Fragment } from 'react'

/**
 * A line said out loud: every word in its own colour, tilted a little, and
 * dropping in one after another. Used for the two headings a child reads
 * rather than skims — the front door, and the step they are on.
 *
 * The four colours cycle, so it works for any number of words.
 */
export function Shout({ children }: { children: string }) {
  const words = children.trim().split(/\s+/)
  return (
    <span className="shout">
      {words.map((w, n) => (
        <Fragment key={`${n}-${w}`}>
          {n > 0 && ' '}
          <span className={`w${n % 4}`} style={{ '--in': `${n * 0.07}s` } as React.CSSProperties}>
            {w}
          </span>
        </Fragment>
      ))}
    </span>
  )
}
