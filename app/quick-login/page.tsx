'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function QuickLoginPage() {
  const [status, setStatus] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (user) {
      setIsLoggedIn(true)
      setUserInfo(user)
      setStatus(`✅ Already logged in as: ${user.email}`)
    } else {
      setIsLoggedIn(false)
      setStatus('❌ Not logged in')
    }
  }

  const autoLogin = async () => {
    setStatus('🔄 Logging in...')

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'TestPass123!',
      })

      if (error) {
        setStatus(`❌ Login failed: ${error.message}`)
        return
      }

      if (data.user) {
        setStatus('✅ Login successful!')
        setIsLoggedIn(true)
        setUserInfo(data.user)

        // Wait a moment then redirect
        setTimeout(() => {
          router.push('/settings')
        }, 1000)
      }
    } catch (err) {
      setStatus(`❌ Error: ${err}`)
    }
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUserInfo(null)
    setStatus('🔓 Logged out')
  }

  const goToSettings = () => {
    router.push('/settings')
  }

  return (
    <div className="min-h-screen p-8 bg-blue-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-800">Quick Login Test</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-lg font-mono">{status}</p>
        </div>

        {!isLoggedIn ? (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Login</h2>
            <button
              onClick={autoLogin}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              🔑 Login as Test User
            </button>
            <div className="mt-4 text-sm text-gray-600">
              <p>Test User: test@example.com</p>
              <p>Password: TestPass123!</p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Logged In</h2>
            <div className="space-y-2 text-sm mb-4">
              <p><strong>Email:</strong> {userInfo?.email}</p>
              <p><strong>User ID:</strong> {userInfo?.id}</p>
              <p><strong>Created:</strong> {new Date(userInfo?.created_at).toLocaleString()}</p>
            </div>
            <div className="space-x-4">
              <button
                onClick={goToSettings}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                ⚙️ Go to Settings
              </button>
              <button
                onClick={logout}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                🔓 Logout
              </button>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Navigation</h2>
          <div className="space-x-4">
            <a href="/settings" className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
              Settings Page
            </a>
            <a href="/login" className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              Login Page
            </a>
            <a href="/debug" className="inline-block px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
              Debug Page
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}