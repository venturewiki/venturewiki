'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import BusinessCard, { BusinessCardSkeleton } from '@/components/business/BusinessCard'
import { subscribeBusinesses } from '@/lib/db'
import { STAGE_LABELS, TYPE_LABELS, cn } from '@/lib/utils'
import type { BusinessPlan, BusinessStage, ProductType } from '@/types'

const STAGES: BusinessStage[]   = ['idea','mvp','beta','live','scaling','exited']
const TYPES:  ProductType[]     = ['web-app','website','ai-agent','api','hybrid','other']

export default function SearchPage() {
  const params  = useSearchParams()
  const router  = useRouter()
  const [all,     setAll]     = useState<BusinessPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [query,   setQuery]   = useState(params.get('q') || '')
  const [stage,   setStage]   = useState<string>(params.get('stage') || '')
  const [type,    setType]    = useState<string>(params.get('type') || '')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const unsub = subscribeBusinesses(b => { setAll(b); setLoading(false) })
    return unsub
  }, [])

  const results = all.filter(b => {
    const q = query.toLowerCase()
    const matchQ = !q || [
      b.cover.companyName, b.cover.tagline, b.cover.industryVertical,
      b.problemSolution?.corePainPoint, b.cover.mission,
    ].some(v => v?.toLowerCase().includes(q))
    const matchStage = !stage || b.cover.stage === stage
    const matchType  = !type  || b.cover.productType === type
    return matchQ && matchStage && matchType
  })

  const clearAll = () => { setQuery(''); setStage(''); setType('') }
  const hasFilters = query || stage || type

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-paper mb-2">Search</h1>
          <p className="text-muted text-sm">
            {loading ? 'Loading…' : `${all.length} business plans in VentureWiki`}
          </p>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by company name, problem, industry…"
              className="input-base pl-10 text-base"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-paper transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn('btn-ghost gap-2', showFilters && 'border-accent/40 text-accent')}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {(stage || type) && (
              <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-lead border border-rule rounded-xl p-4 mb-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Stage</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStage(stage === s ? '' : s)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                        stage === s
                          ? 'border-accent bg-accent/20 text-accent'
                          : 'border-rule text-muted hover:border-muted hover:text-paper'
                      )}
                    >{STAGE_LABELS[s]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Product Type</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setType(type === t ? '' : t)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                        type === t
                          ? 'border-accent bg-accent/20 text-accent'
                          : 'border-rule text-muted hover:border-muted hover:text-paper'
                      )}
                    >{TYPE_LABELS[t]}</button>
                  ))}
                </div>
              </div>
            </div>
            {hasFilters && (
              <button onClick={clearAll} className="mt-3 text-xs text-muted hover:text-accent transition-colors flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-display text-xl font-bold text-paper mb-2">No results found</h3>
            <p className="text-muted text-sm mb-6">
              {hasFilters ? 'Try adjusting your filters or search term.' : 'Be the first to add a business plan!'}
            </p>
            {hasFilters && (
              <button onClick={clearAll} className="btn-ghost">Clear filters</button>
            )}
            <Link href="/business/new" className="btn-primary ml-3">Add a Business</Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''}
              {query && <> for "<span className="text-paper">{query}</span>"</>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map(b => <BusinessCard key={b.id} business={b} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
