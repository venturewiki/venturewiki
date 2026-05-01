import type { Octokit } from 'octokit'
import { getAdminOctokit, getPublicOctokit, GITHUB_ORG } from '@/lib/github'
import type { Comment } from '@/types'
import { resolveBusinessOwner, pickWriteOctokit } from './owner'

// Comments use a single labeled GitHub Issue per repo as the discussion thread.
// Lazy-creates the issue on first comment so unused ventures don't pollute.
async function getOrCreateThread(
  slug: string,
  viewerOctokit?: Octokit,
): Promise<{ owner: string; issueNumber: number }> {
  const owner = await resolveBusinessOwner(slug)
  if (!owner) throw new Error('Business not found')

  // Read with admin token for venturewiki org, viewer otherwise. For private
  // cross-owner repos with no viewer, this 404s and produces an empty thread.
  const reader = owner === GITHUB_ORG
    ? getAdminOctokit()
    : (viewerOctokit ?? getAdminOctokit())

  const { data: issues } = await reader.rest.issues.listForRepo({
    owner, repo: slug, labels: 'discussion', state: 'open', per_page: 1,
  })
  if (issues.length > 0) return { owner, issueNumber: issues[0].number }

  const writer = pickWriteOctokit(owner, viewerOctokit)
  const { data: issue } = await writer.rest.issues.create({
    owner, repo: slug,
    title: '💬 Discussion — Leave your feedback',
    body: 'This is the community discussion thread for this business plan. Share feedback, ask questions, or suggest edits!',
    labels: ['discussion'],
  })
  return { owner, issueNumber: issue.number }
}

export async function addComment(
  data: Omit<Comment, 'id' | 'createdAt'>,
  viewerOctokit?: Octokit,
): Promise<string> {
  const { owner, issueNumber } = await getOrCreateThread(data.businessId, viewerOctokit)
  const octokit = pickWriteOctokit(owner, viewerOctokit)
  const body = data.section
    ? `**Re: ${data.section}**\n\n${data.content}`
    : data.content

  const { data: comment } = await octokit.rest.issues.createComment({
    owner, repo: data.businessId, issue_number: issueNumber, body,
  })
  return comment.id.toString()
}

export async function getComments(businessId: string): Promise<Comment[]> {
  try {
    const { owner, issueNumber } = await getOrCreateThread(businessId)
    const { data: comments } = await getPublicOctokit().rest.issues.listComments({
      owner, repo: businessId, issue_number: issueNumber, per_page: 100,
    })
    return comments.map(c => ({
      id: c.id.toString(),
      businessId,
      userId: c.user?.login || '',
      userName: c.user?.login || '',
      userImage: c.user?.avatar_url,
      content: c.body || '',
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }))
  } catch {
    return []
  }
}
