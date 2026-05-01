'use client'
import { GitBranch } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { EditRecord } from '@/types'

export function HistoryTab({ edits }: { edits: EditRecord[] }) {
  return (
    <div className="section-card animate-fade-in">
      <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-accent" /> Edit History
      </h2>
      {edits.length === 0 ? (
        <p className="text-muted italic text-sm">No edits recorded yet</p>
      ) : (
        <div className="space-y-0 divide-y divide-rule/50">
          {edits.map(e => (
            <div key={e.id} className="flex items-center gap-3 py-3">
              <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-paper/80 text-sm">{e.summary || 'Updated'}</p>
                <p className="text-muted text-xs">{e.userName}</p>
              </div>
              <span className="text-xs text-muted shrink-0">{formatRelativeTime(e.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
