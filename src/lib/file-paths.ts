// Encodes each path segment but preserves '/' separators. The Next.js param
// `path` arrives as already-decoded segments — we re-encode for use as URLs.
export function encodePathSegment(s: string): string {
  return s.split('/').map(encodeURIComponent).join('/')
}

export function rawFileUrl(slug: string, path: string): string {
  return `/api/businesses/${encodeURIComponent(slug)}/files/${encodePathSegment(path)}?raw=1`
}
