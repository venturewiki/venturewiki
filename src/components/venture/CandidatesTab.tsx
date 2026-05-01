'use client'
import { UserPlus } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { RoleCandidate } from '@/types'
import { Avatar } from './Avatar'

const STATUS_BADGE: Record<RoleCandidate['status'], string> = {
  pending:   'bg-amber-900/60 text-amber-300',
  accepted:  'bg-emerald-900/60 text-emerald-300',
  rejected:  'bg-red-900/60 text-red-300',
  withdrawn: 'bg-slate-700 text-slate-300',
}

export function CandidatesTab({
  candidates, openRoles,
}: {
  candidates: RoleCandidate[]
  openRoles?: string
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="section-card">
        <h2 className="font-display font-bold text-paper flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-accent" /> Role Candidates
        </h2>
        <p className="text-muted text-sm mb-4">
          People who have applied for open roles in this venture. Endorse candidates you think are a great fit.
        </p>
        {openRoles && (
          <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg mb-4">
            <p className="text-xs text-accent font-medium uppercase tracking-wider mb-1">Open Roles</p>
            <p className="text-paper/80 text-sm">{openRoles}</p>
          </div>
        )}
        {candidates.length === 0 ? (
          <p className="text-muted italic text-sm text-center py-8">No candidates yet — be the first to apply!</p>
        ) : (
          <div className="space-y-3">
            {candidates.map(c => (
              <div key={c.id} className="flex items-start gap-3 p-3 bg-rule/20 rounded-lg">
                <Avatar src={c.userImage} name={c.userName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-paper">{c.userName}</span>
                    <span className="badge bg-accent/20 text-accent text-xs">{c.role}</span>
                    <span className={cn('badge text-xs', STATUS_BADGE[c.status])}>{c.status}</span>
                  </div>
                  {c.pitch && <p className="text-paper/70 text-sm">{c.pitch}</p>}
                  <p className="text-muted text-xs mt-1">
                    {c.endorsements.length} endorsement{c.endorsements.length !== 1 ? 's' : ''} · Applied {formatRelativeTime(c.appliedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
