'use client'
import { HandCoins } from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { InvestmentInterest } from '@/types'
import { Avatar } from './Avatar'

const STATUS_BADGE: Record<InvestmentInterest['status'], string> = {
  expressed:       'bg-amber-900/60 text-amber-300',
  'in-discussion': 'bg-blue-900/60 text-blue-300',
  committed:       'bg-emerald-900/60 text-emerald-300',
  withdrawn:       'bg-slate-700 text-slate-300',
}

export function InvestmentsTab({ investments }: { investments: InvestmentInterest[] }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="section-card">
        <h2 className="font-display font-bold text-paper mb-4 flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-gold" /> Investment Interest
        </h2>
        <p className="text-muted text-sm mb-4">
          Public ventures are open for investment pitches. Anyone can express interest or pitch to investors.
        </p>
        {investments.length === 0 ? (
          <p className="text-muted italic text-sm text-center py-8">No investment interest yet — be the first investor!</p>
        ) : (
          <div className="space-y-3">
            {investments.map(inv => (
              <div key={inv.id} className="flex items-start gap-3 p-3 bg-rule/20 rounded-lg">
                <Avatar src={inv.investorImage} name={inv.investorName} fallbackClass="bg-gold/20 text-gold" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-paper">{inv.investorName}</span>
                    {inv.amount && <span className="badge bg-gold/20 text-gold text-xs">{inv.amount}</span>}
                    <span className={cn('badge text-xs', STATUS_BADGE[inv.status])}>{inv.status}</span>
                  </div>
                  {inv.message && <p className="text-paper/70 text-sm">{inv.message}</p>}
                  {inv.terms && <p className="text-muted text-xs mt-1">Terms: {inv.terms}</p>}
                  <p className="text-muted text-xs mt-1">{formatRelativeTime(inv.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
