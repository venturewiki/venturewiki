import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getVenturewikiFiles, getVenturewikiFileContent } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/businesses/[slug]/files?path= (list or fetch file)
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const slug = params.slug
  const url = new URL(req.url)
  const filePath = url.searchParams.get('path')

  // TODO: Add privacy checks if needed

  if (!filePath || filePath === '' || filePath === '/') {
    // List all files in .venturewiki
    const tree = await getVenturewikiFiles(slug)
    return NextResponse.json(tree)
  } else {
    // Fetch file content
    const file = await getVenturewikiFileContent(slug, filePath)
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(file)
  }
}
