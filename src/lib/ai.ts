import { GoogleGenerativeAI } from '@google/generative-ai'
import { getPublicOctokit, GITHUB_ORG, getRepoContent } from './github'

const TEMPLATE_REPO = 'venture-template'
const TEMPLATE_PATH = '.venturewiki/plan-template.yaml'

// ── Fetch the live template from GitHub ──────────────────────────────────────

let templateCache: { content: string; ts: number } | null = null
const TEMPLATE_CACHE_TTL = 300_000 // 5 minutes

async function getTemplate(): Promise<string> {
  if (templateCache && Date.now() - templateCache.ts < TEMPLATE_CACHE_TTL) {
    return templateCache.content
  }
  const octokit = getPublicOctokit()
  const { data } = await getRepoContent(octokit, {
    owner: GITHUB_ORG,
    repo: TEMPLATE_REPO,
    path: TEMPLATE_PATH,
  })
  if (!('content' in data) || data.type !== 'file') {
    throw new Error('Template file not found')
  }
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  templateCache = { content, ts: Date.now() }
  return content
}

// ── AI Venture Generator ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are VentureWiki's AI venture plan generator. Your job is to create comprehensive, investor-ready business plans.

RULES:
1. Output ONLY valid YAML matching the template structure exactly — no markdown fencing, no preamble, no commentary.
2. Fill EVERY field with substantive, specific content — never leave fields empty or with placeholder text.
3. Use real-world data when possible: cite actual market sizes, name real competitors, reference real technologies.
4. Be quantitative: include specific dollar amounts, percentages, timelines, and metrics.
5. Write in a professional but energetic tone appropriate for a pitch deck.
6. For financial projections, make them ambitious but defensible given the stage.
7. Match the tone and depth of a Y Combinator application or pitch deck.
8. Do NOT include YAML comments (lines starting with #) — output clean data only.
9. Do NOT include the meta fields (id, slug, createdBy, contributors, viewCount, editCount, isArchived, isFeatured, createdAt, updatedAt) — those are auto-generated.
10. DO include isPublic: true at the top level.`

export async function generateVenturePlan(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const template = await getTemplate()

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro-preview-05-06',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 16000,
    },
  })

  const prompt = `Here is the VentureWiki plan template with field instructions:\n\n${template}\n\n---\n\nUser's venture idea:\n${userPrompt}\n\n---\n\nGenerate a complete venture plan YAML filling every field based on the user's idea and the template structure. Output raw YAML only, no markdown fencing.`

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: prompt }] },
    ],
    systemInstruction: { role: 'model', parts: [{ text: SYSTEM_PROMPT }] },
  })

  const response = result.response.text()

  // Strip markdown fencing if the model accidentally included it
  let yaml = response.trim()
  if (yaml.startsWith('```yaml')) yaml = yaml.slice(7)
  else if (yaml.startsWith('```')) yaml = yaml.slice(3)
  if (yaml.endsWith('```')) yaml = yaml.slice(0, -3)

  return yaml.trim()
}
