import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readVentureFile, readVentureFileBuffer } from '@/lib/db'
import { mimeFromName } from '@/lib/mime'
import { getUserOctokit } from '@/lib/github'

export const dynamic = 'force-dynamic'

/** Returns a self-contained HTML page that renders markdown as GFM using
 *  marked.js + DOMPurify (both from jsDelivr CDN) styled with github-markdown-css dark theme. */
function buildMarkdownHtml(name: string, content: string): string {
  // JSON.stringify produces a valid JS string literal, but the HTML parser
  // will still see a raw </script> inside a <script> block and terminate the
  // tag early — a classic script-injection vector. Escaping </ → <\/ is the
  // standard defence: it remains valid JSON/JS but the HTML parser won't see
  // a closing </script> tag. Likewise escape <!-- to prevent comment tricks.
  const safeContent = JSON.stringify(content)
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--')
  const safeTitle = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown-dark.min.css">
  <style>
    html, body { background: #0d1117; margin: 0; padding: 0; }
    .markdown-body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 45px;
    }
    @media (max-width: 767px) { .markdown-body { padding: 15px; } }
  </style>
</head>
<body>
  <article class="markdown-body" id="content"></article>
  <script src="https://cdn.jsdelivr.net/npm/marked@9/marked.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js" crossorigin="anonymous"></script>
  <script>
    (function () {
      var md = ${safeContent};
      var dirty = marked.parse(md, { gfm: true, breaks: false });
      document.getElementById('content').innerHTML = DOMPurify.sanitize(dirty);
      function s(){parent.postMessage({type:'vw-iframe-height',h:document.documentElement.scrollHeight},'*')}
      s();
      new ResizeObserver(s).observe(document.documentElement);
    })();
  </script>
</body>
</html>`
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; path: string[] } }
) {
  const filePath = params.path?.join('/') ?? ''
  if (!filePath) return NextResponse.json({ error: 'missing path' }, { status: 400 })

  // Viewer token enables access to private repos the signed-in user can see.
  const session = await getServerSession(authOptions)
  const viewerOctokit = session?.accessToken ? getUserOctokit(session.accessToken) : undefined

  if (req.nextUrl.searchParams.has('raw')) {
    const file = await readVentureFileBuffer(params.slug, filePath, viewerOctokit)
    if (!file) return new NextResponse('Not found', { status: 404 })

    // Markdown files: return a rendered HTML page instead of raw text/markdown
    const lower = file.name.toLowerCase()
    if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.mdown')) {
      const text = Buffer.from(file.bytes).toString('utf-8')
      return new NextResponse(buildMarkdownHtml(file.name, text), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=60',
        },
      })
    }

    // HTML files: inject a postMessage resize script so the parent iframe can
    // auto-size to the content height without any fixed min-height constraint.
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      const resizeScript = `<script>(function(){` +
        `function s(){parent.postMessage({type:'vw-iframe-height',h:document.documentElement.scrollHeight},'*')}` +
        `if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',s)}else{s()}` +
        `new ResizeObserver(s).observe(document.documentElement)` +
        `})()</script>`
      let html = Buffer.from(file.bytes).toString('utf-8')
      html = html.includes('</body>') ? html.replace('</body>', resizeScript + '\n</body>') : html + resizeScript
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=60',
        },
      })
    }

    const mime = mimeFromName(file.name)
    // Wrap as Uint8Array — NextResponse's BodyInit type doesn't accept Node's Buffer directly.
    const body = new Uint8Array(file.bytes)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(body.byteLength),
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
        // Sandboxed iframes treat the response as opaque-origin, but defence in depth.
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=60',
      },
    })
  }

  const file = await readVentureFile(params.slug, filePath, viewerOctokit)
  if (!file) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(file)
}
