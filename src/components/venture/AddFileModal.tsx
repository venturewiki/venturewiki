'use client'
import { useState } from 'react'
import { FilePlus, X } from 'lucide-react'

export function AddFileModal({
  open, onClose, onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, content: string) => Promise<string>
}) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const reset = () => { setName(''); setContent(''); setError(null) }

  const close = () => { if (!saving) { reset(); onClose() } }

  const submit = async () => {
    setError(null)
    setSaving(true)
    try {
      await onCreate(name.trim(), content)
      reset()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed to create file')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = (file: File) => {
    setError(null)
    if (!name.trim()) setName(file.name)
    const reader = new FileReader()
    reader.onload = () => setContent(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => setError('Could not read file (must be a text file)')
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={close}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-ink border border-rule rounded-xl shadow-xl max-w-xl w-full max-h-[85vh] overflow-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-paper text-lg flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-teal" /> Add File
          </h2>
          <button className="text-muted hover:text-paper" onClick={close} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted mb-4">
          Adds a file to <code className="bg-rule/40 px-1 rounded font-mono">.venturewiki/</code> in this venture&apos;s repository.
          Letters, numbers, spaces, dot, dash, underscore only.
        </p>

        <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-mono">Filename</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. notes.md"
          className="input-base mb-4 font-mono text-sm"
          autoFocus
        />

        <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-mono">Upload from disk (optional)</label>
        <input
          type="file"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
          className="block w-full text-xs text-paper/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-accent/20 file:text-accent file:text-xs file:cursor-pointer hover:file:bg-accent/30 mb-4"
        />

        <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-mono">Content</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={10}
          placeholder="Paste or type the file contents here…"
          className="input-base font-mono text-xs resize-y w-full"
        />

        {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-ghost" onClick={close} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Create File'}
          </button>
        </div>
      </div>
    </div>
  )
}
