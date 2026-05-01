import type { AdminStats, BusinessStage, ProductType } from '@/types'
import { getBusinesses, getEditHistory } from './businesses'
import { getAllUsers } from './users'

export async function getAdminStats(): Promise<AdminStats> {
  const [{ businesses }, users] = await Promise.all([
    getBusinesses({ pageSize: 100 }),
    getAllUsers(),
  ])

  const byStage: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let totalViews = 0
  let totalEdits = 0

  for (const b of businesses) {
    const stage = b.cover?.stage ?? 'idea'
    const type = b.cover?.productType ?? 'other'
    byStage[stage] = (byStage[stage] ?? 0) + 1
    byType[type] = (byType[type] ?? 0) + 1
    totalViews += b.viewCount ?? 0
    totalEdits += b.editCount ?? 0
  }

  const recentActivity: AdminStats['recentActivity'] = []
  for (const biz of businesses.slice(0, 5)) {
    try {
      const history = await getEditHistory(biz.slug)
      for (const h of history.slice(0, 3)) {
        recentActivity.push({
          type: 'edit',
          userId: h.userId,
          userName: h.userName,
          userImage: h.userImage,
          businessId: biz.id,
          businessName: biz.cover.companyName,
          timestamp: h.timestamp,
        })
      }
    } catch {}
  }
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const topContributors = users
    .sort((a, b) => (b.editsCount ?? 0) - (a.editsCount ?? 0))
    .slice(0, 5)
    .map(u => ({
      userId: u.id,
      userName: u.name || u.login,
      userImage: u.image,
      editsCount: u.editsCount ?? 0,
    }))

  return {
    totalBusinesses: businesses.length,
    totalUsers: users.length,
    totalEdits,
    totalViews,
    businessesByStage: byStage as Record<BusinessStage, number>,
    businessesByType: byType as Record<ProductType, number>,
    recentActivity: recentActivity.slice(0, 10),
    topContributors,
    monthlyGrowth: [],
  }
}
