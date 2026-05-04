# VentureWiki MCP Server — Architecture Design

## Overview

The VentureWiki MCP (Model Context Protocol) Server exposes VentureWiki's venture intelligence as a set of **tools**, **resources**, and **prompts** that any MCP-compatible AI client (Claude Desktop, Cursor, VS Code Copilot, etc.) can consume. Agents can read and update venture plans, query the file vault, search the directory, and take investment or collaboration actions — all through structured, schema-validated calls backed by the existing GitHub-as-database infrastructure.

---

## 1. System Context

```mermaid
C4Context
  title VentureWiki MCP — System Context

  Person(founder, "Founder / Operator", "Uses an MCP-compatible AI client to manage their venture")
  Person(investor, "Investor / Analyst", "Queries venture plans and financials through AI")
  Person(builder, "AI Builder", "Integrates VentureWiki tools into custom agents/workflows")

  System(mcpServer, "VentureWiki MCP Server", "Exposes venture data and actions via MCP protocol")
  System_Ext(aiClient, "MCP Client", "Claude Desktop · Cursor · VS Code Copilot · Custom Agent")
  System_Ext(ventureWikiApp, "VentureWiki Next.js App", "Existing REST API at venturewiki.io")
  System_Ext(github, "GitHub", "Source of truth for plan.yaml, files, edit history")
  System_Ext(stripe, "Stripe", "Subscription gating for Pro/Enterprise tools")

  Rel(founder, aiClient, "Uses")
  Rel(investor, aiClient, "Uses")
  Rel(builder, mcpServer, "Integrates directly via stdio/SSE")
  Rel(aiClient, mcpServer, "MCP protocol (stdio or HTTP+SSE)")
  Rel(mcpServer, ventureWikiApp, "REST calls to /api/*")
  Rel(mcpServer, github, "Octokit — reads/writes plan.yaml + files")
  Rel(mcpServer, stripe, "Validates subscription tier before gated tools")
```

---

## 2. MCP Server Internal Architecture

```mermaid
flowchart TB
  subgraph Transport["Transport Layer"]
    STDIO["stdio\n(local / Claude Desktop)"]
    SSE["HTTP + SSE\n(remote / cloud agents)"]
  end

  subgraph Protocol["MCP Protocol Handler\n@modelcontextprotocol/sdk"]
    TOOL_DISPATCH["Tool Dispatcher"]
    RESOURCE_DISPATCH["Resource Dispatcher"]
    PROMPT_DISPATCH["Prompt Dispatcher"]
    SCHEMA_VAL["Zod Schema Validator"]
  end

  subgraph Auth["Auth & Gating"]
    AUTHN["Authentication\n(GitHub OAuth token or API key)"]
    AUTHZ["Authorization\n(ownership · collaborator role)"]
    TIER["Subscription Tier Check\n(free / pro / enterprise via Stripe)"]
  end

  subgraph Tools["Tool Handlers"]
    direction TB
    T1["venture_search\nSearch directory by keyword/stage/type"]
    T2["venture_get\nRead full BusinessPlan (plan.yaml parsed)"]
    T3["venture_update_section\nPatch one YAML section of the plan"]
    T4["venture_create\nScaffold a new venture repo"]
    T5["file_list\nList files in the .venturewiki vault"]
    T6["file_read\nRead a file (text/binary, handles >1MB)"]
    T7["file_write\nCreate or update a file in the vault"]
    T8["comment_post\nAdd a discussion comment"]
    T9["candidate_apply\nSubmit a role application"]
    T10["validation_add\nRecord an external validation signal"]
    T11["investment_express\nLog an investment interest"]
    T12["collaborator_invite\nInvite a GitHub user to a venture"]
    T13["venture_value_get\nGet AI-derived venture valuation"]
    T14["admin_stats\n(admin-only) Platform usage stats"]
  end

  subgraph Resources["Resource Handlers"]
    R1["venturewiki://ventures\nDirectory listing (paginated)"]
    R2["venturewiki://ventures/{slug}\nSingle venture plan.yaml"]
    R3["venturewiki://ventures/{slug}/files\nFile tree"]
    R4["venturewiki://ventures/{slug}/files/{path}\nFile content"]
    R5["venturewiki://ventures/{slug}/history\nEdit history"]
    R6["venturewiki://ventures/{slug}/comments\nDiscussion thread"]
    R7["venturewiki://user/me\nCurrent user profile + subscription"]
    R8["venturewiki://user/repos\nUser's GitHub repos eligible for onboarding"]
  end

  subgraph Prompts["Prompt Templates"]
    P1["pitch_deck_review\nAnalyse a venture plan against VC criteria"]
    P2["market_sizing_help\nGuide TAM/SAM/SOM research"]
    P3["gtm_strategy\nGenerate a go-to-market plan draft"]
    P4["founder_qa\nPrepare for investor Q&A"]
    P5["competitor_analysis\nMap competitive landscape from plan data"]
    P6["plan_health_check\nScore completeness & flag gaps"]
  end

  subgraph DataLayer["Data / Integration Layer"]
    GH_OCTOKIT["GitHub Octokit\n(admin PAT + viewer OAuth)"]
    VW_REST["VentureWiki REST Client\n(/api/businesses, /api/me, etc.)"]
    STRIPE_CLIENT["Stripe SDK\n(subscription tier lookup)"]
    CACHE["In-process LRU Cache\n(same TTL logic as Next.js app)"]
  end

  Transport --> Protocol
  Protocol --> SCHEMA_VAL
  SCHEMA_VAL --> Auth
  Auth --> AUTHN
  Auth --> AUTHZ
  Auth --> TIER
  Auth --> Tools
  Auth --> Resources
  Auth --> Prompts
  Tools --> DataLayer
  Resources --> DataLayer
  Prompts --> DataLayer
  DataLayer --> GH_OCTOKIT
  DataLayer --> VW_REST
  DataLayer --> STRIPE_CLIENT
  DataLayer --> CACHE
```

---

## 3. Tool Catalogue

```mermaid
mindmap
  root((MCP Tools))
    Discovery
      venture_search
      venture_get
      venture_value_get
    Authoring
      venture_create
      venture_update_section
      file_write
    Reading
      file_list
      file_read
    Collaboration
      comment_post
      collaborator_invite
      candidate_apply
    Investment
      investment_express
      validation_add
    Admin
      admin_stats
```

### Tool Detail

| Tool | Auth Required | Tier | Description |
|---|---|---|---|
| `venture_search` | No | Free | Full-text + filter search across the venture directory |
| `venture_get` | No (public) / Yes (private) | Free | Return the parsed `BusinessPlan` for a slug |
| `venture_create` | Yes | Free | Scaffold a new GitHub repo + `plan.yaml` from template |
| `venture_update_section` | Yes + owner/collab | Free | Patch a single YAML section (cover, problemSolution, etc.) |
| `file_list` | No (public) / Yes (private) | Free | List `.venturewiki/` file tree |
| `file_read` | No (public) / Yes (private) | Free | Read text or binary file; auto-fetches via `download_url` for >1 MB |
| `file_write` | Yes + owner/collab | Pro | Create or update a file in the `.venturewiki/` vault |
| `comment_post` | Yes | Free | Post a discussion comment |
| `candidate_apply` | Yes | Free | Submit application for an open role |
| `validation_add` | Yes | Pro | Record an external validation (customer, press, pilot) |
| `investment_express` | Yes | Free | Log interest in investing with amount + terms |
| `collaborator_invite` | Yes + owner | Pro | Invite GitHub user to a venture GitHub team |
| `venture_value_get` | No (public) | Free | Retrieve AI-derived valuation for a venture |
| `admin_stats` | Yes + admin role | Enterprise | Platform-wide stats (users, ventures, edits) |

---

## 4. Authentication & Authorization Flow

```mermaid
sequenceDiagram
  participant Client as MCP Client (Claude / Agent)
  participant MCP as MCP Server
  participant Stripe as Stripe API
  participant GH as GitHub API
  participant VW as VentureWiki REST API

  Client->>MCP: tool_call: venture_update_section\n{ slug, section, patch, token }
  MCP->>MCP: Zod schema validation

  alt token is GitHub OAuth token
    MCP->>GH: GET /user  (verify token + get login)
    GH-->>MCP: { login, id }
  else token is VentureWiki API key
    MCP->>VW: GET /api/me  (verify key → user record)
    VW-->>MCP: { login, role, subscriptionTier }
  end

  MCP->>VW: GET /api/businesses/{slug}  (check contributors[])
  VW-->>MCP: BusinessPlan (contributors list)
  MCP->>MCP: Is caller owner or collaborator?

  alt Not authorized
    MCP-->>Client: Error: UNAUTHORIZED
  end

  MCP->>Stripe: GET subscription for stripeCustomerId
  Stripe-->>MCP: { tier: "free" | "pro" | "enterprise" }
  MCP->>MCP: Is tool gated? Does tier qualify?

  alt Tier too low
    MCP-->>Client: Error: UPGRADE_REQUIRED { upgradeUrl }
  end

  MCP->>GH: PUT /repos/{owner}/{slug}/contents/.venturewiki/plan.yaml
  GH-->>MCP: { commit: { sha } }
  MCP-->>Client: { success: true, commitSha }
```

---

## 5. Resource URI Scheme

```mermaid
flowchart LR
  subgraph URIs["venturewiki:// URI Space"]
    direction TB
    A["venturewiki://ventures"] --> B["venturewiki://ventures/{slug}"]
    B --> C["venturewiki://ventures/{slug}/files"]
    C --> D["venturewiki://ventures/{slug}/files/{path}"]
    B --> E["venturewiki://ventures/{slug}/history"]
    B --> F["venturewiki://ventures/{slug}/comments"]
    G["venturewiki://user/me"]
    G --> H["venturewiki://user/repos"]
  end
```

Resources are **read-only** subscriptions (MCP resource model). Mutations always go through **Tools**. Resources support `list` (paginated) and `read` (single item). The MCP server emits `notifications/resources/updated` when a venture's `plan.yaml` or file list changes (via GitHub webhook → SSE push).

---

## 6. Prompt Templates

```mermaid
flowchart LR
  subgraph Prompts
    direction TB
    P1["pitch_deck_review\n— Loads: venture_get\n— Output: VC scorecard"]
    P2["market_sizing_help\n— Loads: venture_get → problemSolution.market\n— Output: research questions + TAM model"]
    P3["gtm_strategy\n— Loads: venture_get → productGtm\n— Output: 90-day GTM plan draft"]
    P4["founder_qa\n— Loads: venture_get (full plan)\n— Output: 20 hard investor questions + talking points"]
    P5["competitor_analysis\n— Loads: venture_get → productGtm.competitors\n— Output: competitive positioning map"]
    P6["plan_health_check\n— Loads: venture_get (full plan)\n— Output: completeness score + gap list"]
  end
```

Each prompt template:
1. Accepts `slug` as a required argument
2. Calls `venture_get` to embed the live plan data into the system prompt
3. Returns a structured `messages[]` array for the AI client to send to the model
4. Is versioned (e.g. `pitch_deck_review@2`) so callers can pin a version

---

## 7. Deployment Architecture

```mermaid
flowchart TB
  subgraph Local["Local Mode (stdio)"]
    LD["Developer / Claude Desktop"]
    LS["npx venturewiki-mcp\n(Node.js stdio server)"]
    LD -- "MCP stdio" --> LS
  end

  subgraph Cloud["Cloud Mode (HTTP + SSE)"]
    AG["Remote Agent / Cursor / CI"]
    GW["API Gateway\n(rate limiting · TLS)"]
    subgraph Railway["Railway — venturewiki-mcp service"]
      SRV["MCP HTTP Server\n:3100  /mcp"]
      WH["Webhook Receiver\n:3100  /webhooks/github"]
    end
    DB["VentureWiki Next.js App\nventurewiki.io"]
    GH2["GitHub"]

    AG -- "HTTP POST + SSE" --> GW
    GW --> SRV
    GH2 -- "push events" --> WH
    WH --> SRV
    SRV --> DB
    SRV --> GH2
  end
```

### Environment Variables

| Variable | Purpose |
|---|---|
| `GITHUB_ADMIN_TOKEN` | Admin PAT for public repo reads + team management |
| `VENTUREWIKI_API_BASE` | Base URL of the Next.js app REST API (`https://venturewiki.io`) |
| `VENTUREWIKI_API_SECRET` | Internal shared secret for server-to-server calls |
| `STRIPE_SECRET_KEY` | Subscription tier lookup |
| `GITHUB_WEBHOOK_SECRET` | Verify incoming push events for resource notifications |
| `MCP_TRANSPORT` | `stdio` (default) or `sse` |
| `PORT` | HTTP port for SSE mode (default `3100`) |

---

## 8. Package Structure

```
venturewiki-mcp/
├── src/
│   ├── index.ts              # Entry: create server, register all handlers, start transport
│   ├── server.ts             # McpServer factory + tool/resource/prompt registration
│   ├── transport/
│   │   ├── stdio.ts          # StdioServerTransport
│   │   └── sse.ts            # SSEServerTransport (Express)
│   ├── tools/
│   │   ├── venture.ts        # venture_search, venture_get, venture_create, venture_update_section
│   │   ├── files.ts          # file_list, file_read, file_write
│   │   ├── social.ts         # comment_post, candidate_apply, investment_express, validation_add
│   │   ├── collaboration.ts  # collaborator_invite
│   │   └── admin.ts          # admin_stats
│   ├── resources/
│   │   ├── ventures.ts       # venturewiki://ventures[/{slug}[/...]]
│   │   └── user.ts           # venturewiki://user/me, venturewiki://user/repos
│   ├── prompts/
│   │   ├── pitch-deck-review.ts
│   │   ├── market-sizing.ts
│   │   ├── gtm-strategy.ts
│   │   ├── founder-qa.ts
│   │   ├── competitor-analysis.ts
│   │   └── plan-health-check.ts
│   ├── auth/
│   │   ├── github.ts         # Verify GitHub OAuth tokens
│   │   ├── apiKey.ts         # Verify VW API keys
│   │   └── tier.ts           # Stripe subscription tier check
│   ├── data/
│   │   ├── github.ts         # Octokit wrappers (mirrors src/lib/github.ts)
│   │   ├── ventures.ts       # Fetch/write plan.yaml (mirrors src/lib/db/businesses.ts)
│   │   ├── files.ts          # Read/write venture files (mirrors src/lib/db/files.ts)
│   │   └── cache.ts          # LRU cache
│   └── webhooks/
│       └── github.ts         # Push event → resource notification
├── package.json              # @modelcontextprotocol/sdk, octokit, zod, stripe, express
└── Dockerfile                # Multi-stage Node build for Railway deployment
```

---

## 9. Key Design Decisions

| Decision | Rationale |
|---|---|
| **GitHub as the database** | Reuses the existing `plan.yaml` + `.venturewiki/` convention; no separate DB required |
| **Mirror auth logic from Next.js app** | Same GitHub OAuth token → same access rules; no new auth surface |
| **Zod for all tool input schemas** | MCP SDK auto-generates `inputSchema` JSON Schema from Zod; single source of truth |
| **`download_url` fallback for large files** | GitHub API returns empty `content` for files >1 MB; same fix already applied in the Next.js app |
| **Subscription tier via Stripe** | Pro/Enterprise tool gating matches the existing billing model without duplicating user storage |
| **Dual transport (stdio + SSE)** | `stdio` for local Claude Desktop use; `SSE` for cloud agents and CI pipelines |
| **Prompt templates embed live plan data** | Agents always work against the current plan state, not a stale snapshot |
| **Separate Railway service** | Keeps the MCP server independently scalable and deployable without touching the Next.js app |
