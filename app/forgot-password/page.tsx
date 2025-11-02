'use client'

import { useState } from 'react'
import Link from 'next/link'
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
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <Logo />
            </div>

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
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

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

// Logo Component - same as RegistrationHeader
function Logo() {
  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="4" fill="#FF8C42" />
        <g transform="translate(32, 32)">
          <VShape angle={0} color="#1E3A8A" />
          <VShape angle={30} color="#22C55E" />
          <VShape angle={60} color="#9333EA" />
          <VShape angle={90} color="#DC2626" />
          <VShape angle={120} color="#3B82F6" />
          <VShape angle={150} color="#14B8A6" />
          <VShape angle={180} color="#EAB308" />
          <VShape angle={210} color="#EC4899" />
          <VShape angle={240} color="#1E3A8A" />
          <VShape angle={270} color="#22C55E" />
          <VShape angle={300} color="#9333EA" />
          <VShape angle={330} color="#DC2626" />
        </g>
      </svg>
    </div>
  )
}

const VSHAPE_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 20, y: 0 },
  30: { x: 17.320508, y: 10 },
  60: { x: 10, y: 17.320508 },
  90: { x: 0, y: 20 },
  120: { x: -10, y: 17.320508 },
  150: { x: -17.320508, y: 10 },
  180: { x: -20, y: 0 },
  210: { x: -17.320508, y: -10 },
  240: { x: -10, y: -17.320508 },
  270: { x: 0, y: -20 },
  300: { x: 10, y: -17.320508 },
  330: { x: 17.320508, y: -10 },
}

function VShape({ angle, color }: { angle: number; color: string }) {
  const position = VSHAPE_POSITIONS[angle] || { x: 0, y: 0 }
  const rotation = angle + 90

  return (
    <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation})`}>
      <path
        d="M -3 -6 L 0 0 L 3 -6"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

