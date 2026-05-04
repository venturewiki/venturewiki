export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import BusinessCard from '@/components/business/BusinessCard'
import { getPublicOctokit } from '@/lib/github'
import { getCached, setCache } from '@/lib/cache'
import { readRepoYaml } from '@/lib/db/yaml'
import type { BusinessPlan, BusinessStage, ProductType } from '@/types'

interface Props {
  params: { owner: string }
}

async function getOwnerVentures(owner: string): Promise<BusinessPlan[]> {
  const cacheKey = `owner-ventures:${owner}`
  const cached = getCached<BusinessPlan[]>(cacheKey)
  if (cached) return cached

  const octokit = getPublicOctokit()

  // Check owner exists on GitHub first.
  let ownerType: 'User' | 'Organization' = 'User'
  try {
    const { data } = await octokit.rest.users.getByUsername({ username: owner })
    ownerType = data.type as 'User' | 'Organization'
  } catch {
    return []
  }

  // Search for repos belonging to this owner with the venturewiki topic.
  const { data: searchResult } = await octokit.rest.search.repos({
    q: `user:${owner} topic:venturewiki archived:false`,
    sort: 'updated',
    order: 'desc',
    per_page: 50,
  })

  const plans = await Promise.all(
    searchResult.items.map(async repo => {
      setCache(`owner:${repo.name}`, owner)
      const result = await readRepoYaml<any>(repo.name, '.venturewiki/plan.yaml')
      if (!result) return null
      const data = result.parseError
        ? {
            cover: {
              companyName: repo.name,
              tagline: `⚠ plan.yaml has a YAML error: ${result.parseError}`.slice(0, 200),
              stage: 'idea' as BusinessStage,
              productType: 'other' as ProductType,
            },
            _planError: result.parseError,
          }
        : result.data

      return {
        id: repo.name,
        slug: repo.name,
        owner,
        isPublic: !repo.private,
        starCount: repo.stargazers_count,
        forkCount: repo.forks_count,
        updatedAt: repo.updated_at ?? '',
        cover: {
          companyName: repo.name,
          stage: 'idea' as BusinessStage,
          productType: 'other' as ProductType,
          accentColor: '#E8622A',
          ...data?.cover,
        },
        ...data,
      } as BusinessPlan
    })
  )

  const result = plans.filter((p): p is BusinessPlan => p !== null)
  setCache(cacheKey, result, 60_000)
  return result
}

export default async function OwnerPage({ params }: Props) {
  const { owner } = params
  const ventures = await getOwnerVentures(owner)

  // If owner doesn't exist on GitHub at all (getOwnerVentures returns [] after failing the user lookup),
  // we can't distinguish "exists but 0 ventures" from "doesn't exist". Treat 0 as a valid empty state
  // rather than 404 — the breadcrumb link should always resolve.

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <nav className="text-xs text-muted mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-paper transition-colors">VentureWiki</Link>
            <span>/</span>
            <span className="text-paper font-mono">@{owner}</span>
          </nav>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://github.com/${owner}.png?size=64`}
              alt={owner}
              className="w-14 h-14 rounded-full border border-rule"
            />
            <div>
              <h1 className="font-display text-2xl font-bold text-paper">@{owner}</h1>
              <p className="text-muted text-sm mt-0.5">
                {ventures.length} public venture{ventures.length !== 1 ? 's' : ''} on VentureWiki
              </p>
            </div>
          </div>
        </div>

        {/* Ventures grid */}
        {ventures.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-lg mb-2">No public ventures yet.</p>
            <p className="text-sm">
              Ventures appear here once their repo has the{' '}
              <code className="font-mono bg-rule/40 px-1 rounded">venturewiki</code> topic on GitHub.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ventures.map(v => (
              <BusinessCard key={v.slug} business={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
