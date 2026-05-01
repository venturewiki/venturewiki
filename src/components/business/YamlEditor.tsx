'use client'
import { useEffect, useMemo, useState } from 'react'
import yaml from 'js-yaml'
import { Save, X, Loader2, AlertTriangle, Check } from 'lucide-react'

export interface YamlEditorProps {
  initialValue: string
  /** When set, the editor refuses to save unless the YAML parses cleanly. */
  requireParseOk?: boolean
  rows?: number
  saving?: boolean
  saveLabel?: string
  cancelLabel?: string
  onSave: (rawYaml: string) => Promise<void> | void
  onCancel?: () => void
  /** Optional helper text shown above the editor. */
  hint?: string
}

/**
 * Compact YAML editor with live parse validation.
 *
 * Shows the parsed top-level shape (or a parse error) inline so the user
 * gets immediate feedback while editing. Used for the whole plan.yaml when
 * it's broken, and for per-section subtrees via SectionYamlEditor.
 */
export function YamlEditor({
  initialValue,
  requireParseOk = true,
  rows = 18,
  saving = false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  onSave,
  onCancel,
  hint,
}: YamlEditorProps) {
  const [text, setText] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(initialValue)
  }, [initialValue])

  const parseInfo = useMemo(() => {
    try {
      const parsed = yaml.load(text)
      let summary = 'parses ok'
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed)
        summary = `${keys.length} key${keys.length === 1 ? '' : 's'}: ${keys.slice(0, 6).join(', ')}${keys.length > 6 ? '…' : ''}`
      } else if (Array.isArray(parsed)) {
        summary = `${parsed.length}-item list`
      } else if (parsed === null || parsed === undefined) {
        summary = 'empty'
      } else {
        summary = `${typeof parsed} value`
      }
      return { ok: true as const, summary }
    } catch (err: any) {
      return { ok: false as const, summary: (err?.message || String(err)).split('\n')[0] }
    }
  }, [text])

  const canSave = !saving && (!requireParseOk || parseInfo.ok) && text !== initialValue

  const submit = async () => {
    if (!canSave) return
    setError(null)
    try {
      await onSave(text)
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    }
  }

  return (
    <div className="space-y-2">
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={`input-base font-mono text-xs leading-relaxed resize-y w-full whitespace-pre ${
          parseInfo.ok ? '' : 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
        }`}
      />
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className={`flex items-center gap-1.5 min-w-0 ${parseInfo.ok ? 'text-teal' : 'text-rose-400'}`}>
          {parseInfo.ok
            ? <Check className="w-3.5 h-3.5 shrink-0" />
            : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          <span className="truncate font-mono">{parseInfo.summary}</span>
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-ghost text-xs" disabled={saving}>
              <X className="w-3.5 h-3.5" /> {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            className="btn-primary text-xs"
            disabled={!canSave}
            title={!parseInfo.ok && requireParseOk ? 'Fix YAML errors first' : ''}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
      {error && <p className="text-rose-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
