import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="text-center">
        <div className="font-display text-[120px] font-bold text-rule leading-none select-none">404</div>
        <h1 className="font-display text-3xl font-bold text-paper mt-4 mb-3">Page not found</h1>
        <p className="text-muted text-base mb-8 max-w-sm mx-auto">
          This page doesn't exist in VentureWiki. It may have been moved or deleted.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-primary">Back to home</Link>
          <Link href="/business/new" className="btn-ghost">Create a business plan</Link>
        </div>
      </div>
    </div>
  )
}
