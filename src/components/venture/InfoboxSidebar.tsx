'use client'
import { STAGE_LABELS, TYPE_LABELS } from '@/lib/utils'
import type { BusinessPlan } from '@/types'

export function InfoboxSidebar({ business }: { business: BusinessPlan }) {
  const cover = business.cover
  const fa = (business as any).fundingAsk

  const facts: Array<[string, string | undefined]> = [
    ['Founded', cover.version?.replace('v', '') ? cover.version : undefined],
    ['HQ', cover.headquarters],
    ['Legal', cover.legalStructure],
    ['Stage', STAGE_LABELS[cover.stage]],
    ['Type', TYPE_LABELS[cover.productType]],
    ['Industry', cover.industryVertical],
    ['Funding', cover.fundingStage],
    ['Website', cover.websiteUrl],
  ]

  const traction: Array<[string, string | undefined]> = [
    ['Revenue', cover.tractionHighlights?.revenue],
    ['Users', cover.tractionHighlights?.users],
    ['Partnerships', cover.tractionHighlights?.partnerships],
    ['Press', cover.tractionHighlights?.press],
  ]
  const hasTraction = traction.some(([, v]) => !!v)

  return (
    <aside className="lg:block">
      <div className="sticky top-20 space-y-4">
        <div className="infobox">
          <div className="infobox-header">{cover.companyName}</div>
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="infobox-row">
              <span className="infobox-label">{k}</span>
              <span className="infobox-value text-xs">
                {k === 'Website' ? (
                  <a href={v as string} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate block">{v}</a>
                ) : v}
              </span>
            </div>
          ))}
        </div>

        {hasTraction && (
          <div className="infobox">
            <div className="infobox-header">Traction</div>
            {traction.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="infobox-row">
                <span className="infobox-label">{k}</span>
                <span className="infobox-value text-xs">{v}</span>
              </div>
            ))}
          </div>
        )}

        {fa?.elevatorPitch?.hook && (
          <div className="section-card border-l-2 border-accent">
            <p className="text-xs text-accent uppercase tracking-wider mb-2 font-mono">Elevator Pitch</p>
            <p className="text-paper/70 text-xs leading-relaxed italic">{fa.elevatorPitch.hook}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
