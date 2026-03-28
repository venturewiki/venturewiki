'use client'
import { useEffect, useState } from 'react'
import { Activity, GitBranch, MessageSquare, UserPlus, Plus } from 'lucide-react'
import { getAdminStats } from '@/lib/db'
import { formatRelativeTime } from '@/lib/utils'
import type { AdminStats } from '@/types'

const typeConfig = {
  edit:    { icon: GitBranch,    color: 'text-accent',  bg: 'bg-accent/10',   label: 'edited' },
  create:  { icon: Plus,         color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'created' },
  comment: { icon: MessageSquare, color: 'text-teal',   bg: 'bg-teal/10',     label: 'commented on' },
  signup:  { icon: UserPlus,     color: 'text-gold',    bg: 'bg-gold/10',     label: 'joined' },
}

export default function AdminActivity() {
  const [stats, setStats]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats().then(s => { setStats(s); setLoading(false) })
  }, [])

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-paper flex items-center gap-2">
          <Activity className="w-6 h-6 text-accent" /> Activity Feed
        </h1>
        <p className="text-muted text-sm mt-0.5">Recent contributions across all businesses</p>
      </div>

      <div className="section-card p-0">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full shimmer shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 shimmer rounded w-2/3" />
                  <div className="h-3 shimmer rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !stats?.recentActivity?.length ? (
          <div className="text-center py-16">
            <Activity className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted italic">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-rule/40">
            {stats.recentActivity.map((a, i) => {
              const cfg = typeConfig[a.type] || typeConfig.edit
              const Icon = cfg.icon
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-rule/20 transition-colors">
                  <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-paper/90">
                      <span className="font-semibold text-paper">{a.userName || 'Someone'}</span>
                      {' '}<span className="text-muted">{cfg.label}</span>
                      {a.businessName && (
                        <span className="text-accent font-medium"> {a.businessName}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{formatRelativeTime(a.timestamp)}</p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-rule/60 mt-2 shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
