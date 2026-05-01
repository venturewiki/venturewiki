'use client'
import { Star } from 'lucide-react'
import { EditableSection } from '@/components/business/EditableSection'
import { EditField, TextInput, Selector } from '@/components/business/edit-fields'
import { cn, STAGE_LABELS, STAGE_COLORS, TYPE_ICONS, TYPE_LABELS } from '@/lib/utils'
import type { BusinessPlan } from '@/types'

const STAGE_OPTIONS = [
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'MVP' },
  { value: 'beta', label: 'Beta' },
  { value: 'live', label: 'Live' },
  { value: 'scaling', label: 'Scaling' },
  { value: 'exited', label: 'Exited' },
] as const

const TYPE_OPTIONS = [
  { value: 'web-app', label: 'Web App' },
  { value: 'website', label: 'Website' },
  { value: 'ai-agent', label: 'AI Agent' },
  { value: 'api', label: 'API Product' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'other', label: 'Other' },
] as const

const FUNDING_OPTIONS = [
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'pre-seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'series-a', label: 'Series A' },
  { value: 'series-b+', label: 'Series B+' },
] as const

export function CoverHeader({
  cover, isFeatured, isAdmin, canEdit, onToggleFeatured, onSaveCover,
}: {
  cover: BusinessPlan['cover']
  isFeatured: boolean
  isAdmin: boolean
  canEdit: boolean
  onToggleFeatured: () => void
  onSaveCover: (next: BusinessPlan['cover']) => Promise<void>
}) {
  return (
    <EditableSection
      canEdit={canEdit}
      value={cover}
      className="mb-5"
      onSave={onSaveCover}
      header={
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 mt-0.5"
            style={{ background: `${cover.accentColor || '#E8622A'}20` }}
          >
            {cover.logoEmoji || '🚀'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-paper leading-tight">
                {cover.companyName}
              </h1>
              {isFeatured && <Star className="w-5 h-5 text-gold fill-gold shrink-0" />}
              {isAdmin && (
                <button
                  onClick={onToggleFeatured}
                  className={cn('btn-ghost px-2', isFeatured && 'text-gold')}
                  title="Toggle featured"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {cover.tagline && (
              <p className="text-paper/60 text-base leading-relaxed">{cover.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={cn('badge', STAGE_COLORS[cover.stage])}>{STAGE_LABELS[cover.stage]}</span>
              <span className="badge bg-slate/30 text-paper/60">
                {TYPE_ICONS[cover.productType]} {TYPE_LABELS[cover.productType]}
              </span>
              {cover.industryVertical && (
                <span className="badge bg-lead border border-rule text-muted">{cover.industryVertical}</span>
              )}
            </div>
          </div>
        </div>
      }
      view={() => null}
      edit={(draft, set) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pt-4 border-t border-rule/50">
          <EditField label="Company Name">
            <TextInput value={draft.companyName} onChange={v => set({ ...draft, companyName: v })} placeholder="Acme Corp" />
          </EditField>
          <EditField label="Logo Emoji">
            <TextInput value={draft.logoEmoji} onChange={v => set({ ...draft, logoEmoji: v })} placeholder="🚀" />
          </EditField>
          <div className="sm:col-span-2">
            <EditField label="Tagline">
              <TextInput value={draft.tagline} onChange={v => set({ ...draft, tagline: v })} placeholder="One sentence that defines your product" />
            </EditField>
          </div>
          <EditField label="Stage">
            <Selector value={draft.stage} onChange={v => set({ ...draft, stage: v as any })} options={STAGE_OPTIONS as any} />
          </EditField>
          <EditField label="Product Type">
            <Selector value={draft.productType} onChange={v => set({ ...draft, productType: v as any })} options={TYPE_OPTIONS as any} />
          </EditField>
          <EditField label="Industry Vertical">
            <TextInput value={draft.industryVertical} onChange={v => set({ ...draft, industryVertical: v })} placeholder="FinTech, HealthTech…" />
          </EditField>
          <EditField label="Headquarters">
            <TextInput value={draft.headquarters} onChange={v => set({ ...draft, headquarters: v })} placeholder="New York, NY" />
          </EditField>
          <EditField label="Funding Stage">
            <Selector value={draft.fundingStage} onChange={v => set({ ...draft, fundingStage: v as any })} options={FUNDING_OPTIONS as any} />
          </EditField>
          <EditField label="Website URL">
            <TextInput value={draft.websiteUrl} onChange={v => set({ ...draft, websiteUrl: v })} placeholder="https://" />
          </EditField>
          <EditField label="Accent Color">
            <input
              type="color"
              value={draft.accentColor || '#E8622A'}
              onChange={e => set({ ...draft, accentColor: e.target.value })}
              className="h-10 w-full rounded-lg cursor-pointer bg-transparent border border-rule p-1"
            />
          </EditField>
        </div>
      )}
    />
  )
}
