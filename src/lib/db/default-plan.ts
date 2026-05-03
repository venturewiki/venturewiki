import fs from 'fs'
import path from 'path'

/**
 * Generates a default plan.yaml scaffold for a repo that has the
 * `venturewiki` topic but no `.venturewiki/plan.yaml` yet.
 * Shared by the onboard route and the self-heal logic in getBusinessBySlug.
 *
 * The template lives at templates/default-plan.yaml — edit that file to
 * change the default structure. Tokens: {{owner}}, {{slug}}, {{description}},
 * {{userId}}, {{createdAt}}, {{updatedAt}}.
 */

const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'default-plan.yaml')

export function defaultPlanYaml(opts: {
  owner: string
  name: string
  description: string
  userId: string
}): string {
  const now = new Date().toISOString()
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8')
  return template
    .replaceAll('{{owner}}',      opts.owner)
    .replaceAll('{{slug}}',       opts.name)
    .replaceAll('{{description}}', opts.description)
    .replaceAll('{{userId}}',     opts.userId)
    .replaceAll('{{createdAt}}',  now)
    .replaceAll('{{updatedAt}}',  now)
}
