'use client'

import { useState } from 'react'
import Link from '@/lib/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email')
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full text-center">
            {/* Logo removed */}

            {/* Success Message */}
            <h1 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: '#374151' }}>
              You forgot your password? We got you!
            </h1>

            <p className="text-lg mb-8" style={{ color: '#374151' }}>
              We've sent you an email with a link to reset your password.
            </p>

            {/* Troubleshooting */}
            <div className="bg-white rounded-lg p-6 mb-8 text-left max-w-lg mx-auto">
              <p className="font-semibold mb-2" style={{ color: '#374151' }}>
                Didn't receive it?
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Check your spam folder, or try again in a few minutes. If all fails, shoot us an email at{' '}
                <a
                  href="mailto:hello@expatvillage.ch"
                  className="underline hover:no-underline"
                  style={{ color: '#C85C1A' }}
                >
                  hello@expatvillage.ch
                </a>
              </p>
            </div>
          </div>
        </div>
        <RegistrationFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo removed */}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center" style={{ color: '#374151' }}>
            Forgot your password?
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#2D5016',
                  borderWidth: '1px',
                }}
                placeholder="email@example.com"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2D5016' }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-base hover:underline"
              style={{ color: '#C85C1A' }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
      <RegistrationFooter />
    </div>
  )
}

// Logo removed

