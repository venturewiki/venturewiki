'use client'
import { AlertTriangle } from 'lucide-react'
import { YamlEditor } from '@/components/business/YamlEditor'

export function PlanErrorBanner({
  planError, planRaw, saving, onSave,
}: {
  planError: string
  planRaw?: string
  saving: boolean
  onSave: (raw: string) => Promise<void>
}) {
  return (
    <div className="section-card mb-6 border border-rose-500/40 bg-rose-500/5 animate-fade-in">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-paper text-base mb-1">
            .venturewiki/plan.yaml has a YAML error
          </h2>
          <p className="text-paper/70 text-sm font-mono break-words leading-relaxed">{planError}</p>
          <p className="text-muted text-xs mt-2">
            Edit the file below and save to fix it. Until the YAML parses cleanly, the structured sections
            below are placeholders.
          </p>
        </div>
      </div>
      {planRaw != null && (
        <YamlEditor
          initialValue={planRaw}
          requireParseOk
          rows={26}
          saving={saving}
          saveLabel="Save plan.yaml"
          onSave={onSave}
        />
      )}
    </div>
  )
}
