// Simple extension → MIME inference. Covers the file types a browser can
// render natively (text, html, images, audio, video, pdf) plus common code/
// config formats so they at least display as plain text.

const MIME: Record<string, string> = {
  // Text & docs
  txt: 'text/plain', text: 'text/plain', log: 'text/plain', readme: 'text/plain',
  md: 'text/markdown', markdown: 'text/markdown', mdown: 'text/markdown',
  csv: 'text/csv', tsv: 'text/tab-separated-values',
  // Web
  html: 'text/html', htm: 'text/html', xhtml: 'application/xhtml+xml',
  css: 'text/css',
  js: 'text/javascript', mjs: 'text/javascript', cjs: 'text/javascript', jsx: 'text/javascript',
  ts: 'text/x-typescript', tsx: 'text/x-typescript',
  json: 'application/json',
  xml: 'application/xml', rss: 'application/rss+xml', atom: 'application/atom+xml',
  yaml: 'text/yaml', yml: 'text/yaml',
  toml: 'text/x-toml', ini: 'text/plain', env: 'text/plain', conf: 'text/plain',
  // Code (display as text)
  py: 'text/x-python', rb: 'text/x-ruby', go: 'text/x-go',
  rs: 'text/x-rust', java: 'text/x-java', kt: 'text/x-kotlin',
  c: 'text/x-c', h: 'text/x-c', cpp: 'text/x-c++', hpp: 'text/x-c++', cc: 'text/x-c++',
  cs: 'text/x-csharp', php: 'application/x-php', swift: 'text/x-swift',
  sh: 'application/x-sh', bash: 'application/x-sh', zsh: 'application/x-sh',
  sql: 'application/sql', graphql: 'application/graphql', gql: 'application/graphql',
  dockerfile: 'text/plain', makefile: 'text/plain',
  // Images
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp',
  ico: 'image/x-icon', tiff: 'image/tiff', tif: 'image/tiff',
  heic: 'image/heic', heif: 'image/heif', svg: 'image/svg+xml',
  // Audio
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg',
  m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  weba: 'audio/webm', opus: 'audio/opus',
  // Video
  mp4: 'video/mp4', m4v: 'video/x-m4v', webm: 'video/webm',
  mov: 'video/quicktime', mkv: 'video/x-matroska',
  ogv: 'video/ogg', avi: 'video/x-msvideo',
  // Documents
  pdf: 'application/pdf',
}

export function mimeFromName(name: string): string {
  const lower = name.toLowerCase()
  // Some filenames have no extension but conventional names (Dockerfile, Makefile).
  if (lower === 'dockerfile' || lower === 'makefile' || lower === 'readme') {
    return 'text/plain'
  }
  const i = lower.lastIndexOf('.')
  if (i < 0) return 'application/octet-stream'
  return MIME[lower.slice(i + 1)] || 'application/octet-stream'
}

export type FileCategory =
  | 'markdown'
  | 'html'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'binary'

export function categoryFromName(name: string): FileCategory {
  const m = mimeFromName(name)
  if (m === 'text/markdown') return 'markdown'
  if (m === 'text/html' || m === 'application/xhtml+xml') return 'html'
  if (m === 'application/pdf') return 'pdf'
  if (m === 'image/svg+xml') return 'image' // render via <img>; browser handles SVG
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (
    m.startsWith('text/') ||
    m === 'application/json' ||
    m === 'application/xml' ||
    m === 'application/rss+xml' ||
    m === 'application/atom+xml' ||
    m === 'application/x-sh' ||
    m === 'application/sql' ||
    m === 'application/graphql' ||
    m === 'application/x-php'
  ) {
    return 'text'
  }
  return 'binary'
}
