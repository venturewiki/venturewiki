'use client'
import { useState } from 'react'
import yaml from 'js-yaml'
import { Pencil } from 'lucide-react'
import { DynamicSection } from './DynamicSection'
import { YamlEditor } from './YamlEditor'

export interface SectionYamlEditorProps {
  /** The current parsed value of the section (object/array/primitive). */
  value: any
  /** Show the edit affordance (signed-in editors / admin / repo collaborator). */
  canEdit: boolean
  /** Persists the new value. The promise should resolve once the write is confirmed. */
  onSave: (next: any) => Promise<void>
}

/**
 * Renders a section with the recursive DynamicSection viewer plus a discrete
 * pencil button (visible on hover) that swaps the view for an inline YAML
 * editor scoped to this section's subtree only. Lets users rename keys,
 * change value types, and edit values with full YAML expressivity.
 */
export function SectionYamlEditor({ value, canEdit, onSave }: SectionYamlEditorProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!editing) {
    return (
      <div className="group/section relative">
        {canEdit && (
          <button
            type="button"
            onClick={() => { setError(null); setEditing(true) }}
            className="absolute -top-1 right-0 opacity-0 group-hover/section:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md text-muted hover:text-accent hover:bg-accent/10"
            title="Edit this section as YAML"
            aria-label="Edit this section as YAML"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <DynamicSection value={value} />
        {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
      </div>
    )
  }

  const initial = yaml.dump(value ?? null, { lineWidth: -1 })

  return (
    <YamlEditor
      initialValue={initial}
      requireParseOk
      saving={saving}
      hint="Edit this section as YAML — rename keys, change value types, or restructure freely. Saving rewrites only this section in plan.yaml."
      onCancel={() => setEditing(false)}
      onSave={async (raw) => {
        setSaving(true)
        setError(null)
        try {
          const next = yaml.load(raw)
          await onSave(next)
          setEditing(false)
        } catch (e: any) {
          setError(e?.message || 'Save failed')
        } finally {
          setSaving(false)
        }
      }}
    />
  )
}
