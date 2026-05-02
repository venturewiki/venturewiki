'use client'
import type { UseFieldArrayReturn, UseFormRegister } from 'react-hook-form'
import { Field, Input, Textarea, Select, ArrayHeader, RemoveRowButton, FieldGrid } from './primitives'

type Reg = UseFormRegister<any>

// ── Static option lists ────────────────────────────────────────────────────

export const STAGE_OPTIONS = [
  { value: 'idea',    label: 'Idea' },
  { value: 'mvp',     label: 'MVP' },
  { value: 'beta',    label: 'Beta' },
  { value: 'live',    label: 'Live' },
  { value: 'scaling', label: 'Scaling' },
  { value: 'exited',  label: 'Exited' },
]

export const TYPE_OPTIONS = [
  { value: 'web-app',  label: 'Web App' },
  { value: 'website',  label: 'Website' },
  { value: 'ai-agent', label: 'AI Agent' },
  { value: 'api',      label: 'API Product' },
  { value: 'hybrid',   label: 'Hybrid' },
  { value: 'other',    label: 'Other' },
]

export const FUNDING_OPTIONS = [
  { value: 'bootstrapped', label: 'Bootstrapped' },
  { value: 'pre-seed',     label: 'Pre-Seed' },
  { value: 'seed',         label: 'Seed' },
  { value: 'series-a',     label: 'Series A' },
  { value: 'series-b+',    label: 'Series B+' },
]

const RISK_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
]

const MILESTONE_STATUS = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done',        label: 'Done' },
  { value: 'delayed',     label: 'Delayed' },
]

// ── Section: Cover ─────────────────────────────────────────────────────────

const COVER_TRACTION: ReadonlyArray<readonly [string, string, string]> = [
  ['cover.tractionHighlights.revenue',      'Traction — Revenue / MRR', '$12K MRR'],
  ['cover.tractionHighlights.users',        'Traction — Users',         '2,400 signups'],
  ['cover.tractionHighlights.partnerships', 'Traction — Partnerships',  'LOI with Acme Corp'],
  ['cover.tractionHighlights.press',        'Traction — Press / Awards','Featured in TechCrunch'],
]

export function CoverSection({ register }: { register: Reg }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Field label="Visibility" hint="Public ventures are visible to everyone. Private ventures are only visible to you and your collaborators.">
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('isPublic')} type="radio" value="true" defaultChecked className="accent-accent" />
              <span className="text-sm text-paper">🌐 Public</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('isPublic')} type="radio" value="false" className="accent-accent" />
              <span className="text-sm text-paper">🔒 Private</span>
            </label>
          </div>
        </Field>
      </div>
      <div className="col-span-2"><Field label="Company Name *"><Input reg={register('cover.companyName', { required: true })} placeholder="e.g. VentureWiki" /></Field></div>
      <div className="col-span-2"><Field label="Tagline" hint="One sentence — what it is and who it's for"><Input reg={register('cover.tagline')} placeholder="The collaborative wiki for digital business plans" /></Field></div>
      <Field label="Logo Emoji" hint="Quick visual identifier"><Input reg={register('cover.logoEmoji')} placeholder="🚀" /></Field>
      <Field label="Accent Color" hint="Hex color for your card"><Input reg={register('cover.accentColor')} type="color" /></Field>
      <Field label="Product Type"><Select reg={register('cover.productType')}>{TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
      <Field label="Stage"><Select reg={register('cover.stage')}>{STAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
      <Field label="Industry Vertical"><Input reg={register('cover.industryVertical')} placeholder="FinTech, HealthTech, Productivity…" /></Field>
      <Field label="Headquarters"><Input reg={register('cover.headquarters')} placeholder="New York, NY" /></Field>
      <Field label="Legal Structure"><Input reg={register('cover.legalStructure')} placeholder="C-Corp / LLC" /></Field>
      <Field label="Funding Stage"><Select reg={register('cover.fundingStage')}>{FUNDING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
      <Field label="Funding Sought"><Input reg={register('cover.fundingSought')} placeholder="$500K" /></Field>
      <Field label="Website / Demo URL"><Input reg={register('cover.websiteUrl')} placeholder="https://venturewiki.io" /></Field>
      <div className="col-span-2"><Field label="Mission"><Textarea reg={register('cover.mission')} placeholder="What you do today — for whom, and why it matters" rows={2} /></Field></div>
      <div className="col-span-2"><Field label="Vision"><Textarea reg={register('cover.vision')} placeholder="Where you're going in 5 years — the future you're building" rows={2} /></Field></div>
      {COVER_TRACTION.map(([name, label, ph]) => (
        <Field key={name} label={label}><Input reg={register(name)} placeholder={ph} /></Field>
      ))}
    </div>
  )
}

// ── Section: Problem · Solution · Market ───────────────────────────────────

export function ProblemSolutionSection({
  register, featuresArr,
}: {
  register: Reg
  featuresArr: UseFieldArrayReturn<any>
}) {
  return (
    <>
      <Field label="Core Pain Point">
        <Textarea reg={register('problemSolution.corePainPoint')} placeholder="State the problem from the customer's perspective, not yours" />
      </Field>
      <FieldGrid register={register} fields={[
        ['problemSolution.painDimensions.who', 'Who feels this pain?', 'Job title / persona'],
        ['problemSolution.painDimensions.frequency', 'How often?', 'Daily / per transaction'],
        ['problemSolution.painDimensions.currentWorkarounds', 'Current workarounds', 'What they use today and why it fails'],
        ['problemSolution.painDimensions.costOfProblem', 'Cost of the problem', 'Lost revenue / wasted hours'],
      ]} />

      <Field label="Solution — One Liner">
        <Textarea reg={register('problemSolution.solutionOneLiner')} placeholder="[Category] that [benefit] for [target user] by [mechanism]" rows={2} />
      </Field>

      <div>
        <ArrayHeader label="Features" onAdd={() => featuresArr.append({ feature: '', benefit: '', techLayer: '' })} />
        {featuresArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
            <Input reg={register(`problemSolution.features.${i}.feature`)}   placeholder="Feature" />
            <Input reg={register(`problemSolution.features.${i}.benefit`)}   placeholder="Benefit" />
            <Input reg={register(`problemSolution.features.${i}.techLayer`)} placeholder="Tech layer" />
            <RemoveRowButton onClick={() => featuresArr.remove(i)} />
          </div>
        ))}
      </div>

      <Field label="Unfair Advantage">
        <Textarea reg={register('problemSolution.unfairAdvantage')} placeholder="What cannot be easily copied — data moat, network effects, IP…" rows={2} />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        {(['tam', 'sam', 'som'] as const).map(m => (
          <div key={m} className="space-y-1">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">{m.toUpperCase()}</label>
            <Input reg={register(`problemSolution.market.${m}Size`)}   placeholder="$5B" />
            <Input reg={register(`problemSolution.market.${m}Source`)} placeholder="Source, year" />
          </div>
        ))}
      </div>
      <Field label="Why Now?">
        <Textarea reg={register('problemSolution.whyNow')} placeholder="The technology shift or behavior trend making this the right moment" rows={2} />
      </Field>
    </>
  )
}

// ── Section: Product · GTM · Competition ───────────────────────────────────

const TECH_FIELDS: ReadonlyArray<readonly [string, string, string]> = [
  ['productGtm.techStack.productType',  'Product Type',     'Web App / Chrome Ext / API…'],
  ['productGtm.techStack.frontend',     'Frontend',         'React / Next.js / Vue…'],
  ['productGtm.techStack.backend',      'Backend',          'Node / Python / serverless…'],
  ['productGtm.techStack.aiLayer',      'AI / ML Layer',    'OpenAI / Anthropic / RAG…'],
  ['productGtm.techStack.dataStorage',  'Data Storage',     'PostgreSQL / Pinecone…'],
  ['productGtm.techStack.authPayments', 'Auth & Payments',  'Clerk / Auth0 + Stripe…'],
  ['productGtm.techStack.hosting',      'Hosting',          'Vercel / AWS / GCP…'],
  ['productGtm.techStack.buildStage',   'Build Stage',      'Idea / MVP / Beta / Live…'],
  ['productGtm.techStack.ipLayer',      'IP Layer',         'Proprietary model / patent…'],
]

export function ProductGtmSection({
  register, channelsArr, competArr,
}: {
  register: Reg
  channelsArr: UseFieldArrayReturn<any>
  competArr:   UseFieldArrayReturn<any>
}) {
  return (
    <>
      <FieldGrid register={register} fields={TECH_FIELDS} />

      <div>
        <ArrayHeader label="GTM Channels" onAdd={() => channelsArr.append({ channel: '', tactic: '', goal90Day: '', owner: '', budgetPerMonth: '' })} />
        {channelsArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
            <Input reg={register(`productGtm.gtmChannels.${i}.channel`)}   placeholder="Channel" />
            <Input reg={register(`productGtm.gtmChannels.${i}.tactic`)}    placeholder="Tactic" />
            <Input reg={register(`productGtm.gtmChannels.${i}.goal90Day`)} placeholder="90-day goal" />
            <RemoveRowButton onClick={() => channelsArr.remove(i)} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="ICP"><Textarea reg={register('productGtm.icp')} placeholder="Job title · company size · pain trigger" rows={2} /></Field>
        <Field label="Pricing Model"><Input reg={register('productGtm.pricingModel')} placeholder="Freemium / Usage-based / SaaS…" /></Field>
        <Field label="Price Point"><Input reg={register('productGtm.pricePoint')} placeholder="$49/mo" /></Field>
        <Field label="Sales Motion"><Input reg={register('productGtm.salesMotion')} placeholder="Self-serve PLG / Inside sales…" /></Field>
      </div>

      <div>
        <ArrayHeader label="Competition" addLabel="Add row"
          onAdd={() => competArr.append({ dimension: '', yourProduct: '', competitorA: '', competitorB: '', competitorC: '' })} />
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-1 mb-1 text-xs text-muted px-1">
          <span>Dimension</span><span>You</span><span>A</span><span>B</span><span>C</span><span />
        </div>
        {competArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-1 mb-1.5">
            <Input reg={register(`productGtm.competitors.${i}.dimension`)}   placeholder="Dimension" />
            <Input reg={register(`productGtm.competitors.${i}.yourProduct`)} placeholder="You" />
            <Input reg={register(`productGtm.competitors.${i}.competitorA`)} placeholder="A" />
            <Input reg={register(`productGtm.competitors.${i}.competitorB`)} placeholder="B" />
            <Input reg={register(`productGtm.competitors.${i}.competitorC`)} placeholder="C" />
            <RemoveRowButton onClick={() => competArr.remove(i)} />
          </div>
        ))}
      </div>
    </>
  )
}

// ── Section: Team · Roadmap ────────────────────────────────────────────────

export function TeamRoadmapSection({
  register, foundersArr, kpisArr, milesArr,
}: {
  register: Reg
  foundersArr: UseFieldArrayReturn<any>
  kpisArr:     UseFieldArrayReturn<any>
  milesArr:    UseFieldArrayReturn<any>
}) {
  return (
    <>
      <div>
        <ArrayHeader label="Founders" onAdd={() => foundersArr.append({ name: '', role: '', background: '', commitment: 'Full-time', equity: '' })} />
        {foundersArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto] gap-2 mb-2">
            <Input reg={register(`teamRoadmap.founders.${i}.name`)}       placeholder="Name" />
            <Input reg={register(`teamRoadmap.founders.${i}.role`)}       placeholder="Role" />
            <Input reg={register(`teamRoadmap.founders.${i}.background`)} placeholder="Background" />
            <Input reg={register(`teamRoadmap.founders.${i}.commitment`)} placeholder="Commitment" />
            <Input reg={register(`teamRoadmap.founders.${i}.equity`)}     placeholder="Equity %" />
            <RemoveRowButton onClick={() => foundersArr.remove(i)} />
          </div>
        ))}
      </div>

      <div>
        <ArrayHeader label="KPIs" onAdd={() => kpisArr.append({ metric: '', current: '', target3mo: '', target12mo: '', notes: '' })} />
        {kpisArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 mb-2">
            <Input reg={register(`teamRoadmap.kpis.${i}.metric`)}     placeholder="Metric" />
            <Input reg={register(`teamRoadmap.kpis.${i}.current`)}    placeholder="Current" />
            <Input reg={register(`teamRoadmap.kpis.${i}.target3mo`)}  placeholder="3-month" />
            <Input reg={register(`teamRoadmap.kpis.${i}.target12mo`)} placeholder="12-month" />
            <RemoveRowButton onClick={() => kpisArr.remove(i)} />
          </div>
        ))}
      </div>

      <div>
        <ArrayHeader label="Milestones" onAdd={() => milesArr.append({ milestone: '', owner: '', targetDate: '', budget: '', successCriteria: '', status: 'not-started' })} />
        {milesArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 mb-2">
            <Input reg={register(`teamRoadmap.milestones.${i}.milestone`)}       placeholder="Milestone" />
            <Input reg={register(`teamRoadmap.milestones.${i}.targetDate`)}      placeholder="Q1 2025" />
            <Input reg={register(`teamRoadmap.milestones.${i}.successCriteria`)} placeholder="Success criteria" />
            <Select reg={register(`teamRoadmap.milestones.${i}.status`)}>
              {MILESTONE_STATUS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <RemoveRowButton onClick={() => milesArr.remove(i)} />
          </div>
        ))}
      </div>
    </>
  )
}

// ── Section: Funding Ask ───────────────────────────────────────────────────

const PITCH_FIELDS: ReadonlyArray<readonly [string, string, string]> = [
  ['fundingAsk.elevatorPitch.hook',          'Hook (problem/stat)', 'Start with a number…'],
  ['fundingAsk.elevatorPitch.companyIntro',  'Company Intro',       'We built X — it does Y'],
  ['fundingAsk.elevatorPitch.tractionProof', 'Traction Proof',      'Biggest stat'],
  ['fundingAsk.elevatorPitch.marketSize',    'Market Size',         '$XB market…'],
  ['fundingAsk.elevatorPitch.askAndUse',     'Ask + Use',           "We're raising $X to…"],
  ['fundingAsk.elevatorPitch.cta',           'CTA',                 'What you want them to do'],
]

export function FundingAskSection({
  register, uofArr, risksArr,
}: {
  register: Reg
  uofArr:   UseFieldArrayReturn<any>
  risksArr: UseFieldArrayReturn<any>
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Total Raise"><Input reg={register('fundingAsk.totalRaise')} placeholder="$500,000" /></Field>
        <Field label="Instrument"><Input reg={register('fundingAsk.instrument')} placeholder="SAFE / Convertible Note / Equity" /></Field>
        <Field label="Valuation Cap / Terms"><Input reg={register('fundingAsk.valuationCapTerms')} placeholder="$5M cap / 20% discount" /></Field>
        <Field label="Target Close Date"><Input reg={register('fundingAsk.targetCloseDate')} placeholder="Q3 2025" /></Field>
        <div className="col-span-2">
          <Field label="Ask in One Sentence">
            <Textarea reg={register('fundingAsk.askOneLiner')} placeholder="We're raising $X to achieve Y milestone by Z date" rows={2} />
          </Field>
        </div>
      </div>

      <div>
        <ArrayHeader label="Use of Funds" onAdd={() => uofArr.append({ category: '', amount: '', percentage: '', timeline: '', milestoneUnlocked: '' })} />
        {uofArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 mb-2">
            <Input reg={register(`fundingAsk.useOfFunds.${i}.category`)}          placeholder="Category" />
            <Input reg={register(`fundingAsk.useOfFunds.${i}.amount`)}            placeholder="Amount" />
            <Input reg={register(`fundingAsk.useOfFunds.${i}.percentage`)}        placeholder="%" />
            <Input reg={register(`fundingAsk.useOfFunds.${i}.milestoneUnlocked`)} placeholder="Milestone" />
            <RemoveRowButton onClick={() => uofArr.remove(i)} />
          </div>
        ))}
      </div>

      <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-3">Elevator Pitch</label>
      <FieldGrid register={register} fields={PITCH_FIELDS} />

      <div>
        <ArrayHeader label="Risk Register" onAdd={() => risksArr.append({ risk: '', likelihood: 'medium', impact: 'medium', mitigation: '' })} />
        {risksArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-2 mb-2">
            <Input reg={register(`fundingAsk.risks.${i}.risk`)} placeholder="Risk" />
            <Select reg={register(`fundingAsk.risks.${i}.likelihood`)}>
              {RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Select reg={register(`fundingAsk.risks.${i}.impact`)}>
              {RISK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Input reg={register(`fundingAsk.risks.${i}.mitigation`)} placeholder="Mitigation" />
            <RemoveRowButton onClick={() => risksArr.remove(i)} />
          </div>
        ))}
      </div>
    </>
  )
}

// ── Section: Financials ────────────────────────────────────────────────────

const FINANCIALS_FIELDS: ReadonlyArray<readonly [string, string, string]> = [
  ['financials.revenueModel',   'Revenue Model',  'SaaS / Usage-based…'],
  ['financials.grossMargin',    'Gross Margin',   '70%'],
  ['financials.burnRate',       'Monthly Burn',   '$15,000/mo'],
  ['financials.runway',         'Runway',         '18 months'],
  ['financials.breakEvenTarget','Break-even',     'Q3 2026 at 500 users'],
  ['financials.cac',            'CAC',            '$70 blended'],
  ['financials.ltv',            'LTV',            '$840'],
]

export function FinancialsSection({
  register, projArr,
}: {
  register: Reg
  projArr: UseFieldArrayReturn<any>
}) {
  return (
    <>
      <FieldGrid register={register} fields={FINANCIALS_FIELDS} />

      <div>
        <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">4-Year Projections</label>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 mb-1 text-xs text-muted px-1">
          <span>Year</span><span>Revenue</span><span>EBITDA</span><span>Users</span><span />
        </div>
        {projArr.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
            <Input reg={register(`financials.projections.${i}.year`)}    placeholder={`Year ${i + 1}`} />
            <Input reg={register(`financials.projections.${i}.revenue`)} placeholder="$120K" />
            <Input reg={register(`financials.projections.${i}.ebitda`)}  placeholder="-$80K" />
            <Input reg={register(`financials.projections.${i}.users`)}   placeholder="500" />
            <RemoveRowButton onClick={() => projArr.remove(i)} />
          </div>
        ))}
        <button type="button"
          onClick={() => projArr.append({ year: `Year ${projArr.fields.length + 1}`, revenue: '', ebitda: '', users: '' })}
          className="btn-ghost text-xs mt-1">
          + Add year
        </button>
      </div>
    </>
  )
}
