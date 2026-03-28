'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Search, Plus, ChevronDown, LayoutDashboard, LogOut, User, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-ink/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-7 h-7 relative">
            <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
              <rect width="28" height="28" rx="6" fill="#E8622A"/>
              <path d="M7 8h4l3 8 3-8h4M7 20h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="21" cy="10" r="2" fill="white"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg text-paper group-hover:text-accent transition-colors">
            Venture<span className="text-accent">Wiki</span>
          </span>
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-md hidden sm:block">
          <Link
            href="/search"
            className="flex items-center gap-2 px-3 py-1.5 bg-lead border border-rule rounded-lg
                       text-muted text-sm hover:border-accent/40 hover:text-paper/70 transition-all w-full"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span>Search businesses…</span>
            <kbd className="ml-auto text-xs bg-rule/60 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              <Link href="/business/new" className="btn-primary hidden sm:inline-flex">
                <Plus className="w-4 h-4" /> New Business
              </Link>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-lead transition-colors"
                >
                  {session.user.image ? (
                    <Image src={session.user.image} alt={session.user.name} width={28} height={28} className="rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
                      {session.user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-paper/80 hidden md:block max-w-[120px] truncate">
                    {session.user.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-lead border border-rule rounded-xl shadow-2xl z-20 py-1 overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-rule">
                        <p className="text-xs text-muted">Signed in as</p>
                        <p className="text-sm font-medium text-paper truncate">{session.user.email}</p>
                        {session.user.role === 'admin' && (
                          <span className="badge bg-accent/20 text-accent mt-1">Admin</span>
                        )}
                      </div>
                      <Link href={`/profile`} className="nav-link mx-1 my-0.5" onClick={() => setMenuOpen(false)}>
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      {session.user.role === 'admin' && (
                        <Link href="/admin" className="nav-link mx-1 my-0.5 text-accent hover:text-accent" onClick={() => setMenuOpen(false)}>
                          <Shield className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-rule mt-1 pt-1">
                        <button
                          onClick={() => { signOut(); setMenuOpen(false) }}
                          className="nav-link mx-1 w-[calc(100%-8px)] text-danger hover:text-danger hover:bg-danger/10"
                        >
                          <LogOut className="w-4 h-4" /> Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => signIn('google')} className="btn-primary">
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
