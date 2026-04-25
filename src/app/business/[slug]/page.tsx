'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import {
  Eye, GitBranch, Clock, Edit3, Star, Archive, ArrowLeft,
  Globe, Cpu, DollarSign, Users, Target, Map, MessageSquare,
  ChevronRight, AlertTriangle, TrendingUp, Zap, UserPlus,
  ShieldCheck, HandCoins, BarChart3, FileText, FilePlus, X
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { EditableSection } from '@/components/business/EditableSection'
import { EditField, TextInput, TextArea, Selector, ArrayEditor } from '@/components/business/edit-fields'
import { fetchBusiness, incrementViewCount, toggleFeatured, fetchEditHistory, fetchComments, postComment, fetchCandidates, fetchValidations, fetchInvestments, fetchVentureValue, fetchVentureFiles, fetchVentureFile, createVentureFile, updateBusiness, type VentureFile } from '@/lib/api'
import { cn, STAGE_LABELS, STAGE_COLORS, TYPE_ICONS, TYPE_LABELS, formatRelativeTime, formatNumber } from '@/lib/utils'
import type { BusinessPlan, EditRecord, Comment, RoleCandidate, Validation, InvestmentInterest, VentureValue } from '@/types'

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })

function fileExt(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

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
  const [files, setFiles]           = useState<VentureFile[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<{ name: string; content: string } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)

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
        fetchVentureFiles(b.id).then(setFiles).catch(() => {})
      }
    })
  }, [slug])

  useEffect(() => {
    if (!business || !activeFile) { setFileContent(null); return }
    setFileLoading(true)
    fetchVentureFile(business.id, activeFile)
      .then(setFileContent)
      .catch(() => setFileContent(null))
      .finally(() => setFileLoading(false))
  }, [business, activeFile])

  const selectTab = (id: string) => { setActiveTab(id); setActiveFile(null) }
  const selectFile = (path: string) => { setActiveFile(path) }

  const savePatch = async (patch: Partial<BusinessPlan>) => {
    if (!business) return
    const updated = { ...business, ...patch } as BusinessPlan
    await updateBusiness(business.id, updated, 'Inline edit via venture page')
    setBusiness(updated)
  }

  const [addFileOpen, setAddFileOpen] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileContent, setNewFileContent] = useState('')
  const [newFileError, setNewFileError] = useState<string | null>(null)
  const [newFileSaving, setNewFileSaving] = useState(false)

  const openAddFile = () => {
    setNewFileName('')
    setNewFileContent('')
    setNewFileError(null)
    setAddFileOpen(true)
  }

  const handleUploadPick = (file: File) => {
    setNewFileError(null)
    if (!newFileName.trim()) setNewFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => setNewFileContent(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => setNewFileError('Could not read file (must be a text file)')
    reader.readAsText(file)
  }

  const submitNewFile = async () => {
    if (!business) return
    setNewFileError(null)
    setNewFileSaving(true)
    try {
      const created = await createVentureFile(business.id, newFileName.trim(), newFileContent)
      const refreshed = await fetchVentureFiles(business.id)
      setFiles(refreshed)
      setAddFileOpen(false)
      setActiveFile(created)
    } catch (e: any) {
      setNewFileError(e?.message || 'Failed to create file')
    } finally {
      setNewFileSaving(false)
    }
  }

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
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-6">
          <div className="h-96 shimmer rounded-xl" />
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
  const canEdit  = !!session
    ? (session.user.role === 'editor' || isAdmin)
    : business.owner === 'venturewiki' // anonymous edits allowed only on venturewiki-org repos

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
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-6">

          {/* ── Left navigation: sections + files ──────────────────────── */}
          <aside className="lg:block">
            <div className="sticky top-20 space-y-4">
              <div className="infobox">
                <div className="infobox-header">Sections</div>
                <nav className="py-2">
                  {TABS.map(tab => {
                    const isActive = !activeFile && activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => selectTab(tab.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
                          isActive
                            ? 'bg-accent/15 text-accent border-l-2 border-accent font-medium'
                            : 'text-paper/70 hover:bg-rule/30 hover:text-paper border-l-2 border-transparent'
                        )}
                      >
                        <tab.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    )
                  })}
                  {files.map(f => {
                    const isActive = activeFile === f.path
                    return (
                      <button
                        key={f.path}
                        onClick={() => selectFile(f.path)}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
                          isActive
                            ? 'bg-accent/15 text-accent border-l-2 border-accent font-medium'
                            : 'text-paper/70 hover:bg-rule/30 hover:text-paper border-l-2 border-transparent'
                        )}
                        title={f.name}
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate font-mono text-xs">{f.name}</span>
                      </button>
                    )
                  })}
                  {canEdit && (
                    <button
                      onClick={openAddFile}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors text-teal/80 hover:bg-teal/10 hover:text-teal border-l-2 border-transparent border-t border-rule/50 mt-1 pt-3"
                    >
                      <FilePlus className="w-4 h-4 shrink-0" />
                      <span className="truncate">Add File</span>
                    </button>
                  )}
                </nav>
              </div>
            </div>
          </aside>

          {/* ── Main column ────────────────────────────────────────────── */}
          <main className="min-w-0">

            {/* Title row — inline-editable cover */}
            <EditableSection
              canEdit={canEdit}
              value={cover}
              className="mb-5"
              onSave={async (next) => savePatch({ cover: next })}
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
                      {business.isFeatured && <Star className="w-5 h-5 text-gold fill-gold shrink-0" />}
                      {isAdmin && (
                        <button
                          onClick={() => toggleFeatured(business.id, !business.isFeatured)}
                          className={cn('btn-ghost px-2', business.isFeatured && 'text-gold')}
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
              view={() => null /* header already contains the view */}
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
                    <Selector
                      value={draft.stage}
                      onChange={v => set({ ...draft, stage: v as any })}
                      options={[
                        { value: 'idea', label: 'Idea' },
                        { value: 'mvp', label: 'MVP' },
                        { value: 'beta', label: 'Beta' },
                        { value: 'live', label: 'Live' },
                        { value: 'scaling', label: 'Scaling' },
                        { value: 'exited', label: 'Exited' },
                      ]}
                    />
                  </EditField>
                  <EditField label="Product Type">
                    <Selector
                      value={draft.productType}
                      onChange={v => set({ ...draft, productType: v as any })}
                      options={[
                        { value: 'web-app', label: 'Web App' },
                        { value: 'website', label: 'Website' },
                        { value: 'ai-agent', label: 'AI Agent' },
                        { value: 'api', label: 'API Product' },
                        { value: 'hybrid', label: 'Hybrid' },
                        { value: 'other', label: 'Other' },
                      ]}
                    />
                  </EditField>
                  <EditField label="Industry Vertical">
                    <TextInput value={draft.industryVertical} onChange={v => set({ ...draft, industryVertical: v })} placeholder="FinTech, HealthTech…" />
                  </EditField>
                  <EditField label="Headquarters">
                    <TextInput value={draft.headquarters} onChange={v => set({ ...draft, headquarters: v })} placeholder="New York, NY" />
                  </EditField>
                  <EditField label="Funding Stage">
                    <Selector
                      value={draft.fundingStage}
                      onChange={v => set({ ...draft, fundingStage: v as any })}
                      options={[
                        { value: 'bootstrapped', label: 'Bootstrapped' },
                        { value: 'pre-seed', label: 'Pre-Seed' },
                        { value: 'seed', label: 'Seed' },
                        { value: 'series-a', label: 'Series A' },
                        { value: 'series-b+', label: 'Series B+' },
                      ]}
                    />
                  </EditField>
                  <EditField label="Website URL">
                    <TextInput value={draft.websiteUrl} onChange={v => set({ ...draft, websiteUrl: v })} placeholder="https://" />
                  </EditField>
                  <EditField label="Accent Color">
                    <input type="color" value={draft.accentColor || '#E8622A'} onChange={e => set({ ...draft, accentColor: e.target.value })} className="h-10 w-full rounded-lg cursor-pointer bg-transparent border border-rule p-1" />
                  </EditField>
                </div>
              )}
            />

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-6 text-xs text-muted pb-4 border-b border-rule">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatNumber(business.viewCount)} views</span>
              <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" />{formatNumber(business.editCount)} edits</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Updated {formatRelativeTime(business.updatedAt)}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{business.contributors?.length || 1} contributor{(business.contributors?.length || 1) > 1 ? 's' : ''}</span>
            </div>

            {/* ── File viewer ────────────────────────────────────────── */}
            {activeFile && (
              <div className="section-card animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-accent shrink-0" />
                  <h2 className="font-display font-bold text-paper truncate">
                    {fileContent?.name || activeFile}
                  </h2>
                </div>
                {fileLoading ? (
                  <div className="h-32 shimmer rounded-lg" />
                ) : !fileContent ? (
                  <p className="text-muted italic text-sm">File not available.</p>
                ) : ['md', 'markdown'].includes(fileExt(fileContent.name)) ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{fileContent.content}</ReactMarkdown>
                  </div>
                ) : (
                  <pre className="bg-rule/30 border border-rule rounded-lg p-4 text-xs text-paper/90 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                    {fileContent.content}
                  </pre>
                )}
              </div>
            )}

            {/* ── Tab: Overview ─────────────────────────────────────── */}
            {!activeFile && activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* Mission / Vision */}
                <EditableSection
                  canEdit={canEdit}
                  value={{ mission: cover.mission || '', vision: cover.vision || '' }}
                  onSave={async (next) => savePatch({ cover: { ...cover, mission: next.mission, vision: next.vision } })}
                  header={<h2 className="font-display font-bold text-paper text-base">Mission &amp; Vision</h2>}
                  view={(v) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border-l-2 border-accent pl-5">
                        <p className="text-xs uppercase tracking-widest text-muted mb-2 font-mono">Mission</p>
                        <p className="text-paper/80 text-sm leading-relaxed">{v.mission || <span className="text-muted italic">Not specified</span>}</p>
                      </div>
                      <div className="border-l-2 border-teal pl-5">
                        <p className="text-xs uppercase tracking-widest text-muted mb-2 font-mono">Vision</p>
                        <p className="text-paper/80 text-sm leading-relaxed">{v.vision || <span className="text-muted italic">Not specified</span>}</p>
                      </div>
                    </div>
                  )}
                  edit={(draft, set) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <EditField label="Mission">
                        <TextArea value={draft.mission} onChange={v => set({ ...draft, mission: v })} placeholder="For whom, doing what, and why it matters" rows={4} />
                      </EditField>
                      <EditField label="Vision">
                        <TextArea value={draft.vision} onChange={v => set({ ...draft, vision: v })} placeholder="Where you're going in 5 years" rows={4} />
                      </EditField>
                    </div>
                  )}
                />

                {/* Problem */}
                <EditableSection
                  canEdit={canEdit}
                  value={{
                    corePainPoint: ps?.corePainPoint || '',
                    painDimensions: {
                      who: ps?.painDimensions?.who || '',
                      frequency: ps?.painDimensions?.frequency || '',
                      currentWorkarounds: ps?.painDimensions?.currentWorkarounds || '',
                      costOfProblem: ps?.painDimensions?.costOfProblem || '',
                      urgencyLevel: ps?.painDimensions?.urgencyLevel || '',
                    },
                  }}
                  onSave={async (next) => savePatch({
                    problemSolution: { ...ps, corePainPoint: next.corePainPoint, painDimensions: next.painDimensions } as any,
                  })}
                  header={
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-accent" /> The Problem
                    </h2>
                  }
                  view={(v) => (
                    <>
                      <div className="accent-bar mb-4">
                        <p className="text-paper/80 text-sm leading-relaxed font-medium">
                          {v.corePainPoint || <span className="text-muted italic">Not specified</span>}
                        </p>
                      </div>
                      {Object.values(v.painDimensions).some(Boolean) && (
                        <table className="wiki-table">
                          <tbody>
                            {([
                              ['Who feels this', v.painDimensions.who],
                              ['Frequency', v.painDimensions.frequency],
                              ['Workarounds', v.painDimensions.currentWorkarounds],
                              ['Cost of pain', v.painDimensions.costOfProblem],
                              ['Urgency', v.painDimensions.urgencyLevel],
                            ] as const).filter(([, val]) => val).map(([k, val]) => (
                              <tr key={k}><td className="w-36 text-muted font-medium">{k}</td><td>{val}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                  edit={(draft, set) => (
                    <div className="space-y-3">
                      <EditField label="Core Pain Point">
                        <TextArea value={draft.corePainPoint} onChange={v => set({ ...draft, corePainPoint: v })} placeholder="The exact pain…" rows={3} />
                      </EditField>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <EditField label="Who feels this">
                          <TextInput value={draft.painDimensions.who} onChange={v => set({ ...draft, painDimensions: { ...draft.painDimensions, who: v } })} placeholder="Persona" />
                        </EditField>
                        <EditField label="Frequency">
                          <TextInput value={draft.painDimensions.frequency} onChange={v => set({ ...draft, painDimensions: { ...draft.painDimensions, frequency: v } })} placeholder="Daily / Per tx…" />
                        </EditField>
                        <EditField label="Current workarounds">
                          <TextInput value={draft.painDimensions.currentWorkarounds} onChange={v => set({ ...draft, painDimensions: { ...draft.painDimensions, currentWorkarounds: v } })} placeholder="What they use" />
                        </EditField>
                        <EditField label="Cost of problem">
                          <TextInput value={draft.painDimensions.costOfProblem} onChange={v => set({ ...draft, painDimensions: { ...draft.painDimensions, costOfProblem: v } })} placeholder="$X lost" />
                        </EditField>
                        <EditField label="Urgency">
                          <TextInput value={draft.painDimensions.urgencyLevel} onChange={v => set({ ...draft, painDimensions: { ...draft.painDimensions, urgencyLevel: v } })} placeholder="Must-have / Nice-to-have" />
                        </EditField>
                      </div>
                    </div>
                  )}
                />

                {/* Solution */}
                <EditableSection
                  canEdit={canEdit}
                  value={{
                    solutionOneLiner: ps?.solutionOneLiner || '',
                    features: (ps?.features || []) as Array<{ feature: string; benefit: string; techLayer: string }>,
                    unfairAdvantage: ps?.unfairAdvantage || '',
                  }}
                  onSave={async (next) => savePatch({
                    problemSolution: { ...ps, solutionOneLiner: next.solutionOneLiner, features: next.features, unfairAdvantage: next.unfairAdvantage } as any,
                  })}
                  header={
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <Zap className="w-4 h-4 text-teal" /> The Solution
                    </h2>
                  }
                  view={(v) => (
                    <>
                      {v.solutionOneLiner && (
                        <p className="text-paper/80 text-base leading-relaxed mb-4 font-medium">{v.solutionOneLiner}</p>
                      )}
                      {v.features.filter(f => f.feature).length > 0 && (
                        <table className="wiki-table">
                          <thead><tr><th>Feature</th><th>Benefit</th><th>Tech Layer</th></tr></thead>
                          <tbody>
                            {v.features.filter(f => f.feature).map((f, i) => (
                              <tr key={i}>
                                <td className="font-medium text-paper/90">{f.feature}</td>
                                <td>{f.benefit}</td>
                                <td><code className="text-xs bg-rule/50 px-1.5 py-0.5 rounded font-mono text-teal">{f.techLayer}</code></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      {v.unfairAdvantage && (
                        <div className="mt-4 p-3 bg-teal/5 border border-teal/20 rounded-lg">
                          <p className="text-xs text-teal font-medium uppercase tracking-wider mb-1">Unfair Advantage</p>
                          <p className="text-paper/80 text-sm">{v.unfairAdvantage}</p>
                        </div>
                      )}
                    </>
                  )}
                  edit={(draft, set) => (
                    <div className="space-y-3">
                      <EditField label="Solution one-liner">
                        <TextArea value={draft.solutionOneLiner} onChange={v => set({ ...draft, solutionOneLiner: v })} placeholder="[Product] that [benefit] for [user]" rows={2} />
                      </EditField>
                      <EditField label="Features">
                        <ArrayEditor
                          items={draft.features}
                          onChange={items => set({ ...draft, features: items })}
                          makeNew={() => ({ feature: '', benefit: '', techLayer: '' })}
                          gridClass="grid grid-cols-[1.5fr_1.5fr_1fr_auto] gap-2 items-start"
                          columns={[
                            { key: 'feature', placeholder: 'Feature' },
                            { key: 'benefit', placeholder: 'Benefit' },
                            { key: 'techLayer', placeholder: 'LLM / API…' },
                          ]}
                        />
                      </EditField>
                      <EditField label="Unfair advantage">
                        <TextArea value={draft.unfairAdvantage} onChange={v => set({ ...draft, unfairAdvantage: v })} placeholder="What cannot be easily copied" rows={3} />
                      </EditField>
                    </div>
                  )}
                />

                {/* Market */}
                <EditableSection
                  canEdit={canEdit}
                  value={{
                    market: {
                      tamSize: ps?.market?.tamSize || '',
                      tamSource: ps?.market?.tamSource || '',
                      samSize: ps?.market?.samSize || '',
                      samSource: ps?.market?.samSource || '',
                      somSize: ps?.market?.somSize || '',
                      somSource: ps?.market?.somSource || '',
                    },
                    whyNow: ps?.whyNow || '',
                  }}
                  onSave={async (next) => savePatch({
                    problemSolution: { ...ps, market: next.market, whyNow: next.whyNow } as any,
                  })}
                  header={
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gold" /> Market Opportunity
                    </h2>
                  }
                  view={(v) => (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'TAM', value: v.market.tamSize, color: 'text-gold' },
                          { label: 'SAM', value: v.market.samSize, color: 'text-accent' },
                          { label: 'SOM', value: v.market.somSize, color: 'text-teal' },
                        ].map(m => (
                          <div key={m.label} className="bg-rule/30 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted mb-1">{m.label}</p>
                            <p className={cn('font-display font-bold text-lg', m.color)}>{m.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                      {v.whyNow && (
                        <div className="p-3 bg-gold/5 border border-gold/20 rounded-lg">
                          <p className="text-xs text-gold font-medium uppercase tracking-wider mb-1">Why Now</p>
                          <p className="text-paper/80 text-sm">{v.whyNow}</p>
                        </div>
                      )}
                    </>
                  )}
                  edit={(draft, set) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(['tam', 'sam', 'som'] as const).map(k => (
                          <div key={k} className="space-y-2">
                            <EditField label={`${k.toUpperCase()} size`}>
                              <TextInput
                                value={(draft.market as any)[`${k}Size`]}
                                onChange={v => set({ ...draft, market: { ...draft.market, [`${k}Size`]: v } as any })}
                                placeholder="$2.4B"
                              />
                            </EditField>
                            <EditField label={`${k.toUpperCase()} source`}>
                              <TextInput
                                value={(draft.market as any)[`${k}Source`]}
                                onChange={v => set({ ...draft, market: { ...draft.market, [`${k}Source`]: v } as any })}
                                placeholder="Source, Year"
                              />
                            </EditField>
                          </div>
                        ))}
                      </div>
                      <EditField label="Why now?">
                        <TextArea value={draft.whyNow} onChange={v => set({ ...draft, whyNow: v })} placeholder="The tech shift that makes this the right moment" rows={3} />
                      </EditField>
                    </div>
                  )}
                />
              </div>
            )}

            {/* ── Tab: Product & GTM ────────────────────────────────── */}
            {!activeFile && activeTab === 'product' && (
              <div className="space-y-6 animate-fade-in">
                {/* Tech Stack */}
                <EditableSection
                  canEdit={canEdit}
                  value={gtm?.techStack || {}}
                  onSave={async (next) => savePatch({ productGtm: { ...gtm, techStack: next } as any })}
                  header={
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-accent" /> Tech Stack
                    </h2>
                  }
                  view={(v: any) => (
                    <table className="wiki-table">
                      <tbody>
                        {Object.entries({
                          'Product Type': v?.productType,
                          'Frontend': v?.frontend,
                          'Backend': v?.backend,
                          'AI / ML Layer': v?.aiLayer,
                          'Data Storage': v?.dataStorage,
                          'Auth & Payments': v?.authPayments,
                          'Hosting': v?.hosting,
                          'Build Stage': v?.buildStage,
                          'IP / Proprietary': v?.ipLayer,
                        }).filter(([, val]) => val).map(([k, val]) => (
                          <tr key={k}>
                            <td className="w-40 text-muted font-medium">{k}</td>
                            <td><code className="text-xs bg-rule/50 px-1.5 py-0.5 rounded font-mono text-paper/80">{val as string}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  edit={(draft: any, set) => (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        ['frontend', 'Frontend', 'React / Next.js…'],
                        ['backend', 'Backend / Infra', 'Node / Python…'],
                        ['aiLayer', 'AI / ML Layer', 'OpenAI / Anthropic…'],
                        ['dataStorage', 'Data Storage', 'Postgres / Pinecone…'],
                        ['authPayments', 'Auth & Payments', 'Clerk + Stripe…'],
                        ['hosting', 'Hosting', 'Vercel / AWS…'],
                        ['buildStage', 'Build Stage', 'MVP / Beta / Live…'],
                        ['ipLayer', 'IP / Proprietary', 'Trained model…'],
                      ].map(([k, label, ph]) => (
                        <EditField key={k} label={label}>
                          <TextInput value={(draft as any)[k]} onChange={v => set({ ...draft, [k]: v })} placeholder={ph} />
                        </EditField>
                      ))}
                    </div>
                  )}
                />

                {/* GTM */}
                <EditableSection
                  canEdit={canEdit}
                  value={{
                    icp: gtm?.icp || '',
                    pricingModel: gtm?.pricingModel || '',
                    pricePoint: gtm?.pricePoint || '',
                    salesMotion: gtm?.salesMotion || '',
                    timeToValue: gtm?.timeToValue || '',
                    gtmChannels: (gtm?.gtmChannels || []) as Array<{ channel: string; tactic: string; goal90Day: string; owner: string; budgetPerMonth: string }>,
                  }}
                  onSave={async (next) => savePatch({
                    productGtm: { ...gtm, icp: next.icp, pricingModel: next.pricingModel, pricePoint: next.pricePoint, salesMotion: next.salesMotion, timeToValue: next.timeToValue, gtmChannels: next.gtmChannels } as any,
                  })}
                  header={
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <Target className="w-4 h-4 text-accent" /> Go-to-Market
                    </h2>
                  }
                  view={(v) => (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { label: 'ICP', value: v.icp },
                          { label: 'Pricing Model', value: v.pricingModel },
                          { label: 'Price Point', value: v.pricePoint },
                          { label: 'Sales Motion', value: v.salesMotion },
                        ].filter(i => i.value).map(item => (
                          <div key={item.label} className="bg-rule/20 rounded-lg p-3">
                            <p className="text-xs text-muted mb-1">{item.label}</p>
                            <p className="text-paper/80 text-sm">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {v.gtmChannels.filter(c => c.channel).length > 0 && (
                        <table className="wiki-table">
                          <thead><tr><th>Channel</th><th>Tactic</th><th>90-Day Goal</th></tr></thead>
                          <tbody>
                            {v.gtmChannels.filter(c => c.channel).map((c, i) => (
                              <tr key={i}>
                                <td className="font-medium text-paper/90">{c.channel}</td>
                                <td className="text-paper/70">{c.tactic}</td>
                                <td className="text-teal font-medium">{c.goal90Day}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </>
                  )}
                  edit={(draft, set) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <EditField label="ICP">
                          <TextInput value={draft.icp} onChange={v => set({ ...draft, icp: v })} placeholder="Job title · company size…" />
                        </EditField>
                        <EditField label="Pricing Model">
                          <TextInput value={draft.pricingModel} onChange={v => set({ ...draft, pricingModel: v })} placeholder="Freemium / SaaS…" />
                        </EditField>
                        <EditField label="Price Point">
                          <TextInput value={draft.pricePoint} onChange={v => set({ ...draft, pricePoint: v })} placeholder="$49/mo" />
                        </EditField>
                        <EditField label="Sales Motion">
                          <TextInput value={draft.salesMotion} onChange={v => set({ ...draft, salesMotion: v })} placeholder="Self-serve PLG…" />
                        </EditField>
                        <EditField label="Time to Value">
                          <TextInput value={draft.timeToValue} onChange={v => set({ ...draft, timeToValue: v })} placeholder="< 5 minutes" />
                        </EditField>
                      </div>
                      <EditField label="GTM Channels">
                        <ArrayEditor
                          items={draft.gtmChannels}
                          onChange={items => set({ ...draft, gtmChannels: items })}
                          makeNew={() => ({ channel: '', tactic: '', goal90Day: '', owner: '', budgetPerMonth: '' })}
                          gridClass="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-2 items-start"
                          columns={[
                            { key: 'channel', placeholder: 'Channel' },
                            { key: 'tactic', placeholder: 'Tactic' },
                            { key: 'goal90Day', placeholder: '90-day goal' },
                            { key: 'budgetPerMonth', placeholder: 'Budget/mo' },
                          ]}
                        />
                      </EditField>
                    </div>
                  )}
                />

                {/* Competition */}
                <EditableSection
                  canEdit={canEdit}
                  value={(gtm?.competitors || []) as Array<{ dimension: string; yourProduct: string; competitorA: string; competitorB: string; competitorC: string }>}
                  onSave={async (next) => savePatch({ productGtm: { ...gtm, competitors: next } as any })}
                  className="section-card overflow-x-auto"
                  header={<h2 className="font-display font-bold text-paper">Competitive Landscape</h2>}
                  view={(v) => (
                    v.filter(c => c.yourProduct).length > 0 ? (
                      <table className="wiki-table">
                        <thead><tr>
                          <th>Dimension</th>
                          <th className="text-accent">{cover.companyName}</th>
                          <th>Competitor A</th>
                          <th>Competitor B</th>
                          <th>Competitor C</th>
                        </tr></thead>
                        <tbody>
                          {v.map((c, i) => (
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
                    ) : <p className="text-muted italic text-sm">No competitive matrix yet.</p>
                  )}
                  edit={(draft, set) => (
                    <ArrayEditor
                      items={draft}
                      onChange={set}
                      makeNew={() => ({ dimension: '', yourProduct: '', competitorA: '', competitorB: '', competitorC: '' })}
                      gridClass="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-start"
                      columns={[
                        { key: 'dimension', placeholder: 'Dimension' },
                        { key: 'yourProduct', placeholder: 'Your product' },
                        { key: 'competitorA', placeholder: 'Competitor A' },
                        { key: 'competitorB', placeholder: 'Competitor B' },
                        { key: 'competitorC', placeholder: 'Competitor C' },
                      ]}
                    />
                  )}
                />
              </div>
            )}

            {/* ── Tab: Team & Roadmap ───────────────────────────────── */}
            {!activeFile && activeTab === 'team' && (
              <div className="space-y-6 animate-fade-in">
                {/* Founding Team */}
                <EditableSection
                  canEdit={canEdit}
                  value={(tr?.founders || []) as Array<{ name: string; role: string; background: string; commitment: string; equity: string }>}
                  onSave={async (next) => savePatch({ teamRoadmap: { ...tr, founders: next } as any })}
                  header={
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <Users className="w-4 h-4 text-accent" /> Founding Team
                    </h2>
                  }
                  view={(v) => (
                    v.filter(f => f.name).length > 0 ? (
                      <div className="space-y-3">
                        {v.filter(f => f.name).map((f, i) => (
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
                    ) : <p className="text-muted italic text-sm">No team members added yet</p>
                  )}
                  edit={(draft, set) => (
                    <ArrayEditor
                      items={draft}
                      onChange={set}
                      makeNew={() => ({ name: '', role: '', background: '', commitment: 'Full-time', equity: '' })}
                      gridClass="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-2 items-start"
                      columns={[
                        { key: 'name', placeholder: 'Name' },
                        { key: 'role', placeholder: 'Role' },
                        { key: 'background', placeholder: 'Background' },
                        { key: 'commitment', placeholder: 'Commitment' },
                        { key: 'equity', placeholder: 'Equity' },
                      ]}
                    />
                  )}
                />

                {/* KPIs */}
                <EditableSection
                  canEdit={canEdit}
                  value={(tr?.kpis || []) as Array<{ metric: string; current: string; target3mo: string; target12mo: string; notes: string }>}
                  onSave={async (next) => savePatch({ teamRoadmap: { ...tr, kpis: next } as any })}
                  header={<h2 className="font-display font-bold text-paper">KPI Dashboard</h2>}
                  view={(v) => (
                    v.filter(k => k.metric).length > 0 ? (
                      <table className="wiki-table">
                        <thead><tr><th>Metric</th><th>Current</th><th>3-Month</th><th>12-Month</th></tr></thead>
                        <tbody>
                          {v.filter(k => k.metric).map((k, i) => (
                            <tr key={i}>
                              <td className="font-medium text-paper/90">{k.metric}</td>
                              <td className="font-mono text-sm">{k.current || '—'}</td>
                              <td className="text-teal font-mono text-sm">{k.target3mo || '—'}</td>
                              <td className="text-gold font-mono text-sm">{k.target12mo || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <p className="text-muted italic text-sm">No KPIs added yet</p>
                  )}
                  edit={(draft, set) => (
                    <ArrayEditor
                      items={draft}
                      onChange={set}
                      makeNew={() => ({ metric: '', current: '', target3mo: '', target12mo: '', notes: '' })}
                      gridClass="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr_auto] gap-2 items-start"
                      columns={[
                        { key: 'metric', placeholder: 'Metric' },
                        { key: 'current', placeholder: 'Current' },
                        { key: 'target3mo', placeholder: '3-month' },
                        { key: 'target12mo', placeholder: '12-month' },
                        { key: 'notes', placeholder: 'Notes' },
                      ]}
                    />
                  )}
                />

                {/* Milestones */}
                <EditableSection
                  canEdit={canEdit}
                  value={(tr?.milestones || []) as Array<{ milestone: string; owner: string; targetDate: string; budget: string; successCriteria: string; status: string }>}
                  onSave={async (next) => savePatch({ teamRoadmap: { ...tr, milestones: next } as any })}
                  header={
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <Map className="w-4 h-4 text-accent" /> 12-Month Roadmap
                    </h2>
                  }
                  view={(v) => (
                    v.filter(m => m.milestone).length > 0 ? (
                      <div className="space-y-2">
                        {v.filter(m => m.milestone).map((m, i) => (
                          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-rule/20">
                            <div className={cn('w-2 h-2 rounded-full shrink-0', {
                              'bg-muted': m.status === 'not-started',
                              'bg-accent': m.status === 'in-progress',
                              'bg-emerald': m.status === 'done',
                              'bg-danger': m.status === 'delayed',
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
                    ) : <p className="text-muted italic text-sm">No milestones added yet</p>
                  )}
                  edit={(draft, set) => (
                    <ArrayEditor
                      items={draft}
                      onChange={set}
                      makeNew={() => ({ milestone: '', owner: '', targetDate: '', budget: '', successCriteria: '', status: 'not-started' })}
                      gridClass="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] gap-2 items-start"
                      columns={[
                        { key: 'milestone', placeholder: 'Milestone' },
                        { key: 'owner', placeholder: 'Owner' },
                        { key: 'targetDate', placeholder: 'Target date' },
                        { key: 'successCriteria', placeholder: 'Success criteria' },
                        {
                          key: 'status',
                          render: (val: string, setVal) => (
                            <select value={val || 'not-started'} onChange={e => setVal(e.target.value)} className="input-base text-xs">
                              <option value="not-started">Not started</option>
                              <option value="in-progress">In progress</option>
                              <option value="done">Done</option>
                              <option value="delayed">Delayed</option>
                            </select>
                          ),
                        },
                      ]}
                    />
                  )}
                />
              </div>
            )}

            {/* ── Tab: Financials ───────────────────────────────────── */}
            {!activeFile && activeTab === 'financial' && (
              <div className="space-y-6 animate-fade-in">
                {/* Financial Snapshot */}
                <EditableSection
                  canEdit={canEdit}
                  value={{
                    revenueModel: financials?.revenueModel || '',
                    grossMargin: financials?.grossMargin || '',
                    burnRate: financials?.burnRate || '',
                    runway: financials?.runway || '',
                    breakEvenTarget: financials?.breakEvenTarget || '',
                    cac: financials?.cac || '',
                    ltv: financials?.ltv || '',
                    projections: (financials?.projections || []) as Array<{ year: string; revenue: string; ebitda: string; users: string }>,
                  }}
                  onSave={async (next) => savePatch({
                    financials: {
                      ...financials,
                      revenueModel: next.revenueModel,
                      grossMargin: next.grossMargin,
                      burnRate: next.burnRate,
                      runway: next.runway,
                      breakEvenTarget: next.breakEvenTarget,
                      cac: next.cac,
                      ltv: next.ltv,
                      projections: next.projections,
                    } as any,
                  })}
                  header={
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gold" /> Financial Snapshot
                    </h2>
                  }
                  view={(v) => (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        {[
                          { label: 'Revenue Model', value: v.revenueModel },
                          { label: 'Gross Margin', value: v.grossMargin },
                          { label: 'Burn Rate', value: v.burnRate },
                          { label: 'Runway', value: v.runway },
                          { label: 'Break-even', value: v.breakEvenTarget },
                          { label: 'CAC', value: v.cac },
                          { label: 'LTV', value: v.ltv },
                        ].filter(i => i.value).map(item => (
                          <div key={item.label} className="bg-rule/20 rounded-lg p-3">
                            <p className="text-xs text-muted mb-1">{item.label}</p>
                            <p className="text-paper font-mono text-sm font-medium">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {v.projections.filter(p => p.revenue).length > 0 && (
                        <>
                          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Projections</h3>
                          <table className="wiki-table">
                            <thead><tr><th></th><th>Revenue</th><th>EBITDA</th><th>Users</th></tr></thead>
                            <tbody>
                              {v.projections.filter(p => p.revenue).map((p, i) => (
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
                    </>
                  )}
                  edit={(draft, set) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          ['revenueModel', 'Revenue Model', 'SaaS / Usage…'],
                          ['grossMargin', 'Gross Margin', '70%'],
                          ['burnRate', 'Monthly Burn', '$15,000/mo'],
                          ['runway', 'Runway', '18 months'],
                          ['breakEvenTarget', 'Break-even', 'Q3 2026'],
                          ['cac', 'CAC', '$70 blended'],
                          ['ltv', 'LTV', '$840'],
                        ].map(([k, label, ph]) => (
                          <EditField key={k} label={label}>
                            <TextInput value={(draft as any)[k]} onChange={v => set({ ...draft, [k]: v })} placeholder={ph} />
                          </EditField>
                        ))}
                      </div>
                      <EditField label="Projections">
                        <ArrayEditor
                          items={draft.projections}
                          onChange={items => set({ ...draft, projections: items })}
                          makeNew={() => ({ year: `Year ${draft.projections.length + 1}`, revenue: '', ebitda: '', users: '' })}
                          gridClass="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-start"
                          columns={[
                            { key: 'year', placeholder: 'Year' },
                            { key: 'revenue', placeholder: '$120K' },
                            { key: 'ebitda', placeholder: '-$80K' },
                            { key: 'users', placeholder: '500' },
                          ]}
                        />
                      </EditField>
                    </div>
                  )}
                />

                {/* Funding Ask */}
                <EditableSection
                  canEdit={canEdit}
                  value={{
                    totalRaise: fa?.totalRaise || '',
                    instrument: fa?.instrument || '',
                    valuationCapTerms: fa?.valuationCapTerms || '',
                    targetCloseDate: fa?.targetCloseDate || '',
                    askOneLiner: fa?.askOneLiner || '',
                    useOfFunds: (fa?.useOfFunds || []) as Array<{ category: string; amount: string; percentage: string; timeline: string; milestoneUnlocked: string }>,
                  }}
                  onSave={async (next) => savePatch({
                    fundingAsk: {
                      ...fa,
                      totalRaise: next.totalRaise,
                      instrument: next.instrument,
                      valuationCapTerms: next.valuationCapTerms,
                      targetCloseDate: next.targetCloseDate,
                      askOneLiner: next.askOneLiner,
                      useOfFunds: next.useOfFunds,
                    } as any,
                  })}
                  header={<h2 className="font-display font-bold text-paper">Funding Ask</h2>}
                  view={(v) => (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { label: 'Total Raise', value: v.totalRaise },
                          { label: 'Instrument', value: v.instrument },
                          { label: 'Cap / Terms', value: v.valuationCapTerms },
                          { label: 'Target Close', value: v.targetCloseDate },
                        ].filter(i => i.value).map(item => (
                          <div key={item.label} className="bg-rule/20 rounded-lg p-3">
                            <p className="text-xs text-muted mb-1">{item.label}</p>
                            <p className="text-paper text-sm font-medium">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {v.askOneLiner && (
                        <p className="text-paper/80 text-sm leading-relaxed mb-4 italic border-l-2 border-accent pl-3">
                          {v.askOneLiner}
                        </p>
                      )}
                      {v.useOfFunds.filter(u => u.category).length > 0 && (
                        <table className="wiki-table">
                          <thead><tr><th>Category</th><th>Amount</th><th>%</th><th>Milestone</th></tr></thead>
                          <tbody>
                            {v.useOfFunds.filter(u => u.category).map((u, i) => (
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
                    </>
                  )}
                  edit={(draft, set) => (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <EditField label="Total Raise">
                          <TextInput value={draft.totalRaise} onChange={v => set({ ...draft, totalRaise: v })} placeholder="$500,000" />
                        </EditField>
                        <EditField label="Instrument">
                          <TextInput value={draft.instrument} onChange={v => set({ ...draft, instrument: v })} placeholder="SAFE / Note / Equity" />
                        </EditField>
                        <EditField label="Cap / Terms">
                          <TextInput value={draft.valuationCapTerms} onChange={v => set({ ...draft, valuationCapTerms: v })} placeholder="$5M cap" />
                        </EditField>
                        <EditField label="Target Close">
                          <TextInput value={draft.targetCloseDate} onChange={v => set({ ...draft, targetCloseDate: v })} placeholder="Q3 2026" />
                        </EditField>
                      </div>
                      <EditField label="Ask in one sentence">
                        <TextArea value={draft.askOneLiner} onChange={v => set({ ...draft, askOneLiner: v })} placeholder="We're raising $X to…" rows={2} />
                      </EditField>
                      <EditField label="Use of Funds">
                        <ArrayEditor
                          items={draft.useOfFunds}
                          onChange={items => set({ ...draft, useOfFunds: items })}
                          makeNew={() => ({ category: '', amount: '', percentage: '', timeline: '', milestoneUnlocked: '' })}
                          gridClass="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-2 items-start"
                          columns={[
                            { key: 'category', placeholder: 'Category' },
                            { key: 'amount', placeholder: 'Amount' },
                            { key: 'percentage', placeholder: '%' },
                            { key: 'milestoneUnlocked', placeholder: 'Milestone unlocked' },
                          ]}
                        />
                      </EditField>
                    </div>
                  )}
                />

                {/* Risk Register */}
                <EditableSection
                  canEdit={canEdit}
                  value={(fa?.risks || []) as Array<{ risk: string; likelihood: 'low' | 'medium' | 'high'; impact: 'low' | 'medium' | 'high'; mitigation: string }>}
                  onSave={async (next) => savePatch({ fundingAsk: { ...fa, risks: next } as any })}
                  header={<h2 className="font-display font-bold text-paper">Risk Register</h2>}
                  view={(v) => (
                    v.filter(r => r.risk).length > 0 ? (
                      <table className="wiki-table">
                        <thead><tr><th>Risk</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th></tr></thead>
                        <tbody>
                          {v.filter(r => r.risk).map((r, i) => {
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
                    ) : <p className="text-muted italic text-sm">No risks identified yet.</p>
                  )}
                  edit={(draft, set) => (
                    <ArrayEditor
                      items={draft}
                      onChange={set}
                      makeNew={() => ({ risk: '', likelihood: 'medium' as const, impact: 'medium' as const, mitigation: '' })}
                      gridClass="grid grid-cols-[1.5fr_1fr_1fr_1.5fr_auto] gap-2 items-start"
                      columns={[
                        { key: 'risk', placeholder: 'Risk' },
                        {
                          key: 'likelihood',
                          render: (val: string, setVal) => (
                            <select value={val || 'medium'} onChange={e => setVal(e.target.value)} className="input-base text-xs">
                              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                            </select>
                          ),
                        },
                        {
                          key: 'impact',
                          render: (val: string, setVal) => (
                            <select value={val || 'medium'} onChange={e => setVal(e.target.value)} className="input-base text-xs">
                              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                            </select>
                          ),
                        },
                        { key: 'mitigation', placeholder: 'Mitigation' },
                      ]}
                    />
                  )}
                />
              </div>
            )}

            {/* ── Tab: Candidates ────────────────────────────────── */}
            {!activeFile && activeTab === 'candidates' && (
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
            {!activeFile && activeTab === 'validations' && (
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
            {!activeFile && activeTab === 'invest' && (
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
            {!activeFile && activeTab === 'history' && (
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
            {!activeFile && activeTab === 'discuss' && (
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

      {addFileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => !newFileSaving && setAddFileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative bg-ink border border-rule rounded-xl shadow-xl max-w-xl w-full max-h-[85vh] overflow-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-paper text-lg flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-teal" /> Add File
              </h2>
              <button
                className="text-muted hover:text-paper"
                onClick={() => !newFileSaving && setAddFileOpen(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted mb-4">
              Adds a file to <code className="bg-rule/40 px-1 rounded font-mono">.venturewiki/</code> in this venture&apos;s repository.
              Letters, numbers, spaces, dot, dash, underscore only.
            </p>

            <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-mono">Filename</label>
            <input
              type="text"
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              placeholder="e.g. notes.md"
              className="input-base mb-4 font-mono text-sm"
              autoFocus
            />

            <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-mono">Upload from disk (optional)</label>
            <input
              type="file"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadPick(f) }}
              className="block w-full text-xs text-paper/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-accent/20 file:text-accent file:text-xs file:cursor-pointer hover:file:bg-accent/30 mb-4"
            />

            <label className="block text-xs uppercase tracking-wider text-muted mb-1 font-mono">Content</label>
            <textarea
              value={newFileContent}
              onChange={e => setNewFileContent(e.target.value)}
              rows={10}
              placeholder="Paste or type the file contents here…"
              className="input-base font-mono text-xs resize-y w-full"
            />

            {newFileError && (
              <p className="text-rose-400 text-sm mt-3">{newFileError}</p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                className="btn-ghost"
                onClick={() => setAddFileOpen(false)}
                disabled={newFileSaving}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={submitNewFile}
                disabled={newFileSaving || !newFileName.trim()}
              >
                {newFileSaving ? 'Saving…' : 'Create File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
