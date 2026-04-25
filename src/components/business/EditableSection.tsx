'use client'
import { useState, type ReactNode } from 'react'
import { Edit3, Save, X, Loader2 } from 'lucide-react'

export function EditableSection<T>({
  canEdit,
  value,
  onSave,
  className = 'section-card',
  header,
  view,
  edit,
}: {
  canEdit: boolean
  value: T
  onSave: (next: T) => Promise<void>
  className?: string
  header: ReactNode
  view: (v: T) => ReactNode
  edit: (draft: T, set: (v: T) => void) => ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<T>(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = () => {
    setDraft(value)
    setError(null)
    setEditing(true)
  }
  const cancel = () => {
    setEditing(false)
    setError(null)
  }
  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">{header}</div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={start}
            className="btn-ghost text-xs shrink-0"
            title="Edit this section"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {editing && (
          <div className="flex gap-1.5 shrink-0">
            <button type="button" onClick={cancel} className="btn-ghost text-xs" disabled={saving}>
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button type="button" onClick={save} className="btn-primary text-xs" disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
      {editing ? edit(draft, setDraft) : view(value)}
      {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
    </div>
  )
}
