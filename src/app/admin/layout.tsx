export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { redirect }         from 'next/navigation'
import { authOptions }       from '@/lib/auth'
import AdminSidebar          from './AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/')
  return (
    <div className="min-h-screen bg-ink flex">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
