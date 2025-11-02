'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

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

// Pre-calculated positions for 12 V-shapes at 30-degree intervals (radius = 20)
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

