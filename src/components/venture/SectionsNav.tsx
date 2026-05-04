'use client'
import { useState, useRef } from 'react'
import {
  FileText, FilePlus, FolderPlus, Folder, FolderOpen,
  ChevronRight, ChevronDown, MoreHorizontal,
  Pencil, Trash2, FolderInput, GripVertical,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VentureFile } from '@/lib/api'

export interface NavTab {
  id: string
  label: string
  icon: LucideIcon
}

// ── Tree helpers ─────────────────────────────────────────────────────────────

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size: number
  children: TreeNode[]
}

function buildTree(files: VentureFile[]): TreeNode[] {
  const root: TreeNode[] = []
  // Sort so dirs are listed first, then alpha
  const sorted = [...files].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.path.localeCompare(b.path)
  })

  const dirMap = new Map<string, TreeNode>()

  // First pass: create directory nodes
  for (const f of sorted) {
    if (f.type === 'dir') {
      const node: TreeNode = { name: f.name, path: f.path, type: 'dir', size: 0, children: [] }
      dirMap.set(f.path, node)

      const parentPath = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : ''
      if (parentPath && dirMap.has(parentPath)) {
        dirMap.get(parentPath)!.children.push(node)
      } else {
        root.push(node)
      }
    }
  }

  // Second pass: attach files to their parent directories
  for (const f of sorted) {
    if (f.type === 'file') {
      const node: TreeNode = { name: f.name, path: f.path, type: 'file', size: f.size, children: [] }
      const parentPath = f.path.includes('/') ? f.path.substring(0, f.path.lastIndexOf('/')) : ''
      if (parentPath && dirMap.has(parentPath)) {
        dirMap.get(parentPath)!.children.push(node)
      } else {
        root.push(node)
      }
    }
  }

  return root
}

// ── NavButton (for section/platform tabs) ────────────────────────────────────

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

// ── Folder context menu ──────────────────────────────────────────────────────

function FolderContextMenu({
  folderPath,
  onRename,
  onDelete,
  onClose,
}: {
  folderPath: string
  onRename: (path: string) => void
  onDelete: (path: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute right-0 top-full z-50 mt-1 w-40 bg-ink border border-rule rounded-lg shadow-xl py-1 text-xs animate-fade-in"
      onMouseLeave={onClose}
    >
      <button
        onClick={() => { onRename(folderPath); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-paper/80 hover:bg-rule/40 hover:text-paper transition-colors"
      >
        <Pencil className="w-3 h-3" />
        Rename
      </button>
      <button
        onClick={() => { onDelete(folderPath); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
      >
        <Trash2 className="w-3 h-3" />
        Delete
      </button>
    </div>
  )
}

// ── Move file modal ──────────────────────────────────────────────────────────

function MoveFileMenu({
  fileName,
  folders,
  currentFolder,
  onMove,
  onClose,
}: {
  fileName: string
  folders: string[]
  currentFolder: string
  onMove: (dest: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-ink border border-rule rounded-xl shadow-xl w-full max-w-xs p-4 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-paper text-sm mb-3 flex items-center gap-2">
          <FolderInput className="w-4 h-4 text-accent" />
          Move &ldquo;{fileName}&rdquo;
        </h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <button
            onClick={() => onMove('')}
            disabled={currentFolder === ''}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors',
              currentFolder === ''
                ? 'bg-accent/10 text-accent cursor-default'
                : 'text-paper/70 hover:bg-rule/40 hover:text-paper'
            )}
          >
            <Folder className="w-3.5 h-3.5" />
            <span className="font-mono">/ (root)</span>
          </button>
          {folders.map(f => (
            <button
              key={f}
              onClick={() => onMove(f)}
              disabled={currentFolder === f}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors',
                currentFolder === f
                  ? 'bg-accent/10 text-accent cursor-default'
                  : 'text-paper/70 hover:bg-rule/40 hover:text-paper'
              )}
            >
              <Folder className="w-3.5 h-3.5" />
              <span className="font-mono">{f}/</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-3">
          <button className="btn-ghost text-xs" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── File tree node ───────────────────────────────────────────────────────────

function FileTreeNode({
  node,
  depth,
  activeFile,
  canEdit,
  allFolders,
  onSelectFile,
  onRenameFolder,
  onDeleteFolder,
  onMoveFile,
}: {
  node: TreeNode
  depth: number
  activeFile: string | null
  canEdit: boolean
  allFolders: string[]
  onSelectFile: (path: string) => void
  onRenameFolder: (path: string) => void
  onDeleteFolder: (path: string) => void
  onMoveFile: (srcPath: string, destFolder: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)

  if (node.type === 'dir') {
    const Chevron = open ? ChevronDown : ChevronRight
    const FolderIcon = open ? FolderOpen : Folder
    return (
      <div>
        <div
          className="relative group"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center gap-1.5 px-4 py-1.5 text-sm text-left transition-colors text-paper/60 hover:bg-rule/20 hover:text-paper border-l-2 border-transparent"
          >
            <Chevron className="w-3 h-3 shrink-0 text-paper/40" />
            <FolderIcon className="w-4 h-4 shrink-0 text-amber-400/80" />
            <span className="truncate font-mono text-xs">{node.name}</span>
          </button>
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-rule/40"
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-paper/50" />
            </button>
          )}
          {menuOpen && (
            <FolderContextMenu
              folderPath={node.path}
              onRename={onRenameFolder}
              onDelete={onDeleteFolder}
              onClose={() => setMenuOpen(false)}
            />
          )}
        </div>
        {open && node.children.map(child => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFile={activeFile}
            canEdit={canEdit}
            allFolders={allFolders}
            onSelectFile={onSelectFile}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onMoveFile={onMoveFile}
          />
        ))}
      </div>
    )
  }

  // file node
  const currentFolder = node.path.includes('/') ? node.path.substring(0, node.path.lastIndexOf('/')) : ''
  return (
    <>
      <div
        className="relative group"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          onClick={() => onSelectFile(node.path)}
          className={cn(
            'w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left transition-colors',
            activeFile === node.path
              ? 'bg-accent/15 text-accent border-l-2 border-accent font-medium'
              : 'text-paper/70 hover:bg-rule/30 hover:text-paper border-l-2 border-transparent'
          )}
          title={node.path}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="truncate font-mono text-xs">{node.name}</span>
        </button>
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); setMoveMenuOpen(true) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-rule/40"
            title="Move file"
          >
            <FolderInput className="w-3.5 h-3.5 text-paper/50" />
          </button>
        )}
      </div>
      {moveMenuOpen && (
        <MoveFileMenu
          fileName={node.name}
          folders={allFolders}
          currentFolder={currentFolder}
          onMove={(dest) => {
            const destPath = dest ? `${dest}/${node.name}` : node.name
            if (destPath !== node.path) onMoveFile(node.path, destPath)
            setMoveMenuOpen(false)
          }}
          onClose={() => setMoveMenuOpen(false)}
        />
      )}
    </>
  )
}

// ── Main SectionsNav ─────────────────────────────────────────────────────────

export function SectionsNav({
  sectionTabs, platformTabs, files, activeTab, activeFile,
  canEdit, onSelectTab, onSelectFile, onAddFile,
  onCreateFolder, onRenameFolder, onDeleteFolder, onMoveFile, onNavigate,
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
  onCreateFolder?: () => void
  onRenameFolder?: (path: string) => void
  onDeleteFolder?: (path: string) => void
  onMoveFile?: (srcPath: string, destFolder: string) => void
  onNavigate?: () => void
}) {
  const tree = buildTree(files)
  const allFolders = files.filter(f => f.type === 'dir').map(f => f.path)

  const wrappedSelectTab = (id: string) => { onSelectTab(id); onNavigate?.() }
  const wrappedSelectFile = (path: string) => { onSelectFile(path); onNavigate?.() }

  return (
    <aside>
      <div className="sticky top-20 space-y-4">
        <div className="infobox">
          <div className="infobox-header">Sections</div>
          <nav className="py-2">
            {sectionTabs.map(tab => (
              <NavButton
                key={tab.id}
                tab={tab}
                active={!activeFile && activeTab === tab.id}
                onClick={() => wrappedSelectTab(tab.id)}
              />
            ))}
            {platformTabs.length > 0 && <div className="border-t border-rule/50 my-1" />}
            {platformTabs.map(tab => (
              <NavButton
                key={tab.id}
                tab={tab}
                active={!activeFile && activeTab === tab.id}
                onClick={() => wrappedSelectTab(tab.id)}
              />
            ))}

            {/* Files section */}
            {(files.length > 0 || canEdit) && (
              <div className="border-t border-rule/50 my-1" />
            )}
            {files.length > 0 && (
              <div className="px-4 py-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted font-mono">Files</span>
              </div>
            )}
            {tree.map(node => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                activeFile={activeFile}
                canEdit={canEdit}
                allFolders={allFolders}
                onSelectFile={wrappedSelectFile}
                onRenameFolder={(path) => onRenameFolder?.(path)}
                onDeleteFolder={(path) => onDeleteFolder?.(path)}
                onMoveFile={(src, dest) => onMoveFile?.(src, dest)}
              />
            ))}

            {/* Add file / Add folder buttons */}
            {canEdit && (
              <div className="border-t border-rule/50 mt-1 pt-1 flex flex-col">
                <button
                  onClick={onAddFile}
                  className="w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left transition-colors text-teal/80 hover:bg-teal/10 hover:text-teal border-l-2 border-transparent"
                >
                  <FilePlus className="w-4 h-4 shrink-0" />
                  <span className="truncate text-xs">Add File</span>
                </button>
                {onCreateFolder && (
                  <button
                    onClick={onCreateFolder}
                    className="w-full flex items-center gap-2 px-4 py-1.5 text-sm text-left transition-colors text-amber-400/80 hover:bg-amber-400/10 hover:text-amber-400 border-l-2 border-transparent"
                  >
                    <FolderPlus className="w-4 h-4 shrink-0" />
                    <span className="truncate text-xs">Add Folder</span>
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </aside>
  )
}
