'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import {
  Eye, GitBranch, Clock, Star,
  Globe, Cpu, DollarSign, Users, Target, Map, MessageSquare,
  ChevronRight, AlertTriangle, TrendingUp, UserPlus,
  ShieldCheck, HandCoins, FileText, FilePlus, X, Layers,
  Briefcase, Activity, Building2, Heart, Lock, Rocket, Truck
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { EditableSection } from '@/components/business/EditableSection'
import { EditField, TextInput, Selector } from '@/components/business/edit-fields'
import { listDynamicSections } from '@/components/business/DynamicSection'
import { SectionYamlEditor } from '@/components/business/SectionYamlEditor'
import { YamlEditor } from '@/components/business/YamlEditor'
import MentionInput from '@/components/business/MentionInput'
import InvitePersonModal from '@/components/business/InvitePersonModal'
import { fetchBusiness, incrementViewCount, toggleFeatured, fetchEditHistory, fetchComments, postComment, fetchCandidates, fetchValidations, fetchInvestments, fetchVentureValue, fetchVentureFiles, fetchVentureFile, createVentureFile, updateBusiness, updatePlanYaml, inviteCollaborator, applyForRole, type VentureFile, type GhUserHit } from '@/lib/api'
import { cn, STAGE_LABELS, STAGE_COLORS, TYPE_ICONS, TYPE_LABELS, formatRelativeTime, formatNumber } from '@/lib/utils'
import { categoryFromName } from '@/lib/mime'
import type { BusinessPlan, EditRecord, Comment, RoleCandidate, Validation, InvestmentInterest, VentureValue } from '@/types'

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })

// Platform tabs are always available — they back onto separate yaml files
// (candidates.yaml, validations.yaml, …) and the discussion / git history
// surfaces. Plan-section tabs are derived dynamically from the keys present
// in `.venturewiki/plan.yaml`.
const PLATFORM_TAB_IDS = [
  'candidates', 'validations', 'invest', 'history', 'discuss',
] as const

const SECTION_ICON_MAP: Record<string, any> = {
  cover: Globe,
  problemSolution: AlertTriangle,
  productGtm: Cpu,
  product: Cpu,
  gtm: Target,
  teamRoadmap: Users,
  team: Users,
  roadmap: Map,
  fundingAsk: HandCoins,
  funding: HandCoins,
  financials: DollarSign,
  governance: ShieldCheck,
  kpis: TrendingUp,
  slas: Activity,
  businessContinuity: Building2,
  insurance: Heart,
  dataOwnership: Lock,
  exitStrategy: Rocket,
  firstFiveTenants: UserPlus,
  vendors: Truck,
  partners: Briefcase,
}

function iconFor(key: string) {
  return SECTION_ICON_MAP[key] || Layers
}

function encodePathSegment(s: string) {
  return s.split('/').map(encodeURIComponent).join('/')
}

function rawFileUrl(slug: string, path: string) {
  return `/api/businesses/${encodeURIComponent(slug)}/files/${encodePathSegment(path)}?raw=1`
}

export default function BusinessPage() {
  const params              = useParams<{ slug: string; path?: string[] }>()
  const slug                = params.slug
  const pathSegments        = params.path ?? []
  const firstSegment        = pathSegments[0]
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
  const [loading, setLoading]       = useState(true)
  const [files, setFiles]           = useState<VentureFile[]>([])
  const [fileContent, setFileContent] = useState<{ name: string; content: string } | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [savingRawYaml, setSavingRawYaml] = useState(false)

  // Plan-section tabs are derived from the live plan keys. A URL segment that
  // matches a known plan key OR a platform tab id is a tab; otherwise it is a
  // file name. Falls back to the first plan section (or 'cover').
  const sectionDescriptors = listDynamicSections(business as any)
  const sectionKeys = sectionDescriptors.map(s => s.key)
  const tabIdSet = new Set<string>([...sectionKeys, ...PLATFORM_TAB_IDS])
  const defaultTab = sectionKeys[0] || 'discuss'
  const isFile  = !!firstSegment && !!business && !tabIdSet.has(firstSegment)
  const activeFile: string | null = isFile ? firstSegment : null
  const activeTab: string         = !firstSegment || isFile
    ? defaultTab
    : firstSegment

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
    // Only fetch text content when the file viewer needs it (markdown/text).
    // Binary categories render via the raw URL — no JSON fetch required.
    const cat = categoryFromName(activeFile)
    if (cat !== 'markdown' && cat !== 'text') { setFileContent(null); return }
    setFileLoading(true)
    fetchVentureFile(business.id, activeFile)
      .then(setFileContent)
      .catch(() => setFileContent(null))
      .finally(() => setFileLoading(false))
  }, [business, activeFile])

  const selectTab = (id: string) => {
    const target = id === defaultTab ? `/business/${slug}` : `/business/${slug}/${id}`
    router.replace(target, { scroll: false })
  }
  const selectFile = (path: string) => {
    router.replace(`/business/${slug}/${encodePathSegment(path)}`, { scroll: false })
  }

  const savePatch = async (patch: Partial<BusinessPlan>) => {
    if (!business) return
    const updated = { ...business, ...patch } as BusinessPlan
    await updateBusiness(business.id, updated, 'Inline edit via venture page')
    setBusiness(updated)
  }

  const [inviteContributorOpen, setInviteContributorOpen] = useState(false)
  const [inviteCandidateOpen, setInviteCandidateOpen] = useState(false)
  const [inviteRole, setInviteRole] = useState('')
  const [inviteToast, setInviteToast] = useState<string | null>(null)

  const handleInviteContributor = async (user: GhUserHit) => {
    if (!business) return
    await inviteCollaborator(business.id, user.login, 'push')
    setInviteToast(`@${user.login} was invited as a contributor on GitHub.`)
  }

  const handleInviteCandidate = async (user: GhUserHit) => {
    if (!business) return
    const pitch = inviteRole
      ? `Invited by the venture team for the ${inviteRole} role.`
      : 'Invited by the venture team to apply for an open role.'
    await applyForRole(business.id, inviteRole || 'Open role', `@${user.login} — ${pitch}`)
    const list = await fetchCandidates(business.id)
    setCandidates(list)
    setInviteToast(`@${user.login} was added to candidates. Mention them in Discussion to notify them.`)
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
      selectFile(created)
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

  const cover: BusinessPlan['cover'] = (business as any).cover || ({} as BusinessPlan['cover'])
  const tr = (business as any).teamRoadmap
  const fa = (business as any).fundingAsk
  const planError: string | undefined = (business as any)._planError
  const planRaw: string | undefined = (business as any)._planRaw
  const isAdmin  = session?.user.role === 'admin'
  const canEdit  = !!session
    ? (session.user.role === 'editor' || isAdmin)
    : business.owner === 'venturewiki' // anonymous edits allowed only on venturewiki-org repos

  const sectionTabs = sectionDescriptors.map(s => ({
    id: s.key,
    label: s.label,
    icon: iconFor(s.key),
  }))

  const platformTabs = [
    { id: 'candidates',  label: `Candidates (${candidates.length})`, icon: UserPlus },
    { id: 'validations', label: `Validations (${validations.length})`, icon: ShieldCheck },
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
                  {sectionTabs.map(tab => {
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
                  {platformTabs.length > 0 && (
                    <div className="border-t border-rule/50 my-1" />
                  )}
                  {platformTabs.map(tab => {
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
                  {files.length > 0 && (
                    <div className="border-t border-rule/50 my-1" />
                  )}
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
            {activeFile && (() => {
              const displayName = fileContent?.name || activeFile
              const category = categoryFromName(displayName)
              const rawUrl = rawFileUrl(business.id, activeFile)
              const needsTextContent = category === 'markdown' || category === 'text'
              return (
              <div className="section-card animate-fade-in">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-accent shrink-0" />
                    <h2 className="font-display font-bold text-paper truncate">{displayName}</h2>
                  </div>
                  <a
                    href={rawUrl}
                    download={displayName}
                    className="text-xs text-muted hover:text-paper underline-offset-2 hover:underline shrink-0"
                  >
                    Download
                  </a>
                </div>
                {needsTextContent && fileLoading ? (
                  <div className="h-32 shimmer rounded-lg" />
                ) : category === 'markdown' ? (
                  fileContent ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{fileContent.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-muted italic text-sm">File not available.</p>
                  )
                ) : category === 'html' ? (
                  // Sandbox with no flags = scripts/forms/popups blocked, opaque origin.
                  // The HTML still renders (text, styling, images via the same origin).
                  <iframe
                    src={rawUrl}
                    sandbox=""
                    className="w-full min-h-[70vh] rounded-lg bg-white border border-rule"
                    title={displayName}
                  />
                ) : category === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={rawUrl}
                    alt={displayName}
                    className="max-w-full h-auto rounded-lg mx-auto"
                  />
                ) : category === 'video' ? (
                  <video src={rawUrl} controls className="w-full max-h-[80vh] rounded-lg bg-black" />
                ) : category === 'audio' ? (
                  <audio src={rawUrl} controls className="w-full" />
                ) : category === 'pdf' ? (
                  <iframe
                    src={rawUrl}
                    className="w-full min-h-[80vh] rounded-lg bg-white border border-rule"
                    title={displayName}
                  />
                ) : category === 'text' ? (
                  fileContent ? (
                    <pre className="bg-rule/30 border border-rule rounded-lg p-4 text-xs text-paper/90 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                      {fileContent.content}
                    </pre>
                  ) : (
                    <p className="text-muted italic text-sm">File not available.</p>
                  )
                ) : (
                  // Unknown / binary: no safe inline render, offer a download.
                  <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted">
                    <FileText className="w-10 h-10 opacity-40" />
                    <p>This file type can't be previewed inline.</p>
                    <a href={rawUrl} download={displayName} className="btn-secondary">Download {displayName}</a>
                  </div>
                )}
              </div>
              )
            })()}

            {/* ── plan.yaml parse-error banner + raw editor ───────────────── */}
            {!activeFile && planError && (
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
                    saving={savingRawYaml}
                    saveLabel="Save plan.yaml"
                    onSave={async (raw) => {
                      setSavingRawYaml(true)
                      try {
                        await updatePlanYaml(business.id, raw, 'Fix plan.yaml via VentureWiki editor')
                        const fresh = await fetchBusiness(business.id)
                        if (fresh) setBusiness(fresh)
                      } finally {
                        setSavingRawYaml(false)
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* ── Dynamic plan sections (one tab per top-level key in plan.yaml) ── */}
            {!activeFile && sectionDescriptors.map(section => (
              activeTab === section.key && (
                <div key={section.key} className="space-y-4 animate-fade-in">
                  <div className="section-card">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h2 className="font-display font-bold text-paper text-lg flex items-center gap-2">
                        {(() => { const Icon = iconFor(section.key); return <Icon className="w-5 h-5 text-accent" /> })()}
                        {section.label}
                      </h2>
                      <span className="text-[11px] text-muted font-mono uppercase tracking-wider">
                        {section.key}
                      </span>
                    </div>
                    <SectionYamlEditor
                      value={section.value}
                      canEdit={canEdit}
                      onSave={async (next) => {
                        await savePatch({ [section.key]: next } as any)
                      }}
                    />
                  </div>
                </div>
              )
            ))}

            {/* ── Tab: Candidates ────────────────────────────────── */}
            {!activeFile && activeTab === 'candidates' && (
              <div className="space-y-4 animate-fade-in">
                <div className="section-card">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h2 className="font-display font-bold text-paper flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-accent" /> Role Candidates
                    </h2>
                    {canEdit && (
                      <button
                        onClick={() => { setInviteRole(''); setInviteCandidateOpen(true) }}
                        className="btn-ghost text-xs shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Invite candidate
                      </button>
                    )}
                  </div>
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
                    <p className="text-xs text-muted mb-2">
                      Type <code className="font-mono bg-rule/40 px-1 rounded">@</code> to mention a GitHub user — they&apos;ll be notified by GitHub.
                    </p>
                    <MentionInput
                      value={newComment}
                      onChange={setNewComment}
                      placeholder="Leave a comment or feedback. Use @ to mention someone…"
                      rows={3}
                    />
                    <button onClick={handleComment} className="btn-primary mt-3" disabled={!newComment.trim()}>
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

      <InvitePersonModal
        open={inviteContributorOpen}
        title="Invite contributor"
        ctaLabel="Invite"
        onPick={async (user) => { await handleInviteContributor(user) }}
        onClose={() => setInviteContributorOpen(false)}
      />
      <InvitePersonModal
        open={inviteCandidateOpen}
        title="Invite candidate"
        ctaLabel="Add as candidate"
        onPick={async (user) => { await handleInviteCandidate(user) }}
        onClose={() => setInviteCandidateOpen(false)}
      />
      {inviteToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-900/90 border border-emerald-600 rounded-lg px-4 py-2 shadow-xl">
          <div className="flex items-center gap-3">
            <p className="text-sm text-emerald-100">{inviteToast}</p>
            <button onClick={() => setInviteToast(null)} className="text-emerald-300 hover:text-emerald-100 text-xs">Dismiss</button>
          </div>
        </div>
      )}

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
