/**
 * One-off cleanup for the "outside collaborators only" change.
 *
 * Earlier versions of VentureWiki created a `venture-<slug>` GitHub team per
 * org-hosted venture (to scope email org invitations) and stored the team id
 * as `_githubTeamId` inside `.venturewiki/plan.yaml`. Invites now only ever add
 * outside collaborators, so those teams and that key are dead weight.
 *
 * This script:
 *   1. Deletes every `venture-*` team in the org.
 *   2. Strips the `_githubTeamId` key from every `plan.yaml` that still has it.
 *
 * Run a dry run first:
 *   npx tsx scripts/cleanup-venture-teams.ts --dry-run
 * Then for real:
 *   npx tsx scripts/cleanup-venture-teams.ts
 *
 * Requires NEXT_PUBLIC_GITHUB_ORG and GITHUB_ADMIN_TOKEN (PAT with
 * admin:org + repo scopes) in .env.local.
 */

import { Octokit } from 'octokit'
import * as dotenv from 'dotenv'
import * as path from 'path'
import yaml from 'js-yaml'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const GITHUB_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG!
const GITHUB_TOKEN = process.env.GITHUB_ADMIN_TOKEN!
const DRY_RUN = process.argv.includes('--dry-run')

if (!GITHUB_ORG || !GITHUB_TOKEN) {
  console.error('Missing NEXT_PUBLIC_GITHUB_ORG or GITHUB_ADMIN_TOKEN in .env.local')
  process.exit(1)
}

const octokit = new Octokit({ auth: GITHUB_TOKEN })
const PLAN_PATH = '.venturewiki/plan.yaml'
const TEAM_PREFIX = 'venture-'

async function deleteVentureTeams() {
  console.log(`\n== Teams in ${GITHUB_ORG} ==`)
  const teams = await octokit.paginate(octokit.rest.teams.list, { org: GITHUB_ORG, per_page: 100 })
  const ventureTeams = teams.filter(t => t.slug.startsWith(TEAM_PREFIX) || t.name.startsWith(TEAM_PREFIX))

  if (ventureTeams.length === 0) {
    console.log('  No venture-* teams found.')
    return
  }

  for (const team of ventureTeams) {
    if (DRY_RUN) {
      console.log(`  [dry-run] would delete team @${GITHUB_ORG}/${team.slug}`)
      continue
    }
    try {
      await octokit.rest.teams.deleteInOrg({ org: GITHUB_ORG, team_slug: team.slug })
      console.log(`  deleted team @${GITHUB_ORG}/${team.slug}`)
    } catch (e: any) {
      console.warn(`  ! failed to delete @${GITHUB_ORG}/${team.slug}: ${e?.message || e}`)
    }
  }
}

async function stripGithubTeamIdFromPlans() {
  console.log(`\n== plan.yaml files in ${GITHUB_ORG} ==`)
  const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
    org: GITHUB_ORG,
    type: 'all',
    per_page: 100,
  })

  for (const repo of repos) {
    let file
    try {
      const res = await octokit.rest.repos.getContent({ owner: GITHUB_ORG, repo: repo.name, path: PLAN_PATH })
      file = 'content' in res.data ? res.data : null
    } catch {
      continue // no plan.yaml — not a venture repo
    }
    if (!file || !('content' in file) || !file.content) continue

    const raw = Buffer.from(file.content, 'base64').toString('utf-8')
    if (!raw.includes('_githubTeamId')) continue

    let parsed: any
    try {
      parsed = yaml.load(raw)
    } catch {
      console.warn(`  ! ${repo.name}: plan.yaml is not valid YAML, skipping`)
      continue
    }
    if (!parsed || typeof parsed !== 'object' || !('_githubTeamId' in parsed)) continue

    delete parsed._githubTeamId
    const next = yaml.dump(parsed, { lineWidth: -1 })

    if (DRY_RUN) {
      console.log(`  [dry-run] would strip _githubTeamId from ${repo.name}/${PLAN_PATH}`)
      continue
    }
    try {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: GITHUB_ORG,
        repo: repo.name,
        path: PLAN_PATH,
        message: 'chore: drop unused _githubTeamId from plan.yaml',
        content: Buffer.from(next, 'utf-8').toString('base64'),
        sha: file.sha,
      })
      console.log(`  stripped _githubTeamId from ${repo.name}/${PLAN_PATH}`)
    } catch (e: any) {
      console.warn(`  ! ${repo.name}: failed to update plan.yaml: ${e?.message || e}`)
    }
  }
}

async function main() {
  console.log(`Cleanup for org "${GITHUB_ORG}"${DRY_RUN ? ' (dry run)' : ''}`)
  await deleteVentureTeams()
  await stripGithubTeamIdFromPlans()
  console.log('\nDone.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
