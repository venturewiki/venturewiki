'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Eye, GitBranch, Clock, Edit3, Star, Archive, ArrowLeft,
  Globe, Cpu, DollarSign, Users, Target, Map, MessageSquare,
  ChevronRight, AlertTriangle, TrendingUp, Zap, UserPlus,
  ShieldCheck, HandCoins, BarChart3
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { fetchBusiness, incrementViewCount, toggleFeatured, fetchEditHistory, fetchComments, postComment, fetchCandidates, fetchValidations, fetchInvestments, fetchVentureValue } from '@/lib/api'
import { cn, STAGE_LABELS, STAGE_COLORS, TYPE_ICONS, TYPE_LABELS, formatRelativeTime, formatNumber } from '@/lib/utils'
import type { BusinessPlan, EditRecord, Comment, RoleCandidate, Validation, InvestmentInterest, VentureValue } from '@/types'

export default function BusinessPage() {
  const { slug }            = useParams<{ slug: string }>()
  const { data: session }   = useSession()
  const router              = useRouter()
  const [business, setBusiness]     = useState<BusinessPlan | null>(null)
  const [edits, setEdits]           = useState<EditRecord[]>([])
  const [comments, setComments]     = useState<Comment[]>([])
  const [candidates, setCandidates] = useState<RoleCandidate[]>([])
  const [validations, setValidations] = useState<Validation[]>([])
  const [investments, setInvestments] = useState<InvestmentInterest[]>([])
  const [ventureValue, setVentureValue] = useState<VentureValue | null>(null)
  const [newComment, setNewComment] = useState('')
  const [activeTab, setActiveTab]   = useState('overview')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!slug) return
    fetchBusiness(slug as string).then(b => {
      setBusiness(b)
      setLoading(false)
      if (b) {
        incrementViewCount(b.id)
        fetchEditHistory(b.id).then(setEdits)
        fetchComments(b.id).then(setComments)
        fetchCandidates(b.id).then(setCandidates)
        fetchValidations(b.id).then(setValidations)
        fetchInvestments(b.id).then(setInvestments)
        fetchVentureValue(b.id).then(setVentureValue).catch(() => {})
      }
    })
  }, [slug])

  const handleComment = async () => {
    if (!newComment.trim() || !session || !business) return
    await postComment(business.id, newComment.trim())
    setComments(await fetchComments(business.id))
    setNewComment('')
  }

  if (loading) return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-4">
            {[80, 400, 300, 250].map((h, i) => (
              <div key={i} className={`h-${h > 100 ? '48' : '10'} shimmer rounded-xl`} />
            ))}
          </div>
          <div className="h-96 shimmer rounded-xl" />
        </div>
      </div>
    </div>
  )

  if (!business) return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <Navbar />
      <div className="text-center">
        <div className="text-6xl mb-4">🔭</div>
        <h1 className="font-display text-2xl font-bold text-paper mb-2">Venture not found</h1>
        <Link href="/" className="btn-primary mt-4">← Back to directory</Link>
      </div>
    </div>
  )

  const { cover, problemSolution: ps, productGtm: gtm, teamRoadmap: tr, fundingAsk: fa, financials } = business
  const isAdmin  = session?.user.role === 'admin'
  const canEdit  = session && (session.user.role === 'editor' || isAdmin)

  const TABS = [
    { id: 'overview',    label: 'Overview',        icon: Globe },
    { id: 'product',     label: 'Product & GTM',   icon: Cpu },
    { id: 'team',        label: 'Team & Roadmap',  icon: Users },
    { id: 'candidates',  label: `Candidates (${candidates.length})`, icon: UserPlus },
    { id: 'validations', label: `Validations (${validations.length})`, icon: ShieldCheck },
    { id: 'financial',   label: 'Financials',       icon: DollarSign },
    { id: 'invest',      label: `Invest (${investments.length})`, icon: HandCoins },
    { id: 'history',     label: `History (${edits.length})`, icon: GitBranch },
    { id: 'discuss',     label: `Discussion (${comments.length})`, icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />

      {/* Accent bar */}
      <div className="h-0.5 w-full" style={{ background: cover.accentColor || '#E8622A' }} />

      {/* Breadcrumb */}
      <div className="border-b border-rule">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-1.5 text-xs text-muted">
          <Link href="/" className="hover:text-paper transition-colors">VentureWiki</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-paper/60">{cover.productType}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-paper">{cover.companyName}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ── Main column ────────────────────────────────────────────── */}
          <main className="min-w-0">

            {/* Title row */}
            <div className="flex items-start gap-4 mb-5">
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
                  {business.isFeatured && <Star className="w-5 h-5 text-gold fill-gold shrink-0" />}
                </div>
                {cover.tagline && (
                  <p className="text-paper/60 text-base leading-relaxed">{cover.tagline}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={cn('badge', STAGE_COLORS[cover.stage])}>
                    {STAGE_LABELS[cover.stage]}
                  </span>
                  <span className="badge bg-slate/30 text-paper/60">
                    {TYPE_ICONS[cover.productType]} {TYPE_LABELS[cover.productType]}
                  </span>
                  {cover.industryVertical && (
                    <span className="badge bg-lead border border-rule text-muted">
                      {cover.industryVertical}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <Link
                    href={`/business/${slug}/edit`}
                    className="btn-outline"
                  >
                    <Edit3 className="w-4 h-4" /> Edit
                  </Link>
                )}
                {isAdmin && (
                  <button
                    onClick={() => toggleFeatured(business.id, !business.isFeatured)}
                    className={cn('btn-ghost', business.isFeatured && 'text-gold')}
                    title="Toggle featured"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-6 text-xs text-muted pb-4 border-b border-rule">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatNumber(business.viewCount)} views</span>
              <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" />{formatNumber(business.editCount)} edits</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Updated {formatRelativeTime(business.updatedAt)}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{business.contributors?.length || 1} contributor{(business.contributors?.length || 1) > 1 ? 's' : ''}</span>
            </div>

            {/* Tab nav */}
            <div className="flex gap-0.5 mb-6 bg-lead border border-rule rounded-lg p-1 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all',
                    activeTab === tab.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-muted hover:text-paper'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Overview ─────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* Mission / Vision */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Mission', value: cover.mission, color: 'border-accent' },
                    { label: 'Vision',  value: cover.vision,  color: 'border-teal' },
                  ].map(item => (
                    <div key={item.label} className={cn('section-card border-l-2 pl-5', item.color)}>
                      <p className="text-xs uppercase tracking-widest text-muted mb-2 font-mono">{item.label}</p>
                      <p className="text-paper/80 text-sm leading-relaxed">{item.value || <span className="text-muted italic">Not specified</span>}</p>
                    </div>
                  ))}
                </div>

                {/* Problem */}
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent" /> The Problem
                  </h2>
                  <div className="accent-bar mb-4">
                    <p className="text-paper/80 text-sm leading-relaxed font-medium">
                      {ps?.corePainPoint || <span className="text-muted italic">Not specified</span>}
                    </p>
                  </div>
                  {ps?.painDimensions && (
                    <table className="wiki-table">
                      <tbody>
                        {Object.entries({
                          'Who feels this': ps.painDimensions.who,
                          'Frequency':      ps.painDimensions.frequency,
                          'Workarounds':    ps.painDimensions.currentWorkarounds,
                          'Cost of pain':   ps.painDimensions.costOfProblem,
                          'Urgency':        ps.painDimensions.urgencyLevel,
                        }).filter(([,v]) => v).map(([k, v]) => (
                          <tr key={k}><td className="w-36 text-muted font-medium">{k}</td><td>{v}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Solution */}
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal" /> The Solution
                  </h2>
                  {ps?.solutionOneLiner && (
                    <p className="text-paper/80 text-base leading-relaxed mb-4 font-medium">
                      {ps.solutionOneLiner}
                    </p>
                  )}
                  {ps?.features?.filter(f => f.feature).length > 0 && (
                    <table className="wiki-table">
                      <thead><tr>
                        <th>Feature</th><th>Benefit</th><th>Tech Layer</th>
                      </tr></thead>
                      <tbody>
                        {ps.features.filter(f => f.feature).map((f, i) => (
                          <tr key={i}>
                            <td className="font-medium text-paper/90">{f.feature}</td>
                            <td>{f.benefit}</td>
                            <td><code className="text-xs bg-rule/50 px-1.5 py-0.5 rounded font-mono text-teal">{f.techLayer}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {ps?.unfairAdvantage && (
                    <div className="mt-4 p-3 bg-teal/5 border border-teal/20 rounded-lg">
                      <p className="text-xs text-teal font-medium uppercase tracking-wider mb-1">Unfair Advantage</p>
                      <p className="text-paper/80 text-sm">{ps.unfairAdvantage}</p>
                    </div>
                  )}
                </div>

                {/* Market */}
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gold" /> Market Opportunity
                  </h2>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'TAM', value: ps?.market?.tamSize, color: 'text-gold' },
                      { label: 'SAM', value: ps?.market?.samSize, color: 'text-accent' },
                      { label: 'SOM', value: ps?.market?.somSize, color: 'text-teal' },
                    ].map(m => (
                      <div key={m.label} className="bg-rule/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted mb-1">{m.label}</p>
                        <p className={cn('font-display font-bold text-lg', m.color)}>
                          {m.value || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                  {ps?.whyNow && (
                    <div className="p-3 bg-gold/5 border border-gold/20 rounded-lg">
                      <p className="text-xs text-gold font-medium uppercase tracking-wider mb-1">Why Now</p>
                      <p className="text-paper/80 text-sm">{ps.whyNow}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: Product & GTM ────────────────────────────────── */}
            {activeTab === 'product' && (
              <div className="space-y-6 animate-fade-in">
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent" /> Tech Stack
                  </h2>
                  {gtm?.techStack && (
                    <table className="wiki-table">
                      <tbody>
                        {Object.entries({
                          'Product Type': gtm.techStack.productType,
                          'Frontend':     gtm.techStack.frontend,
                          'Backend':      gtm.techStack.backend,
                          'AI / ML Layer':gtm.techStack.aiLayer,
                          'Data Storage': gtm.techStack.dataStorage,
                          'Auth & Payments': gtm.techStack.authPayments,
                          'Hosting':      gtm.techStack.hosting,
                          'Build Stage':  gtm.techStack.buildStage,
                          'IP / Proprietary': gtm.techStack.ipLayer,
                        }).filter(([,v]) => v).map(([k, v]) => (
                          <tr key={k}>
                            <td className="w-40 text-muted font-medium">{k}</td>
                            <td><code className="text-xs bg-rule/50 px-1.5 py-0.5 rounded font-mono text-paper/80">{v}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-accent" /> Go-to-Market
                  </h2>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'ICP',           value: gtm?.icp },
                      { label: 'Pricing Model', value: gtm?.pricingModel },
                      { label: 'Price Point',   value: gtm?.pricePoint },
                      { label: 'Sales Motion',  value: gtm?.salesMotion },
                    ].filter(i => i.value).map(item => (
                      <div key={item.label} className="bg-rule/20 rounded-lg p-3">
                        <p className="text-xs text-muted mb-1">{item.label}</p>
                        <p className="text-paper/80 text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {gtm?.gtmChannels?.filter(c => c.channel).length > 0 && (
                    <table className="wiki-table">
                      <thead><tr><th>Channel</th><th>Tactic</th><th>90-Day Goal</th></tr></thead>
                      <tbody>
                        {gtm.gtmChannels.filter(c => c.channel).map((c, i) => (
                          <tr key={i}>
                            <td className="font-medium text-paper/90">{c.channel}</td>
                            <td className="text-paper/70">{c.tactic}</td>
                            <td className="text-teal font-medium">{c.goal90Day}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Competition */}
                {gtm?.competitors?.filter(c => c.yourProduct).length > 0 && (
                  <div className="section-card overflow-x-auto">
                    <h2 className="font-display font-bold text-paper mb-4">Competitive Landscape</h2>
                    <table className="wiki-table">
                      <thead><tr>
                        <th>Dimension</th>
                        <th className="text-accent">{cover.companyName}</th>
                        <th>Competitor A</th>
                        <th>Competitor B</th>
                        <th>Competitor C</th>
                      </tr></thead>
                      <tbody>
                        {gtm.competitors.map((c, i) => (
                          <tr key={i}>
                            <td className="font-medium text-muted">{c.dimension}</td>
                            <td className="text-accent font-medium">{c.yourProduct}</td>
                            <td>{c.competitorA}</td>
                            <td>{c.competitorB}</td>
                            <td>{c.competitorC}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Team & Roadmap ───────────────────────────────── */}
            {activeTab === 'team' && (
              <div className="space-y-6 animate-fade-in">
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent" /> Founding Team
                  </h2>
                  {tr?.founders?.filter(f => f.name).length > 0 ? (
                    <div className="space-y-3">
                      {tr.founders.filter(f => f.name).map((f, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-rule/20 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold shrink-0">
                            {f.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-paper">{f.name}</p>
                            <p className="text-accent text-sm">{f.role}</p>
                            <p className="text-muted text-xs mt-1 line-clamp-2">{f.background}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted">{f.commitment}</p>
                            {f.equity && <p className="text-xs text-gold font-mono">{f.equity}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted italic text-sm">No team members added yet</p>}
                </div>

                {/* KPIs */}
                {tr?.kpis?.filter(k => k.metric).length > 0 && (
                  <div className="section-card">
                    <h2 className="font-display font-bold text-paper mb-4">KPI Dashboard</h2>
                    <table className="wiki-table">
                      <thead><tr><th>Metric</th><th>Current</th><th>3-Month</th><th>12-Month</th></tr></thead>
                      <tbody>
                        {tr.kpis.filter(k => k.metric).map((k, i) => (
                          <tr key={i}>
                            <td className="font-medium text-paper/90">{k.metric}</td>
                            <td className="font-mono text-sm">{k.current || '—'}</td>
                            <td className="text-teal font-mono text-sm">{k.target3mo || '—'}</td>
                            <td className="text-gold font-mono text-sm">{k.target12mo || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Roadmap */}
                {tr?.milestones?.filter(m => m.milestone).length > 0 && (
                  <div className="section-card">
                    <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                      <Map className="w-4 h-4 text-accent" /> 12-Month Roadmap
                    </h2>
                    <div className="space-y-2">
                      {tr.milestones.filter(m => m.milestone).map((m, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-rule/20">
                          <div className={cn('w-2 h-2 rounded-full shrink-0', {
                            'bg-muted':    m.status === 'not-started',
                            'bg-accent':   m.status === 'in-progress',
                            'bg-emerald':  m.status === 'done',
                            'bg-danger':   m.status === 'delayed',
                          })} />
                          <div className="flex-1 min-w-0">
                            <p className="text-paper/90 text-sm font-medium">{m.milestone}</p>
                            {m.successCriteria && <p className="text-muted text-xs mt-0.5">{m.successCriteria}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted">{m.targetDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Financials ───────────────────────────────────── */}
            {activeTab === 'financial' && (
              <div className="space-y-6 animate-fade-in">
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gold" /> Financial Snapshot
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'Revenue Model', value: financials?.revenueModel },
                      { label: 'Gross Margin',  value: financials?.grossMargin },
                      { label: 'Burn Rate',     value: financials?.burnRate },
                      { label: 'Runway',        value: financials?.runway },
                      { label: 'Break-even',    value: financials?.breakEvenTarget },
                      { label: 'CAC',           value: financials?.cac },
                      { label: 'LTV',           value: financials?.ltv },
                    ].filter(i => i.value).map(item => (
                      <div key={item.label} className="bg-rule/20 rounded-lg p-3">
                        <p className="text-xs text-muted mb-1">{item.label}</p>
                        <p className="text-paper font-mono text-sm font-medium">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {financials?.projections?.filter(p => p.revenue).length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">4-Year Projections</h3>
                      <table className="wiki-table">
                        <thead><tr><th></th><th>Revenue</th><th>EBITDA</th><th>Users</th></tr></thead>
                        <tbody>
                          {financials.projections.filter(p => p.revenue).map((p, i) => (
                            <tr key={i}>
                              <td className="font-medium text-muted">{p.year}</td>
                              <td className="font-mono text-gold">{p.revenue}</td>
                              <td className={cn('font-mono', p.ebitda?.startsWith('-') ? 'text-danger' : 'text-emerald-400')}>{p.ebitda}</td>
                              <td className="font-mono text-teal">{p.users}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>

                {/* Funding ask */}
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4">Funding Ask</h2>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Total Raise',   value: fa?.totalRaise },
                      { label: 'Instrument',    value: fa?.instrument },
                      { label: 'Cap / Terms',   value: fa?.valuationCapTerms },
                      { label: 'Target Close',  value: fa?.targetCloseDate },
                    ].filter(i => i.value).map(item => (
                      <div key={item.label} className="bg-rule/20 rounded-lg p-3">
                        <p className="text-xs text-muted mb-1">{item.label}</p>
                        <p className="text-paper text-sm font-medium">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {fa?.useOfFunds?.filter(u => u.category).length > 0 && (
                    <table className="wiki-table">
                      <thead><tr><th>Category</th><th>Amount</th><th>%</th><th>Milestone</th></tr></thead>
                      <tbody>
                        {fa.useOfFunds.filter(u => u.category).map((u, i) => (
                          <tr key={i}>
                            <td className="font-medium text-paper/90">{u.category}</td>
                            <td className="font-mono text-gold">{u.amount}</td>
                            <td className="font-mono text-sm">{u.percentage}</td>
                            <td className="text-muted text-xs">{u.milestoneUnlocked}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Risk register */}
                {fa?.risks?.filter(r => r.risk).length > 0 && (
                  <div className="section-card">
                    <h2 className="font-display font-bold text-paper mb-4">Risk Register</h2>
                    <table className="wiki-table">
                      <thead><tr><th>Risk</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th></tr></thead>
                      <tbody>
                        {fa.risks.filter(r => r.risk).map((r, i) => {
                          const colors = { high: 'text-danger', medium: 'text-gold', low: 'text-emerald-400' }
                          return (
                            <tr key={i}>
                              <td className="font-medium text-paper/90">{r.risk}</td>
                              <td className={cn('font-medium text-xs', colors[r.likelihood])}>{r.likelihood?.toUpperCase()}</td>
                              <td className={cn('font-medium text-xs', colors[r.impact])}>{r.impact?.toUpperCase()}</td>
                              <td className="text-muted text-xs">{r.mitigation}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Candidates ────────────────────────────────── */}
            {activeTab === 'candidates' && (
              <div className="space-y-4 animate-fade-in">
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-accent" /> Role Candidates
                  </h2>
                  <p className="text-muted text-sm mb-4">
                    People who have applied for open roles in this venture. Endorse candidates you think are a great fit.
                  </p>
                  {tr?.openRoles && (
                    <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg mb-4">
                      <p className="text-xs text-accent font-medium uppercase tracking-wider mb-1">Open Roles</p>
                      <p className="text-paper/80 text-sm">{tr.openRoles}</p>
                    </div>
                  )}
                  {candidates.length === 0 ? (
                    <p className="text-muted italic text-sm text-center py-8">No candidates yet — be the first to apply!</p>
                  ) : (
                    <div className="space-y-3">
                      {candidates.map(c => (
                        <div key={c.id} className="flex items-start gap-3 p-3 bg-rule/20 rounded-lg">
                          {c.userImage ? (
                            <Image src={c.userImage} alt={c.userName} width={32} height={32} className="w-8 h-8 rounded-full shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                              {c.userName[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-paper">{c.userName}</span>
                              <span className="badge bg-accent/20 text-accent text-xs">{c.role}</span>
                              <span className={cn('badge text-xs', {
                                'bg-amber-900/60 text-amber-300': c.status === 'pending',
                                'bg-emerald-900/60 text-emerald-300': c.status === 'accepted',
                                'bg-red-900/60 text-red-300': c.status === 'rejected',
                                'bg-slate-700 text-slate-300': c.status === 'withdrawn',
                              })}>{c.status}</span>
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
            )}

            {/* ── Tab: Validations ──────────────────────────────────── */}
            {activeTab === 'validations' && (
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
                      <div className="bg-rule/20 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted mb-1">Validation Score</p>
                        <p className={cn('font-display font-bold text-lg', ventureValue.validationScore >= 0 ? 'text-emerald-400' : 'text-danger')}>
                          {ventureValue.validationScore >= 0 ? '+' : ''}{ventureValue.validationScore}
                        </p>
                      </div>
                      <div className="bg-rule/20 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted mb-1">Collaborations</p>
                        <p className="font-display font-bold text-lg text-accent">{ventureValue.collaborationCount}</p>
                      </div>
                      <div className="bg-rule/20 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted mb-1">Venture Score</p>
                        <p className="font-display font-bold text-lg text-gold">{ventureValue.overallScore}</p>
                      </div>
                      <div className="bg-rule/20 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted mb-1">Investors</p>
                        <p className="font-display font-bold text-lg text-teal">{ventureValue.investmentInterest}</p>
                      </div>
                    </div>
                  )}
                  {validations.length === 0 ? (
                    <p className="text-muted italic text-sm text-center py-8">No validations yet — help validate this business plan!</p>
                  ) : (
                    <div className="space-y-2">
                      {validations.map(v => (
                        <div key={v.id} className="flex items-start gap-3 p-3 bg-rule/20 rounded-lg">
                          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs', v.status === 'validated' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300')}>
                            {v.status === 'validated' ? '✓' : '✗'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-paper">{v.userName}</span>
                              <span className="badge bg-lead border border-rule text-muted text-xs">{v.section}{v.field ? ` → ${v.field}` : ''}</span>
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
            )}

            {/* ── Tab: Investment ───────────────────────────────────── */}
            {activeTab === 'invest' && (
              <div className="space-y-4 animate-fade-in">
                <div className="section-card">
                  <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
                    <HandCoins className="w-4 h-4 text-gold" /> Investment Interest
                  </h2>
                  <p className="text-muted text-sm mb-4">
                    Public ventures are open for investment pitches. Anyone can express interest or pitch to investors.
                  </p>
                  {investments.length === 0 ? (
                    <p className="text-muted italic text-sm text-center py-8">No investment interest yet — be the first investor!</p>
                  ) : (
                    <div className="space-y-3">
                      {investments.map(inv => (
                        <div key={inv.id} className="flex items-start gap-3 p-3 bg-rule/20 rounded-lg">
                          {inv.investorImage ? (
                            <Image src={inv.investorImage} alt={inv.investorName} width={32} height={32} className="w-8 h-8 rounded-full shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold shrink-0">
                              {inv.investorName[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-paper">{inv.investorName}</span>
                              {inv.amount && <span className="badge bg-gold/20 text-gold text-xs">{inv.amount}</span>}
                              <span className={cn('badge text-xs', {
                                'bg-amber-900/60 text-amber-300': inv.status === 'expressed',
                                'bg-blue-900/60 text-blue-300': inv.status === 'in-discussion',
                                'bg-emerald-900/60 text-emerald-300': inv.status === 'committed',
                                'bg-slate-700 text-slate-300': inv.status === 'withdrawn',
                              })}>{inv.status}</span>
                            </div>
                            {inv.message && <p className="text-paper/70 text-sm">{inv.message}</p>}
                            {inv.terms && <p className="text-muted text-xs mt-1">Terms: {inv.terms}</p>}
                            <p className="text-muted text-xs mt-1">{formatRelativeTime(inv.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Tab: History ──────────────────────────────────────── */}
            {activeTab === 'history' && (
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
            )}

            {/* ── Tab: Discussion ───────────────────────────────────── */}
            {activeTab === 'discuss' && (
              <div className="space-y-4 animate-fade-in">
                {session ? (
                  <div className="section-card">
                    <textarea
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Leave a comment or feedback…"
                      rows={3}
                      className="input-base resize-none mb-3"
                    />
                    <button onClick={handleComment} className="btn-primary" disabled={!newComment.trim()}>
                      Post Comment
                    </button>
                  </div>
                ) : (
                  <div className="section-card text-center py-8">
                    <p className="text-muted mb-3">Sign in to join the discussion</p>
                    <Link href="/api/auth/signin" className="btn-primary">Sign in</Link>
                  </div>
                )}
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="section-card flex gap-3">
                      {c.userImage ? (
                        <Image src={c.userImage} alt={c.userName} width={32} height={32} className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                          {c.userName[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-paper">{c.userName}</span>
                          <span className="text-xs text-muted">{formatRelativeTime(c.createdAt)}</span>
                        </div>
                        <p className="text-paper/70 text-sm leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-muted italic text-sm text-center py-8">No comments yet — start the discussion!</p>}
                </div>
              </div>
            )}
          </main>

          {/* ── Sidebar infobox ──────────────────────────────────────── */}
          <aside className="lg:block">
            <div className="sticky top-20 space-y-4">
              <div className="infobox">
                <div className="infobox-header">{cover.companyName}</div>
                {[
                  ['Founded', cover.version?.replace('v','') ? cover.version : null],
                  ['HQ', cover.headquarters],
                  ['Legal', cover.legalStructure],
                  ['Stage', STAGE_LABELS[cover.stage]],
                  ['Type', TYPE_LABELS[cover.productType]],
                  ['Industry', cover.industryVertical],
                  ['Funding', cover.fundingStage],
                  ['Website', cover.websiteUrl],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="infobox-row">
                    <span className="infobox-label">{k}</span>
                    <span className="infobox-value text-xs">
                      {k === 'Website' ? (
                        <a href={v as string} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate block">{v}</a>
                      ) : v}
                    </span>
                  </div>
                ))}
              </div>

              {/* Traction highlights */}
              {Object.values(cover.tractionHighlights || {}).some(Boolean) && (
                <div className="infobox">
                  <div className="infobox-header">Traction</div>
                  {Object.entries({
                    'Revenue':      cover.tractionHighlights?.revenue,
                    'Users':        cover.tractionHighlights?.users,
                    'Partnerships': cover.tractionHighlights?.partnerships,
                    'Press':        cover.tractionHighlights?.press,
                  }).filter(([,v]) => v).map(([k, v]) => (
                    <div key={k} className="infobox-row">
                      <span className="infobox-label">{k}</span>
                      <span className="infobox-value text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Elevator pitch */}
              {fa?.elevatorPitch?.hook && (
                <div className="section-card border-l-2 border-accent">
                  <p className="text-xs text-accent uppercase tracking-wider mb-2 font-mono">Elevator Pitch</p>
                  <p className="text-paper/70 text-xs leading-relaxed italic">{fa.elevatorPitch.hook}</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
