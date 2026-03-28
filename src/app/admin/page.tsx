'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Globe, Users, GitBranch, Eye, TrendingUp, Star,
  Plus, ArrowRight, Activity, Zap
} from 'lucide-react'
import { getAdminStats, getBusinesses } from '@/lib/db'
import { formatNumber, formatRelativeTime, STAGE_LABELS, TYPE_LABELS } from '@/lib/utils'
import type { AdminStats, BusinessPlan, BusinessStage, ProductType } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'

const COLORS = ['#E8622A','#00B4A0','#D4A843','#5B4EFA','#1DB87A','#E84040']

function StatCard({ icon: Icon, label, value, sub, color = 'text-accent' }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="section-card flex items-start gap-4">
      <div className={`p-2.5 rounded-lg bg-current/10 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-muted text-xs mb-0.5">{label}</p>
        <p className="font-display font-bold text-paper text-2xl">{formatNumber(Number(value) || 0)}</p>
        {sub && <p className="text-muted text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats]           = useState<AdminStats | null>(null)
  const [recent, setRecent]         = useState<BusinessPlan[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      getBusinesses({ pageSize: 5 }),
    ]).then(([s, { businesses }]) => {
      setStats(s)
      setRecent(businesses)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="p-8 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 shimmer rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1,2].map(i => <div key={i} className="h-64 shimmer rounded-xl" />)}
      </div>
    </div>
  )

  const stageData = Object.entries(stats?.businessesByStage || {}).map(([k, v]) => ({
    name: STAGE_LABELS[k as BusinessStage] || k, value: v
  }))

  const typeData = Object.entries(stats?.businessesByType || {}).map(([k, v]) => ({
    name: TYPE_LABELS[k as ProductType] || k, value: v
  }))

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-paper">Dashboard</h1>
          <p className="text-muted text-sm mt-0.5">Welcome back. Here's what's happening.</p>
        </div>
        <Link href="/business/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Business
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Globe}      label="Total Businesses" value={stats?.totalBusinesses || 0}  sub="across all stages"      color="text-accent" />
        <StatCard icon={Users}      label="Registered Users" value={stats?.totalUsers || 0}       sub="contributors"           color="text-teal" />
        <StatCard icon={GitBranch}  label="Total Edits"      value={stats?.totalEdits || 0}       sub="wiki contributions"     color="text-gold" />
        <StatCard icon={Eye}        label="Total Views"      value={stats?.totalViews || 0}       sub="across all businesses"  color="text-emerald-400" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* Businesses by stage */}
        <div className="section-card">
          <h2 className="font-display font-semibold text-paper text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" /> By Stage
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stageData} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: '#7A7A96', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7A7A96', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1C1C28', border: '1px solid #2E2E40', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#F7F5F0' }}
                cursor={{ fill: 'rgba(232,98,42,0.05)' }}
              />
              <Bar dataKey="value" fill="#E8622A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By type */}
        <div className="section-card">
          <h2 className="font-display font-semibold text-paper text-sm mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal" /> By Type
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}
                fontSize={9}
              >
                {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1C1C28', border: '1px solid #2E2E40', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top contributors */}
        <div className="section-card">
          <h2 className="font-display font-semibold text-paper text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold" /> Top Contributors
          </h2>
          <div className="space-y-3">
            {stats?.topContributors?.length ? (
              stats.topContributors.map((c, i) => (
                <div key={c.userId} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted w-4">{i + 1}</span>
                  {c.userImage ? (
                    <Image src={c.userImage} alt={c.userName} width={26} height={26} className="rounded-full shrink-0" />
                  ) : (
                    <div className="w-6.5 h-6.5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold shrink-0">
                      {c.userName?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-paper/80 text-sm flex-1 truncate">{c.userName}</span>
                  <span className="badge bg-rule text-muted text-xs">{c.editsCount} edits</span>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm italic">No contributors yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent businesses */}
        <div className="section-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-paper text-sm">Recent Businesses</h2>
            <Link href="/admin/businesses" className="text-xs text-accent hover:text-accent-light flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map(b => (
              <Link key={b.id} href={`/business/${b.slug}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-rule/30 transition-colors group"
              >
                <span className="text-xl shrink-0">{b.cover.logoEmoji || '🚀'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-paper/90 text-sm font-medium group-hover:text-accent transition-colors truncate">
                    {b.cover.companyName}
                  </p>
                  <p className="text-muted text-xs truncate">{b.cover.industryVertical || b.cover.productType}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted">{formatRelativeTime(b.updatedAt)}</p>
                  <p className="text-xs text-muted flex items-center gap-1 justify-end mt-0.5">
                    <Eye className="w-3 h-3" />{formatNumber(b.viewCount || 0)}
                  </p>
                </div>
              </Link>
            ))}
            {recent.length === 0 && <p className="text-muted italic text-sm">No businesses yet</p>}
          </div>
        </div>

        {/* Recent activity */}
        <div className="section-card">
          <h2 className="font-display font-semibold text-paper text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" /> Recent Activity
          </h2>
          <div className="space-y-0 divide-y divide-rule/40">
            {stats?.recentActivity?.length ? (
              stats.recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-paper/80 text-xs">
                      <span className="font-medium text-paper">{a.userName || 'Someone'}</span>
                      {' '}{a.type === 'edit' ? 'edited' : a.type === 'create' ? 'created' : 'joined'}
                      {a.businessName && <span className="text-accent"> {a.businessName}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted shrink-0">{formatRelativeTime(a.timestamp)}</span>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm italic pt-2">No activity recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
