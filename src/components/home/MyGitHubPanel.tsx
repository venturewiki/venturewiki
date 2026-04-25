'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Lock, Unlock, GitFork, BookOpen, Plus, ExternalLink, RefreshCw } from 'lucide-react'
import { fetchMyOrgs, fetchMyRepos, onboardRepoToVentureWiki, type MyOrg, type MyRepo } from '@/lib/api'

export default function MyGitHubPanel() {
  const [orgs, setOrgs] = useState<MyOrg[]>([])
  const [repos, setRepos] = useState<MyRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState<string | null>(null)
  const [onboardError, setOnboardError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [o, r] = await Promise.all([fetchMyOrgs(), fetchMyRepos()])
      setOrgs(o)
      setRepos(r)
    } catch (e: any) {
      setError(e?.message || 'Failed to load GitHub data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleOnboard = async (r: MyRepo) => {
    setOnboardError(null)
    setOnboarding(r.fullName)
    try {
      await onboardRepoToVentureWiki(r.owner, r.name)
      await load()
    } catch (e: any) {
      setOnboardError(`${r.fullName}: ${e?.message || 'failed'}`)
    } finally {
      setOnboarding(null)
    }
  }

  const onboarded = repos.filter(r => r.hasVentureWiki)
  const notOnboarded = repos.filter(r => !r.hasVentureWiki)

  return (
    <section className="border-b border-rule">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display font-bold text-paper text-lg">Your GitHub</h2>
          <button onClick={load} className="btn-ghost text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="section-card border-l-2 border-rose-500">
            <p className="text-rose-400 text-sm">{error}</p>
            <p className="text-muted text-xs mt-1">If you signed in before this feature was added, sign out and back in to grant the new GitHub scopes.</p>
          </div>
        )}

        {/* Organizations */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted mb-3 font-mono">
            Organizations {orgs.length > 0 && <span className="text-paper/70">({orgs.length})</span>}
          </h3>
          {loading && orgs.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 shimmer rounded-lg" />)}
            </div>
          ) : orgs.length === 0 ? (
            <p className="text-muted text-sm italic">No organizations.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {orgs.map(o => (
                <a
                  key={o.id}
                  href={`https://github.com/${o.login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="section-card flex items-center gap-3 hover:border-accent/50 transition-colors"
                >
                  <Image src={o.avatarUrl} alt={o.login} width={32} height={32} className="w-8 h-8 rounded shrink-0" unoptimized />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-paper truncate">{o.login}</div>
                    {o.description && <div className="text-xs text-muted truncate">{o.description}</div>}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Onboarded repos */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted mb-3 font-mono">
            On VentureWiki {onboarded.length > 0 && <span className="text-paper/70">({onboarded.length})</span>}
          </h3>
          {loading && onboarded.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 shimmer rounded-lg" />)}
            </div>
          ) : onboarded.length === 0 ? (
            <p className="text-muted text-sm italic">No repos on VentureWiki yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {onboarded.map(r => <RepoCard key={r.fullName} r={r} onboarded />)}
            </div>
          )}
        </div>

        {/* Not-yet-onboarded repos */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted mb-3 font-mono">
            Other repos {notOnboarded.length > 0 && <span className="text-paper/70">({notOnboarded.length})</span>}
          </h3>
          {onboardError && <p className="text-rose-400 text-xs mb-3">{onboardError}</p>}
          {loading && notOnboarded.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 shimmer rounded-lg" />)}
            </div>
          ) : notOnboarded.length === 0 ? (
            <p className="text-muted text-sm italic">All your repos are on VentureWiki.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notOnboarded.map(r => (
                <RepoCard
                  key={r.fullName}
                  r={r}
                  onboarded={false}
                  onOnboard={() => handleOnboard(r)}
                  onboarding={onboarding === r.fullName}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function RepoCard({
  r, onboarded, onOnboard, onboarding,
}: {
  r: MyRepo
  onboarded: boolean
  onOnboard?: () => void
  onboarding?: boolean
}) {
  const VisIcon = r.visibility === 'private' ? Lock : Unlock
  return (
    <div className="section-card flex items-start gap-3">
      <BookOpen className="w-4 h-4 text-accent shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <a
            href={r.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-paper hover:text-accent truncate"
            title={r.fullName}
          >
            {r.fullName}
          </a>
          <span className={`badge text-[10px] ${r.visibility === 'private' ? 'bg-amber-900/40 text-amber-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
            <VisIcon className="w-3 h-3" /> {r.visibility}
          </span>
          {r.isFork && (
            <span className="badge text-[10px] bg-slate-700 text-slate-300"><GitFork className="w-3 h-3" /> fork</span>
          )}
          {onboarded && r.hasTopic && (
            <span className="badge text-[10px] bg-accent/20 text-accent">topic</span>
          )}
        </div>
        {r.description && <p className="text-xs text-muted line-clamp-2 mb-2">{r.description}</p>}
        <div className="flex items-center gap-2">
          {onboarded ? (
            <a
              href={`${r.htmlUrl}/blob/main/.venturewiki/plan.yaml`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs"
            >
              View plan.yaml <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <button
              onClick={onOnboard}
              disabled={onboarding}
              className="btn-primary text-xs"
            >
              {onboarding ? 'Adding…' : <><Plus className="w-3 h-3" /> Add to VentureWiki</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
