'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginTestPage() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const autoLogin = async () => {
    setLoading(true)
    setStatus('🔄 Attempting auto-login with test user...')

    try {
      const supabase = createClient()

      // Test credentials
      const email = 'test@example.com'
      const password = 'TestPass123!'

      setStatus('🔑 Signing in...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setStatus(`❌ Login Error: ${error.message}`)
        setLoading(false)
        return
      }

      if (data.user) {
        setStatus('✅ Login successful! Redirecting to settings...')

        // Wait a moment then redirect
        setTimeout(() => {
          router.push('/settings')
        }, 1500)
      } else {
        setStatus('❌ No user data returned')
      }
    } catch (err) {
      setStatus(`❌ Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const checkAuthStatus = async () => {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      setStatus(`❌ Auth check error: ${error.message}`)
      return
    }

    if (user) {
      setStatus(`✅ User authenticated: ${user.email} (ID: ${user.id})`)
    } else {
      setStatus('❌ No user authenticated')
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Login Test</h1>

      <div className="space-y-4">
        <button
          onClick={autoLogin}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Auto-Login with Test User'}
        </button>

        <button
          onClick={checkAuthStatus}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 ml-4"
        >
          Check Auth Status
        </button>

        <div className="mt-6 p-4 bg-white rounded-lg border">
          <h3 className="font-semibold mb-2">Status:</h3>
          <pre className="text-sm">{status}</pre>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border">
          <h3 className="font-semibold mb-2">Test User Credentials:</h3>
          <p>Email: test@example.com</p>
          <p>Password: TestPass123!</p>
        </div>

        <div className="mt-6 space-x-4">
          <a href="/login" className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            Go to Login Page
          </a>
          <a href="/settings" className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Go to Settings Page
          </a>
        </div>
      </div>
    </div>
  )
}