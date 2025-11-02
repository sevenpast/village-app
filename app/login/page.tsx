'use client'

import Link from '@/lib/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RegistrationFooter from '@/components/forms/RegistrationFooter'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Handle email not confirmed error - auto-confirm for MVP (email verification comes later)
        if (signInError.message?.includes('email not confirmed') || signInError.message?.includes('Email not confirmed')) {
          // Auto-confirm email via API so user can login (MVP requirement: no email confirmation needed)
          try {
            const confirmResponse = await fetch('/api/auth/confirm-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            })

            if (confirmResponse.ok) {
              // Retry login after auto-confirming email
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email,
                password,
              })

              if (retryError) {
                setError(retryError.message || 'Invalid email or password')
                setLoading(false)
                return
              }

              if (retryData.user) {
                router.push('/')
                router.refresh()
                return
              }
            }
          } catch (confirmErr) {
            console.error('Error auto-confirming email:', confirmErr)
          }
        }

        setError(signInError.message || 'Invalid email or password')
        setLoading(false)
        return
      }

      if (data.user) {
        // Successfully logged in - redirect to dashboard or home
        router.push('/')
        router.refresh() // Refresh to update auth state
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      {/* Main Content - centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo removed */}

          {/* Welcome Message */}
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center" style={{ color: '#374151' }}>
            Welcome to Village
          </h1>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
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

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
                Password
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
                placeholder="Password"
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-left">
              <Link
                href="/forgot-password"
                className="text-sm underline hover:no-underline"
                style={{ color: '#374151' }}
              >
                Forgot your password?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2D5016' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <Link
              href="/register"
              className="text-base hover:underline"
              style={{ color: '#C85C1A' }}
            >
              New here? Sign up!
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <RegistrationFooter />
    </div>
  )
}

// Logo removed

