import type { Auth } from './core.js'

/** GitHub token for stdio mode — read once from the environment. */
export function envAuth(): Auth {
  const token =
    process.env.VENTUREWIKI_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GITHUB_ADMIN_TOKEN ||
    ''
  return { token }
}

/** Extract a bearer token from an HTTP Authorization header. */
export function bearerAuth(authorizationHeader: string | undefined): Auth {
  const m = /^Bearer\s+(.+)$/i.exec(authorizationHeader ?? '')
  return { token: m?.[1]?.trim() || '' }
}
