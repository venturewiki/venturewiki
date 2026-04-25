'use client'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Lock, Unlock, GitFork, BookOpen, Plus, ExternalLink, RefreshCw, AlertTriangle, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { fetchMyOrgs, fetchMyRepos, onboardRepoToVentureWiki, type MyOrg, type MyRepo } from '@/lib/api'

type StatusFilter = 'all' | 'on-vw' | 'not-vw'
type VisFilter = 'all' | 'public' | 'private'

export default function MyGitHubPanel() {
  const [orgs, setOrgs] = useState<MyOrg[]>([])
  const [repos, setRepos] = useState<MyRepo[]>([])
  const [scopes, setScopes] = useState<string[]>([])
  const [missingScopes, setMissingScopes] = useState<string[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [visFilter, setVisFilter] = useState<VisFilter>('all')
  const [showForks, setShowForks] = useState(true)
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set())

  const [onboarding, setOnboarding] = useState<string | null>(null)
  const [onboardError, setOnboardError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [o, r] = await Promise.all([fetchMyOrgs(), fetchMyRepos()])
      setOrgs(o)
      setRepos(r.repos)
      setScopes(r.scopes)
      setMissingScopes(r.missingScopes)
      setTruncated(r.truncated)
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return repos.filter(r => {
      if (statusFilter === 'on-vw' && !r.hasVentureWiki) return false
      if (statusFilter === 'not-vw' && r.hasVentureWiki) return false
      if (visFilter !== 'all' && r.visibility !== visFilter) return false
      if (!showForks && r.isFork) return false
      if (q) {
        return r.fullName.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      }
      return true
    })
  }, [repos, search, statusFilter, visFilter, showForks])

  const grouped = useMemo(() => {
    const map = new Map<string, MyRepo[]>()
    for (const r of filtered) {
      const list = map.get(r.owner) ?? []
      list.push(r)
      map.set(r.owner, list)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [filtered])

  const toggleOwner = (owner: string) => {
    setExpandedOwners(s => {
      const next = new Set(s)
      if (next.has(owner)) next.delete(owner)
      else next.add(owner)
      return next
    })
  }

  const onboardedCount = repos.filter(r => r.hasVentureWiki).length
  const totalCount = repos.length
  const filteredCount = filtered.length

  return (
    <section className="border-b border-rule">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display font-bold text-paper text-lg">Your GitHub</h2>
          <button onClick={load} className="btn-ghost text-xs" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="section-card border-l-2 border-rose-500">
            <p className="text-rose-400 text-sm">{error}</p>
          </div>
        )}

        {missingScopes.length > 0 && (
          <div className="section-card border-l-2 border-amber-500 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-300 text-sm font-medium">
                You&apos;re seeing only some of your repos.
              </p>
              <p className="text-paper/70 text-xs mt-1">
                Your GitHub session is missing the
                {' '}<code className="bg-rule/40 px-1 rounded font-mono text-amber-300">{missingScopes.join(' / ')}</code>{' '}
                scope{missingScopes.length > 1 ? 's' : ''} required to list private repos and all org-membership repos.
                Sign out and back in to grant them — VentureWiki only stores pointers, never your private content.
              </p>
              <a
                href="/api/auth/signout?callbackUrl=/api/auth/signin"
                className="btn-primary text-xs mt-3 inline-flex"
              >
                Sign out and re-authenticate
              </a>
            </div>
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

        {/* Repos: header + filters */}
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h3 className="text-xs uppercase tracking-widest text-muted font-mono mr-1">
              Repositories <span className="text-paper/70">({filteredCount}/{totalCount})</span>
            </h3>
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Filter repos…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-base pl-8 py-1.5 text-sm w-full"
              />
            </div>
            <FilterChip label={`All (${totalCount})`} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            <FilterChip label={`On VW (${onboardedCount})`} active={statusFilter === 'on-vw'} onClick={() => setStatusFilter('on-vw')} accent />
            <FilterChip label={`Other (${totalCount - onboardedCount})`} active={statusFilter === 'not-vw'} onClick={() => setStatusFilter('not-vw')} />
            <span className="text-rule">|</span>
            <FilterChip label="Public" active={visFilter === 'public'} onClick={() => setVisFilter(visFilter === 'public' ? 'all' : 'public')} />
            <FilterChip label="Private" active={visFilter === 'private'} onClick={() => setVisFilter(visFilter === 'private' ? 'all' : 'private')} />
            <FilterChip label="Forks" active={showForks} onClick={() => setShowForks(!showForks)} />
          </div>

          {onboardError && <p className="text-rose-400 text-xs mb-3">{onboardError}</p>}
          {truncated && (
            <p className="text-amber-300/80 text-xs mb-3">
              You have a lot of repos — only the most recently pushed are shown.
            </p>
          )}

          {loading && filtered.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 shimmer rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted text-sm italic">No matching repos.</p>
          ) : (
            <div className="space-y-3">
              {grouped.map(([owner, list]) => {
                const collapsed = !expandedOwners.has(owner)
                return (
                  <div key={owner} className="bg-lead border border-rule rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleOwner(owner)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-2 text-left hover:bg-rule/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {collapsed ? <ChevronRight className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                        <span className="text-sm font-medium text-paper font-mono">{owner}</span>
                        <span className="badge bg-rule/50 text-muted text-[10px]">{list.length}</span>
                      </div>
                    </button>
                    {!collapsed && (
                      <ul className="divide-y divide-rule/60">
                        {list.map(r => (
                          <RepoRow
                            key={r.fullName}
                            r={r}
                            onOnboard={() => handleOnboard(r)}
                            onboarding={onboarding === r.fullName}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function FilterChip({ label, active, onClick, accent }: { label: string; active: boolean; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
        active
          ? (accent ? 'bg-accent text-white border-accent' : 'bg-paper/10 text-paper border-paper/30')
          : 'border-rule text-muted hover:text-paper hover:border-muted',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function RepoRow({ r, onOnboard, onboarding }: { r: MyRepo; onOnboard: () => void; onboarding: boolean }) {
  const VisIcon = r.visibility === 'private' ? Lock : Unlock
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-rule/20 transition-colors">
      <BookOpen className={`w-4 h-4 shrink-0 ${r.hasVentureWiki ? 'text-accent' : 'text-muted'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={r.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-paper hover:text-accent truncate"
            title={r.fullName}
          >
            {r.name}
          </a>
          <span className={`badge text-[10px] ${r.visibility === 'private' ? 'bg-amber-900/40 text-amber-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
            <VisIcon className="w-3 h-3" /> {r.visibility}
          </span>
          {r.isFork && (
            <span className="badge text-[10px] bg-slate-700 text-slate-300"><GitFork className="w-3 h-3" /> fork</span>
          )}
          {r.hasVentureWiki && (
            <span className="badge text-[10px] bg-accent/20 text-accent">on VW</span>
          )}
        </div>
        {r.description && <p className="text-xs text-muted truncate">{r.description}</p>}
      </div>
      <div className="shrink-0">
        {r.hasVentureWiki ? (
          <a
            href={`${r.htmlUrl}/blob/main/.venturewiki/plan.yaml`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-xs"
          >
            View plan <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <button
            onClick={onOnboard}
            disabled={onboarding}
            className="btn-primary text-xs"
          >
            {onboarding ? 'Adding…' : <><Plus className="w-3 h-3" /> Add</>}
          </button>
        )}
      </div>
    </li>
  )
}
