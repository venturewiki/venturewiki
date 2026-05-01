import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { BusinessStage, ProductType } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STAGE_LABELS: Record<BusinessStage, string> = {
  idea:    'Idea',
  mvp:     'MVP',
  beta:    'Beta',
  live:    'Live',
  scaling: 'Scaling',
  exited:  'Exited',
}

export const STAGE_COLORS: Record<BusinessStage, string> = {
  idea:    'bg-slate-700 text-slate-200',
  mvp:     'bg-blue-900/60 text-blue-300',
  beta:    'bg-amber-900/60 text-amber-300',
  live:    'bg-emerald-900/60 text-emerald-300',
  scaling: 'bg-teal-900/60 text-teal-300',
  exited:  'bg-purple-900/60 text-purple-300',
}

export const TYPE_LABELS: Record<ProductType, string> = {
  'web-app':  'Web App',
  'website':  'Website',
  'ai-agent': 'AI Agent',
  'api':      'API Product',
  'hybrid':   'Hybrid',
  'other':    'Other',
}

export const TYPE_ICONS: Record<ProductType, string> = {
  'web-app':  '🌐',
  'website':  '🖥️',
  'ai-agent': '🤖',
  'api':      '⚡',
  'hybrid':   '🔀',
  'other':    '💡',
}

export function formatRelativeTime(dateStr: string): string {
  const date  = new Date(dateStr)
  const now   = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffS  = Math.floor(diffMs / 1000)
  const diffM  = Math.floor(diffS / 60)
  const diffH  = Math.floor(diffM / 60)
  const diffD  = Math.floor(diffH / 24)
  if (diffS  < 60)  return 'just now'
  if (diffM  < 60)  return `${diffM}m ago`
  if (diffH  < 24)  return `${diffH}h ago`
  if (diffD  < 30)  return `${diffD}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffD > 365 ? 'numeric' : undefined })
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

