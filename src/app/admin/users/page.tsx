'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Shield, Edit3, Users } from 'lucide-react'
import { fetchAllUsers, updateUserRole } from '@/lib/api'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { VWUser } from '@/types'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

const ROLE_COLORS = {
  admin:  'bg-accent/20 text-accent',
  editor: 'bg-teal/20 text-teal',
  viewer: 'bg-rule text-muted',
}

export default function AdminUsers() {
  const { data: session }   = useSession()
  const [users, setUsers]   = useState<VWUser[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetchAllUsers().then(u => { setUsers(u); setLoading(false) })
  }
  useEffect(load, [])

  const handleRole = async (user: VWUser, newRole: VWUser['role']) => {
    if (user.id === session?.user.id && newRole !== 'admin') {
      toast.error("You can't demote yourself")
      return
    }
    await updateUserRole(user.id, newRole)
    toast.success(`${user.name} is now ${newRole}`)
    load()
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-paper flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" /> Users
          </h1>
          <p className="text-muted text-sm mt-0.5">{users.length} registered members</p>
        </div>
      </div>

      {/* Role legend */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {(['admin', 'editor', 'viewer'] as const).map(r => (
          <div key={r} className="flex items-center gap-1.5">
            <span className={cn('badge text-xs', ROLE_COLORS[r])}>{r}</span>
            <span className="text-muted text-xs">
              {r === 'admin'  ? 'Full access + admin panel' :
               r === 'editor' ? 'Can create + edit plans' :
               'Read-only access'}
            </span>
          </div>
        ))}
      </div>

      <div className="section-card overflow-x-auto p-0">
        <table className="wiki-table">
          <thead>
            <tr>
              <th className="pl-4">User</th>
              <th>Role</th>
              <th>Plans Created</th>
              <th>Total Edits</th>
              <th>Last Active</th>
              <th>Joined</th>
              <th className="pr-4 text-right">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className="h-4 shimmer rounded w-3/4" /></td>
                ))}</tr>
              ))
            ) : users.map(u => (
              <tr key={u.id} className="group">
                <td className="pl-4">
                  <div className="flex items-center gap-2.5">
                    {u.image ? (
                      <Image src={u.image} alt={u.name} width={30} height={30} className="rounded-full shrink-0" />
                    ) : (
                      <div className="w-7.5 h-7.5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-paper text-sm font-medium truncate">{u.name}</p>
                      <p className="text-muted text-xs truncate">{u.email}</p>
                    </div>
                    {u.id === session?.user.id && (
                      <span className="badge bg-rule text-muted text-[10px]">You</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={cn('badge text-xs', ROLE_COLORS[u.role])}>{u.role}</span>
                </td>
                <td className="text-paper/60 text-sm font-mono">{u.businessesCreated || 0}</td>
                <td className="text-paper/60 text-sm font-mono">{u.editsCount || 0}</td>
                <td className="text-muted text-xs whitespace-nowrap">{formatRelativeTime(u.lastActiveAt)}</td>
                <td className="text-muted text-xs whitespace-nowrap">{formatRelativeTime(u.createdAt)}</td>
                <td className="pr-4">
                  <select
                    value={u.role}
                    onChange={e => handleRole(u, e.target.value as VWUser['role'])}
                    className="bg-lead border border-rule rounded-md text-xs text-paper px-2 py-1 focus:outline-none focus:border-accent transition-colors"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
