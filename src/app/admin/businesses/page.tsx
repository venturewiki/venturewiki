'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Edit3, Star, Archive, Plus, Search, GitBranch } from 'lucide-react'
import { getBusinesses, toggleFeatured, archiveBusiness } from '@/lib/db'
import { STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, formatRelativeTime, formatNumber, cn } from '@/lib/utils'
import type { BusinessPlan } from '@/types'
import { toast } from 'sonner'

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<BusinessPlan[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  const load = () => {
    setLoading(true)
    getBusinesses({ pageSize: 100 }).then(({ businesses: b }) => {
      setBusinesses(b)
      setLoading(false)
    })
  }

  useEffect(load, [])

  const filtered = businesses.filter(b =>
    !search ||
    b.cover.companyName.toLowerCase().includes(search.toLowerCase()) ||
    b.cover.industryVertical?.toLowerCase().includes(search.toLowerCase())
  )

  const handleFeature = async (id: string, cur: boolean) => {
    await toggleFeatured(id, !cur)
    toast.success(!cur ? 'Marked as featured' : 'Removed from featured')
    load()
  }

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archive "${name}"? It will be hidden from the directory.`)) return
    await archiveBusiness(id)
    toast.success('Business archived')
    load()
  }

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-paper">Businesses</h1>
          <p className="text-muted text-sm mt-0.5">{businesses.length} total plans in the wiki</p>
        </div>
        <Link href="/business/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or industry…"
          className="input-base pl-9"
        />
      </div>

      {/* Table */}
      <div className="section-card overflow-x-auto p-0">
        <table className="wiki-table">
          <thead>
            <tr>
              <th className="pl-4">Business</th>
              <th>Stage</th>
              <th>Type</th>
              <th>Views</th>
              <th>Edits</th>
              <th>Updated</th>
              <th className="text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="h-4 shimmer rounded w-3/4" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted italic">No businesses found</td></tr>
            ) : (
              filtered.map(b => (
                <tr key={b.id} className="group">
                  <td className="pl-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{b.cover.logoEmoji || '🚀'}</span>
                      <div className="min-w-0">
                        <Link href={`/business/${b.slug}`} className="font-medium text-paper hover:text-accent transition-colors block truncate max-w-[200px]">
                          {b.cover.companyName}
                        </Link>
                        <p className="text-muted text-xs truncate max-w-[200px]">{b.cover.tagline}</p>
                      </div>
                      {b.isFeatured && <Star className="w-3.5 h-3.5 text-gold fill-gold shrink-0" />}
                    </div>
                  </td>
                  <td>
                    <span className={cn('badge text-xs', STAGE_COLORS[b.cover.stage])}>
                      {STAGE_LABELS[b.cover.stage]}
                    </span>
                  </td>
                  <td className="text-paper/60 text-xs">{TYPE_LABELS[b.cover.productType]}</td>
                  <td>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Eye className="w-3 h-3" />{formatNumber(b.viewCount || 0)}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <GitBranch className="w-3 h-3" />{formatNumber(b.editCount || 0)}
                    </span>
                  </td>
                  <td className="text-xs text-muted whitespace-nowrap">{formatRelativeTime(b.updatedAt)}</td>
                  <td className="pr-4">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/business/${b.slug}/edit`} className="btn-ghost py-1 px-2 text-xs">
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleFeature(b.id, b.isFeatured)}
                        className={cn('btn-ghost py-1 px-2 text-xs', b.isFeatured && 'text-gold')}
                        title="Toggle featured"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchive(b.id, b.cover.companyName)}
                        className="btn-ghost py-1 px-2 text-xs text-danger hover:bg-danger/10"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
