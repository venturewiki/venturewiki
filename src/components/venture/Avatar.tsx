'use client'
import Image from 'next/image'

// Compact avatar — image when one is given, else colored initials. Used in
// candidate, validation, investment, and discussion lists.
export function Avatar({
  src, name, size = 32, fallbackClass = 'bg-accent/20 text-accent',
}: {
  src?: string
  name: string
  size?: number
  fallbackClass?: string
}) {
  const className = 'rounded-full shrink-0 flex items-center justify-center'
  const dim = { width: size, height: size, minWidth: size, minHeight: size }
  if (src) {
    return <Image src={src} alt={name} width={size} height={size} className="w-8 h-8 rounded-full shrink-0" style={dim} />
  }
  return (
    <div className={`w-8 h-8 ${className} ${fallbackClass} text-xs font-bold`} style={dim}>
      {name[0]?.toUpperCase()}
    </div>
  )
}
