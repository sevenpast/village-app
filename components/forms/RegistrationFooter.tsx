'use client'

import Link from 'next/link'

/**
 * Registration Footer Component
 * Shows privacy statement and footer links
 */
export default function RegistrationFooter() {
  return (
    <>
      {/* Privacy Statement */}
      <div className="max-w-4xl mx-auto px-4 py-6 text-center">
        <p className="text-sm text-gray-700 max-w-3xl mx-auto">
          We care about your privacy. By signing up, you agree to our{' '}
          <Link href="/privacy" className="underline hover:no-underline">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/terms" className="underline hover:no-underline">
            Terms of Use
          </Link>
          . We'll only use your information to support your experience and will never share your
          sensitive data with third parties without your consent.
        </p>
      </div>

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


