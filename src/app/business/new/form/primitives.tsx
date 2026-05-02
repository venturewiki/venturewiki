'use client'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

// ── Form primitives — thin wrappers that bind to react-hook-form's register() ──

export function Field({
  label, hint, error, children,
}: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted/60 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}

export function Input({ reg, placeholder, type = 'text' }: { reg: any; placeholder?: string; type?: string }) {
  return <input {...reg} type={type} placeholder={placeholder} className="input-base" />
}

export function Textarea({ reg, placeholder, rows = 3 }: { reg: any; placeholder?: string; rows?: number }) {
  return <textarea {...reg} placeholder={placeholder} rows={rows} className="input-base resize-none" />
}

export function Select({ reg, children }: { reg: any; children: ReactNode }) {
  return <select {...reg} className="input-base">{children}</select>
}

// Renders a label + add button header above an array-of-rows editor.
export function ArrayHeader({ label, onAdd, addLabel = 'Add' }: { label: string; onAdd: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>
      <button type="button" onClick={onAdd} className="btn-ghost text-xs py-1 px-2">
        <Plus className="w-3 h-3" /> {addLabel}
      </button>
    </div>
  )
}

export function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="btn-ghost px-1 text-danger">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}

export function SectionPanel({
  id, label, emoji, open, onToggle, children,
}: {
  id: string; label: string; emoji: string; open: boolean; onToggle: () => void; children: ReactNode
}) {
  return (
    <div className="section-card">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between text-left">
        <h2 className="font-display font-bold text-paper flex items-center gap-2 text-base">
          <span>{emoji}</span> {label}
        </h2>
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {open && <div className="mt-6 space-y-4 border-t border-rule pt-6">{children}</div>}
    </div>
  )
}

// Renders a vertically-grouped grid of simple labelled inputs from a config.
// Config tuple: [name, label, placeholder?]. Pass `register` from RHF.
export type FieldRow = readonly [string, string, string?]
export function FieldGrid({ register, fields, cols = 2 }: { register: any; fields: ReadonlyArray<FieldRow>; cols?: 2 | 3 }) {
  // Tailwind needs literal classes — switch on cols rather than interpolating.
  const grid = cols === 3 ? 'grid grid-cols-3 gap-4' : 'grid grid-cols-2 gap-4'
  return (
    <div className={grid}>
      {fields.map(([name, label, ph]) => (
        <Field key={name} label={label}>
          <Input reg={register(name)} placeholder={ph} />
        </Field>
      ))}
    </div>
  )
}
