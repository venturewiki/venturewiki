# venturewiki-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI
agents **create, read, update and archive VentureWiki ventures** — public or
private — on a user's own GitHub account **or** in the public `venturewiki`
organization.

A "venture" is just a GitHub repo carrying a `.venturewiki/plan.yaml` business
plan and the `venturewiki` topic, so every operation here is a thin, well-typed
wrapper over the GitHub API authenticated with the user's own token.

> Scope: this is a focused first version covering venture CRUD. It deliberately
> reimplements a slice of the web app's `src/lib/db` layer (see `src/core.ts`);
> the natural follow-up is extracting a shared `@venturewiki/core` package.

## Tools

| Tool | What it does |
|------|--------------|
| `whoami` | Show the GitHub identity behind the configured token |
| `list_ventures` | List ventures — your own (`mine`), an `owner`'s, or by `query` |
| `get_venture` | Fetch a venture's parsed `plan.yaml`, raw file, repo metadata, blob SHA |
| `create_venture` | Create a venture repo + scaffolded `plan.yaml` (under you, or `org`) |
| `update_venture_section` | Replace one top-level section of `plan.yaml` |
| `get_venture_raw` / `set_venture_raw` | Read / overwrite the raw `plan.yaml` (YAML-validated on write) |
| `archive_venture` | Archive a venture's repo (read-only; not a delete) |

`owner` defaults to the `venturewiki` organization (override via the
`VENTUREWIKI_ORG` env var).

## Auth

Every call uses a GitHub token (OAuth token or PAT) with at least the `repo`
scope (needed to touch private ventures).

- **stdio**: set `VENTUREWIKI_GITHUB_TOKEN` (or `GITHUB_TOKEN`) in the process env.
- **HTTP**: send `Authorization: Bearer <github-token>` on each request.

## Run it

```bash
# from this directory
npm install
npm run build

# stdio (Claude Desktop, local agents) — the default
VENTUREWIKI_GITHUB_TOKEN=ghp_xxx node dist/index.js

# experimental Streamable-HTTP transport
node dist/index.js --http 3100      # POST /mcp, Authorization: Bearer <token>
```

### Claude Desktop config

```json
{
  "mcpServers": {
    "venturewiki": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp-server/dist/index.js"],
      "env": { "VENTUREWIKI_GITHUB_TOKEN": "ghp_xxx" }
    }
  }
}
```

(Once published to npm this becomes `"command": "npx", "args": ["-y", "venturewiki-mcp"]`.)

## Notes

- New ventures get a minimal-but-valid `plan.yaml` (meta + `cover` + empty
  section stubs); flesh out the full 5-page template in the web app or via
  `update_venture_section`.
- `create_venture` tags new repos with the `venturewiki` topic plus
  `stage-*`, `type-*` and `created-via-mcp`, so they show up in VentureWiki.
- The HTTP transport is stateless (one MCP server per request) and is marked
  experimental; stdio is the primary, fully-supported transport.
