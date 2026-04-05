/**
 * GitHub Actions workflow that builds a static HTML page from plan.yaml
 * and deploys it to GitHub Pages on every push.
 */
export function generatePagesWorkflow(): string {
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
            <title>\\\${c.logoEmoji||'🚀'} \\\${c.companyName||'Business Plan'}</title>
            <meta name='description' content='\\\${(c.tagline||'').replace(/'/g,\"&#39;\")}' />
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
                <h1><span class='emoji'>\\\${c.logoEmoji||'🚀'}</span> \\\${c.companyName||'Business Plan'}</h1>
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
                <p>Powered by <a href=\\'https://venturewiki.io\\'>VentureWiki</a> — The open wiki for digital business plans</p>
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

/**
 * Enable GitHub Pages on a repo (source: GitHub Actions).
 */
export async function enableGitHubPages(
  octokit: any,
  owner: string,
  repo: string
): Promise<void> {
  try {
    await octokit.rest.repos.createPagesSite({
      owner,
      repo,
      build_type: 'workflow',
    })
  } catch (e: any) {
    // 409 = pages already enabled, 422 = already exists
    if (e.status !== 409 && e.status !== 422) {
      console.error('Failed to enable GitHub Pages:', e.message)
    }
  }
}
