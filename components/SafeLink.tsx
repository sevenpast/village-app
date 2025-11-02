/**
 * Safe Link Component - Explicit Next.js Link import
 * Fixes Vercel production build issues with Link not being defined
 */

import NextLink from 'next/link'
import { ComponentProps } from 'react'

// Re-export Link with explicit import to prevent bundling issues
export default function SafeLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} />
}

// Also provide a named export for convenience
export const Link = SafeLink