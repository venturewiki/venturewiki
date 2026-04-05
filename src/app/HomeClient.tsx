'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Plus, Zap, Globe, Bot, TrendingUp, ArrowRight, Filter } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import BusinessCard, { BusinessCardSkeleton } from '@/components/business/BusinessCard'
import { subscribeBusinesses } from '@/lib/api'
import { STAGE_LABELS, TYPE_LABELS } from '@/lib/utils'
import type { BusinessPlan, BusinessStage, ProductType } from '@/types'

const STAGE_FILTERS = ['all', 'idea', 'mvp', 'beta', 'live', 'scaling'] as const
const TYPE_FILTERS  = ['all', 'web-app', 'website', 'ai-agent', 'api', 'hybrid'] as const

export default function HomePage() {
  const { data: session } = useSession()
  const [businesses, setBusinesses] = useState<BusinessPlan[]>([])
  const [loading, setLoading]       = useState(true)
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter]   = useState<string>('all')
  const [search, setSearch]           = useState('')

  useEffect(() => {
    const unsub = subscribeBusinesses(data => {
      setBusinesses(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtered = businesses.filter(b => {
    if (stageFilter !== 'all' && b.cover.stage !== stageFilter) return false
    if (typeFilter  !== 'all' && b.cover.productType !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        b.cover.companyName.toLowerCase().includes(q) ||
        b.cover.tagline?.toLowerCase().includes(q) ||
        b.cover.industryVertical?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const featured  = businesses.filter(b => b.isFeatured).slice(0, 3)
  const totalLive = businesses.filter(b => b.cover.stage === 'live' || b.cover.stage === 'scaling').length

  return (
    <div className="min-h-screen bg-ink grain">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-rule overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid-ink bg-grid opacity-100 pointer-events-none" />
        {/* Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/8 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="badge bg-accent/20 text-accent text-xs tracking-wide">
                COLLABORATIVE · OPEN · FREE
              </span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-paper leading-[1.05] mb-5">
              The Encyclopedia of
              <br />
              <span className="text-accent">Digital Ventures</span>
            </h1>

            <p className="text-paper/60 text-lg md:text-xl leading-relaxed mb-8 max-w-2xl">
              Build, iterate, and share structured business plans for Web Apps, Websites,
              and AI Agents — collaboratively, like a wiki.
            </p>

            <div className="flex flex-wrap gap-3">
              {session ? (
                <Link href="/business/new" className="btn-primary text-base px-6 py-3">
                  <Plus className="w-5 h-5" /> New Business Plan
                </Link>
              ) : (
                <Link href="/api/auth/signin" className="btn-primary text-base px-6 py-3">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link href="#directory" className="btn-outline text-base px-6 py-3">
                Browse {businesses.length} businesses
              </Link>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-rule/50">
              {[
                { icon: Globe,       label: 'Web Apps & Sites',  value: businesses.filter(b => ['web-app','website'].includes(b.cover.productType)).length },
                { icon: Bot,         label: 'AI Agents',         value: businesses.filter(b => b.cover.productType === 'ai-agent').length },
                { icon: TrendingUp,  label: 'Live / Scaling',    value: totalLive },
                { icon: Zap,         label: 'Total Plans',       value: businesses.length },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-accent" />
                  <span className="font-display font-bold text-paper text-lg">{value}</span>
                  <span className="text-muted text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured ──────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="border-b border-rule">
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-gold" />
              <h2 className="font-display font-bold text-paper text-lg">Featured Ventures</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(b => <BusinessCard key={b.id} business={b} featured />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Directory ─────────────────────────────────────────────────────── */}
      <section id="directory" className="max-w-7xl mx-auto px-4 py-10">
        {/* Header + filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <h2 className="font-display font-bold text-paper text-lg">All Ventures</h2>
            <span className="badge bg-rule text-muted ml-1">{filtered.length}</span>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, vertical…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base sm:w-64 py-2"
          />
        </div>

        {/* Stage filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {STAGE_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                stageFilter === s
                  ? 'bg-accent text-white border-accent'
                  : 'border-rule text-muted hover:text-paper hover:border-muted'
              }`}
            >
              {s === 'all' ? 'All Stages' : STAGE_LABELS[s as BusinessStage]}
            </button>
          ))}
          <span className="text-rule mx-1">|</span>
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                typeFilter === t
                  ? 'bg-teal/80 text-ink border-teal'
                  : 'border-rule text-muted hover:text-paper hover:border-muted'
              }`}
            >
              {t === 'all' ? 'All Types' : TYPE_LABELS[t as ProductType]}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🔭</div>
            <h3 className="font-display text-xl font-bold text-paper mb-2">Nothing here yet</h3>
            <p className="text-muted mb-6">
              {search ? `No results for "${search}"` : 'Be the first to add a business plan'}
            </p>
            {session && (
              <Link href="/business/new" className="btn-primary">
                <Plus className="w-4 h-4" /> Add the first one
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
            {filtered.map(b => <BusinessCard key={b.id} business={b} />)}
          </div>
        )}
      </section>
    </div>
  )
}
