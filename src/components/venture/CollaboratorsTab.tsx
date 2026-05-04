'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { fetchCollaboratorsData, type CollaboratorsData } from '@/lib/api'
import { Loader2, Users, Mail, Shield, UserPlus } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function CollaboratorsTab({
  businessId,
  canEdit,
  onInvite,
}: {
  businessId: string
  canEdit: boolean
  onInvite: () => void
}) {
  const [data, setData] = useState<CollaboratorsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCollaboratorsData(businessId).then(res => {
      if (res) setData(res)
      setLoading(false)
    })
  }, [businessId])

  if (loading) {
    return (
      <div className="py-12 flex justify-center text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted">
        Failed to load collaborators. You may need to sign in again.
      </div>
    )
  }

  const { collaborators, invitations, teams } = data

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-display font-bold text-paper text-lg">Collaborators and teams</h2>
          <p className="text-muted text-sm">People and teams with access to this venture&apos;s repository.</p>
        </div>
        {canEdit && (
          <button className="btn-primary flex items-center gap-2" onClick={onInvite}>
            <UserPlus className="w-4 h-4" /> Invite collaborator
          </button>
        )}
      </div>

      {teams.length > 0 && (
        <div className="section-card">
          <h3 className="font-display font-semibold text-paper mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" /> Teams ({teams.length})
          </h3>
          <ul className="divide-y divide-rule/50 border border-rule/50 rounded-lg overflow-hidden">
            {teams.map(team => (
              <li key={team.slug} className="p-4 bg-ink flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-rule/30 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-paper font-medium text-sm">@{team.slug}</p>
                  {team.description && <p className="text-muted text-xs truncate">{team.description}</p>}
                </div>
                <div className="shrink-0 text-xs text-muted border border-rule px-2 py-1 rounded">
                  {team.permission}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="section-card">
          <h3 className="font-display font-semibold text-paper mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" /> Pending Invitations ({invitations.length})
          </h3>
          <ul className="divide-y divide-rule/50 border border-rule/50 rounded-lg overflow-hidden">
            {invitations.map(inv => (
              <li key={inv.id} className="p-4 bg-ink flex items-center gap-4 opacity-75">
                <Image
                  src={inv.invitee.avatar_url}
                  alt={inv.invitee.login}
                  width={40}
                  height={40}
                  className="rounded-full shrink-0"
                  unoptimized
                />
                <div className="flex-1 min-w-0">
                  <a href={inv.invitee.html_url} target="_blank" rel="noreferrer" className="text-paper font-medium text-sm hover:underline">
                    @{inv.invitee.login}
                  </a>
                  <p className="text-muted text-xs truncate">Invited {formatRelativeTime(inv.created_at)}</p>
                </div>
                <div className="shrink-0 text-xs text-muted border border-rule px-2 py-1 rounded">
                  {inv.permissions}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="section-card">
        <h3 className="font-display font-semibold text-paper mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" /> Collaborators ({collaborators.length})
        </h3>
        {collaborators.length === 0 ? (
          <p className="text-sm text-muted">No direct collaborators.</p>
        ) : (
          <ul className="divide-y divide-rule/50 border border-rule/50 rounded-lg overflow-hidden">
            {collaborators.map(c => (
              <li key={c.login} className="p-4 bg-ink flex items-center gap-4">
                <Image
                  src={c.avatar_url}
                  alt={c.login}
                  width={40}
                  height={40}
                  className="rounded-full shrink-0"
                  unoptimized
                />
                <div className="flex-1 min-w-0">
                  <a href={c.html_url} target="_blank" rel="noreferrer" className="text-paper font-medium text-sm hover:underline">
                    @{c.login}
                  </a>
                  {c.role_name && <p className="text-muted text-xs truncate">{c.role_name}</p>}
                </div>
                <div className="shrink-0 text-xs text-muted border border-rule px-2 py-1 rounded capitalize">
                  {c.permissions.admin ? 'Admin' : c.permissions.push ? 'Write' : c.permissions.pull ? 'Read' : 'None'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  )
}
