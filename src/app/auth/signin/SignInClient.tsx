'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function SignInClient() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      {/* Grid bg */}
      <div className="absolute inset-0 bg-grid-ink bg-grid opacity-100 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent/6 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-4">
            <svg viewBox="0 0 28 28" fill="none" className="w-8 h-8">
              <path d="M4 6h5l5 12 5-12h5M4 18h20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="21" cy="8" r="2.5" fill="white"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-paper">VentureWiki</h1>
          <p className="text-muted mt-2 text-sm">The collaborative business plan encyclopedia</p>
        </div>

        {/* Card */}
        <div className="bg-lead border border-rule rounded-2xl p-8">
          <h2 className="font-display text-xl font-bold text-paper mb-1">Welcome back</h2>
          <p className="text-muted text-sm mb-7">Sign in to create and contribute to business plans</p>

          <button
            onClick={() => { setLoading(true); signIn('github', { callbackUrl: '/' }) }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white hover:bg-gray-50
                       text-gray-800 font-semibold rounded-xl transition-all active:scale-98
                       disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#24292f">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with GitHub'}
          </button>

          <p className="text-muted text-xs text-center mt-5 leading-relaxed">
            By signing in, you agree to contribute collaboratively and respectfully.
            First user automatically becomes admin.
          </p>
        </div>

        <p className="text-center text-muted/50 text-xs mt-6">
          venturewiki.io · Free forever · No credit card
        </p>
      </div>
    </div>
  )
}
