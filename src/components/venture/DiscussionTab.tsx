'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { formatRelativeTime } from '@/lib/utils'
import type { Comment } from '@/types'
import { Avatar } from './Avatar'

export function DiscussionTab({
  comments, value, onChange, onPost,
}: {
  comments: Comment[]
  value: string
  onChange: (v: string) => void
  onPost: () => void | Promise<void>
}) {
  const { data: session } = useSession()

  return (
    <div className="space-y-4 animate-fade-in">
      {session ? (
        <div className="section-card">
          <p className="text-xs text-muted mb-2">
            Type <code className="font-mono bg-rule/40 px-1 rounded">@username</code> to mention a GitHub user — GitHub will notify them on the issue thread.
          </p>
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Leave a comment or feedback. Use @username to mention someone…"
            rows={3}
            className="input-base resize-none"
          />
          <button onClick={onPost} className="btn-primary mt-3" disabled={!value.trim()}>
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
            <Avatar src={c.userImage} name={c.userName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-paper">{c.userName}</span>
                <span className="text-xs text-muted">{formatRelativeTime(c.createdAt)}</span>
              </div>
              <p className="text-paper/70 text-sm leading-relaxed">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-muted italic text-sm text-center py-8">No comments yet — start the discussion!</p>
        )}
      </div>
    </div>
  )
}
