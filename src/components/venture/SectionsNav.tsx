'use client'
import { FileText, FilePlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VentureFile } from '@/lib/api'

export interface NavTab {
  id: string
  label: string
  icon: LucideIcon
}

function NavButton({ tab, active, onClick }: { tab: NavTab; active: boolean; onClick: () => void }) {
  const Icon = tab.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
        active
          ? 'bg-accent/15 text-accent border-l-2 border-accent font-medium'
          : 'text-paper/70 hover:bg-rule/30 hover:text-paper border-l-2 border-transparent'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{tab.label}</span>
    </button>
  )
}

export function SectionsNav({
  sectionTabs, platformTabs, files, activeTab, activeFile,
  canEdit, onSelectTab, onSelectFile, onAddFile,
}: {
  sectionTabs: NavTab[]
  platformTabs: NavTab[]
  files: VentureFile[]
  activeTab: string
  activeFile: string | null
  canEdit: boolean
  onSelectTab: (id: string) => void
  onSelectFile: (path: string) => void
  onAddFile: () => void
}) {
  return (
    <aside className="lg:block">
      <div className="sticky top-20 space-y-4">
        <div className="infobox">
          <div className="infobox-header">Sections</div>
          <nav className="py-2">
            {sectionTabs.map(tab => (
              <NavButton
                key={tab.id}
                tab={tab}
                active={!activeFile && activeTab === tab.id}
                onClick={() => onSelectTab(tab.id)}
              />
            ))}
            {platformTabs.length > 0 && <div className="border-t border-rule/50 my-1" />}
            {platformTabs.map(tab => (
              <NavButton
                key={tab.id}
                tab={tab}
                active={!activeFile && activeTab === tab.id}
                onClick={() => onSelectTab(tab.id)}
              />
            ))}
            {files.length > 0 && <div className="border-t border-rule/50 my-1" />}
            {files.map(f => (
              <button
                key={f.path}
                onClick={() => onSelectFile(f.path)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
                  activeFile === f.path
                    ? 'bg-accent/15 text-accent border-l-2 border-accent font-medium'
                    : 'text-paper/70 hover:bg-rule/30 hover:text-paper border-l-2 border-transparent'
                )}
                title={f.name}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate font-mono text-xs">{f.name}</span>
              </button>
            ))}
            {canEdit && (
              <button
                onClick={onAddFile}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors text-teal/80 hover:bg-teal/10 hover:text-teal border-l-2 border-transparent border-t border-rule/50 mt-1 pt-3"
              >
                <FilePlus className="w-4 h-4 shrink-0" />
                <span className="truncate">Add File</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </aside>
  )
}
