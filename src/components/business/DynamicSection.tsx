'use client'
import { cn } from '@/lib/utils'

const MAX_DEPTH = 5

const ACRONYMS = new Set([
  'API', 'GTM', 'KPI', 'SAM', 'TAM', 'SOM', 'CAC', 'LTV', 'ARR',
  'MRR', 'ROI', 'CRM', 'KB', 'AI', 'ML', 'BPO', 'SMB', 'POA',
  'SLA', 'SLAS', 'NPS', 'ICP', 'IP', 'RPO', 'RTO', 'TCPA',
  'HIPAA', 'GDPR', 'CCPA', 'DNS', 'CDN', 'WAF', 'EIN', 'SMS',
  'EBITDA', 'DR', 'EOY', 'Q1', 'Q2', 'Q3', 'Q4', 'OS', 'UI',
  'UX', 'CTO', 'CEO', 'COO', 'CFO', 'IPO', 'PR', 'VC', 'PE',
])

export function prettifyKey(key: string): string {
  // Snake/kebab → space; camelCase split; PascalCase split
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()

  return spaced
    .split(/\s+/)
    .map(w => {
      const upper = w.toUpperCase()
      if (ACRONYMS.has(upper)) return upper
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

function isPrimitive(v: any): boolean {
  return (
    v === null ||
    v === undefined ||
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  )
}

function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string' && v.trim() === '') return true
  if (Array.isArray(v) && v.length === 0) return true
  if (typeof v === 'object' && Object.keys(v).length === 0) return true
  return false
}

function isUrl(v: any): boolean {
  return typeof v === 'string' && /^https?:\/\//i.test(v.trim())
}

function isLongText(v: string): boolean {
  return v.length > 80 || v.includes('\n')
}

type ArrayShape = 'primitives' | 'objects-uniform' | 'objects-mixed' | 'mixed'

function arrayShape(arr: any[]): ArrayShape {
  if (arr.length === 0) return 'primitives'
  if (arr.every(isPrimitive)) return 'primitives'
  const allObj = arr.every(v => v && typeof v === 'object' && !Array.isArray(v))
  if (!allObj) return 'mixed'
  const firstKeys = Object.keys(arr[0])
  const sameShape = arr.every(o => {
    const keys = Object.keys(o)
    return keys.length === firstKeys.length && keys.every(k => firstKeys.includes(k))
  })
  return sameShape ? 'objects-uniform' : 'objects-mixed'
}

function PrimitiveValue({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted italic">—</span>
  }
  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
        {value ? '✓ Yes' : '✗ No'}
      </span>
    )
  }
  if (typeof value === 'number') {
    return <span className="font-mono text-paper">{value.toLocaleString()}</span>
  }
  if (isUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline break-all"
      >
        {value}
      </a>
    )
  }
  const s = String(value)
  if (isLongText(s)) {
    return <span className="text-paper/85 leading-relaxed whitespace-pre-wrap">{s}</span>
  }
  return <span className="text-paper/90">{s}</span>
}

function SubHeader({ label, depth }: { label: string; depth: number }) {
  if (depth === 0) {
    return (
      <h3 className="font-display font-semibold text-paper text-base mb-2.5 flex items-center gap-2">
        <span className="w-1 h-4 bg-accent rounded-sm" />
        {label}
      </h3>
    )
  }
  if (depth === 1) {
    return (
      <h4 className="font-semibold text-accent text-xs mb-2 uppercase tracking-wider">
        {label}
      </h4>
    )
  }
  if (depth === 2) {
    return (
      <h5 className="font-medium text-teal text-xs mb-1.5 uppercase tracking-wider font-mono">
        {label}
      </h5>
    )
  }
  return (
    <h6 className="font-medium text-muted text-[11px] mb-1 uppercase tracking-wider font-mono">
      {label}
    </h6>
  )
}

function nestPaddingClass(depth: number): string {
  if (depth === 0) return 'pl-3 border-l-2 border-rule/50'
  if (depth === 1) return 'pl-2.5 border-l border-rule/40'
  if (depth === 2) return 'pl-2 border-l border-rule/30'
  return ''
}

function cardClass(depth: number): string {
  if (depth === 0) return 'p-4 rounded-lg bg-rule/15 border border-rule/30'
  if (depth === 1) return 'p-3 rounded-lg bg-rule/10 border border-rule/25'
  if (depth === 2) return 'p-2.5 rounded-md bg-rule/10 border border-rule/20'
  return 'p-2 rounded-md bg-rule/5 border border-rule/15'
}

export interface DynamicSectionProps {
  value: any
  depth?: number
}

export function DynamicSection({ value, depth = 0 }: DynamicSectionProps) {
  if (depth >= MAX_DEPTH) {
    return (
      <pre className="text-xs bg-rule/30 border border-rule rounded p-2 overflow-auto text-paper/70 max-h-64">
        {safeStringify(value)}
      </pre>
    )
  }

  if (isEmpty(value)) {
    return <p className="text-muted italic text-sm">—</p>
  }

  if (isPrimitive(value)) {
    const s = typeof value === 'string' ? value : ''
    if (isLongText(s)) {
      return (
        <p className="text-paper/85 text-sm leading-relaxed whitespace-pre-wrap">{s}</p>
      )
    }
    return (
      <div className="text-sm">
        <PrimitiveValue value={value} />
      </div>
    )
  }

  if (Array.isArray(value)) {
    return <ArrayRenderer items={value} depth={depth} />
  }

  // Object
  return <ObjectRenderer obj={value} depth={depth} />
}

function ArrayRenderer({ items, depth }: { items: any[]; depth: number }) {
  const shape = arrayShape(items)

  if (shape === 'primitives') {
    return (
      <ul className="space-y-1.5 text-sm">
        {items.map((v, i) => (
          <li key={i} className="flex items-start gap-2 text-paper/85 leading-relaxed">
            <span className="text-accent shrink-0 mt-1.5 leading-none">•</span>
            <span className="min-w-0 flex-1"><PrimitiveValue value={v} /></span>
          </li>
        ))}
      </ul>
    )
  }

  if (shape === 'objects-uniform') {
    const cols = Object.keys(items[0])
    const tableSafe =
      cols.length <= 6 &&
      items.every(o =>
        cols.every(c => {
          const v = o[c]
          if (isPrimitive(v)) {
            return typeof v !== 'string' || v.length <= 140
          }
          return false
        }),
      )

    if (tableSafe) {
      return (
        <div className="overflow-x-auto -mx-1">
          <table className="wiki-table">
            <thead>
              <tr>
                {cols.map(c => (
                  <th key={c}>{prettifyKey(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i}>
                  {cols.map(c => (
                    <td key={c} className="align-top">
                      <PrimitiveValue value={row[c]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  }

  // Mixed array or objects-uniform that can't fit in a table → cards
  return (
    <div className="space-y-3">
      {items.map((v, i) => {
        if (isPrimitive(v)) {
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-accent shrink-0 mt-1.5 leading-none">•</span>
              <span className="min-w-0 flex-1"><PrimitiveValue value={v} /></span>
            </div>
          )
        }
        return (
          <div key={i} className={cardClass(depth)}>
            <ItemHeader item={v} index={i} />
            <DynamicSection value={stripItemHeaderField(v)} depth={depth + 1} />
          </div>
        )
      })}
    </div>
  )
}

const HEADER_FIELDS = ['name', 'title', 'label', 'role', 'category', 'milestone', 'level']

function getHeaderField(item: any): string | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  for (const f of HEADER_FIELDS) {
    if (typeof item[f] === 'string' && item[f].length < 80) return f
  }
  return null
}

function ItemHeader({ item, index }: { item: any; index: number }) {
  const field = getHeaderField(item)
  if (!field) {
    return (
      <p className="text-[11px] text-muted font-mono uppercase tracking-wider mb-2">
        Item {index + 1}
      </p>
    )
  }
  return (
    <p className="text-sm font-semibold text-accent mb-2">{item[field]}</p>
  )
}

function stripItemHeaderField(item: any): any {
  const field = getHeaderField(item)
  if (!field) return item
  const { [field]: _omit, ...rest } = item
  return rest
}

function ObjectRenderer({ obj, depth }: { obj: Record<string, any>; depth: number }) {
  const entries = Object.entries(obj).filter(([, v]) => !isEmpty(v))
  if (entries.length === 0) {
    return <p className="text-muted italic text-sm">—</p>
  }

  const allPrimitive = entries.every(
    ([, v]) => isPrimitive(v) && (typeof v !== 'string' || !isLongText(v)),
  )

  if (allPrimitive) {
    return (
      <table className="wiki-table">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td className="w-44 text-muted font-medium align-top">{prettifyKey(k)}</td>
              <td className="align-top"><PrimitiveValue value={v} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className={cn('space-y-4', depth > 0 && depth < 3 && nestPaddingClass(depth))}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <SubHeader label={prettifyKey(k)} depth={depth} />
          <div>
            <DynamicSection value={v} depth={depth + 1} />
          </div>
        </div>
      ))}
    </div>
  )
}

function safeStringify(v: any): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

/**
 * Section keys that are platform/meta fields, not user-editable plan content.
 * Anything not in this set becomes a dynamic section tab.
 */
export const META_PLAN_KEYS: ReadonlySet<string> = new Set([
  'id',
  'slug',
  'owner',
  'createdAt',
  'updatedAt',
  'createdBy',
  'contributors',
  'viewCount',
  'editCount',
  'isPublic',
  'isArchived',
  'isFeatured',
])

export interface DynamicSectionDescriptor {
  key: string
  label: string
  value: any
}

export function listDynamicSections(plan: Record<string, any> | null | undefined): DynamicSectionDescriptor[] {
  if (!plan) return []
  return Object.keys(plan)
    .filter(k => !META_PLAN_KEYS.has(k))
    .filter(k => !isEmpty(plan[k]))
    .map(k => ({ key: k, label: prettifyKey(k), value: plan[k] }))
}
