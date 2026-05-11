'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Plus, Loader2, MessageSquare, RefreshCw } from 'lucide-react'
import { fetchVentureIssues } from '@/lib/api'
import type { VentureIssue, VentureIssueType, VentureIssueStatus } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import { Avatar } from './Avatar'
import { NewIssueModal } from './NewIssueModal'
import { IssueDetailModal } from './IssueDetailModal'

export const ISSUE_TYPE_META: Record<VentureIssueType, { label: string; cls: string }> = {
  task:        { label: 'Task',      cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' },
  milestone:   { label: 'Milestone', cls: 'bg-violet-900/40 text-violet-300 border-violet-700/40' },
  'open-role': { label: 'Open role', cls: 'bg-sky-900/40 text-sky-300 border-sky-700/40' },
  idea:        { label: 'Idea',      cls: 'bg-amber-900/40 text-amber-300 border-amber-700/40' },
  risk:        { label: 'Risk',      cls: 'bg-rose-900/40 text-rose-300 border-rose-700/40' },
  bug:         { label: 'Bug',       cls: 'bg-red-900/40 text-red-300 border-red-700/40' },
}

const COLUMNS: Array<{ id: VentureIssueStatus; label: string }> = [
  { id: 'backlog',     label: 'Backlog' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'done',        label: 'Done' },
]

export interface RoadmapHint {
  milestones?: Array<{ milestone?: string; owner?: string; targetDate?: string; successCriteria?: string }>
  openRoles?: string
}

export function IssuesTab({
  businessId, canEdit, roadmap,
}: {
  businessId: string
  canEdit: boolean
  roadmap?: RoadmapHint
}) {
  const [issues, setIssues] = useState<VentureIssue[] | null>(null)
  const [reloading, setReloading] = useState(false)
  const [filterType, setFilterType] = useState<VentureIssueType | 'all'>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [openNumber, setOpenNumber] = useState<number | null>(null)

  const load = useCallback(async () => {
    setIssues(await fetchVentureIssues(businessId, { state: 'all' }))
  }, [businessId])

  useEffect(() => { load() }, [load])

  const reload = async () => { setReloading(true); try { await load() } finally { setReloading(false) } }

  const applyUpdated = (updated: VentureIssue) =>
    setIssues(prev => (prev ? prev.map(i => (i.number === updated.number ? updated : i)) : prev))
  const applyCreated = (created: VentureIssue) =>
    setIssues(prev => (prev ? [created, ...prev] : [created]))

  if (issues === null) {
    return <div className="py-12 flex justify-center text-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>
  }

  const visible = filterType === 'all' ? issues : issues.filter(i => i.type === filterType)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-display font-bold text-paper text-lg">Issues &amp; work</h2>
          <p className="text-muted text-sm">
            Tasks, milestones, risks and ideas for this venture — backed by its GitHub issues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reload} disabled={reloading} className="text-muted hover:text-paper transition-colors p-1.5" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
          </button>
          {canEdit && (
            <button className="btn-primary flex items-center gap-2" onClick={() => setNewOpen(true)}>
              <Plus className="w-4 h-4" /> New issue
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filterType === 'all'} onClick={() => setFilterType('all')}>All ({issues.length})</FilterChip>
        {(Object.keys(ISSUE_TYPE_META) as VentureIssueType[]).map(t => {
          const n = issues.filter(i => i.type === t).length
          return n === 0 ? null : (
            <FilterChip key={t} active={filterType === t} onClick={() => setFilterType(t)}>
              {ISSUE_TYPE_META[t].label} ({n})
            </FilterChip>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const items = visible.filter(i => i.status === col.id)
          return (
            <div key={col.id} className="bg-ink/40 border border-rule/50 rounded-lg p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center justify-between">
                <span>{col.label}</span><span className="text-muted/60">{items.length}</span>
              </h3>
              <div className="space-y-2">
                {items.length === 0 && <p className="text-xs text-muted/50 italic py-2">Nothing here.</p>}
                {items.map(issue => (
                  <button
                    key={issue.number}
                    onClick={() => setOpenNumber(issue.number)}
                    className="w-full text-left bg-ink border border-rule rounded-md p-3 hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-[11px] text-muted font-mono shrink-0 mt-0.5">#{issue.number}</span>
                      <span className="text-sm text-paper flex-1 min-w-0 break-words">{issue.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {issue.type && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ISSUE_TYPE_META[issue.type].cls}`}>
                          {ISSUE_TYPE_META[issue.type].label}
                        </span>
                      )}
                      {issue.commentCount > 0 && (
                        <span className="text-[10px] text-muted flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />{issue.commentCount}
                        </span>
                      )}
                      <span className="text-[10px] text-muted ml-auto">{formatRelativeTime(issue.updatedAt)}</span>
                      {issue.assignees.slice(0, 3).map(a => <Avatar key={a.login} src={a.avatarUrl} name={a.login} size={16} />)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {!canEdit && issues.length === 0 && (
        <p className="text-muted text-sm italic">No issues yet.</p>
      )}

      <NewIssueModal
        open={newOpen}
        businessId={businessId}
        roadmap={roadmap}
        onClose={() => setNewOpen(false)}
        onCreated={created => { applyCreated(created); setNewOpen(false); setOpenNumber(created.number) }}
      />
      <IssueDetailModal
        businessId={businessId}
        number={openNumber}
        canEdit={canEdit}
        onClose={() => setOpenNumber(null)}
        onChanged={applyUpdated}
      />
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active ? 'bg-accent/20 text-accent border-accent/40' : 'border-rule text-muted hover:text-paper'
      }`}
    >
      {children}
    </button>
  )
}
