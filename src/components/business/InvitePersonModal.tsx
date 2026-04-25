'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Search, ExternalLink, Loader2 } from 'lucide-react'
import { searchGithubUsers, type GhUserHit } from '@/lib/api'

/**
 * Modal that lets the user search GitHub for someone and pick them. If no
 * result matches, it offers a github.com/join link so the inviter can pass
 * along a GitHub signup invitation.
 */
export default function InvitePersonModal({
  open, title, ctaLabel, onPick, onClose,
}: {
  open: boolean
  title: string
  ctaLabel: string
  onPick: (user: GhUserHit) => Promise<void> | void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<GhUserHit[]>([])
  const [loading, setLoading] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setHits([])
      setError(null)
      setPicking(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!query.trim()) { setHits([]); return }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      const res = await searchGithubUsers(query)
      if (!cancelled) {
        setHits(res)
        setLoading(false)
      }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, query])

  const handlePick = async (user: GhUserHit) => {
    setError(null)
    setPicking(user.login)
    try {
      await onPick(user)
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Could not invite this person')
    } finally {
      setPicking(null)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={() => !picking && onClose()}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-ink border border-rule rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-paper text-lg">{title}</h2>
          <button className="text-muted hover:text-paper" onClick={onClose} aria-label="Close" disabled={!!picking}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search GitHub by username or name…"
            className="input-base pl-8"
            autoFocus
          />
        </div>

        {error && <p className="text-rose-400 text-sm mb-2">{error}</p>}

        {loading && hits.length === 0 && query ? (
          <div className="py-6 flex items-center justify-center text-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching GitHub…
          </div>
        ) : !query ? (
          <p className="text-muted text-sm italic py-4">Start typing to search GitHub users.</p>
        ) : hits.length === 0 ? (
          <div className="py-4 space-y-3">
            <p className="text-muted text-sm">
              No GitHub user matches &quot;{query}&quot;.
            </p>
            <a
              href="https://github.com/join"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs inline-flex"
            >
              Invite them to join GitHub <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-xs text-muted">
              Share that link with them — once they create a GitHub account, search their username here to invite them in.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-rule/60">
            {hits.map(h => (
              <li key={h.login} className="flex items-center gap-3 py-2.5">
                <Image src={h.avatarUrl} alt={h.login} width={32} height={32} className="w-8 h-8 rounded shrink-0" unoptimized />
                <div className="flex-1 min-w-0">
                  <a href={h.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-paper font-mono text-sm hover:text-accent">
                    @{h.login}
                  </a>
                  {h.name && <p className="text-muted text-xs truncate">{h.name}</p>}
                </div>
                <button
                  className="btn-primary text-xs shrink-0"
                  onClick={() => handlePick(h)}
                  disabled={!!picking}
                >
                  {picking === h.login ? 'Working…' : ctaLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
