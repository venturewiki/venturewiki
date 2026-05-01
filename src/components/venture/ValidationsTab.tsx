'use client'
import { ShieldCheck } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Validation, VentureValue } from '@/types'

export function ValidationsTab({
  validations, ventureValue,
}: {
  validations: Validation[]
  ventureValue: VentureValue | null
}) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="section-card">
        <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal" /> Information Validations
        </h2>
        <p className="text-muted text-sm mb-4">
          Wikipedia-style validation: community members can verify or dispute information in this business plan.
        </p>

        {ventureValue && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Stat label="Validation Score"
              value={`${ventureValue.validationScore >= 0 ? '+' : ''}${ventureValue.validationScore}`}
              valueClass={ventureValue.validationScore >= 0 ? 'text-emerald-400' : 'text-danger'} />
            <Stat label="Collaborations" value={ventureValue.collaborationCount} valueClass="text-accent" />
            <Stat label="Venture Score" value={ventureValue.overallScore} valueClass="text-gold" />
            <Stat label="Investors" value={ventureValue.investmentInterest} valueClass="text-teal" />
          </div>
        )}

        {validations.length === 0 ? (
          <p className="text-muted italic text-sm text-center py-8">No validations yet — help validate this business plan!</p>
        ) : (
          <div className="space-y-2">
            {validations.map(v => (
              <div key={v.id} className="flex items-start gap-3 p-3 bg-rule/20 rounded-lg">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs',
                  v.status === 'validated' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300',
                )}>
                  {v.status === 'validated' ? '✓' : '✗'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-paper">{v.userName}</span>
                    <span className="badge bg-lead border border-rule text-muted text-xs">
                      {v.section}{v.field ? ` → ${v.field}` : ''}
                    </span>
                  </div>
                  <p className="text-paper/70 text-sm">{v.evidence}</p>
                  <p className="text-muted text-xs mt-1">{formatRelativeTime(v.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, valueClass }: { label: string; value: string | number; valueClass: string }) {
  return (
    <div className="bg-rule/20 rounded-lg p-3 text-center">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={cn('font-display font-bold text-lg', valueClass)}>{value}</p>
    </div>
  )
}
