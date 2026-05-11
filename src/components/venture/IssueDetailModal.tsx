'use client'
import { useEffect, useState } from 'react'
import { X, Loader2, ExternalLink } from 'lucide-react'
import { fetchVentureIssue, updateVentureIssue, addVentureIssueComment } from '@/lib/api'
import type { VentureIssue, VentureIssueDetail, VentureIssueType, VentureIssueStatus } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import { Avatar } from './Avatar'
import { ISSUE_TYPE_META } from './IssuesTab'

const TYPE_OPTIONS: Array<{ value: VentureIssueType | ''; label: string }> = [
  { value: '', label: 'No type' },
  { value: 'task', label: 'Task' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'open-role', label: 'Open role' },
  { value: 'idea', label: 'Idea' },
  { value: 'risk', label: 'Risk' },
  { value: 'bug', label: 'Bug' },
]
const STATUS_OPTIONS: Array<{ value: VentureIssueStatus; label: string }> = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done (closed)' },
]

export function IssueDetailModal({
  businessId, number, canEdit, onClose, onChanged,
}: {
  businessId: string
  number: number | null
  canEdit: boolean
  onClose: () => void
  onChanged: (issue: VentureIssue) => void
}) {
  const [issue, setIssue] = useState<VentureIssueDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setComment('')
    if (number === null) { setIssue(null); return }
    setLoading(true)
    fetchVentureIssue(businessId, number)
      .then(setIssue)
      .catch(() => setIssue(null))
      .finally(() => setLoading(false))
  }, [businessId, number])

  if (number === null) return null

  const patch = async (p: { type?: VentureIssueType | null; status?: VentureIssueStatus }) => {
    if (!issue) return
    setBusy(true); setError(null)
    try {
      const updated = await updateVentureIssue(businessId, issue.number, p)
      setIssue({ ...issue, ...updated })
      onChanged(updated)
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const postComment = async () => {
    if (!issue || !comment.trim()) return
    setBusy(true); setError(null)
    try {
      const c = await addVentureIssueComment(businessId, issue.number, comment.trim())
      const nextCount = issue.commentCount + 1
      const updated = { ...issue, comments: [...issue.comments, c], commentCount: nextCount }
      setIssue(updated)
      setComment('')
      onChanged(updated)
    } catch (e: any) {
      setError(e?.message || 'Failed to add comment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-ink border border-rule rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            {issue ? (
              <h2 className="font-display font-bold text-paper text-lg break-words">
                <span className="text-muted font-mono text-base mr-1.5">#{issue.number}</span>{issue.title}
              </h2>
            ) : (
              <h2 className="font-display font-bold text-paper text-lg">Issue #{number}</h2>
            )}
          </div>
          <button onClick={onClose} disabled={busy} className="text-muted hover:text-paper transition-colors shrink-0" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && <div className="py-10 flex justify-center text-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>}

        {!loading && !issue && (
          <p className="text-muted text-sm py-6">Couldn&apos;t load this issue. It may be private or has been deleted.</p>
        )}

        {!loading && issue && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted mb-4 flex-wrap">
              <span>opened by <span className="text-paper/80">@{issue.authorLogin}</span> {formatRelativeTime(issue.createdAt)}</span>
              <a href={issue.htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                on GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-rule">
              {canEdit ? (
                <>
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    Status
                    <select
                      className="input-base text-xs py-1"
                      value={issue.status}
                      disabled={busy}
                      onChange={e => patch({ status: e.target.value as VentureIssueStatus })}
                    >
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    Type
                    <select
                      className="input-base text-xs py-1"
                      value={issue.type ?? ''}
                      disabled={busy}
                      onChange={e => patch({ type: (e.target.value || null) as VentureIssueType | null })}
                    >
                      {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <span className="text-xs px-2 py-0.5 rounded border border-rule text-muted capitalize">{issue.status.replace('-', ' ')}</span>
                  {issue.type && (
                    <span className={`text-[11px] px-1.5 py-0.5 rounded border ${ISSUE_TYPE_META[issue.type].cls}`}>
                      {ISSUE_TYPE_META[issue.type].label}
                    </span>
                  )}
                </>
              )}
              {issue.assignees.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  Assignees:
                  {issue.assignees.map(a => <Avatar key={a.login} src={a.avatarUrl} name={a.login} size={18} />)}
                </span>
              )}
              {busy && <Loader2 className="w-4 h-4 animate-spin text-muted" />}
            </div>

            {/* Body */}
            {issue.body.trim() ? (
              <p className="text-paper/80 text-sm whitespace-pre-wrap leading-relaxed mb-6">{issue.body}</p>
            ) : (
              <p className="text-muted/60 text-sm italic mb-6">No description.</p>
            )}

            {/* Comments */}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
              Comments ({issue.comments.length})
            </h3>
            <div className="space-y-3 mb-4">
              {issue.comments.length === 0 && <p className="text-muted/60 text-sm italic">No comments yet.</p>}
              {issue.comments.map(c => (
                <div key={c.id} className="section-card flex gap-3">
                  <Avatar src={c.authorImage} name={c.authorLogin || '?'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-paper">@{c.authorLogin}</span>
                      <span className="text-xs text-muted">{formatRelativeTime(c.createdAt)}</span>
                    </div>
                    <p className="text-paper/70 text-sm whitespace-pre-wrap leading-relaxed">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {canEdit && (
              <div className="section-card">
                <textarea
                  className="input-base resize-none w-full"
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment… (use @username to mention someone)"
                  disabled={busy}
                />
                <button onClick={postComment} disabled={busy || !comment.trim()} className="btn-primary mt-3">
                  {busy ? 'Working…' : 'Comment'}
                </button>
              </div>
            )}

            {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
