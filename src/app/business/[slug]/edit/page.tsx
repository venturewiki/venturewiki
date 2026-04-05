'use client'
// Edit page re-uses the same full editor as /business/new
// but pre-loads the existing business by ID and calls updateBusiness on submit.
// The slug param here is actually the Firestore document ID.
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession }           from 'next-auth/react'
import { useForm, useFieldArray } from 'react-hook-form'
import { toast }                from 'sonner'
import { Save, Plus, Trash2, ArrowLeft, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import Navbar                   from '@/components/layout/Navbar'
import { fetchBusiness, updateBusiness } from '@/lib/api'
import { EMPTY_BUSINESS, cn }   from '@/lib/utils'
import type { BusinessPlan }    from '@/types'

const SECTIONS = [
  { id: 'cover',           label: '01 · Cover & Snapshot',           emoji: '🏢' },
  { id: 'problemSolution', label: '02 · Problem, Solution & Market',  emoji: '🎯' },
  { id: 'productGtm',      label: '03 · Product & Go-to-Market',      emoji: '🚀' },
  { id: 'teamRoadmap',     label: '04 · Team & Roadmap',              emoji: '👥' },
  { id: 'fundingAsk',      label: '05 · Funding Ask',                 emoji: '💰' },
  { id: 'financials',      label: '📊 · Financial Snapshot',          emoji: '📊' },
]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted/60 mt-1">{hint}</p>}
    </div>
  )
}
const Input    = ({ reg, placeholder, type = 'text' }: any) => <input    {...reg} type={type} placeholder={placeholder} className="input-base" />
const Textarea = ({ reg, placeholder, rows = 3 }: any)     => <textarea {...reg} placeholder={placeholder} rows={rows} className="input-base resize-none" />
const Select   = ({ reg, children }: any)                  => <select   {...reg} className="input-base">{children}</select>

function SectionPanel({ id, label, emoji, open, onToggle, children }: {
  id: string; label: string; emoji: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="section-card">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between text-left">
        <h2 className="font-display font-bold text-paper flex items-center gap-2 text-base">
          <span>{emoji}</span> {label}
        </h2>
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {open && <div className="mt-6 space-y-4 border-t border-rule pt-6">{children}</div>}
    </div>
  )
}

export default function EditBusinessPage() {
  const params              = useParams()
  const router              = useRouter()
  const { data: session }   = useSession()
  const id                  = params.slug as string   // route is /business/[slug]/edit — slug = doc ID
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [biz, setBiz]           = useState<BusinessPlan | null>(null)
  const [openSections, setOpen] = useState<Record<string,boolean>>({ cover: true })

  const { register, control, handleSubmit, reset } = useForm<any>({ defaultValues: EMPTY_BUSINESS })

  const featArr  = useFieldArray({ control, name: 'problemSolution.features' })
  const gtmArr   = useFieldArray({ control, name: 'productGtm.gtmChannels' })
  const compArr  = useFieldArray({ control, name: 'productGtm.competitors' })
  const foundArr = useFieldArray({ control, name: 'teamRoadmap.founders' })
  const kpiArr   = useFieldArray({ control, name: 'teamRoadmap.kpis' })
  const msArr    = useFieldArray({ control, name: 'teamRoadmap.milestones' })
  const uofArr   = useFieldArray({ control, name: 'fundingAsk.useOfFunds' })
  const risksArr = useFieldArray({ control, name: 'fundingAsk.risks' })
  const projArr  = useFieldArray({ control, name: 'financials.projections' })

  const toggle = (id: string) => setOpen(s => ({ ...s, [id]: !s[id] }))

  useEffect(() => {
    if (!id) return
    fetchBusiness(id).then(b => {
      if (!b) { toast.error('Business not found'); router.push('/'); return }
      setBiz(b)
      reset(b)
      setLoading(false)
    }).catch(() => { toast.error('Failed to load'); setLoading(false) })
  }, [id, reset, router])

  if (loading) return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-accent animate-spin" />
    </div>
  )

  const onSubmit = async (data: any) => {
    if (!session?.user) { toast.error('Sign in required'); return }
    setSaving(true)
    try {
      await updateBusiness(
        biz!.id, data,
        `Edited by ${session.user.name}`
      )
      toast.success('Changes saved!')
      router.push(`/business/${biz!.id}`)
    } catch (e: any) {
      toast.error(e.message ?? 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-paper">
              Editing: {biz?.cover.companyName}
            </h1>
            <p className="text-sm text-muted mt-0.5">All edits are tracked in the revision history</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ── SECTION 1: Cover ──────────────────────────────────────── */}
          <SectionPanel {...SECTIONS[0]} open={!!openSections.cover} onToggle={() => toggle('cover')}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company Name"><Input reg={register('cover.companyName')} placeholder="Acme Corp" /></Field>
              <Field label="Logo Emoji"><Input reg={register('cover.logoEmoji')} placeholder="🚀" /></Field>
              <div className="col-span-2"><Field label="Tagline"><Input reg={register('cover.tagline')} placeholder="One sentence that defines your product" /></Field></div>
              <div className="col-span-2"><Field label="Mission"><Textarea reg={register('cover.mission')} placeholder="For whom, doing what, and why it matters" rows={2} /></Field></div>
              <div className="col-span-2"><Field label="Vision"><Textarea reg={register('cover.vision')} placeholder="Where you're going in 5 years" rows={2} /></Field></div>
              <Field label="Product Type">
                <Select reg={register('cover.productType')}>
                  <option value="web-app">Web App</option><option value="website">Website</option>
                  <option value="ai-agent">AI Agent</option><option value="api">API Product</option>
                  <option value="hybrid">Hybrid</option><option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Stage">
                <Select reg={register('cover.stage')}>
                  <option value="idea">Idea</option><option value="mvp">MVP</option>
                  <option value="beta">Beta</option><option value="live">Live</option>
                  <option value="scaling">Scaling</option><option value="exited">Exited</option>
                </Select>
              </Field>
              <Field label="Industry Vertical"><Input reg={register('cover.industryVertical')} placeholder="FinTech, HealthTech…" /></Field>
              <Field label="Headquarters"><Input reg={register('cover.headquarters')} placeholder="New York, NY" /></Field>
              <Field label="Funding Stage">
                <Select reg={register('cover.fundingStage')}>
                  <option value="bootstrapped">Bootstrapped</option><option value="pre-seed">Pre-Seed</option>
                  <option value="seed">Seed</option><option value="series-a">Series A</option>
                  <option value="series-b+">Series B+</option>
                </Select>
              </Field>
              <Field label="Funding Sought"><Input reg={register('cover.fundingSought')} placeholder="$500,000" /></Field>
              <Field label="Website / Demo"><Input reg={register('cover.websiteUrl')} placeholder="https://" /></Field>
              <Field label="Prepared By"><Input reg={register('cover.preparedBy')} placeholder="Founder name" /></Field>
              <Field label="Accent Color" hint="Card colour">
                <div className="flex gap-2">
                  <input type="color" {...register('cover.accentColor')} className="h-10 w-14 rounded-lg cursor-pointer bg-transparent border border-rule p-1" />
                  <Input reg={register('cover.accentColor')} placeholder="#E8622A" />
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-rule">
              <Field label="Traction — Revenue"><Input reg={register('cover.tractionHighlights.revenue')} placeholder="$5K MRR" /></Field>
              <Field label="Traction — Users"><Input reg={register('cover.tractionHighlights.users')} placeholder="1,200 signups" /></Field>
              <Field label="Traction — Partnerships"><Input reg={register('cover.tractionHighlights.partnerships')} placeholder="LOI with Acme" /></Field>
              <Field label="Traction — Press"><Input reg={register('cover.tractionHighlights.press')} placeholder="TechCrunch" /></Field>
            </div>
          </SectionPanel>

          {/* ── SECTION 2: Problem & Market ──────────────────────────── */}
          <SectionPanel {...SECTIONS[1]} open={!!openSections.problemSolution} onToggle={() => toggle('problemSolution')}>
            <Field label="Core Pain Point"><Textarea reg={register('problemSolution.corePainPoint')} placeholder="The exact pain…" rows={2} /></Field>
            <div className="grid grid-cols-2 gap-4">
              {[['problemSolution.painDimensions.who','Who Feels This Pain','Persona'],
                ['problemSolution.painDimensions.frequency','How Often','Daily / Per tx…'],
                ['problemSolution.painDimensions.currentWorkarounds','Current Workarounds','What they use'],
                ['problemSolution.painDimensions.costOfProblem','Cost of Problem','$X lost'],
                ['problemSolution.painDimensions.urgencyLevel','Urgency','Must-have'],
              ].map(([k,l,p]) => <Field key={k} label={l}><Input reg={register(k as any)} placeholder={p} /></Field>)}
            </div>
            <Field label="Solution One-Liner"><Textarea reg={register('problemSolution.solutionOneLiner')} rows={2} placeholder="[Product] that [benefit] for [user]" /></Field>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Features</label>
                <button type="button" onClick={() => featArr.append({ feature:'',benefit:'',techLayer:'' })} className="btn-ghost text-xs py-1 px-2"><Plus className="w-3 h-3" /> Add</button>
              </div>
              {featArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`problemSolution.features.${i}.feature`)} placeholder="Feature" />
                  <Input reg={register(`problemSolution.features.${i}.benefit`)} placeholder="Benefit" />
                  <Input reg={register(`problemSolution.features.${i}.techLayer`)} placeholder="LLM/API…" />
                  <button type="button" onClick={() => featArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <Field label="Unfair Advantage"><Textarea reg={register('problemSolution.unfairAdvantage')} placeholder="What cannot be easily copied" rows={2}/></Field>
            <div className="grid grid-cols-3 gap-4">
              {[['tam','TAM'],['sam','SAM'],['som','SOM']].map(([k,l]) => (
                <div key={k} className="space-y-1">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">{l}</label>
                  <Input reg={register(`problemSolution.market.${k}Size`)} placeholder="$2.4B" />
                  <Input reg={register(`problemSolution.market.${k}Source`)} placeholder="Source, Year" />
                </div>
              ))}
            </div>
            <Field label="Why Now?"><Textarea reg={register('problemSolution.whyNow')} placeholder="The tech shift that makes this the right moment" rows={2}/></Field>
          </SectionPanel>

          {/* ── SECTION 3: Product & GTM ──────────────────────────────── */}
          <SectionPanel {...SECTIONS[2]} open={!!openSections.productGtm} onToggle={() => toggle('productGtm')}>
            <div className="grid grid-cols-2 gap-4">
              {[['productGtm.techStack.frontend','Frontend','React / Next.js…'],
                ['productGtm.techStack.backend','Backend / Infra','Node / Python…'],
                ['productGtm.techStack.aiLayer','AI / ML Layer','OpenAI / Anthropic…'],
                ['productGtm.techStack.dataStorage','Data Storage','Postgres / Pinecone…'],
                ['productGtm.techStack.authPayments','Auth & Payments','Clerk + Stripe…'],
                ['productGtm.techStack.hosting','Hosting','Vercel / AWS…'],
                ['productGtm.techStack.buildStage','Build Stage','MVP / Beta / Live…'],
                ['productGtm.techStack.ipLayer','IP / Proprietary','Trained model…'],
              ].map(([k,l,p]) => <Field key={k} label={l}><Input reg={register(k as any)} placeholder={p} /></Field>)}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">GTM Channels</label>
                <button type="button" onClick={() => gtmArr.append({ channel:'',tactic:'',goal90Day:'',owner:'',budgetPerMonth:'' })} className="btn-ghost text-xs py-1 px-2"><Plus className="w-3 h-3"/> Add</button>
              </div>
              {gtmArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`productGtm.gtmChannels.${i}.channel`)} placeholder="Channel" />
                  <Input reg={register(`productGtm.gtmChannels.${i}.tactic`)} placeholder="Tactic" />
                  <Input reg={register(`productGtm.gtmChannels.${i}.goal90Day`)} placeholder="90-day goal" />
                  <Input reg={register(`productGtm.gtmChannels.${i}.budgetPerMonth`)} placeholder="Budget/mo" />
                  <button type="button" onClick={() => gtmArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['productGtm.icp','Ideal Customer Profile','Job title · company…'],
                ['productGtm.pricingModel','Pricing Model','Freemium / SaaS…'],
                ['productGtm.pricePoint','Price Point','$49/mo'],
                ['productGtm.salesMotion','Sales Motion','Self-serve PLG…'],
                ['productGtm.timeToValue','Time-to-Value','< 5 minutes'],
              ].map(([k,l,p]) => <Field key={k} label={l}><Input reg={register(k as any)} placeholder={p} /></Field>)}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Competitive Matrix</label>
                <button type="button" onClick={() => compArr.append({ dimension:'',yourProduct:'',competitorA:'',competitorB:'',competitorC:'' })} className="btn-ghost text-xs py-1 px-2"><Plus className="w-3 h-3"/> Add row</button>
              </div>
              {compArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  {['dimension','yourProduct','competitorA','competitorB','competitorC'].map(k => (
                    <Input key={k} reg={register(`productGtm.competitors.${i}.${k}`)} placeholder={k} />
                  ))}
                  <button type="button" onClick={() => compArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
          </SectionPanel>

          {/* ── SECTION 4: Team & Roadmap ─────────────────────────────── */}
          <SectionPanel {...SECTIONS[3]} open={!!openSections.teamRoadmap} onToggle={() => toggle('teamRoadmap')}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Founding Team</label>
                <button type="button" onClick={() => foundArr.append({ name:'',role:'',background:'',commitment:'Full-time',equity:'' })} className="btn-ghost text-xs py-1 px-2"><Plus className="w-3 h-3"/> Add</button>
              </div>
              {foundArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-2 mb-2">
                  {['name','role','background','commitment','equity'].map(k => (
                    <Input key={k} reg={register(`teamRoadmap.founders.${i}.${k}`)} placeholder={k} />
                  ))}
                  <button type="button" onClick={() => foundArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Advisors"><Input reg={register('teamRoadmap.advisors')} placeholder="Name — domain" /></Field>
              <Field label="Open Roles"><Input reg={register('teamRoadmap.openRoles')} placeholder="CTO Q1, AE Q2…" /></Field>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">KPI Targets</label>
                <button type="button" onClick={() => kpiArr.append({ metric:'',current:'',target3mo:'',target12mo:'',notes:'' })} className="btn-ghost text-xs py-1 px-2"><Plus className="w-3 h-3"/> Add</button>
              </div>
              {kpiArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_auto] gap-2 mb-2">
                  {['metric','current','target3mo','target12mo','notes'].map(k => (
                    <Input key={k} reg={register(`teamRoadmap.kpis.${i}.${k}`)} placeholder={k} />
                  ))}
                  <button type="button" onClick={() => kpiArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Milestones</label>
                <button type="button" onClick={() => msArr.append({ milestone:'',owner:'',targetDate:'',budget:'',successCriteria:'',status:'not-started' })} className="btn-ghost text-xs py-1 px-2"><Plus className="w-3 h-3"/> Add</button>
              </div>
              {msArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_auto] gap-2 mb-2">
                  {['milestone','owner','targetDate','budget','successCriteria'].map(k => (
                    <Input key={k} reg={register(`teamRoadmap.milestones.${i}.${k}`)} placeholder={k} />
                  ))}
                  <Select reg={register(`teamRoadmap.milestones.${i}.status`)}>
                    <option value="not-started">Not started</option><option value="in-progress">In progress</option>
                    <option value="done">Done</option><option value="delayed">Delayed</option>
                  </Select>
                  <button type="button" onClick={() => msArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
          </SectionPanel>

          {/* ── SECTION 5: Funding Ask ────────────────────────────────── */}
          <SectionPanel {...SECTIONS[4]} open={!!openSections.fundingAsk} onToggle={() => toggle('fundingAsk')}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Total Raise"><Input reg={register('fundingAsk.totalRaise')} placeholder="$500,000" /></Field>
              <Field label="Instrument"><Input reg={register('fundingAsk.instrument')} placeholder="SAFE / Note / Equity" /></Field>
              <Field label="Val. Cap / Terms"><Input reg={register('fundingAsk.valuationCapTerms')} placeholder="$5M cap" /></Field>
              <Field label="Close Date"><Input reg={register('fundingAsk.targetCloseDate')} placeholder="Q3 2025" /></Field>
              <div className="col-span-2"><Field label="Ask in One Sentence"><Textarea reg={register('fundingAsk.askOneLiner')} rows={2} placeholder="We're raising $X to…" /></Field></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Use of Funds</label>
                <button type="button" onClick={() => uofArr.append({ category:'',amount:'',percentage:'',timeline:'',milestoneUnlocked:'' })} className="btn-ghost text-xs py-1 px-2"><Plus className="w-3 h-3"/> Add</button>
              </div>
              {uofArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  {['category','amount','percentage','milestoneUnlocked'].map(k => (
                    <Input key={k} reg={register(`fundingAsk.useOfFunds.${i}.${k}`)} placeholder={k} />
                  ))}
                  <button type="button" onClick={() => uofArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-3">Elevator Pitch</label>
            <div className="grid grid-cols-2 gap-3">
              {[['fundingAsk.elevatorPitch.hook','Hook','Start with a stat…'],
                ['fundingAsk.elevatorPitch.companyIntro','Company Intro','We built X…'],
                ['fundingAsk.elevatorPitch.tractionProof','Traction Proof','Biggest stat'],
                ['fundingAsk.elevatorPitch.marketSize','Market Size','$XB market…'],
                ['fundingAsk.elevatorPitch.askAndUse','Ask + Use',"Raising $X to…"],
                ['fundingAsk.elevatorPitch.cta','CTA','What you want them to do'],
              ].map(([k,l,p]) => <Field key={k} label={l}><Input reg={register(k as any)} placeholder={p} /></Field>)}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Risk Register</label>
                <button type="button" onClick={() => risksArr.append({ risk:'',likelihood:'medium',impact:'medium',mitigation:'' })} className="btn-ghost text-xs py-1 px-2"><Plus className="w-3 h-3"/> Add</button>
              </div>
              {risksArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-2 mb-2">
                  <Input reg={register(`fundingAsk.risks.${i}.risk`)} placeholder="Risk" />
                  <Select reg={register(`fundingAsk.risks.${i}.likelihood`)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select>
                  <Select reg={register(`fundingAsk.risks.${i}.impact`)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select>
                  <Input reg={register(`fundingAsk.risks.${i}.mitigation`)} placeholder="Mitigation" />
                  <button type="button" onClick={() => risksArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
          </SectionPanel>

          {/* ── SECTION 6: Financials ─────────────────────────────────── */}
          <SectionPanel {...SECTIONS[5]} open={!!openSections.financials} onToggle={() => toggle('financials')}>
            <div className="grid grid-cols-2 gap-4">
              {[['financials.revenueModel','Revenue Model','SaaS / Usage…'],
                ['financials.grossMargin','Gross Margin','70%'],
                ['financials.burnRate','Monthly Burn','$15,000/mo'],
                ['financials.runway','Runway','18 months'],
                ['financials.breakEvenTarget','Break-even','Q3 2026'],
                ['financials.cac','CAC','$70 blended'],
                ['financials.ltv','LTV','$840'],
              ].map(([k,l,p]) => <Field key={k} label={l}><Input reg={register(k as any)} placeholder={p} /></Field>)}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">4-Year Projections</label>
              {projArr.fields.map((f,i) => (
                <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`financials.projections.${i}.year`)} placeholder={`Year ${i+1}`} />
                  <Input reg={register(`financials.projections.${i}.revenue`)} placeholder="$120K" />
                  <Input reg={register(`financials.projections.${i}.ebitda`)} placeholder="-$80K" />
                  <Input reg={register(`financials.projections.${i}.users`)} placeholder="500" />
                  <button type="button" onClick={() => projArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
              <button type="button" onClick={() => projArr.append({ year:`Year ${projArr.fields.length+1}`,revenue:'',ebitda:'',users:'' })} className="btn-ghost text-xs mt-1">
                <Plus className="w-3 h-3"/> Add year
              </button>
            </div>
          </SectionPanel>

          <div className="sticky bottom-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary shadow-2xl px-8 py-3 text-base">
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
