'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { X, Search, ExternalLink, Loader2 } from 'lucide-react'
import { searchGithubUsers, inviteCollaborator, type GhUserHit } from '@/lib/api'

/**
 * Modal that lets the venture owner search for a GitHub user by username or
 * display name and send them a GitHub repository collaboration invite
 * (gives push / write access to the venture's repo).
 *
 * If no match is found the user is offered a link to github.com/join so they
 * can share a GitHub signup invitation with the person they want to add.
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
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state when the modal is closed / re-opened.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setHits([])
      setError(null)
      setInvited([])
    } else {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

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
          Search GitHub by username or display name. The person will receive a GitHub notification
          and get <span className="text-paper/80">write access</span> to this venture&apos;s repository.
        </p>

        {/* Search input */}
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

        {error && (
          <p className="text-rose-400 text-sm mb-3">{error}</p>
        )}

        {/* Results */}
        {loading && !hits.length ? (
          <div className="py-8 flex items-center justify-center text-muted text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Searching GitHub…
          </div>
        ) : !query.trim() ? (
          <p className="text-muted text-sm italic py-4">Start typing to search GitHub users.</p>
        ) : hits.length === 0 ? (
          <div className="py-4 space-y-3">
            <p className="text-muted text-sm">
              No GitHub user found for &quot;{query}&quot;.
            </p>
            <a
              href="https://github.com/join"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              Invite them to create a GitHub account <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-xs text-muted">
              Share that link — once they have a GitHub account you can search their username here.
            </p>
          </div>
        ) : (
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
                    {h.name && (
                      <p className="text-muted text-xs truncate">{h.name}</p>
                    )}
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
        )}
      </div>
    </div>
  )
}
