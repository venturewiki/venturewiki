/**
 * Seed script — creates the VentureWiki business plan as the first repo in your GitHub org.
 *
 * Prerequisites:
 *   1. Create a GitHub Organization (e.g. "venturewiki")
 *   2. Create a GitHub OAuth App at https://github.com/settings/developers
 *   3. Create a PAT with repo + admin:org scopes
 *   4. Copy .env.example → .env.local and fill in the values
 *
 * Run:
 *   npx tsx scripts/seed-venturewiki.ts
 */

import { Octokit } from 'octokit'
import * as dotenv from 'dotenv'
import * as path from 'path'
import yaml from 'js-yaml'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG!
const GITHUB_TOKEN = process.env.GITHUB_ADMIN_TOKEN!

if (!GITHUB_ORG || !GITHUB_TOKEN) {
  console.error('Missing NEXT_PUBLIC_GITHUB_ORG or GITHUB_ADMIN_TOKEN in .env.local')
  process.exit(1)
}

const octokit = new Octokit({ auth: GITHUB_TOKEN })

function encode(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64')
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

// Helper: create or update a file with retry (handles race conditions on newly-created repos)
async function upsertFile(repo: string, filePath: string, message: string, content: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Try to get existing file (for update with sha)
      const { data: existing } = await octokit.rest.repos.getContent({
        owner: GITHUB_ORG,
        repo,
        path: filePath,
      })
      if ('sha' in existing) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: GITHUB_ORG,
          repo,
          path: filePath,
          message,
          content: encode(content),
          sha: existing.sha,
        })
      }
      return
    } catch {
      // File doesn't exist — create it
      try {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: GITHUB_ORG,
          repo,
          path: filePath,
          message,
          content: encode(content),
        })
        return
      } catch (e: any) {
        if (attempt < 2) {
          console.log(`    Retrying in 3s (attempt ${attempt + 2}/3)...`)
          await wait(3000)
        } else {
          throw e
        }
      }
    }
  }
}

// -- Inlined from src/lib/pages-template.ts (avoids ESM import issues with tsx) --

function generatePagesWorkflow(): string {
  return `name: Deploy to GitHub Pages

on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - '.venturewiki/plan.yaml'
      - 'README.md'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install js-yaml
        run: npm install js-yaml

      - name: Build static site
        run: |
          node -e "
          const fs = require('fs');
          const yaml = require('js-yaml');
          const plan = yaml.load(fs.readFileSync('.venturewiki/plan.yaml', 'utf8'));
          const readme = fs.existsSync('README.md') ? fs.readFileSync('README.md', 'utf8') : '';
          const c = plan.cover || {};
          const p = plan.problemSolution || {};
          const f = plan.financials || {};
          const fa = plan.fundingAsk || {};
          const t = plan.teamRoadmap || {};
          const accent = c.accentColor || '#E8622A';
          const features = (p.features || []).map(f => '<li><strong>' + (f.feature||'') + '</strong> — ' + (f.benefit||'') + '</li>').join('');
          const projRows = (f.projections || []).map(p => '<tr><td>' + p.year + '</td><td>' + p.revenue + '</td><td>' + p.ebitda + '</td><td>' + p.users + '</td></tr>').join('');
          const fundRows = (fa.useOfFunds || []).map(u => '<tr><td>' + u.category + '</td><td>' + u.amount + '</td><td>' + u.percentage + '</td><td>' + u.milestoneUnlocked + '</td></tr>').join('');
          const teamRows = (t.founders || []).map(f => '<tr><td>' + f.name + '</td><td>' + f.role + '</td><td>' + f.background + '</td></tr>').join('');
          const milestones = (t.milestones || []).map(m => '<tr><td>' + m.milestone + '</td><td>' + m.targetDate + '</td><td><span class=status-' + (m.status||'not-started') + '>' + (m.status||'not-started') + '</span></td></tr>').join('');
          const html = \\\`<!DOCTYPE html>
          <html lang='en'>
          <head>
            <meta charset='utf-8'/>
            <meta name='viewport' content='width=device-width,initial-scale=1'/>
            <title>\\\${c.logoEmoji||''} \\\${c.companyName||'Business Plan'}</title>
            <meta name='description' content='\\\${(c.tagline||'').replace(/'/g,\\"&#39;\\")}' />
            <style>
              *{margin:0;padding:0;box-sizing:border-box}
              body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e0e0e0;line-height:1.7}
              .container{max-width:900px;margin:0 auto;padding:2rem 1.5rem}
              header{text-align:center;padding:3rem 0;border-bottom:1px solid #222}
              h1{font-size:2.5rem;margin:.5rem 0;color:#fff}
              h1 .emoji{font-size:2rem;margin-right:.5rem}
              .tagline{font-size:1.2rem;color:#999;margin-bottom:1rem}
              .badges span{display:inline-block;background:#1a1a1a;border:1px solid #333;border-radius:4px;padding:.25rem .75rem;margin:.25rem;font-size:.85rem;color:\\\${accent}}
              section{padding:2.5rem 0;border-bottom:1px solid #1a1a1a}
              h2{font-size:1.5rem;color:\\\${accent};margin-bottom:1rem;letter-spacing:.5px}
              h3{font-size:1.1rem;color:#ccc;margin:1.5rem 0 .5rem}
              p{margin-bottom:1rem;color:#bbb}
              ul{list-style:none;padding:0}
              ul li{padding:.5rem 0;border-bottom:1px solid #111}
              ul li strong{color:#fff}
              table{width:100%;border-collapse:collapse;margin:1rem 0}
              th,td{padding:.6rem .8rem;text-align:left;border-bottom:1px solid #1a1a1a;font-size:.9rem}
              th{color:\\\${accent};font-weight:600;text-transform:uppercase;font-size:.75rem;letter-spacing:.5px}
              td{color:#ccc}
              .status-in-progress{color:#f0c040}
              .status-not-started{color:#666}
              .status-completed{color:#4ade80}
              .highlight{background:#111;border-left:3px solid \\\${accent};padding:1rem 1.5rem;margin:1rem 0;border-radius:0 4px 4px 0}
              .highlight p{margin:0;color:#ddd}
              .market-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem}
              .market-card{background:#111;border:1px solid #222;border-radius:6px;padding:1.25rem}
              .market-card .label{font-size:.75rem;color:\\\${accent};text-transform:uppercase;letter-spacing:.5px}
              .market-card .value{font-size:1.5rem;color:#fff;font-weight:700;margin:.25rem 0}
              .market-card .source{font-size:.8rem;color:#666}
              footer{text-align:center;padding:2rem 0;color:#555;font-size:.85rem}
              footer a{color:\\\${accent};text-decoration:none}
              @media(max-width:600px){h1{font-size:1.8rem}.container{padding:1rem}}
            </style>
          </head>
          <body>
            <div class='container'>
              <header>
                <h1><span class='emoji'>\\\${c.logoEmoji||''}</span> \\\${c.companyName||'Business Plan'}</h1>
                <p class='tagline'>\\\${c.tagline||''}</p>
                <div class='badges'>
                  <span>\\\${c.stage||'idea'}</span>
                  <span>\\\${c.productType||''}</span>
                  <span>\\\${c.fundingStage||''}</span>
                  \\\${c.headquarters ? '<span>'+c.headquarters+'</span>' : ''}
                </div>
              </header>

              <section>
                <h2>Mission</h2>
                <p>\\\${c.mission||''}</p>
                <h2>Vision</h2>
                <p>\\\${c.vision||''}</p>
              </section>

              <section>
                <h2>The Problem</h2>
                <div class='highlight'><p>\\\${p.corePainPoint||''}</p></div>
                <h2>Our Solution</h2>
                <p>\\\${p.solutionOneLiner||''}</p>
                \\\${features ? '<h3>Key Features</h3><ul>'+features+'</ul>' : ''}
              </section>

              \\\${p.market ? '<section><h2>Market</h2><div class=market-grid><div class=market-card><div class=label>TAM</div><div class=value>'+(p.market.tamSize||'')+'</div><div class=source>'+(p.market.tamSource||'')+'</div></div><div class=market-card><div class=label>SAM</div><div class=value>'+(p.market.samSize||'')+'</div><div class=source>'+(p.market.samSource||'')+'</div></div><div class=market-card><div class=label>SOM</div><div class=value>'+(p.market.somSize||'')+'</div><div class=source>'+(p.market.somSource||'')+'</div></div></div></section>' : ''}

              \\\${teamRows ? '<section><h2>Team</h2><table><thead><tr><th>Name</th><th>Role</th><th>Background</th></tr></thead><tbody>'+teamRows+'</tbody></table></section>' : ''}

              \\\${milestones ? '<section><h2>Roadmap</h2><table><thead><tr><th>Milestone</th><th>Target</th><th>Status</th></tr></thead><tbody>'+milestones+'</tbody></table></section>' : ''}

              <section>
                <h2>Financials</h2>
                <table>
                  <tbody>
                    <tr><td>Revenue Model</td><td>\\\${f.revenueModel||''}</td></tr>
                    <tr><td>Gross Margin</td><td>\\\${f.grossMargin||''}</td></tr>
                    <tr><td>Burn Rate</td><td>\\\${f.burnRate||''}</td></tr>
                    <tr><td>Runway</td><td>\\\${f.runway||''}</td></tr>
                  </tbody>
                </table>
                \\\${projRows ? '<h3>Projections</h3><table><thead><tr><th>Year</th><th>Revenue</th><th>EBITDA</th><th>Users</th></tr></thead><tbody>'+projRows+'</tbody></table>' : ''}
              </section>

              \\\${fa.askOneLiner ? '<section><h2>Funding Ask</h2><div class=highlight><p>'+fa.askOneLiner+'</p></div>'+(fundRows ? '<table><thead><tr><th>Category</th><th>Amount</th><th>%</th><th>Milestone</th></tr></thead><tbody>'+fundRows+'</tbody></table>' : '')+'</section>' : ''}

              <footer>
                <p>Powered by <a href='https://venturewiki.io'>VentureWiki</a> — The open wiki for digital business plans</p>
              </footer>
            </div>
          </body>
          </html>\\\`;
          fs.mkdirSync('_site', { recursive: true });
          fs.writeFileSync('_site/index.html', html);
          "

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: _site

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`
}

async function enableGitHubPages(
  ok: InstanceType<typeof Octokit>,
  owner: string,
  repo: string
): Promise<void> {
  try {
    await ok.rest.repos.createPagesSite({
      owner,
      repo,
      build_type: 'workflow',
    })
  } catch (e: any) {
    if (e.status !== 409 && e.status !== 422) {
      console.error('Failed to enable GitHub Pages:', e.message)
    }
  }
}

// -- The VentureWiki business plan --

const SLUG = 'venturewiki'

const plan = {
  id: SLUG,
  slug: SLUG,
  createdBy: 'seed',
  contributors: ['seed'],
  viewCount: 0,
  editCount: 0,
  isPublic: true,
  isArchived: false,
  isFeatured: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  // Page 1: Cover & Snapshot
  cover: {
    companyName: 'VentureWiki',
    tagline: 'The open encyclopedia for digital business plans',
    mission: 'Make business planning transparent, collaborative, and accessible to every digital founder on the planet.',
    vision: 'Become the Wikipedia of business plans — a living, version-controlled reference that anyone can learn from, contribute to, or fork.',
    productType: 'web-app' as const,
    industryVertical: 'SaaS / Developer Tools',
    stage: 'mvp' as const,
    fundingStage: 'bootstrapped' as const,
    headquarters: 'Remote (US/EU)',
    legalStructure: 'Delaware C-Corp (planned)',
    websiteUrl: 'https://venturewiki.io',
    logoEmoji: '\u{1F4D6}',
    accentColor: '#E8622A',
    version: '1.0',
    preparedBy: 'VentureWiki Founding Team',
    fundingSought: '$250K pre-seed',
    tractionHighlights: {
      revenue: 'Pre-revenue — free public beta',
      users: 'Open-source, community-driven',
      partnerships: 'Built on GitHub infrastructure',
      press: 'Self-documenting: our own plan is on VentureWiki',
    },
  },

  // Page 2: Problem / Solution / Market
  problemSolution: {
    corePainPoint: "Business plans are locked in closed PDFs, stale slide decks, and expensive SaaS tools — they die the moment they're created. Founders can't learn from real examples, investors can't compare, and the knowledge never compounds.",
    painDimensions: {
      who: 'First-time digital founders, indie hackers, bootstrap entrepreneurs, accelerator cohorts',
      frequency: 'Every new venture (millions per year globally)',
      currentWorkarounds: 'LivePlan ($20/mo locked), Google Docs (unstructured), pitch decks (incomplete), Y Combinator essays (not actionable templates)',
      costOfProblem: 'Founders waste 40-80 hours writing plans from scratch. Investors see inconsistent formats. Knowledge never compounds.',
      urgencyLevel: 'High — AI is creating a new wave of micro-SaaS founders who need lightweight planning tools',
    },
    solutionOneLiner: 'VentureWiki is an open, version-controlled wiki where every digital business plan lives as a GitHub repo — structured, forkable, and always up to date.',
    features: [
      { feature: 'Structured 5-page business plan template', benefit: 'Consistent, comparable format across all plans', techLayer: 'React form + JSON schema validation' },
      { feature: 'GitHub-backed storage', benefit: 'Full version history, forking, pull requests — built on infrastructure developers already know', techLayer: 'Octokit + GitHub API (repos, commits, issues)' },
      { feature: 'Public-by-default directory', benefit: 'Anyone can browse, learn from, and fork real business plans', techLayer: 'GitHub Search API + Topics for filtering' },
      { feature: 'Community discussion via GitHub Issues', benefit: 'Feedback and Q&A without building a custom comment system', techLayer: 'GitHub Issues API as discussion threads' },
      { feature: 'Auto-generated README', benefit: 'Every plan is readable directly on GitHub without our UI', techLayer: 'Markdown generation from plan.yaml' },
      { feature: 'Edit history from git commits', benefit: 'See how a business plan evolved over time — pivots, growth, strategy shifts', techLayer: 'Git log on .venturewiki/plan.yaml' },
    ],
    unfairAdvantage: 'Network effects: every plan added makes VentureWiki more valuable. GitHub gives us free hosting, CDN, version control, and developer trust. No other business plan tool builds on open infrastructure.',
    market: {
      tam: 'Global business planning software market',
      tamSize: '$1.2B',
      tamSource: 'Grand View Research 2025',
      sam: 'Digital-first founders using SaaS/developer tools',
      samSize: '$320M',
      samSource: 'Subset of TAM: ~27% digital-first ventures x planning tool adoption',
      som: 'English-speaking indie hackers and startup founders in Y1',
      somSize: '$8M',
      somSource: 'Est. 100K founders x $80/yr avg willingness-to-pay for premium features',
    },
    whyNow: 'Three converging trends: (1) AI is exploding the number of micro-SaaS founders, (2) GitHub Copilot/Codex made developers comfortable with AI-assisted workflows, (3) the "build in public" movement means founders want to share plans openly.',
  },

  // Page 3: Product / GTM / Competition
  productGtm: {
    techStack: {
      productType: 'Web Application (Next.js)',
      frontend: 'Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS',
      backend: 'Next.js API routes, NextAuth.js v4',
      aiLayer: 'Planned: GPT-4o for plan generation assistance, embeddings for search',
      dataStorage: 'GitHub repos via Octokit (1 repo per plan, plan.yaml + README.md)',
      authPayments: 'GitHub OAuth via NextAuth, Stripe (planned for premium)',
      hosting: 'Railway / Vercel',
      buildStage: 'MVP — core CRUD, auth, search, and browsing functional',
      ipLayer: 'Open source (MIT) — the platform is open, plans are owned by their creators',
    },
    gtmChannels: [
      { channel: 'Hacker News / Product Hunt', tactic: 'Launch post: "We put our business plan on GitHub — here it is"', goal90Day: '5,000 unique visitors, 200 signups', owner: 'Founder', budgetPerMonth: '$0' },
      { channel: 'Twitter / X', tactic: 'Build-in-public thread series, share plan updates weekly', goal90Day: '2,000 followers, 50 plans created', owner: 'Founder', budgetPerMonth: '$0' },
      { channel: 'Dev communities', tactic: 'Post on r/SideProject, IndieHackers, dev.to — "fork this business plan template"', goal90Day: '100 forks of template plan', owner: 'Founder', budgetPerMonth: '$0' },
      { channel: 'GitHub organic', tactic: 'Star-worthy repos -> GitHub Trending -> organic discovery', goal90Day: '500 GitHub stars on venturewiki org', owner: 'Community', budgetPerMonth: '$0' },
      { channel: 'Accelerator partnerships', tactic: 'Offer VentureWiki as default plan tool for incubator cohorts', goal90Day: '2 accelerator pilots', owner: 'Founder', budgetPerMonth: '$100' },
    ],
    icp: 'Technical founder, 25-40, building a digital product (SaaS, API, AI agent). Comfortable with GitHub. Wants structured planning without expensive tools. Values transparency and learning from others.',
    pricingModel: 'Freemium — Public plans free forever. Premium for private plans, AI assistance, analytics, and custom domains.',
    pricePoint: 'Free (public) / $9/mo creator tier / $29/mo team tier',
    salesMotion: 'Product-led growth: browse -> fork -> create -> upgrade',
    timeToValue: '< 5 minutes: sign in with GitHub, fill in the cover section, publish',
    competitors: [
      { dimension: 'Price', yourProduct: 'Free (public plans)', competitorA: '$20/mo (LivePlan)', competitorB: 'Free (Google Docs)', competitorC: '$0-$50/mo (Notion)' },
      { dimension: 'Version control', yourProduct: 'Full git history', competitorA: 'None', competitorB: 'Basic revision history', competitorC: 'Page history' },
      { dimension: 'Structured template', yourProduct: '5-page structured schema', competitorA: 'SBA-aligned wizard', competitorB: 'Blank document', competitorC: 'User-built templates' },
      { dimension: 'Open / forkable', yourProduct: 'Yes — public repos, MIT', competitorA: 'No — proprietary', competitorB: 'Shareable but not forkable', competitorC: 'Duplicatable' },
      { dimension: 'Developer-friendly', yourProduct: 'GitHub-native, JSON/API', competitorA: 'No', competitorB: 'No', competitorC: 'API available' },
      { dimension: 'Community / discovery', yourProduct: 'Public directory + search', competitorA: 'Sample plans (read-only)', competitorB: 'None', competitorC: 'Template gallery' },
    ],
  },

  // Page 4: Team / Traction / Roadmap
  teamRoadmap: {
    founders: [
      {
        name: 'VentureWiki Founder',
        role: 'CEO / Full-Stack Engineer',
        background: 'Serial entrepreneur, 10+ years in SaaS and developer tools. Previously built and exited a B2B analytics platform.',
        commitment: 'Full-time',
        equity: '100% (pre-funding)',
      },
    ],
    advisors: 'Seeking: (1) ex-YC partner for accelerator channel, (2) GitHub ecosystem expert, (3) fintech/business planning domain expert',
    openRoles: 'Co-founder/CTO (equity-based), Community Manager (part-time), Content Creator (contract)',
    kpis: [
      { metric: 'Published plans', current: '1', target3mo: '100', target12mo: '5,000', notes: 'Core growth metric — every plan adds network value' },
      { metric: 'Monthly active users', current: '0', target3mo: '500', target12mo: '10,000', notes: 'Browse + create + edit activity' },
      { metric: 'GitHub stars (org)', current: '0', target3mo: '500', target12mo: '5,000', notes: 'Developer credibility signal' },
      { metric: 'Fork rate', current: '0%', target3mo: '15%', target12mo: '25%', notes: '% of visitors who fork a plan as template' },
      { metric: 'Premium conversion', current: '0%', target3mo: 'N/A (free beta)', target12mo: '3%', notes: 'Free -> $9/mo creator tier' },
    ],
    milestones: [
      { milestone: 'Launch public beta on Product Hunt', owner: 'Founder', targetDate: '2026-Q2', budget: '$0', successCriteria: '500 signups in first week', status: 'in-progress' as const },
      { milestone: 'First 100 community-submitted plans', owner: 'Community', targetDate: '2026-Q3', budget: '$500 (bounties)', successCriteria: '100 published, non-template plans', status: 'not-started' as const },
      { milestone: 'AI plan generation assistant', owner: 'Engineering', targetDate: '2026-Q3', budget: '$2,000 (API costs)', successCriteria: 'GPT-4o fills 80% of template from a one-paragraph idea', status: 'not-started' as const },
      { milestone: 'Premium tier launch (private plans + analytics)', owner: 'Founder', targetDate: '2026-Q4', budget: '$1,000 (Stripe setup)', successCriteria: '50 paying customers at $9/mo', status: 'not-started' as const },
      { milestone: 'Accelerator partnerships (2 pilots)', owner: 'Founder', targetDate: '2026-Q4', budget: '$100', successCriteria: '2 cohorts use VentureWiki as default planning tool', status: 'not-started' as const },
      { milestone: 'Series seed raise ($250K)', owner: 'Founder', targetDate: '2027-Q1', budget: '$5,000 (legal)', successCriteria: 'Close round at $2M+ cap', status: 'not-started' as const },
    ],
  },

  // Page 5: Funding Ask
  fundingAsk: {
    totalRaise: '$250,000',
    instrument: 'SAFE (Simple Agreement for Future Equity)',
    valuationCapTerms: '$2.5M post-money cap, no discount',
    targetCloseDate: 'Q1 2027',
    askOneLiner: 'Raising $250K to grow VentureWiki from MVP to 5,000 published plans and launch a premium tier generating $5K MRR.',
    useOfFunds: [
      { category: 'Engineering', amount: '$100,000', percentage: '40%', timeline: '12 months', milestoneUnlocked: 'AI plan assistant, premium tier, API' },
      { category: 'Community & Growth', amount: '$60,000', percentage: '24%', timeline: '12 months', milestoneUnlocked: '5,000 plans, 10K MAU, 2 accelerator partnerships' },
      { category: 'Infrastructure', amount: '$30,000', percentage: '12%', timeline: '12 months', milestoneUnlocked: 'Hosting, GitHub API usage, CDN, monitoring' },
      { category: 'Content & Templates', amount: '$25,000', percentage: '10%', timeline: '6 months', milestoneUnlocked: 'Industry-specific templates, case studies, tutorial content' },
      { category: 'Legal & Admin', amount: '$20,000', percentage: '8%', timeline: '3 months', milestoneUnlocked: 'Delaware C-Corp, IP assignment, SAFE docs' },
      { category: 'Reserve', amount: '$15,000', percentage: '6%', timeline: 'Buffer', milestoneUnlocked: 'Runway extension or opportunistic hire' },
    ],
    elevatorPitch: {
      hook: 'Business plans are stuck in the dark ages — locked in PDFs, stale in slide decks, and invisible to the world.',
      companyIntro: 'VentureWiki is the open encyclopedia for digital business plans. Every plan lives as a GitHub repo — structured, version-controlled, and forkable.',
      tractionProof: 'We built the MVP in 3 weeks, our own plan is live on the platform, and the "build in public" movement is creating organic demand for transparent planning tools.',
      marketSize: 'The business planning software market is $1.2B and growing, but no one has built the GitHub/Wikipedia of business plans.',
      askAndUse: "We're raising $250K on a SAFE to reach 5,000 published plans, launch a premium tier, and build AI-assisted plan generation.",
      cta: 'Check out venturewiki.io — and fork our business plan to start yours.',
    },
    risks: [
      { risk: "Founders don't want to make plans public", likelihood: 'medium' as const, impact: 'high' as const, mitigation: 'Premium tier offers private plans. Many indie hackers already build in public — VentureWiki is the structured version.' },
      { risk: 'GitHub API rate limits at scale', likelihood: 'low' as const, impact: 'medium' as const, mitigation: 'Caching layer, GitHub App (higher limits), migrate hot paths to our own DB if needed.' },
      { risk: 'Low-quality or spam plans', likelihood: 'high' as const, impact: 'medium' as const, mitigation: "Community moderation, featured curation, AI quality scoring, GitHub's built-in abuse tools." },
      { risk: 'GitHub changes API terms / pricing', likelihood: 'low' as const, impact: 'high' as const, mitigation: 'Standard GitHub API is stable and free for public repos. We can self-host Gitea as a fallback.' },
    ],
  },

  // Financial Snapshot
  financials: {
    revenueModel: 'Freemium SaaS (public plans free, premium for private + AI + analytics)',
    grossMargin: '85%+ (software, minimal COGS beyond API/hosting)',
    burnRate: '$8,000/mo (solo founder, infra, tools)',
    runway: '31 months at current burn with $250K raise',
    breakEvenTarget: 'Month 18 — 550 premium subscribers at $9/mo',
    cac: '$5 estimated (organic + community-led growth)',
    ltv: '$108 (avg 12-month retention x $9/mo)',
    projections: [
      { year: 'Year 1 (2026)', revenue: '$0', ebitda: '-$96K', users: '10,000 MAU' },
      { year: 'Year 2 (2027)', revenue: '$120K', ebitda: '-$30K', users: '50,000 MAU' },
      { year: 'Year 3 (2028)', revenue: '$480K', ebitda: '$120K', users: '150,000 MAU' },
      { year: 'Year 4 (2029)', revenue: '$1.2M', ebitda: '$400K', users: '400,000 MAU' },
    ],
  },
}

// -- README generator --

function generateReadme(): string {
  const c = plan.cover
  const p = plan.problemSolution
  const f = plan.financials
  return `# ${c.logoEmoji} ${c.companyName}

> ${c.tagline}

**Stage:** ${c.stage} | **Type:** ${c.productType} | **Funding:** ${c.fundingStage}
**HQ:** ${c.headquarters} | [Website](${c.websiteUrl})

---

## Mission
${c.mission}

## Vision
${c.vision}

## The Problem
${p.corePainPoint}

## Our Solution
${p.solutionOneLiner}

### Key Features
${p.features.map(f => `- **${f.feature}** — ${f.benefit}`).join('\n')}

## Market
| | Size | Source |
|---|---|---|
| **TAM** | ${p.market.tamSize} | ${p.market.tamSource} |
| **SAM** | ${p.market.samSize} | ${p.market.samSource} |
| **SOM** | ${p.market.somSize} | ${p.market.somSource} |

## Why Now
${p.whyNow}

## Financials
| Metric | Value |
|---|---|
| Revenue Model | ${f.revenueModel} |
| Gross Margin | ${f.grossMargin} |
| Burn Rate | ${f.burnRate} |
| Runway | ${f.runway} |
| Break-even | ${f.breakEvenTarget} |

### Projections
| Year | Revenue | EBITDA | Users |
|---|---|---|---|
${f.projections.map(p => `| ${p.year} | ${p.revenue} | ${p.ebitda} | ${p.users} |`).join('\n')}

## Funding Ask
${plan.fundingAsk.askOneLiner}

| Category | Amount | % | Milestone |
|---|---|---|---|
${plan.fundingAsk.useOfFunds.map(u => `| ${u.category} | ${u.amount} | ${u.percentage} | ${u.milestoneUnlocked} |`).join('\n')}

## Elevator Pitch
> ${plan.fundingAsk.elevatorPitch.hook}

${plan.fundingAsk.elevatorPitch.companyIntro}

${plan.fundingAsk.elevatorPitch.tractionProof}

${plan.fundingAsk.elevatorPitch.askAndUse}

**${plan.fundingAsk.elevatorPitch.cta}**

---

*Powered by [VentureWiki](https://venturewiki.io) — The open wiki for digital business plans*
`
}

// -- Seed execution --

async function seed() {
  console.log(`\nSeeding VentureWiki business plan into org "${GITHUB_ORG}"...\n`)

  // 1. Create the meta repo (.venturewiki) if it doesn't exist
  console.log('  Creating .venturewiki meta repo (users registry)...')
  try {
    await octokit.rest.repos.createInOrg({
      org: GITHUB_ORG,
      name: '.venturewiki',
      description: 'VentureWiki platform metadata (user registry)',
      visibility: 'public',
      auto_init: true,
      has_issues: false,
    })
    await wait(2000) // Wait for repo initialization
    await upsertFile('.venturewiki', 'users.yaml', 'Init users registry', yaml.dump([]))
    console.log('  Done: .venturewiki meta repo created')
  } catch (e: any) {
    if (e.status === 422) {
      console.log('  Skip: .venturewiki already exists')
    } else {
      throw e
    }
  }

  // 2. Create the venturewiki business plan repo
  console.log('  Creating venturewiki plan repo...')
  try {
    await octokit.rest.repos.createInOrg({
      org: GITHUB_ORG,
      name: SLUG,
      description: `${plan.cover.logoEmoji} ${plan.cover.companyName} — ${plan.cover.tagline}`,
      visibility: 'public',
      has_issues: true,
      auto_init: true,
    })
    console.log('  Done: Repo created')
    await wait(3000) // Wait for repo initialization
  } catch (e: any) {
    if (e.status === 422) {
      console.log('  Skip: Repo already exists, will update files')
    } else {
      throw e
    }
  }

  // 3. Write plan.yaml
  console.log('  Writing .venturewiki/plan.yaml...')
  await upsertFile(SLUG, '.venturewiki/plan.yaml', 'Create VentureWiki business plan', yaml.dump(plan, { lineWidth: -1 }))
  console.log('  Done: plan.yaml written')
  await wait(2000) // Wait between commits

  // 4. Write README.md
  console.log('  Writing README.md...')
  await upsertFile(SLUG, 'README.md', 'Add README', generateReadme())
  console.log('  Done: README.md written')
  await wait(2000)

  // 5. Add GitHub Pages workflow
  console.log('  Adding GitHub Pages workflow...')
  await upsertFile(SLUG, '.github/workflows/pages.yml', 'Add GitHub Pages workflow', generatePagesWorkflow())
  console.log('  Done: GitHub Pages workflow added')

  // 6. Enable GitHub Pages
  console.log('  Enabling GitHub Pages...')
  await enableGitHubPages(octokit, GITHUB_ORG, SLUG)
  console.log('  Done: GitHub Pages enabled')

  // 7. Set topics
  console.log('  Setting topics...')
  await octokit.rest.repos.replaceAllTopics({
    owner: GITHUB_ORG,
    repo: SLUG,
    names: [
      'venturewiki',
      'venturewiki-featured',
      'stage-mvp',
      'type-web-app',
      'funding-bootstrapped',
      'saas',
      'developer-tools',
    ],
  })
  console.log('  Done: Topics set')

  // 8. Create discussion issue
  console.log('  Creating discussion issue...')
  try {
    await octokit.rest.issues.create({
      owner: GITHUB_ORG,
      repo: SLUG,
      title: 'Discussion — Leave your feedback',
      body: "This is the community discussion thread for the VentureWiki business plan. Share feedback, ask questions, or suggest edits!\n\n> This is the first plan on VentureWiki — we're using our own tool to plan our own business. Meta, right?",
      labels: ['discussion'],
    })
    console.log('  Done: Discussion issue created')
  } catch {
    console.log('  Skip: Discussion issue may already exist')
  }

  console.log(`
Done! Your VentureWiki business plan is live at:
   https://github.com/${GITHUB_ORG}/${SLUG}

   Next steps:
   1. Set up .env.local with your credentials
   2. Run: npm run dev
   3. Visit: http://localhost:3000/business/${SLUG}
`)
}

seed().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
