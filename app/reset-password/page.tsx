'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from '@/lib/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'

export const dynamic = 'force-dynamic'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    // Check password strength (match server validation)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    if (!passwordRegex.test(password)) {
      setError('Password must contain uppercase, lowercase, number and special character')
      return
    }

    if (!token) {
      setError('Invalid reset token')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          password_confirm: passwordConfirm,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to reset password')
        setLoading(false)
        return
      }

      setSuccess(true)
      // Redirect to success page after 2 seconds
      setTimeout(() => {
        router.push('/reset-password/success')
      }, 2000)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo removed */}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center" style={{ color: '#374151' }}>
            Reset your password.
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#2D5016',
                  borderWidth: '1px',
                }}
                placeholder="Enter new password"
              />
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                id="passwordConfirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#2D5016',
                  borderWidth: '1px',
                }}
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-600">
                Password reset successfully! Redirecting...
              </div>
            )}

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading || success || !token}
              className="w-full px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2D5016' }}
            >
              {loading ? 'Saving...' : success ? 'Saved!' : 'Save'}
            </button>
          </form>
        </div>
      </div>
      <RegistrationFooter />
    </div>
  )
}

// Logo removed

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

