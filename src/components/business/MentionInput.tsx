'use client'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { searchGithubUsers, type GhUserHit } from '@/lib/api'

/**
 * Textarea with @mention autocomplete against GitHub's user search.
 * - Type "@" to open the picker; keep typing to refine.
 * - Arrow keys + Enter to insert the selected `@username` at the cursor.
 * - Escape closes the picker.
 * - When the search returns no hits, a footer link points to github.com/join.
 */
export default function MentionInput({
  value, onChange, placeholder, rows = 3, disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<GhUserHit[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const [triggerStart, setTriggerStart] = useState<number | null>(null)

  // Detect an "@" trigger immediately before the caret and capture the partial query
  const onValueChange = (newVal: string) => {
    onChange(newVal)
    const ta = taRef.current
    const pos = ta?.selectionStart ?? newVal.length
    // Walk back from caret looking for an @ that starts a word (prev char is space/newline/start)
    let i = pos - 1
    while (i >= 0 && /[A-Za-z0-9_-]/.test(newVal[i])) i--
    if (i >= 0 && newVal[i] === '@' && (i === 0 || /\s/.test(newVal[i - 1]))) {
      const q = newVal.slice(i + 1, pos)
      setTriggerStart(i)
      setQuery(q)
      setOpen(true)
      setActive(0)
    } else {
      setOpen(false)
      setTriggerStart(null)
      setQuery('')
    }
  }

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (!query) { setHits([]); return }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      const res = await searchGithubUsers(query)
      if (!cancelled) {
        setHits(res)
        setLoading(false)
        setActive(0)
      }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, query])

  const insert = (login: string) => {
    if (triggerStart === null) return
    const ta = taRef.current
    const pos = ta?.selectionStart ?? value.length
    const before = value.slice(0, triggerStart)
    const after = value.slice(pos)
    const newVal = `${before}@${login} ${after}`
    onChange(newVal)
    setOpen(false)
    setTriggerStart(null)
    // Restore caret just after the inserted mention + space
    requestAnimationFrame(() => {
      const newCaret = before.length + 1 + login.length + 1
      ta?.focus()
      ta?.setSelectionRange(newCaret, newCaret)
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || hits.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, hits.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insert(hits[active].login)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onValueChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className="input-base resize-none"
      />
      {open && (
        <div className="absolute left-0 right-0 mt-1 z-30 bg-lead border border-rule rounded-lg shadow-xl max-h-72 overflow-auto">
          {loading && hits.length === 0 ? (
            <div className="p-3 text-xs text-muted">Searching GitHub for &quot;{query}&quot;…</div>
          ) : hits.length === 0 ? (
            <div className="p-3 text-xs text-muted">
              No GitHub user matches &quot;{query}&quot;.{' '}
              <a
                href="https://github.com/join"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline inline-flex items-center gap-1"
              >
                Invite them to GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <ul>
              {hits.map((h, i) => (
                <li key={h.login}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); insert(h.login) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      i === active ? 'bg-accent/15 text-accent' : 'text-paper hover:bg-rule/30'
                    }`}
                  >
                    <Image src={h.avatarUrl} alt={h.login} width={24} height={24} className="w-6 h-6 rounded shrink-0" unoptimized />
                    <span className="font-mono text-sm">@{h.login}</span>
                    {h.name && <span className="text-xs text-muted truncate">{h.name}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
