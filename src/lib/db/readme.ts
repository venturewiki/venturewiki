import type { BusinessPlan } from '@/types'

// Topics applied to the GitHub repo so the directory listing search
// ("topic:venturewiki ...") can filter without touching plan.yaml.
export function planToTopics(plan: BusinessPlan): string[] {
  const topics = ['venturewiki']
  if (plan.cover?.stage) topics.push(`stage-${plan.cover.stage}`)
  if (plan.cover?.productType) topics.push(`type-${plan.cover.productType}`)
  if (plan.cover?.fundingStage) topics.push(`funding-${plan.cover.fundingStage}`)
  if (plan.isFeatured) topics.push('venturewiki-featured')
  if (plan.cover?.industryVertical) {
    topics.push(plan.cover.industryVertical.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }
  return topics.slice(0, 20)
}
