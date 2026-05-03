'use client'
import Link from 'next/link'
import { Eye, GitBranch, Clock, Star } from 'lucide-react'
import { cn, STAGE_LABELS, STAGE_COLORS, TYPE_ICONS, TYPE_LABELS, formatRelativeTime, formatNumber } from '@/lib/utils'
import type { BusinessPlan } from '@/types'

interface Props {
  business: BusinessPlan
  featured?: boolean
}

export default function BusinessCard({ business, featured }: Props) {
  const { cover } = business
  const accentColor = cover.accentColor || '#E8622A'

  const href = business.owner ? `/${business.owner}/${business.slug}` : `/business/${business.slug}`

  return (
    <Link href={href}>
      <article
        className={cn(
          'venture-card relative bg-lead border border-rule rounded-xl overflow-hidden cursor-pointer h-full',
          featured && 'ring-1 ring-gold/30'
        )}
      >
        {/* Color accent top bar */}
        <div className="h-0.5 w-full" style={{ background: accentColor }} />

        {/* Featured star */}
        {featured && (
          <div className="absolute top-3 right-3">
            <Star className="w-4 h-4 text-gold fill-gold" />
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: `${accentColor}18` }}
            >
              {cover.logoEmoji || TYPE_ICONS[cover.productType] || '🚀'}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-paper text-base leading-snug truncate pr-6">
                {cover.companyName || 'Untitled Business'}
              </h3>
              <p className="text-muted text-xs mt-0.5 truncate">
                {cover.industryVertical || cover.productType}
              </p>
            </div>
          </div>

          {/* Tagline */}
          {cover.tagline && (
            <p className="text-paper/70 text-sm leading-relaxed mb-3 line-clamp-2">
              {cover.tagline}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <span className={cn('badge text-[11px]', STAGE_COLORS[cover.stage])}>
              {STAGE_LABELS[cover.stage]}
            </span>
            <span className="badge bg-slate/30 text-paper/60 text-[11px]">
              {TYPE_ICONS[cover.productType]} {TYPE_LABELS[cover.productType]}
            </span>
            {cover.fundingSought && (
              <span className="badge bg-gold/15 text-gold text-[11px]">
                {cover.fundingSought}
              </span>
            )}
          </div>

          {/* Contributors avatars + stats */}
          <div className="flex items-center justify-between pt-3 border-t border-rule/50">
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {formatNumber(business.viewCount || 0)}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                {formatNumber(business.editCount || 0)}
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(business.updatedAt)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

/* Skeleton loader */
export function BusinessCardSkeleton() {
  return (
    <div className="bg-lead border border-rule rounded-xl overflow-hidden">
      <div className="h-0.5 shimmer" />
      <div className="p-5 space-y-3">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-xl shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 shimmer rounded w-3/4" />
            <div className="h-3 shimmer rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 shimmer rounded w-full" />
        <div className="h-3 shimmer rounded w-5/6" />
        <div className="flex gap-2">
          <div className="h-5 shimmer rounded-full w-16" />
          <div className="h-5 shimmer rounded-full w-20" />
        </div>
        <div className="pt-3 border-t border-rule/50 flex justify-between">
          <div className="h-3 shimmer rounded w-20" />
          <div className="h-3 shimmer rounded w-16" />
        </div>
      </div>
    </div>
  )
}
