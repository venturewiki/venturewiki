import { NextRequest, NextResponse } from 'next/server'
import { readVentureFile, readVentureFileBuffer } from '@/lib/db'
import { mimeFromName } from '@/lib/mime'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; path: string[] } }
) {
  const filePath = params.path?.join('/') ?? ''
  if (!filePath) return NextResponse.json({ error: 'missing path' }, { status: 400 })

  if (req.nextUrl.searchParams.has('raw')) {
    const file = await readVentureFileBuffer(params.slug, filePath)
    if (!file) return new NextResponse('Not found', { status: 404 })
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

  const file = await readVentureFile(params.slug, filePath)
  if (!file) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json(file)
}
