'use client'

import Link from '@/lib/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'

export default function ResetPasswordSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          {/* Logo removed */}

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#374151' }}>
            Your new password is set!
          </h1>

          {/* Continue Button */}
          <Link
            href="/login"
            className="inline-block px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2D5016' }}
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

