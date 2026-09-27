import { useState } from 'react'
import type { Material } from '../lib/ai'

interface Props {
  items: Material[]
  onChange: (items: Material[]) => void
}

/**
 * What it found, as stickers you can peel off. It gets things wrong — a child
 * correcting it is part of the fun, and the ideas get better for it.
 */
export function Materials({ items, onChange }: Props) {
  const [typed, setTyped] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    const name = typed.trim().toLowerCase()
    if (!name) return
    setTyped('')
    if (items.some((i) => i.name === name)) return
    onChange([...items, { name }])
  }

  return (
    <div className="stickers">
      {items.map((item) => (
        <span className="sticker" key={item.name}>
          {item.name}
          {item.amount && <span className="sticker-amount">{item.amount}</span>}
          <button
            type="button" className="sticker-x"
            aria-label={`Take ${item.name} off the table`}
            onClick={() => onChange(items.filter((i) => i.name !== item.name))}
          >
            ×
          </button>
        </span>
      ))}
      <form className="sticker-add" onSubmit={add}>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Add something"
          aria-label="Add something it missed"
        />
        <button type="submit" className="sticker-plus" disabled={!typed.trim()} aria-label="Add">
          +
        </button>
      </form>
    </div>
  )
}
