'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useForm, useFieldArray } from 'react-hook-form'
import { toast } from 'sonner'
import { Save, Plus, Trash2, ArrowLeft, ChevronDown, ChevronUp, Sparkles, Loader2, Crown } from 'lucide-react'
import yaml from 'js-yaml'
import Navbar from '@/components/layout/Navbar'
import { fetchBusiness, createBusiness, updateBusiness, generateVenturePlanAI, createCheckoutSession, fetchMyOrgs, type CreateBusinessTarget } from '@/lib/api'
import { EMPTY_BUSINESS, cn } from '@/lib/utils'
import type { BusinessPlan } from '@/types'

const SECTIONS = [
  { id: 'cover',           label: '01 · Cover & Snapshot',        emoji: '🏢' },
  { id: 'problemSolution', label: '02 · Problem, Solution & Market', emoji: '🎯' },
  { id: 'productGtm',      label: '03 · Product & Go-to-Market',   emoji: '🚀' },
  { id: 'teamRoadmap',     label: '04 · Team & Roadmap',           emoji: '👥' },
  { id: 'fundingAsk',      label: '05 · Funding Ask',              emoji: '💰' },
  { id: 'financials',      label: '📊 · Financial Snapshot',       emoji: '📊' },
]

// Simple labelled input
function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint  && <p className="text-xs text-muted/60 mt-1">{hint}</p>}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}

function Input({ reg, placeholder, type = 'text' }: { reg: any; placeholder?: string; type?: string }) {
  return <input {...reg} type={type} placeholder={placeholder} className="input-base" />
}

function Textarea({ reg, placeholder, rows = 3 }: { reg: any; placeholder?: string; rows?: number }) {
  return <textarea {...reg} placeholder={placeholder} rows={rows} className="input-base resize-none" />
}

function Select({ reg, children }: { reg: any; children: React.ReactNode }) {
  return (
    <select {...reg} className="input-base">
      {children}
    </select>
  )
}

function SectionPanel({ id, label, emoji, open, onToggle, children }: {
  id: string; label: string; emoji: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="section-card">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="font-display font-bold text-paper flex items-center gap-2 text-base">
          <span>{emoji}</span> {label}
        </h2>
        {open ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {open && <div className="mt-6 space-y-4 border-t border-rule pt-6">{children}</div>}
    </div>
  )
}

export default function BusinessEditorPage() {
  const params              = useParams()
  const router              = useRouter()
  const { data: session }   = useSession()
  const isNew               = !params.slug || params.slug === 'new'
  const [loading, setLoading]   = useState(!isNew)
  const [saving, setSaving]     = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ cover: true })
  const [aiPrompt, setAiPrompt]     = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [ownerOptions, setOwnerOptions] = useState<Array<{ key: string; label: string; target: CreateBusinessTarget }>>([])
  const [ownerKey, setOwnerKey] = useState<string>('')

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<any>({
    defaultValues: EMPTY_BUSINESS,
  })

  const featuresArr  = useFieldArray({ control, name: 'problemSolution.features' })
  const channelsArr  = useFieldArray({ control, name: 'productGtm.gtmChannels' })
  const competArr    = useFieldArray({ control, name: 'productGtm.competitors' })
  const foundersArr  = useFieldArray({ control, name: 'teamRoadmap.founders' })
  const kpisArr      = useFieldArray({ control, name: 'teamRoadmap.kpis' })
  const milesArr     = useFieldArray({ control, name: 'teamRoadmap.milestones' })
  const uofArr       = useFieldArray({ control, name: 'fundingAsk.useOfFunds' })
  const risksArr     = useFieldArray({ control, name: 'fundingAsk.risks' })
  const projArr      = useFieldArray({ control, name: 'financials.projections' })

  useEffect(() => {
    if (isNew) return
    fetchBusiness(params.slug as string).then(b => {
      if (b) reset(b)
      setLoading(false)
    })
  }, [params.slug, isNew, reset])

  // Redirect if not authenticated
  useEffect(() => {
    if (session === null) router.push('/api/auth/signin')
  }, [session, router])

  // Load possible target owners (personal account + each org the user belongs to)
  useEffect(() => {
    if (!isNew || !session?.user?.login) return
    const personal = {
      key: `user:${session.user.login}`,
      label: `Personal · @${session.user.login}`,
      target: { type: 'user' as const, login: session.user.login },
    }
    setOwnerOptions([personal])
    setOwnerKey(personal.key)
    fetchMyOrgs().then(orgs => {
      const orgOpts = orgs.map(o => ({
        key: `org:${o.login}`,
        label: `Org · ${o.login}`,
        target: { type: 'org' as const, login: o.login },
      }))
      setOwnerOptions([personal, ...orgOpts])
    }).catch(() => {})
  }, [isNew, session?.user?.login])

  const toggle = (id: string) => setOpenSections(p => ({ ...p, [id]: !p[id] }))

  const isPro = session?.user?.role === 'admin' ||
    (session?.user?.subscriptionTier === 'pro' &&
     (session?.user?.subscriptionStatus === 'active' || session?.user?.subscriptionStatus === 'trialing'))

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Describe your venture idea first')
      return
    }
    setAiGenerating(true)
    try {
      const yamlStr = await generateVenturePlanAI(aiPrompt)
      const parsed = yaml.load(yamlStr) as any
      if (parsed) {
        // Merge AI output with form, preserving meta fields
        const merged = { ...EMPTY_BUSINESS, ...parsed }
        reset(merged)
        // Open all sections so user can review
        setOpenSections(
          SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
        )
        toast.success('AI plan generated! Review and edit below, then save.')
      }
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      const url = await createCheckoutSession('monthly')
      window.location.href = url
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout')
    }
  }

  const onSubmit = async (data: any) => {
    if (!session) return
    setSaving(true)
    try {
      // Convert radio string to boolean
      data.isPublic = data.isPublic === 'true' || data.isPublic === true
      if (isNew) {
        const target = ownerOptions.find(o => o.key === ownerKey)?.target
        const { slug } = await createBusiness(
          { ...data, createdBy: session.user.id },
          target,
        )
        toast.success('Business plan created!')
        router.push(`/business/${slug}`)
      } else {
        const existing = await fetchBusiness(params.slug as string)
        if (existing) {
          await updateBusiness(existing.id, data, 'Updated business plan')
          toast.success('Changes saved!')
          router.push(`/business/${existing.slug}`)
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save. Check your connection.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading || session === undefined) return (
    <div className="min-h-screen bg-ink"><Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 shimmer rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="btn-ghost px-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-paper">
              {isNew ? 'New Business Plan' : 'Edit Business Plan'}
            </h1>
            <p className="text-muted text-sm">Fill in as much or as little as you know. You can always come back.</p>
          </div>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
            className="btn-primary ml-auto"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ── Repo owner picker ─────────────────────────────────────── */}
          {isNew && ownerOptions.length > 0 && (
            <div className="section-card">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-display font-bold text-paper text-base">Where to create the GitHub repo</h2>
              </div>
              {ownerOptions.length === 1 ? (
                <p className="text-muted text-sm">
                  Will be created under <span className="text-paper font-mono">{ownerOptions[0].label}</span>.
                </p>
              ) : (
                <>
                  <p className="text-muted text-sm mb-3">
                    Choose where to create the new repository. The repo and its <code className="font-mono">.venturewiki/plan.yaml</code> will live there.
                  </p>
                  <select
                    value={ownerKey}
                    onChange={e => setOwnerKey(e.target.value)}
                    className="input-base"
                  >
                    {ownerOptions.map(o => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}

          {/* ── AI Venture Generator (Pro feature) ────────────────────── */}
          {isNew && (
            <div className="section-card border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-display font-bold text-paper text-base">AI Venture Generator</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent px-2 py-0.5 rounded-full ml-1">Pro</span>
              </div>
              {isPro ? (
                <>
                  <p className="text-muted text-sm mb-3">
                    Describe your venture idea and Gemini Pro will generate a complete, investor-ready business plan.
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Describe your venture idea in detail — what problem it solves, who it's for, how it works, your background, target market, tech stack ideas, revenue model…&#10;&#10;The more detail you provide, the better the AI output."
                    rows={5}
                    className="input-base resize-none mb-3"
                    maxLength={10000}
                    disabled={aiGenerating}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      className="btn-primary"
                    >
                      {aiGenerating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating plan…</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate with AI</>
                      )}
                    </button>
                    <span className="text-xs text-muted">{aiPrompt.length}/10,000</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted text-sm mb-3">
                    Upgrade to <span className="text-accent font-semibold">VentureWiki Pro</span> to use AI-powered venture plan generation.
                  </p>
                  <button
                    type="button"
                    onClick={session ? handleUpgrade : () => router.push('/auth/signin')}
                    className="btn-primary"
                  >
                    <Crown className="w-4 h-4" />
                    {session ? 'Upgrade to Pro' : 'Sign in to upgrade'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 1: Cover ─────────────────────────────────────── */}
          <SectionPanel {...SECTIONS[0]} open={!!openSections.cover} onToggle={() => toggle('cover')}>
            <div className="grid grid-cols-2 gap-4">
              {/* Visibility toggle */}
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
              <div className="col-span-2">
                <Field label="Company Name *">
                  <Input reg={register('cover.companyName', { required: true })} placeholder="e.g. VentureWiki" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Tagline" hint="One sentence — what it is and who it's for">
                  <Input reg={register('cover.tagline')} placeholder="The collaborative wiki for digital business plans" />
                </Field>
              </div>
              <Field label="Logo Emoji" hint="Quick visual identifier">
                <Input reg={register('cover.logoEmoji')} placeholder="🚀" />
              </Field>
              <Field label="Accent Color" hint="Hex color for your card">
                <Input reg={register('cover.accentColor')} placeholder="#E8622A" type="color" />
              </Field>
              <Field label="Product Type">
                <Select reg={register('cover.productType')}>
                  <option value="web-app">Web App</option>
                  <option value="website">Website</option>
                  <option value="ai-agent">AI Agent</option>
                  <option value="api">API Product</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Stage">
                <Select reg={register('cover.stage')}>
                  <option value="idea">Idea</option>
                  <option value="mvp">MVP</option>
                  <option value="beta">Beta</option>
                  <option value="live">Live</option>
                  <option value="scaling">Scaling</option>
                  <option value="exited">Exited</option>
                </Select>
              </Field>
              <Field label="Industry Vertical">
                <Input reg={register('cover.industryVertical')} placeholder="FinTech, HealthTech, Productivity…" />
              </Field>
              <Field label="Headquarters">
                <Input reg={register('cover.headquarters')} placeholder="New York, NY" />
              </Field>
              <Field label="Legal Structure">
                <Input reg={register('cover.legalStructure')} placeholder="C-Corp / LLC" />
              </Field>
              <Field label="Funding Stage">
                <Select reg={register('cover.fundingStage')}>
                  <option value="bootstrapped">Bootstrapped</option>
                  <option value="pre-seed">Pre-Seed</option>
                  <option value="seed">Seed</option>
                  <option value="series-a">Series A</option>
                  <option value="series-b+">Series B+</option>
                </Select>
              </Field>
              <Field label="Funding Sought">
                <Input reg={register('cover.fundingSought')} placeholder="$500K" />
              </Field>
              <Field label="Website / Demo URL">
                <Input reg={register('cover.websiteUrl')} placeholder="https://venturewiki.io" />
              </Field>
              <div className="col-span-2">
                <Field label="Mission">
                  <Textarea reg={register('cover.mission')} placeholder="What you do today — for whom, and why it matters" rows={2} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Vision">
                  <Textarea reg={register('cover.vision')} placeholder="Where you're going in 5 years — the future you're building" rows={2} />
                </Field>
              </div>
              <Field label="Traction — Revenue / MRR">
                <Input reg={register('cover.tractionHighlights.revenue')} placeholder="$12K MRR" />
              </Field>
              <Field label="Traction — Users">
                <Input reg={register('cover.tractionHighlights.users')} placeholder="2,400 signups" />
              </Field>
              <Field label="Traction — Partnerships">
                <Input reg={register('cover.tractionHighlights.partnerships')} placeholder="LOI with Acme Corp" />
              </Field>
              <Field label="Traction — Press / Awards">
                <Input reg={register('cover.tractionHighlights.press')} placeholder="Featured in TechCrunch" />
              </Field>
            </div>
          </SectionPanel>

          {/* ── SECTION 2: Problem/Solution/Market ───────────────────── */}
          <SectionPanel {...SECTIONS[1]} open={!!openSections.problemSolution} onToggle={() => toggle('problemSolution')}>
            <Field label="Core Pain Point">
              <Textarea reg={register('problemSolution.corePainPoint')} placeholder="State the problem from the customer's perspective, not yours" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Who feels this pain?">
                <Input reg={register('problemSolution.painDimensions.who')} placeholder="Job title / persona" />
              </Field>
              <Field label="How often?">
                <Input reg={register('problemSolution.painDimensions.frequency')} placeholder="Daily / per transaction" />
              </Field>
              <Field label="Current workarounds">
                <Input reg={register('problemSolution.painDimensions.currentWorkarounds')} placeholder="What they use today and why it fails" />
              </Field>
              <Field label="Cost of the problem">
                <Input reg={register('problemSolution.painDimensions.costOfProblem')} placeholder="Lost revenue / wasted hours" />
              </Field>
            </div>

            <Field label="Solution — One Liner">
              <Textarea reg={register('problemSolution.solutionOneLiner')} placeholder="[Category] that [benefit] for [target user] by [mechanism]" rows={2} />
            </Field>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Features</label>
                <button type="button" onClick={() => featuresArr.append({ feature: '', benefit: '', techLayer: '' })} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {featuresArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`problemSolution.features.${i}.feature`)} placeholder="Feature" />
                  <Input reg={register(`problemSolution.features.${i}.benefit`)} placeholder="Benefit" />
                  <Input reg={register(`problemSolution.features.${i}.techLayer`)} placeholder="Tech layer" />
                  <button type="button" onClick={() => featuresArr.remove(i)} className="btn-ghost px-2 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
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
                  <Input reg={register(`problemSolution.market.${m}Size`)} placeholder="$5B" />
                  <Input reg={register(`problemSolution.market.${m}Source`)} placeholder="Source, year" />
                </div>
              ))}
            </div>
            <Field label="Why Now?">
              <Textarea reg={register('problemSolution.whyNow')} placeholder="The technology shift or behavior trend making this the right moment" rows={2} />
            </Field>
          </SectionPanel>

          {/* ── SECTION 3: Product & GTM ──────────────────────────────── */}
          <SectionPanel {...SECTIONS[2]} open={!!openSections.productGtm} onToggle={() => toggle('productGtm')}>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['productType', 'Product Type', 'Web App / Chrome Ext / API…'],
                ['frontend',    'Frontend',     'React / Next.js / Vue…'],
                ['backend',     'Backend',      'Node / Python / serverless…'],
                ['aiLayer',     'AI / ML Layer','OpenAI / Anthropic / RAG…'],
                ['dataStorage', 'Data Storage', 'PostgreSQL / Pinecone…'],
                ['authPayments','Auth & Payments','Clerk / Auth0 + Stripe…'],
                ['hosting',     'Hosting',      'Vercel / AWS / GCP…'],
                ['buildStage',  'Build Stage',  'Idea / MVP / Beta / Live…'],
                ['ipLayer',     'IP Layer',     'Proprietary model / patent…'],
              ].map(([key, label, ph]) => (
                <Field key={key} label={label}>
                  <Input reg={register(`productGtm.techStack.${key}`)} placeholder={ph} />
                </Field>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">GTM Channels</label>
                <button type="button" onClick={() => channelsArr.append({ channel: '', tactic: '', goal90Day: '', owner: '', budgetPerMonth: '' })} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {channelsArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`productGtm.gtmChannels.${i}.channel`)} placeholder="Channel" />
                  <Input reg={register(`productGtm.gtmChannels.${i}.tactic`)} placeholder="Tactic" />
                  <Input reg={register(`productGtm.gtmChannels.${i}.goal90Day`)} placeholder="90-day goal" />
                  <button type="button" onClick={() => channelsArr.remove(i)} className="btn-ghost px-2 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Competition</label>
                <button type="button" onClick={() => competArr.append({ dimension: '', yourProduct: '', competitorA: '', competitorB: '', competitorC: '' })} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add row
                </button>
              </div>
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-1 mb-1 text-xs text-muted px-1">
                <span>Dimension</span><span>You</span><span>A</span><span>B</span><span>C</span><span />
              </div>
              {competArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-1 mb-1.5">
                  <Input reg={register(`productGtm.competitors.${i}.dimension`)} placeholder="Dimension" />
                  <Input reg={register(`productGtm.competitors.${i}.yourProduct`)} placeholder="You" />
                  <Input reg={register(`productGtm.competitors.${i}.competitorA`)} placeholder="A" />
                  <Input reg={register(`productGtm.competitors.${i}.competitorB`)} placeholder="B" />
                  <Input reg={register(`productGtm.competitors.${i}.competitorC`)} placeholder="C" />
                  <button type="button" onClick={() => competArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </SectionPanel>

          {/* ── SECTION 4: Team & Roadmap ─────────────────────────────── */}
          <SectionPanel {...SECTIONS[3]} open={!!openSections.teamRoadmap} onToggle={() => toggle('teamRoadmap')}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Founders</label>
                <button type="button" onClick={() => foundersArr.append({ name: '', role: '', background: '', commitment: 'Full-time', equity: '' })} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {foundersArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`teamRoadmap.founders.${i}.name`)} placeholder="Name" />
                  <Input reg={register(`teamRoadmap.founders.${i}.role`)} placeholder="Role" />
                  <Input reg={register(`teamRoadmap.founders.${i}.background`)} placeholder="Background" />
                  <Input reg={register(`teamRoadmap.founders.${i}.commitment`)} placeholder="Commitment" />
                  <Input reg={register(`teamRoadmap.founders.${i}.equity`)} placeholder="Equity %" />
                  <button type="button" onClick={() => foundersArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">KPIs</label>
                <button type="button" onClick={() => kpisArr.append({ metric: '', current: '', target3mo: '', target12mo: '', notes: '' })} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {kpisArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`teamRoadmap.kpis.${i}.metric`)} placeholder="Metric" />
                  <Input reg={register(`teamRoadmap.kpis.${i}.current`)} placeholder="Current" />
                  <Input reg={register(`teamRoadmap.kpis.${i}.target3mo`)} placeholder="3-month" />
                  <Input reg={register(`teamRoadmap.kpis.${i}.target12mo`)} placeholder="12-month" />
                  <button type="button" onClick={() => kpisArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Milestones</label>
                <button type="button" onClick={() => milesArr.append({ milestone: '', owner: '', targetDate: '', budget: '', successCriteria: '', status: 'not-started' })} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {milesArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`teamRoadmap.milestones.${i}.milestone`)} placeholder="Milestone" />
                  <Input reg={register(`teamRoadmap.milestones.${i}.targetDate`)} placeholder="Q1 2025" />
                  <Input reg={register(`teamRoadmap.milestones.${i}.successCriteria`)} placeholder="Success criteria" />
                  <Select reg={register(`teamRoadmap.milestones.${i}.status`)}>
                    <option value="not-started">Not started</option>
                    <option value="in-progress">In progress</option>
                    <option value="done">Done</option>
                    <option value="delayed">Delayed</option>
                  </Select>
                  <button type="button" onClick={() => milesArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </SectionPanel>

          {/* ── SECTION 5: Funding Ask ────────────────────────────────── */}
          <SectionPanel {...SECTIONS[4]} open={!!openSections.fundingAsk} onToggle={() => toggle('fundingAsk')}>
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
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Use of Funds</label>
                <button type="button" onClick={() => uofArr.append({ category: '', amount: '', percentage: '', timeline: '', milestoneUnlocked: '' })} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {uofArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`fundingAsk.useOfFunds.${i}.category`)} placeholder="Category" />
                  <Input reg={register(`fundingAsk.useOfFunds.${i}.amount`)} placeholder="Amount" />
                  <Input reg={register(`fundingAsk.useOfFunds.${i}.percentage`)} placeholder="%" />
                  <Input reg={register(`fundingAsk.useOfFunds.${i}.milestoneUnlocked`)} placeholder="Milestone" />
                  <button type="button" onClick={() => uofArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>

            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-3">Elevator Pitch</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['fundingAsk.elevatorPitch.hook',          'Hook (problem/stat)',           'Start with a number…'],
                ['fundingAsk.elevatorPitch.companyIntro',  'Company Intro',                 'We built X — it does Y'],
                ['fundingAsk.elevatorPitch.tractionProof', 'Traction Proof',                'Biggest stat'],
                ['fundingAsk.elevatorPitch.marketSize',    'Market Size',                   '$XB market…'],
                ['fundingAsk.elevatorPitch.askAndUse',     'Ask + Use',                     "We're raising $X to…"],
                ['fundingAsk.elevatorPitch.cta',           'CTA',                           'What you want them to do'],
              ].map(([key, label, ph]) => (
                <Field key={key} label={label}>
                  <Input reg={register(key as any)} placeholder={ph} />
                </Field>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Risk Register</label>
                <button type="button" onClick={() => risksArr.append({ risk: '', likelihood: 'medium', impact: 'medium', mitigation: '' })} className="btn-ghost text-xs py-1 px-2">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {risksArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-2 mb-2">
                  <Input reg={register(`fundingAsk.risks.${i}.risk`)} placeholder="Risk" />
                  <Select reg={register(`fundingAsk.risks.${i}.likelihood`)}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </Select>
                  <Select reg={register(`fundingAsk.risks.${i}.impact`)}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </Select>
                  <Input reg={register(`fundingAsk.risks.${i}.mitigation`)} placeholder="Mitigation" />
                  <button type="button" onClick={() => risksArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </SectionPanel>

          {/* ── SECTION 6: Financials ─────────────────────────────────── */}
          <SectionPanel {...SECTIONS[5]} open={!!openSections.financials} onToggle={() => toggle('financials')}>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['financials.revenueModel',     'Revenue Model',    'SaaS / Usage-based…'],
                ['financials.grossMargin',       'Gross Margin',     '70%'],
                ['financials.burnRate',          'Monthly Burn',     '$15,000/mo'],
                ['financials.runway',            'Runway',           '18 months'],
                ['financials.breakEvenTarget',   'Break-even',       'Q3 2026 at 500 users'],
                ['financials.cac',               'CAC',              '$70 blended'],
                ['financials.ltv',               'LTV',              '$840'],
              ].map(([key, label, ph]) => (
                <Field key={key} label={label}>
                  <Input reg={register(key as any)} placeholder={ph} />
                </Field>
              ))}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">4-Year Projections</label>
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-1 mb-1 text-xs text-muted px-1">
                <span>Year</span><span>Revenue</span><span>EBITDA</span><span>Users</span><span />
              </div>
              {projArr.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                  <Input reg={register(`financials.projections.${i}.year`)} placeholder={`Year ${i+1}`} />
                  <Input reg={register(`financials.projections.${i}.revenue`)} placeholder="$120K" />
                  <Input reg={register(`financials.projections.${i}.ebitda`)} placeholder="-$80K" />
                  <Input reg={register(`financials.projections.${i}.users`)} placeholder="500" />
                  <button type="button" onClick={() => projArr.remove(i)} className="btn-ghost px-1 text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => projArr.append({ year: `Year ${projArr.fields.length + 1}`, revenue: '', ebitda: '', users: '' })} className="btn-ghost text-xs mt-1">
                <Plus className="w-3 h-3" /> Add year
              </button>
            </div>
          </SectionPanel>

          {/* Save footer */}
          <div className="sticky bottom-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary shadow-2xl px-8 py-3 text-base">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : isNew ? 'Create Business Plan' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
