'use client'
import Link      from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import {
  LayoutDashboard, Globe, Users, Activity, Star,
  Settings, LogOut, ChevronLeft, Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin',          icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/admin/businesses',icon: Globe,           label: 'Businesses' },
  { href: '/admin/users',    icon: Users,            label: 'Users'      },
  { href: '/admin/activity', icon: Activity,         label: 'Activity'   },
  { href: '/admin/featured', icon: Star,             label: 'Featured'   },
]

export default function AdminSidebar() {
  const pathname       = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-56 shrink-0 bg-lead border-r border-rule flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-rule">
        <Link href="/" className="flex items-center gap-2 group mb-1">
          <ChevronLeft className="w-3.5 h-3.5 text-muted group-hover:text-paper transition-colors" />
          <span className="text-xs text-muted group-hover:text-paper transition-colors">Back to site</span>
        </Link>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-paper">Admin Panel</p>
            <p className="text-[10px] text-muted">VentureWiki</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={cn('nav-link', active && 'active')}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      {session && (
        <div className="px-3 py-4 border-t border-rule">
          <div className="flex items-center gap-2 mb-3">
            {session.user.image ? (
              <Image src={session.user.image} alt={session.user.name} width={28} height={28} className="rounded-full shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                {session.user.name[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-paper truncate">{session.user.name}</p>
              <p className="text-[10px] text-muted truncate">{session.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="nav-link w-full text-danger hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </aside>
  )
}
