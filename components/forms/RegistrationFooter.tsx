'use client'

import Link from '@/lib/link'

/**
 * Registration Footer Component
 * Shows privacy statement and footer links
 */
export default function RegistrationFooter() {
  return (
    <>
      {/* Footer Bar */}
      <footer
        className="w-full px-4 py-4 flex justify-between items-center text-sm"
        style={{ backgroundColor: '#FAF6F0', color: '#8B6F47' }}
      >
        <span>Village</span>
        <nav className="flex gap-4">
          <Link href="/about" className="hover:underline">
            About
          </Link>
          <span>|</span>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <span>|</span>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
        </nav>
      </footer>
    </>
  )
}


