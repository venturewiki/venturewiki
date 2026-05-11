import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Auth } from './core.js'
import {
  VENTUREWIKI_ORG,
  whoami, listMyVentures, listVenturesForOwner, searchVentures,
  getVenture, createVenture, updateVentureSection, getVentureRaw, setVentureRaw, archiveVenture,
} from './core.js'

const DEFAULT_OWNER = VENTUREWIKI_ORG

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }

function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] }
}
function fail(e: unknown): ToolResult {
  const msg = e instanceof Error ? e.message : String(e)
  return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true }
}
async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try { return ok(await fn()) } catch (e) { return fail(e) }
}

/**
 * Builds a fresh MCP server. `getAuth` is resolved lazily so an HTTP host can
 * supply per-request credentials while a stdio host uses a fixed env token.
 */
export function createVentureWikiServer(getAuth: () => Auth): McpServer {
  const server = new McpServer({ name: 'venturewiki-mcp', version: '0.1.0' })
  const auth = () => getAuth()

  server.tool(
    'whoami',
    'Return the GitHub identity (login, name, id) behind the configured token. Use this to confirm which account ventures will be created under.',
    {},
    async () => run(() => whoami(auth())),
  )

  server.tool(
    'list_ventures',
    'List ventures (GitHub repos tagged with the `venturewiki` topic). With `mine: true` (the default when nothing else is given) lists the authenticated user\'s ventures; with `owner` lists that user/org\'s ventures; with `query` searches across GitHub.',
    {
      mine: z.boolean().optional().describe('List the authenticated user\'s ventures'),
      owner: z.string().optional().describe('A GitHub user or org login to list ventures for'),
      query: z.string().optional().describe('Free-text search across all public ventures'),
      limit: z.number().int().positive().max(50).optional().describe('Max results for `query` mode (default 20)'),
    },
    async ({ mine, owner, query, limit }) => run(async () => {
      if (owner) return listVenturesForOwner(auth(), owner)
      if (query !== undefined) return searchVentures(auth(), query, limit ?? 20)
      if (mine === false) return searchVentures(auth(), '', limit ?? 20)
      return listMyVentures(auth())
    }),
  )

  server.tool(
    'get_venture',
    'Fetch a venture: its parsed `.venturewiki/plan.yaml`, the raw file, repo metadata (private/archived/topics) and the plan blob SHA. `owner` defaults to the venturewiki organization.',
    {
      slug: z.string().describe('The venture/repo name'),
      owner: z.string().optional().describe(`GitHub owner login (default: "${DEFAULT_OWNER}")`),
    },
    async ({ slug, owner }) => run(() => getVenture(auth(), { owner: owner || DEFAULT_OWNER, slug })),
  )

  server.tool(
    'create_venture',
    'Create a new venture: a GitHub repo with a scaffolded `.venturewiki/plan.yaml`. By default it is created under the authenticated user\'s account; pass `org` to create it in an organization (e.g. the public `venturewiki` org). Use the venture page in the web app, or update_venture_section, to flesh out the rest of the plan.',
    {
      companyName: z.string().describe('Company / venture name'),
      slug: z.string().optional().describe('Repo name (defaults to a slug of companyName)'),
      org: z.string().optional().describe('Create under this GitHub org instead of the authenticated user'),
      visibility: z.enum(['public', 'private']).optional().describe('Repo visibility (default: public)'),
      tagline: z.string().optional(),
      mission: z.string().optional(),
      stage: z.enum(['idea', 'mvp', 'beta', 'live', 'scaling', 'exited']).optional(),
      productType: z.enum(['web-app', 'website', 'ai-agent', 'api', 'hybrid', 'other']).optional(),
      industryVertical: z.string().optional(),
      websiteUrl: z.string().optional(),
      logoEmoji: z.string().optional(),
    },
    async (a) => run(() => createVenture(auth(), {
      target: a.org ? { kind: 'org', org: a.org } : { kind: 'me' },
      companyName: a.companyName,
      slug: a.slug,
      visibility: a.visibility ?? 'public',
      tagline: a.tagline,
      mission: a.mission,
      stage: a.stage,
      productType: a.productType,
      industryVertical: a.industryVertical,
      websiteUrl: a.websiteUrl,
      logoEmoji: a.logoEmoji,
    })),
  )

  server.tool(
    'update_venture_section',
    'Replace a single top-level section of a venture\'s `plan.yaml` (e.g. "cover", "problemSolution", "teamRoadmap", "fundingAsk", "financials") with a new value. The value must match the shape that section expects. `updatedAt` is bumped automatically.',
    {
      slug: z.string(),
      owner: z.string().optional().describe(`GitHub owner login (default: "${DEFAULT_OWNER}")`),
      section: z.string().describe('A single top-level key in plan.yaml'),
      value: z.any().describe('The new value for that section (object/array/string as appropriate)'),
      message: z.string().optional().describe('Commit message'),
    },
    async ({ slug, owner, section, value, message }) =>
      run(async () => {
        await updateVentureSection(auth(), { owner: owner || DEFAULT_OWNER, slug }, section, value, message)
        return { ok: true, owner: owner || DEFAULT_OWNER, slug, section }
      }),
  )

  server.tool(
    'get_venture_raw',
    'Return the verbatim `.venturewiki/plan.yaml` text for a venture (or null if it has none).',
    {
      slug: z.string(),
      owner: z.string().optional().describe(`GitHub owner login (default: "${DEFAULT_OWNER}")`),
    },
    async ({ slug, owner }) => run(async () => {
      const raw = await getVentureRaw(auth(), { owner: owner || DEFAULT_OWNER, slug })
      return raw ?? '(no plan.yaml)'
    }),
  )

  server.tool(
    'set_venture_raw',
    'Overwrite a venture\'s `.venturewiki/plan.yaml` with the given content. The content is validated as YAML before committing. Prefer update_venture_section for targeted edits.',
    {
      slug: z.string(),
      owner: z.string().optional().describe(`GitHub owner login (default: "${DEFAULT_OWNER}")`),
      content: z.string().describe('The full new plan.yaml content'),
      message: z.string().optional().describe('Commit message'),
    },
    async ({ slug, owner, content, message }) => run(async () => {
      await setVentureRaw(auth(), { owner: owner || DEFAULT_OWNER, slug }, content, message)
      return { ok: true, owner: owner || DEFAULT_OWNER, slug }
    }),
  )

  server.tool(
    'archive_venture',
    'Archive a venture\'s GitHub repo (makes it read-only). This does not delete it. Requires admin permission on the repo.',
    {
      slug: z.string(),
      owner: z.string().optional().describe(`GitHub owner login (default: "${DEFAULT_OWNER}")`),
    },
    async ({ slug, owner }) => run(async () => {
      await archiveVenture(auth(), { owner: owner || DEFAULT_OWNER, slug })
      return { ok: true, owner: owner || DEFAULT_OWNER, slug, archived: true }
    }),
  )

  return server
}
