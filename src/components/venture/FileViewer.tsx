'use client'
import { useEffect, useState } from 'react'
import { FileText, Maximize2 } from 'lucide-react'
import { categoryFromName } from '@/lib/mime'
import { rawFileUrl } from '@/lib/file-paths'

export function FileViewer({
  slug, activeFile, fileContent, fileLoading,
}: {
  slug: string
  activeFile: string
  fileContent: { name: string; content: string } | null
  fileLoading: boolean
}) {
  const displayName = fileContent?.name || activeFile.split('/').pop() || activeFile
  const category = categoryFromName(displayName)
  const url = rawFileUrl(slug, activeFile)
  const needsTextContent = category === 'text'

  // Auto-size markdown and HTML iframes by listening for postMessage from the
  // injected ResizeObserver script in the API response (allow-scripts opaque-origin sandbox).
  const [iframeHeight, setIframeHeight] = useState(400)
  useEffect(() => {
    if (category !== 'html' && category !== 'markdown') return
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'vw-iframe-height' && typeof e.data.h === 'number') {
        setIframeHeight(e.data.h + 24)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [category])

  // For "maximize" we open the raw file URL directly in the browser,
  // letting the browser render HTML/images/PDFs/etc. natively.
  const canMaximize = ['html', 'image', 'pdf', 'video', 'audio', 'markdown', 'text'].includes(category)
  const handleMaximize = () => {
    window.open(url, '_blank')
  }

  return (
    <div className="section-card animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-accent shrink-0" />
          <h2 className="font-display font-bold text-paper truncate">{displayName}</h2>
          {activeFile.includes('/') && (
            <span className="text-[10px] text-muted font-mono ml-1 shrink-0">
              {activeFile.substring(0, activeFile.lastIndexOf('/'))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canMaximize && (
            <button
              onClick={handleMaximize}
              className="text-muted hover:text-paper transition-colors p-1 rounded hover:bg-rule/30"
              title="Open full-screen in browser"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <a
            href={url} download={displayName}
            className="text-xs text-muted hover:text-paper underline-offset-2 hover:underline"
          >
            Download
          </a>
        </div>
      </div>

      {needsTextContent && fileLoading ? (
        <div className="h-32 shimmer rounded-lg" />
      ) : category === 'markdown' ? (
        // Render markdown via the raw API (GFM + DOMPurify + github-markdown-css),
        // same engine as the standalone ?raw=1 URL. allow-scripts opaque-origin sandbox is safe.
        <iframe
          src={url}
          sandbox="allow-scripts"
          style={{ height: iframeHeight }}
          className="w-full rounded-lg border border-rule overflow-hidden"
          title={displayName}
        />
      ) : category === 'html' ? (
        // allow-scripts without allow-same-origin = opaque origin (safe).
        // The API injects a ResizeObserver postMessage script so height is dynamic.
        <iframe
          src={url}
          sandbox="allow-scripts"
          style={{ height: iframeHeight }}
          className="w-full rounded-lg bg-white border border-rule overflow-hidden"
          title={displayName}
        />
      ) : category === 'image' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={displayName} className="max-w-full h-auto rounded-lg mx-auto" />
      ) : category === 'video' ? (
        <video src={url} controls className="w-full max-h-[80vh] rounded-lg bg-black" />
      ) : category === 'audio' ? (
        <audio src={url} controls className="w-full" />
      ) : category === 'pdf' ? (
        <iframe src={url} className="w-full min-h-[80vh] rounded-lg bg-white border border-rule" title={displayName} />
      ) : category === 'text' && fileContent ? (
        <pre className="bg-rule/30 border border-rule rounded-lg p-4 text-xs text-paper/90 font-mono overflow-x-auto whitespace-pre-wrap break-words">
          {fileContent.content}
        </pre>
      ) : needsTextContent ? (
        <p className="text-muted italic text-sm">File not available.</p>
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted">
          <FileText className="w-10 h-10 opacity-40" />
          <p>This file type can&apos;t be previewed inline.</p>
          <a href={url} download={displayName} className="btn-secondary">Download {displayName}</a>
        </div>
      )}
    </div>
  )
}
