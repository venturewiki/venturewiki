'use client'
import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createVentureIssue } from '@/lib/api'
import type { VentureIssue, VentureIssueType } from '@/types'
import type { RoadmapHint } from './IssuesTab'

const TYPE_OPTIONS: Array<{ value: VentureIssueType; label: string }> = [
  { value: 'task', label: 'Task' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'open-role', label: 'Open role' },
  { value: 'idea', label: 'Idea' },
  { value: 'risk', label: 'Risk' },
  { value: 'bug', label: 'Bug' },
]

export function NewIssueModal({
  open, businessId, roadmap, onClose, onCreated,
}: {
  open: boolean
  businessId: string
  roadmap?: RoadmapHint
  onClose: () => void
  onCreated: (issue: VentureIssue) => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<VentureIssueType | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) { setTitle(''); setBody(''); setType(''); setError(null); setSubmitting(false) }
  }, [open])

  if (!open) return null

  const milestones = (roadmap?.milestones ?? []).filter(m => (m?.milestone || '').trim())

  const prefillFromMilestone = (idx: number) => {
    const m = milestones[idx]
    if (!m) return
    setType('milestone')
    setTitle(`Milestone: ${m.milestone}`)
    setBody([
      m.owner ? `**Owner:** ${m.owner}` : '',
      m.targetDate ? `**Target date:** ${m.targetDate}` : '',
      m.successCriteria ? `**Success criteria:** ${m.successCriteria}` : '',
    ].filter(Boolean).join('\n'))
  }

  const submit = async () => {
    if (!title.trim()) return
    setSubmitting(true); setError(null)
    try {
      const created = await createVentureIssue(businessId, {
        title: title.trim(),
        body: body.trim() || undefined,
        type: type || undefined,
      })
      onCreated(created)
    } catch (e: any) {
      setError(e?.message || 'Failed to create issue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-ink border border-rule rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-paper text-lg">New issue</h2>
          <button onClick={onClose} disabled={submitting} className="text-muted hover:text-paper transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {milestones.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs text-muted mb-1">Start from a roadmap milestone</label>
            <select
              className="input-base w-full"
              defaultValue=""
              onChange={e => { if (e.target.value !== '') prefillFromMilestone(Number(e.target.value)) }}
            >
              <option value="">— none —</option>
              {milestones.map((m, i) => <option key={i} value={i}>{m.milestone}</option>)}
            </select>
          </div>
        )}

        <label className="block text-xs text-muted mb-1">Title</label>
        <input
          className="input-base w-full mb-3"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Short summary…"
          autoFocus
        />

        <label className="block text-xs text-muted mb-1">Type</label>
        <select className="input-base w-full mb-3" value={type} onChange={e => setType(e.target.value as VentureIssueType | '')}>
          <option value="">— none —</option>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className="block text-xs text-muted mb-1">
          Description <span className="text-muted/60">(markdown, optional)</span>
        </label>
        <textarea
          className="input-base w-full resize-none mb-1"
          rows={6}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Details, acceptance criteria, links…"
        />

        {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-sm px-3 py-1.5 rounded-lg border border-rule text-muted hover:text-paper transition-colors"
          >
            Cancel
          </button>
          <button onClick={submit} disabled={submitting || !title.trim()} className="btn-primary">
            {submitting
              ? <span className="flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Creating…</span>
              : 'Create issue'}
          </button>
        </div>
      </div>
    </div>
  )
}
