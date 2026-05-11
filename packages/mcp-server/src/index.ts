#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createVentureWikiServer } from './server.js'
import { envAuth } from './auth.js'
import { startHttpServer } from './http.js'

function parseHttpPort(args: string[]): number | null {
  const i = args.findIndex(a => a === '--http' || a.startsWith('--http='))
  if (i === -1) return null
  const inline = args[i].includes('=') ? Number(args[i].split('=')[1]) : NaN
  const next = Number(args[i + 1])
  const env = Number(process.env.PORT)
  const port = [inline, next, env].find(n => Number.isFinite(n) && n > 0) ?? 3100
  return port
}

async function main() {
  const args = process.argv.slice(2)

  const httpPort = parseHttpPort(args)
  if (httpPort !== null) {
    startHttpServer(httpPort)
    return
  }

  // stdio (default) — for Claude Desktop and local agents. Never write to
  // stdout here: it carries the JSON-RPC stream. Logs go to stderr.
  const auth = envAuth()
  if (!auth.token) {
    console.error('[venturewiki-mcp] No GitHub token found. Set VENTUREWIKI_GITHUB_TOKEN (or GITHUB_TOKEN) — tool calls will fail without it.')
  }
  const server = createVentureWikiServer(() => auth)
  await server.connect(new StdioServerTransport())
  console.error('[venturewiki-mcp] stdio transport ready')
}

main().catch(err => {
  console.error('[venturewiki-mcp] fatal:', err)
  process.exit(1)
})
