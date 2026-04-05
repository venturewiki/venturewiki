'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, StarOff, ExternalLink } from 'lucide-react'
import { fetchBusinesses, toggleFeatured } from '@/lib/api'
import { STAGE_LABELS, STAGE_COLORS, cn } from '@/lib/utils'
import type { BusinessPlan } from '@/types'
import { toast } from 'sonner'

export default function AdminFeatured() {
  const [all,     setAll]     = useState<BusinessPlan[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetchBusinesses({ pageSize: 100 }).then(businesses => {
      setAll(businesses)
      setLoading(false)
    })
  }
  useEffect(load, [])

  const featured    = all.filter(b => b.isFeatured)
  const notFeatured = all.filter(b => !b.isFeatured)

  const handle = async (id: string, cur: boolean) => {
    await toggleFeatured(id, !cur)
    toast.success(!cur ? '⭐ Added to featured' : 'Removed from featured')
    load()
  }

  const Card = ({ b }: { b: BusinessPlan }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-rule/20 hover:bg-rule/40 transition-colors">
      <span className="text-2xl shrink-0">{b.cover.logoEmoji || '🚀'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-paper font-medium text-sm truncate">{b.cover.companyName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={cn('badge text-[10px]', STAGE_COLORS[b.cover.stage])}>
            {STAGE_LABELS[b.cover.stage]}
          </span>
          <span className="text-muted text-xs truncate">{b.cover.tagline}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Link href={`/business/${b.slug}`} className="btn-ghost py-1 px-2" target="_blank">
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={() => handle(b.id, b.isFeatured)}
          className={cn('btn-ghost py-1 px-2', b.isFeatured ? 'text-gold hover:text-gold' : 'text-muted')}
        >
          {b.isFeatured ? <Star className="w-4 h-4 fill-gold" /> : <Star className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-paper flex items-center gap-2">
          <Star className="w-6 h-6 text-gold" /> Featured Businesses
        </h1>
        <p className="text-muted text-sm mt-0.5">
          Featured businesses appear at the top of the directory. Max recommended: 6.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currently featured */}
        <div className="section-card">
          <h2 className="font-display font-semibold text-paper mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-gold fill-gold" />
            Featured ({featured.length})
          </h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 shimmer rounded-lg" />)}</div>
          ) : featured.length === 0 ? (
            <p className="text-muted italic text-sm py-4 text-center">No featured businesses yet.<br/>Star some from the right →</p>
          ) : (
            <div className="space-y-2">{featured.map(b => <Card key={b.id} b={b} />)}</div>
          )}
        </div>

        {/* Not featured */}
        <div className="section-card">
          <h2 className="font-display font-semibold text-paper mb-4 flex items-center gap-2">
            <StarOff className="w-4 h-4 text-muted" />
            Not Featured ({notFeatured.length})
          </h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 shimmer rounded-lg" />)}</div>
          ) : notFeatured.length === 0 ? (
            <p className="text-muted italic text-sm py-4 text-center">All businesses are featured!</p>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {notFeatured.map(b => <Card key={b.id} b={b} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
