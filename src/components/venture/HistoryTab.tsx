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
            <div key={e.id} className="flex items-start gap-3 py-3">
              <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <p className="text-paper/80 text-sm">{e.section || 'Updated'}</p>
                <p className="text-muted text-xs">{e.userName}</p>
                {e.files && e.files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {e.files.map(f => (
                      <span key={f} className="inline-block text-xs font-mono bg-rule/40 text-muted px-1.5 py-0.5 rounded">
                        {f.replace('.venturewiki/', '')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted shrink-0 mt-0.5">{formatRelativeTime(e.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
