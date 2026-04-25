'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function EditField({
  label, hint, children,
}: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted/60 mt-0.5">{hint}</p>}
    </div>
  )
}

export function TextInput({ value, onChange, placeholder }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-base"
    />
  )
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="input-base resize-none"
    />
  )
}

export function Selector<V extends string>({
  value, onChange, options,
}: { value: V; onChange: (v: V) => void; options: ReadonlyArray<{ value: V; label: string }> }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as V)}
      className="input-base"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/**
 * Generic editor for an array of plain objects. Renders one row per item with
 * the given column inputs, plus per-row remove + a single Add button at the bottom.
 */
export function ArrayEditor<T extends Record<string, any>>({
  items, onChange, columns, makeNew, gridClass,
}: {
  items: T[]
  onChange: (next: T[]) => void
  columns: Array<{ key: keyof T; placeholder?: string; type?: 'text' | 'textarea'; render?: (val: any, set: (v: any) => void) => ReactNode }>
  makeNew: () => T
  gridClass?: string
}) {
  const update = (i: number, key: keyof T, val: any) => {
    const next = items.slice()
    next[i] = { ...next[i], [key]: val }
    onChange(next)
  }
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, makeNew()])

  return (
    <div>
      {items.length === 0 && <p className="text-muted italic text-xs mb-2">Empty — click Add to start.</p>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={gridClass || 'grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))_auto] gap-2 items-start'}>
            {columns.map(col => (
              col.render
                ? <div key={String(col.key)}>{col.render(item[col.key], (v) => update(i, col.key, v))}</div>
                : col.type === 'textarea'
                  ? <textarea
                      key={String(col.key)}
                      value={item[col.key] || ''}
                      onChange={e => update(i, col.key, e.target.value)}
                      placeholder={col.placeholder}
                      rows={2}
                      className="input-base resize-none text-xs"
                    />
                  : <input
                      key={String(col.key)}
                      type="text"
                      value={item[col.key] || ''}
                      onChange={e => update(i, col.key, e.target.value)}
                      placeholder={col.placeholder}
                      className="input-base text-xs"
                    />
            ))}
            <button
              type="button"
              onClick={() => remove(i)}
              className="btn-ghost px-2 text-rose-400 self-center"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="btn-ghost text-xs mt-2"
      >
        <Plus className="w-3 h-3" /> Add row
      </button>
    </div>
  )
}
