import http from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createVentureWikiServer } from './server.js'
import { bearerAuth } from './auth.js'

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf-8')
  return raw ? JSON.parse(raw) : undefined
}

/**
 * Minimal stateless Streamable-HTTP transport. Each request gets its own MCP
 * server bound to the request's `Authorization: Bearer <github-token>`.
 * Experimental — stdio is the primary, fully-supported transport.
 */
export function startHttpServer(port: number): http.Server {
  const httpServer = http.createServer(async (req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, service: 'venturewiki-mcp' }))
      return
    }
    if (!req.url || !req.url.startsWith('/mcp')) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found')
      return
    }

    const auth = bearerAuth(req.headers['authorization'])
    const server = createVentureWikiServer(() => auth)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => { void transport.close(); void server.close() })

    try {
      await server.connect(transport)
      const body = req.method === 'POST' ? await readJsonBody(req) : undefined
      await transport.handleRequest(req, res, body)
    } catch (e) {
      console.error('[venturewiki-mcp] request error:', e)
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32603, message: (e as Error)?.message ?? 'Internal error' }, id: null }))
      }
    }
  })

  httpServer.listen(port, () => {
    console.error(`[venturewiki-mcp] HTTP transport on :${port} — POST /mcp with header "Authorization: Bearer <github-token>"`)
  })
  return httpServer
}
