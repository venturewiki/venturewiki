'use client'
import { useEffect, useState } from 'react'
import { useSession }          from 'next-auth/react'
import { useRouter }           from 'next/navigation'
import Image                   from 'next/image'
import Link                    from 'next/link'
import { Edit3, Globe, GitBranch, Clock, ArrowLeft } from 'lucide-react'
import Navbar                  from '@/components/layout/Navbar'
import BusinessCard            from '@/components/business/BusinessCard'
import { subscribeBusinesses } from '@/lib/api'
import { formatRelativeTime, formatNumber } from '@/lib/utils'
import type { BusinessPlan }   from '@/types'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [businesses, setBusinesses] = useState<BusinessPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth/signin'); return }
    if (status !== 'authenticated')   return
    const unsub = subscribeBusinesses(all => {
      setBusinesses(all.filter(b => b.createdBy === session.user.id || b.contributors?.includes(session.user.id)))
      setLoading(false)
    })
    return unsub
  }, [status, session, router])

  if (status === 'loading' || !session) return (
    <div className="min-h-screen bg-ink flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const created      = businesses.filter(b => b.createdBy === session.user.id)
  const contributed  = businesses.filter(b => b.createdBy !== session.user.id && b.contributors?.includes(session.user.id))

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Back */}
        <button onClick={() => router.back()} className="btn-ghost p-2 mb-6">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Profile header */}
        <div className="bg-lead border border-rule rounded-2xl p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative">
            {session.user.image ? (
              <Image src={session.user.image} alt={session.user.name} width={80} height={80} className="rounded-2xl" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center text-accent text-3xl font-bold">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
            )}
            {session.user.role === 'admin' && (
              <span className="absolute -top-2 -right-2 badge bg-accent text-white text-[10px] px-2">Admin</span>
            )}
          </div>

          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-paper mb-1">{session.user.name}</h1>
            <p className="text-muted text-sm mb-4">{session.user.email}</p>

            <div className="flex flex-wrap gap-6">
              {[
                { icon: Globe,      label: 'Created',     value: formatNumber(created.length) },
                { icon: GitBranch,  label: 'Contributed', value: formatNumber(contributed.length) },
                { icon: Edit3,      label: 'Role',        value: session.user.role },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted" />
                  <span className="text-xs text-muted">{label}:</span>
                  <span className="text-sm font-semibold text-paper capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <Link href="/business/new" className="btn-primary shrink-0">
            + New Business
          </Link>
        </div>

        {/* Created businesses */}
        <section className="mb-10">
          <h2 className="font-display text-lg font-bold text-paper mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            My Business Plans
            <span className="ml-1 text-sm font-normal text-muted">({created.length})</span>
          </h2>
          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : created.length === 0 ? (
            <div className="bg-lead border border-rule rounded-xl p-8 text-center">
              <p className="text-muted text-sm mb-4">You haven't created any business plans yet.</p>
              <Link href="/business/new" className="btn-primary">Create your first plan</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {created.map(b => <BusinessCard key={b.id} business={b} />)}
            </div>
          )}
        </section>

        {/* Contributed */}
        {contributed.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold text-paper mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-teal" />
              Contributed To
              <span className="ml-1 text-sm font-normal text-muted">({contributed.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {contributed.map(b => <BusinessCard key={b.id} business={b} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
