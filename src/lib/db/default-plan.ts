import { getPublicOctokit } from '@/lib/github'

const TEMPLATE_OWNER = 'venturewiki'
const TEMPLATE_REPO  = 'venture-template'
const TEMPLATE_DIR   = '.venturewiki'

export interface TemplateFile {
  /** Destination path written to the new repo, relative to .venturewiki/  */
  path: string
  /** UTF-8 text content with tokens already substituted */
  content: string
}

/**
 * Fetches every file from venturewiki/venture-template/.venturewiki/ and
 * applies token substitution. `plan-template.yaml` is renamed to `plan.yaml`.
 *
 * Tokens: {{owner}}, {{slug}}, {{description}}, {{userId}},
 *         {{createdAt}}, {{updatedAt}}
 *
 * Returns an empty array if the template repo is unreachable, so callers
 * must handle a graceful fallback.
 */
export async function scaffoldVentureFiles(opts: {
  owner: string
  name: string
  description: string
  userId: string
}): Promise<TemplateFile[]> {
  const octokit = getPublicOctokit()
  const now = new Date().toISOString()

  // List all files in the template's .venturewiki/ directory
  let dirItems: Array<{ type: string; path: string; download_url?: string | null }>
  try {
    const { data } = await octokit.request(
      'GET /repos/{owner}/{repo}/contents/{+path}',
      { owner: TEMPLATE_OWNER, repo: TEMPLATE_REPO, path: TEMPLATE_DIR, ref: 'main' },
    )
    dirItems = (Array.isArray(data) ? data : []).filter(i => i.type === 'file')
  } catch {
    return []
  }

  const files: TemplateFile[] = []

  for (const item of dirItems) {
    try {
      const { data } = await octokit.request(
        'GET /repos/{owner}/{repo}/contents/{+path}',
        { owner: TEMPLATE_OWNER, repo: TEMPLATE_REPO, path: item.path, ref: 'main' },
      ) as { data: { content?: string } }

      const raw = Buffer.from(data.content ?? '', 'base64').toString('utf-8')
      const content = raw
        .replaceAll('{{owner}}',       opts.owner)
        .replaceAll('{{slug}}',        opts.name)
        .replaceAll('{{description}}', opts.description)
        .replaceAll('{{userId}}',      opts.userId)
        .replaceAll('{{createdAt}}',   now)
        .replaceAll('{{updatedAt}}',   now)

      // plan-template.yaml → plan.yaml; all other files keep their names
      const destName = item.path.split('/').pop()!.replace('plan-template.yaml', 'plan.yaml')
      files.push({ path: destName, content })
    } catch {
      // Skip any individual file that fails — don't abort the whole scaffold
    }
  }

  return files
}
