'use client'

/**
 * Centralized Link component
 * Ensures Link is always properly bundled in production
 */
import NextLink from 'next/link'
import { ComponentProps } from 'react'

// Explicit default export
const Link = (props: ComponentProps<typeof NextLink>) => {
  return <NextLink {...props} />
}

export default Link
export { Link }

