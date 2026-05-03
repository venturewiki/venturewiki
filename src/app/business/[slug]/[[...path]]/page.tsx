'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Eye, GitBranch, Clock, Users, ChevronRight,
  UserPlus, ShieldCheck, HandCoins, MessageSquare,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { SectionYamlEditor } from '@/components/business/SectionYamlEditor'
import { listDynamicSections } from '@/components/business/DynamicSection'
import {
  fetchBusiness, toggleFeatured, fetchEditHistory, fetchComments, postComment,
  fetchCandidates, fetchValidations, fetchInvestments, fetchVentureValue,
  fetchVentureFiles, fetchVentureFile, createVentureFile, updateBusiness,
  updatePlanYaml, moveVentureFile,
  createVentureFolder, renameVentureFolder, deleteVentureFolder,
} from '@/lib/api'
import { categoryFromName } from '@/lib/mime'
import { encodePathSegment } from '@/lib/file-paths'
import { formatRelativeTime, formatNumber } from '@/lib/utils'
import { iconFor } from '@/components/venture/section-icons'
import { CoverHeader } from '@/components/venture/CoverHeader'
import { SectionsNav } from '@/components/venture/SectionsNav'
import { InfoboxSidebar } from '@/components/venture/InfoboxSidebar'
import { FileViewer } from '@/components/venture/FileViewer'
import { PlanErrorBanner } from '@/components/venture/PlanErrorBanner'
import { CandidatesTab } from '@/components/venture/CandidatesTab'
import { ValidationsTab } from '@/components/venture/ValidationsTab'
import { InvestmentsTab } from '@/components/venture/InvestmentsTab'
import { HistoryTab } from '@/components/venture/HistoryTab'
import { DiscussionTab } from '@/components/venture/DiscussionTab'
import { AddFileModal } from '@/components/venture/AddFileModal'
import InviteCollaboratorModal from '@/components/venture/InviteCollaboratorModal'
import type { BusinessPlan, EditRecord, Comment, RoleCandidate, Validation, InvestmentInterest, VentureValue } from '@/types'
import type { VentureFile } from '@/lib/api'

// Platform tabs back onto separate yaml files (candidates/validations/…) plus
// the discussion + git-history surfaces. Plan-section tabs are derived from
// the keys present in `.venturewiki/plan.yaml`.
const PLATFORM_TAB_IDS = ['candidates', 'validations', 'invest', 'history', 'discuss'] as const

export default function BusinessPage() {
  const params       = useParams<{ slug: string; path?: string[] }>()
  const slug         = params.slug
  const pathSegments = params.path ?? []
  const firstSegment = pathSegments[0]
  const router       = useRouter()
  const { data: session } = useSession()

  const [business,     setBusiness]     = useState<BusinessPlan | null>(null)
  const [edits,        setEdits]        = useState<EditRecord[]>([])
  const [comments,     setComments]     = useState<Comment[]>([])
  const [candidates,   setCandidates]   = useState<RoleCandidate[]>([])
  const [validations,  setValidations]  = useState<Validation[]>([])
  const [investments,  setInvestments]  = useState<InvestmentInterest[]>([])
  const [ventureValue, setVentureValue] = useState<VentureValue | null>(null)
  const [files,        setFiles]        = useState<VentureFile[]>([])
  const [fileContent,  setFileContent]  = useState<{ name: string; content: string } | null>(null)
  const [fileLoading,  setFileLoading]  = useState(false)
  const [newComment,   setNewComment]   = useState('')
  const [savingRawYaml, setSavingRawYaml] = useState(false)
  const [loading,      setLoading]      = useState(true)

  // Sections come straight from plan.yaml keys, tabs from URL.
  const sectionDescriptors = listDynamicSections(business as any)
  const sectionKeys = sectionDescriptors.map(s => s.key)
  const tabIdSet    = new Set<string>([...sectionKeys, ...PLATFORM_TAB_IDS])
  const defaultTab  = sectionKeys[0] || 'discuss'
  // A multi-segment path (e.g. /business/slug/docs/readme.md) is a file inside a subfolder.
  // A single segment that isn't a known tab is a root-level file.
  const fullPath    = pathSegments.join('/')
  const isFile      = !!firstSegment && !!business && !tabIdSet.has(firstSegment)
  const activeFile  = isFile ? fullPath : null
  const activeTab   = !firstSegment || isFile ? defaultTab : firstSegment

  useEffect(() => {
    if (!slug) return
    fetchBusiness(slug as string).then(b => {
      setBusiness(b)
      setLoading(false)
      if (!b) return
      fetchEditHistory(b.id).then(setEdits)
      fetchComments(b.id).then(setComments)
      fetchCandidates(b.id).then(setCandidates)
      fetchValidations(b.id).then(setValidations)
      fetchInvestments(b.id).then(setInvestments)
      fetchVentureValue(b.id).then(setVentureValue).catch(() => {})
      fetchVentureFiles(b.id).then(setFiles).catch(() => {})
    })
  }, [slug])

  useEffect(() => {
    if (!business || !activeFile) { setFileContent(null); return }
    // Only fetch text content when the viewer needs it. Binary categories
    // render directly via the raw URL — no JSON fetch required.
    const fileName = activeFile.split('/').pop() || activeFile
    const cat = categoryFromName(fileName)
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
  const selectFile = (path: string) =>
    router.replace(`/business/${slug}/${encodePathSegment(path)}`, { scroll: false })

  const savePatch = async (patch: Partial<BusinessPlan>) => {
    if (!business) return
    const updated = { ...business, ...patch } as BusinessPlan
    await updateBusiness(business.id, updated, 'Inline edit via venture page')
    setBusiness(updated)
  }

  const [addFileOpen,        setAddFileOpen]        = useState(false)
  const [inviteColabOpen,    setInviteColabOpen]    = useState(false)

  const handleComment = async () => {
    if (!newComment.trim() || !session || !business) return
    await postComment(business.id, newComment.trim())
    setComments(await fetchComments(business.id))
    setNewComment('')
  }

  const handleCreateFile = async (name: string, content: string) => {
    if (!business) throw new Error('No business loaded')
    const created = await createVentureFile(business.id, name, content)
    setFiles(await fetchVentureFiles(business.id))
    selectFile(created)
    return created
  }

  const refreshFiles = async () => {
    if (!business) return
    setFiles(await fetchVentureFiles(business.id))
  }

  const handleCreateFolder = async () => {
    if (!business) return
    const name = prompt('New folder name:')
    if (!name?.trim()) return
    try {
      await createVentureFolder(business.id, name.trim())
      await refreshFiles()
    } catch (e: any) {
      alert(e?.message || 'Failed to create folder')
    }
  }

  const handleRenameFolder = async (path: string) => {
    if (!business) return
    const currentName = path.split('/').pop() || path
    const newName = prompt(`Rename folder "${currentName}":`, currentName)
    if (!newName?.trim() || newName.trim() === currentName) return
    const parentDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
    const newPath = parentDir ? `${parentDir}/${newName.trim()}` : newName.trim()
    try {
      await renameVentureFolder(business.id, path, newPath)
      await refreshFiles()
    } catch (e: any) {
      alert(e?.message || 'Failed to rename folder')
    }
  }

  const handleDeleteFolder = async (path: string) => {
    if (!business) return
    if (!confirm(`Delete folder "${path}" and all its contents?`)) return
    try {
      await deleteVentureFolder(business.id, path)
      await refreshFiles()
    } catch (e: any) {
      alert(e?.message || 'Failed to delete folder')
    }
  }

  const handleMoveFile = async (srcPath: string, destPath: string) => {
    if (!business) return
    try {
      await moveVentureFile(business.id, srcPath, destPath)
      await refreshFiles()
      selectFile(destPath)
    } catch (e: any) {
      alert(e?.message || 'Failed to move file')
    }
  }

  if (loading) return <LoadingState />
  if (!business) return <NotFoundState />

  const cover     = business.cover || ({} as BusinessPlan['cover'])
  const tr        = (business as any).teamRoadmap
  const planError = (business as any)._planError as string | undefined
  const planRaw   = (business as any)._planRaw as string | undefined
  const isAdmin   = session?.user.role === 'admin'
  const canEdit   = !!session
    ? (session.user.role === 'editor' || isAdmin)
    : business.owner === 'venturewiki' // anonymous edits allowed only on venturewiki-org repos

  const sectionTabs = sectionDescriptors.map(s => ({
    id: s.key,
    label: s.label,
    icon: iconFor(s.key),
  }))
  const platformTabs = [
    { id: 'candidates',  label: `Candidates (${candidates.length})`,   icon: UserPlus },
    { id: 'validations', label: `Validations (${validations.length})`, icon: ShieldCheck },
    { id: 'invest',      label: `Invest (${investments.length})`,      icon: HandCoins },
    { id: 'history',     label: `History (${edits.length})`,           icon: GitBranch },
    { id: 'discuss',     label: `Discussion (${comments.length})`,     icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />

      <div className="h-0.5 w-full" style={{ background: cover.accentColor || '#E8622A' }} />

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

          <SectionsNav
            sectionTabs={sectionTabs}
            platformTabs={platformTabs}
            files={files}
            activeTab={activeTab}
            activeFile={activeFile}
            canEdit={canEdit}
            onSelectTab={selectTab}
            onSelectFile={selectFile}
            onAddFile={() => setAddFileOpen(true)}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onMoveFile={handleMoveFile}
          />

          <main className="min-w-0">
            <CoverHeader
              cover={cover}
              isFeatured={!!business.isFeatured}
              isAdmin={isAdmin}
              canEdit={canEdit}
              onToggleFeatured={() => toggleFeatured(business.id, !business.isFeatured)}
              onSaveCover={async (next) => savePatch({ cover: next })}
            />

            <div className="flex items-center gap-4 mb-6 text-xs text-muted pb-4 border-b border-rule">
              <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatNumber(business.viewCount)} views</span>
              <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" />{formatNumber(business.editCount)} edits</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Updated {formatRelativeTime(business.updatedAt)}</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{business.contributors?.length || 1} contributor{(business.contributors?.length || 1) > 1 ? 's' : ''}</span>
              {canEdit && (
                <button
                  className="ml-auto flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                  onClick={() => setInviteColabOpen(true)}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Invite collaborator
                </button>
              )}
            </div>

            {activeFile && (
              <FileViewer
                slug={business.id}
                activeFile={activeFile}
                fileContent={fileContent}
                fileLoading={fileLoading}
              />
            )}

            {!activeFile && planError && (
              <PlanErrorBanner
                planError={planError}
                planRaw={planRaw}
                saving={savingRawYaml}
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

            {!activeFile && sectionDescriptors.map(section => activeTab === section.key && (
              <div key={section.key} className="space-y-4 animate-fade-in">
                <div className="section-card">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="font-display font-bold text-paper text-lg flex items-center gap-2">
                      {(() => { const Icon = iconFor(section.key); return <Icon className="w-5 h-5 text-accent" /> })()}
                      {section.label}
                    </h2>
                    <span className="text-[11px] text-muted font-mono uppercase tracking-wider">{section.key}</span>
                  </div>
                  <SectionYamlEditor
                    value={section.value}
                    canEdit={canEdit}
                    onSave={async (next) => savePatch({ [section.key]: next } as any)}
                  />
                </div>
              </div>
            ))}

            {!activeFile && activeTab === 'candidates' && (
              <CandidatesTab
                candidates={candidates}
                openRoles={tr?.openRoles}
              />
            )}
            {!activeFile && activeTab === 'validations' && (
              <ValidationsTab validations={validations} ventureValue={ventureValue} />
            )}
            {!activeFile && activeTab === 'invest' && (
              <InvestmentsTab investments={investments} />
            )}
            {!activeFile && activeTab === 'history' && (
              <HistoryTab edits={edits} />
            )}
            {!activeFile && activeTab === 'discuss' && (
              <DiscussionTab
                comments={comments}
                value={newComment}
                onChange={setNewComment}
                onPost={handleComment}
              />
            )}
          </main>

          <InfoboxSidebar business={business} />
        </div>
      </div>

      <AddFileModal
        open={addFileOpen}
        onClose={() => setAddFileOpen(false)}
        onCreate={handleCreateFile}
        folders={files.filter(f => f.type === 'dir').map(f => f.path)}
      />

      <InviteCollaboratorModal
        open={inviteColabOpen}
        ventureId={business.id}
        onClose={() => setInviteColabOpen(false)}
      />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-6">
          <div className="h-96 shimmer rounded-xl" />
          <div className="space-y-4">
            <div className="h-10 shimmer rounded-xl" />
            <div className="h-48 shimmer rounded-xl" />
            <div className="h-48 shimmer rounded-xl" />
            <div className="h-48 shimmer rounded-xl" />
          </div>
          <div className="h-96 shimmer rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <Navbar />
      <div className="text-center">
        <div className="text-6xl mb-4">🔭</div>
        <h1 className="font-display text-2xl font-bold text-paper mb-2">Venture not found</h1>
        <Link href="/" className="btn-primary mt-4">← Back to directory</Link>
      </div>
    </div>
  )
}
