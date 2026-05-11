'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, Search, Loader2, ShieldCheck, ShieldAlert, ShieldOff, ExternalLink } from 'lucide-react'
import { searchGithubUsers, inviteCollaborator, getCollaboratorSecurity, type GhUserHit, type CollabSecurityStatus } from '@/lib/api'

/**
 * Modal that lets the venture owner search for a GitHub user by username or
 * display name and add them as an *outside collaborator* on the venture's
 * repository only (push / write access to this one repo — never org membership).
 *
 * If no GitHub account matches, the user is pointed to github.com/join so the
 * person can create an account; once they have a username they can be invited
 * directly here. We deliberately do not offer email-based org invitations,
 * which would make the invitee a member of the whole organization and expose
 * every other repo governed by the org's base permissions.
 */
export default function InviteCollaboratorModal({
  open,
  ventureId,
  onClose,
}: {
  open: boolean
  ventureId: string
  onClose: () => void
}) {
  const [query,   setQuery]   = useState('')
  const [hits,    setHits]    = useState<GhUserHit[]>([])
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [invited, setInvited] = useState<string[]>([])

  // Org security status (checked on open for org-hosted ventures)
  const [security, setSecurity] = useState<CollabSecurityStatus | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when the modal is closed / re-opened.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setHits([])
      setError(null)
      setInvited([])
      setSecurity(null)
    } else {
      setTimeout(() => inputRef.current?.focus(), 50)
      // Check (and auto-fix) the org's base permissions in the background.
      getCollaboratorSecurity(ventureId).then(setSecurity).catch(() => {})
    }
  }, [open, ventureId])

  // Debounced search as the user types.
  useEffect(() => {
    if (!open) return
    if (!query.trim()) { setHits([]); setLoading(false); return }
    setLoading(true)
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const results = await searchGithubUsers(query)
        if (!cancelled) setHits(results)
      } catch {
        if (!cancelled) setHits([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, query])

  const handleInvite = async (user: GhUserHit) => {
    setError(null)
    setInviting(user.login)
    try {
      await inviteCollaborator(ventureId, user.login)
      setInvited(prev => [...prev, user.login])
    } catch (e: any) {
      setError(e?.message || 'Could not send invite')
    } finally {
      setInviting(null)
    }
  }

  if (!open) return null

  const noResults = !loading && query.trim().length > 0 && hits.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={() => !inviting && onClose()}
    >
      <div className="absolute inset-0 bg-black/70" />

      <div
        className="relative bg-ink border border-rule rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-paper text-lg">Invite collaborator</h2>
          <button
            className="text-muted hover:text-paper transition-colors"
            onClick={onClose}
            disabled={!!inviting}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-muted text-sm mb-4">
          Search GitHub by username or display name. The person is added as an{' '}
          <span className="text-paper/80">outside collaborator</span> with{' '}
          <span className="text-paper/80">write access</span> to this venture&apos;s repository only —
          they will not gain access to any other repository.
        </p>

        {/* ── GitHub username search ── */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search GitHub username or name…"
            className="input-base pl-8 w-full"
          />
        </div>

        {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}

        {/* Security status banner */}
        {security?.applicable && (
          <div className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 mb-3 ${
            security.fixFailed
              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/50'
              : security.wasFixed
              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
              : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
          }`}>
            {security.fixFailed ? (
              <ShieldOff className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ) : security.wasFixed ? (
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            )}
            <span>
              {security.fixFailed
                ? 'Could not verify org base permissions. Ask your GitHub org admin to set "Base permissions" to "No permission" so members can\'t see other private repos.'
                : security.wasFixed
                ? <>Heads up: org base permissions were <strong>open</strong>, so org members could see other private repos. We automatically tightened them to <strong>No permission</strong>.</>
                : <>Org base permissions are <strong>locked down</strong>. Collaborators you invite here only get access to this repo.</>}
            </span>
          </div>
        )}

        {/* Search results */}
        {loading && !hits.length ? (
          <div className="py-8 flex items-center justify-center text-muted text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Searching GitHub…
          </div>
        ) : !query.trim() ? (
          <p className="text-muted text-sm italic py-4">Start typing to search GitHub users.</p>
        ) : hits.length > 0 ? (
          <ul className="divide-y divide-rule/50">
            {hits.map(h => {
              const alreadyInvited = invited.includes(h.login)
              return (
                <li key={h.login} className="flex items-center gap-3 py-3">
                  <Image
                    src={h.avatarUrl}
                    alt={h.login}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full shrink-0"
                    unoptimized
                  />
                  <div className="flex-1 min-w-0">
                    <a
                      href={h.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-paper font-mono text-sm hover:text-accent transition-colors"
                    >
                      @{h.login}
                    </a>
                    {h.name && <p className="text-muted text-xs truncate">{h.name}</p>}
                  </div>
                  {alreadyInvited ? (
                    <span className="text-emerald-400 text-xs font-medium shrink-0">Invited ✓</span>
                  ) : (
                    <button
                      className="btn-primary text-xs shrink-0"
                      onClick={() => handleInvite(h)}
                      disabled={!!inviting}
                    >
                      {inviting === h.login ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" /> Inviting…
                        </span>
                      ) : 'Invite'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}

        {/* No-results state: guide them to create a GitHub account */}
        {noResults && (
          <div className="border border-rule/60 rounded-lg p-4 space-y-2">
            <p className="text-paper/90 text-sm font-medium">
              No GitHub account found for &quot;{query}&quot;.
            </p>
            <p className="text-muted text-xs leading-relaxed">
              GitHub repository access requires a GitHub account. Ask them to sign up, then
              come back and search their new username to add them as an outside collaborator
              on this repo. (We don&apos;t offer email invitations because those would add the
              person to your whole organization, not just this repository.)
            </p>
            <a
              href="https://github.com/join"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-accent text-xs hover:underline"
            >
              github.com/join <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
