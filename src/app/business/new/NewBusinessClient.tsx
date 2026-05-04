'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import yaml from 'js-yaml'
import { ArrowLeft, Upload, FileText, Loader2, Lock } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import { createBusiness, fetchMyOrgs, type CreateBusinessTarget } from '@/lib/api'

interface OwnerOption {
  key: string
  label: string
  target: CreateBusinessTarget
}

const STARTER_YAML = `cover:
  companyName: My Venture
  tagline: One sentence about what you do
  stage: idea           # idea | mvp | beta | live | scaling | exited
  productType: web-app  # web-app | website | ai-agent | api | hybrid | other
  fundingStage: bootstrapped
  industryVertical: ''
  mission: ''
  vision: ''
  logoEmoji: '🚀'
  accentColor: '#E8622A'

problemSolution:
  corePainPoint: ''
  solutionOneLiner: ''

# Add any other top-level sections you like — they become tabs automatically.
`

export default function NewBusinessClient() {
  const router  = useRouter()
  const { data: session } = useSession()

  const [yamlText, setYamlText]   = useState(STARTER_YAML)
  const [isPublic, setIsPublic]   = useState(true)
  const [ownerOptions, setOwnerOptions] = useState<OwnerOption[]>([])
  const [ownerKey, setOwnerKey]   = useState('')
  const [saving, setSaving]       = useState(false)

  // Owner picker. Anonymous → forced to venturewiki org.
  useEffect(() => {
    if (!session?.user?.login) {
      const anon: OwnerOption = {
        key: 'anon:venturewiki',
        label: 'venturewiki org (anonymous)',
        target: { type: 'org', login: 'venturewiki' },
      }
      setOwnerOptions([anon])
      setOwnerKey(anon.key)
      return
    }
    const personal: OwnerOption = {
      key: `user:${session.user.login}`,
      label: `Personal · @${session.user.login}`,
      target: { type: 'user', login: session.user.login },
    }
    setOwnerOptions([personal])
    setOwnerKey(personal.key)
    fetchMyOrgs().then(orgs => {
      setOwnerOptions([
        personal,
        ...orgs.map(o => ({
          key: `org:${o.login}`,
          label: `Org · ${o.login}`,
          target: { type: 'org' as const, login: o.login },
        })),
      ])
    }).catch(() => {})
  }, [session?.user?.login])

  // Live YAML parse → validation hint.
  let parsed: any = null
  let parseError: string | null = null
  try {
    parsed = yaml.load(yamlText)
  } catch (e: any) {
    parseError = (e?.message || String(e)).split('\n')[0]
  }
  const companyName: string | undefined = parsed?.cover?.companyName
  const valid = !parseError && parsed && typeof parsed === 'object' && !!companyName?.trim()

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setYamlText(text)
    }
    reader.onerror = () => toast.error('Could not read file')
    reader.readAsText(file)
  }

  const onSubmit = async () => {
    if (!valid || !parsed) {
      toast.error(parseError || 'plan.yaml needs a non-empty cover.companyName')
      return
    }
    setSaving(true)
    try {
      const target = ownerOptions.find(o => o.key === ownerKey)?.target
      const { slug, owner } = await createBusiness(
        { ...parsed, isPublic, createdBy: session?.user?.id || 'anonymous' },
        target,
      )
      toast.success('Venture created!')
      router.push(`/${owner}/${slug}`)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create venture')
    } finally {
      setSaving(false)
    }
  }

  if (session === undefined) return (
    <div className="min-h-screen bg-ink"><Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-32 shimmer rounded-xl" />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-ghost px-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-paper">New Business Plan</h1>
            <p className="text-muted text-sm">Upload or paste a <code className="font-mono bg-rule/40 px-1 rounded">plan.yaml</code> — that&apos;s it. Edit later inline.</p>
          </div>
        </div>

        {ownerOptions.length > 0 && (
          <div className="section-card">
            <h2 className="font-display font-bold text-paper text-base mb-3">Where to create the GitHub repo</h2>
            {!session ? (
              <div className="space-y-2">
                <p className="text-muted text-sm">
                  Not signed in. The repo will be created in the
                  {' '}<span className="text-paper font-mono">venturewiki</span>{' '}
                  org as an anonymous contribution.
                </p>
                <a href="/api/auth/signin" className="btn-ghost text-xs inline-flex">Sign in →</a>
              </div>
            ) : ownerOptions.length === 1 ? (
              <p className="text-muted text-sm">
                Will be created under <span className="text-paper font-mono">{ownerOptions[0].label}</span>.
              </p>
            ) : (
              <select value={ownerKey} onChange={e => setOwnerKey(e.target.value)} className="input-base">
                {ownerOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            )}
          </div>
        )}

        <div className="section-card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display font-bold text-paper text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" /> plan.yaml
            </h2>
            <label className="btn-ghost text-xs cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Upload .yaml
              <input
                type="file"
                accept=".yaml,.yml,text/yaml,text/plain"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            value={yamlText}
            onChange={e => setYamlText(e.target.value)}
            spellCheck={false}
            rows={24}
            className={`input-base font-mono text-xs leading-relaxed resize-y w-full whitespace-pre ${
              parseError ? 'border-rose-500/60 focus:border-rose-500' : ''
            }`}
          />

          <div className="flex items-center justify-between gap-3 text-xs">
            {parseError ? (
              <span className="text-rose-400 font-mono truncate">⚠ {parseError}</span>
            ) : !companyName?.trim() ? (
              <span className="text-amber-300">Add a <code className="font-mono">cover.companyName</code> to continue.</span>
            ) : (
              <span className="text-teal">✓ Looks good — will create <span className="font-mono">{companyName}</span></span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-rule/50">
            {/* Force public for venturewiki-org (anonymous or org target) */}
            {(() => {
              const selectedTarget = ownerOptions.find(o => o.key === ownerKey)?.target
              const forcedPublic = !session || (selectedTarget?.type === 'org' && selectedTarget?.login === 'venturewiki')
              const isPro = session?.user?.subscriptionTier === 'pro' && session?.user?.subscriptionStatus === 'active'
              if (forcedPublic && !isPublic) setIsPublic(true)
              return (
                <>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-paper">
                    <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="accent-accent" />
                    🌐 Public
                  </label>
                  <label className={`flex items-center gap-2 text-sm ${forcedPublic || !isPro ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer text-paper'}`}>
                    <input
                      type="radio"
                      checked={!isPublic}
                      onChange={() => { if (!forcedPublic && isPro) setIsPublic(false) }}
                      disabled={forcedPublic || !isPro}
                      className="accent-accent"
                    />
                    🔒 Private
                    {!isPro && !forcedPublic && (
                      <span className="inline-flex items-center gap-1 text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                        <Lock className="w-3 h-3" /> Pro
                      </span>
                    )}
                  </label>
                </>
              )
            })()}
            <button onClick={onSubmit} disabled={saving || !valid} className="btn-primary ml-auto">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create venture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
