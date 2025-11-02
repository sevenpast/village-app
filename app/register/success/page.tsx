'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import NextLink from 'next/link'

// Explicitly alias Link to avoid production bundling issues
const Link = NextLink
import RegistrationHeader from '@/components/forms/RegistrationHeader'
import RegistrationFooter from '@/components/forms/RegistrationFooter'

export const dynamic = 'force-dynamic'

function SuccessContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || '[your email]'
  const firstName = searchParams.get('firstName') || email.split('@')[0]

  return (
    <div className="min-h-screen flex flex-col bg-village-beige">
      <RegistrationHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          {/* Logo removed */}

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-700">
            Thanks for registering at Village, {firstName}!
          </h1>

          <p className="text-lg mb-8 text-gray-700">
            Please confirm your email by clicking on the link in the email we sent you.
          </p>

          {/* Troubleshooting */}
          <div className="bg-white rounded-lg p-6 mb-8 text-left max-w-lg mx-auto shadow-sm">
            <p className="font-semibold mb-2 text-gray-700">
              Didn't receive it?
            </p>
            <p className="text-sm text-gray-600">
              Check your spam folder, or try again in a few minutes. If all fails, shoot us an email at{' '}
              <a
                href="mailto:hello@expatvillage.ch"
                className="underline hover:no-underline text-village-orange"
              >
                hello@expatvillage.ch
              </a>
            </p>
          </div>

          {/* Continue Button */}
          <Link
            href="/login"
            className="inline-block px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90 bg-village-green hover:bg-village-green-light"
          >
            Continue to Login
          </Link>
        </div>
      </div>
      <RegistrationFooter />
    </div>
  )
}

// Logo removed

export default function RegistrationSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}

