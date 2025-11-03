'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardClient from './dashboard-client'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [firstName, setFirstName] = useState('there')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        
        // Check if user is logged in
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        
        if (error || !currentUser) {
          // Not logged in - show welcome page
          setLoading(false)
          return
        }

        // User is logged in
        setUser(currentUser)
        
        // Get first name from user metadata
        const name = currentUser.user_metadata?.first_name || currentUser.email?.split('@')[0] || 'there'
        setFirstName(name)

        // Try to get avatar URL (non-critical)
        try {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('user_id', currentUser.id)
            .single()
          
          if (profileErr) {
            console.warn('⚠️ Error loading avatar:', profileErr)
          } else {
            console.log('🖼️ Avatar URL from profile:', profile?.avatar_url)
            if (profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.trim() !== '') {
              console.log('✅ Setting avatar URL:', profile.avatar_url)
              setAvatarUrl(profile.avatar_url)
            } else {
              console.log('⚠️ No valid avatar URL found, using fallback')
              setAvatarUrl(null)
            }
          }
        } catch (err) {
          console.warn('⚠️ Error loading avatar (catch):', err)
          // Continue without avatar
        }

        setLoading(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Show loading state briefly
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF6F0' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2D5016' }}></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is logged in, show dashboard
  if (user) {
    return <DashboardClient firstName={firstName} avatarUrl={avatarUrl} />
  }

  // Not logged in - show welcome page
  return <WelcomePage />
}

function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col px-4" style={{ backgroundColor: '#FAF6F0' }}>
      {/* Main Content - vertikal und horizontal zentriert */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center w-full max-w-md">
          {/* Welcome Text */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-16 text-center">
            Welcome to Village
          </h1>

          {/* Buttons */}
          <div className="flex flex-col gap-4 w-full mb-6">
            <a
              href="/login"
              style={{ backgroundColor: '#2D5016' }}
              className="hover:opacity-90 text-white font-bold py-4 px-8 rounded-lg text-center transition-opacity w-full"
            >
              Log in
            </a>
            <a
              href="/register"
              style={{ backgroundColor: '#C85C1A' }}
              className="hover:opacity-90 text-white font-bold py-4 px-8 rounded-lg text-center transition-opacity w-full"
            >
              Sign up
            </a>
          </div>

          {/* Sign up link */}
          <p className="text-center" style={{ color: '#C85C1A' }}>
            <a href="/register" className="hover:underline">
              New here? Sign up for free.
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-6 flex justify-between items-center text-sm" style={{ color: '#8B6F47' }}>
        <span>Village</span>
        <nav className="flex gap-4">
          <a href="/about" className="hover:underline">
            About
          </a>
          <span>|</span>
          <a href="/privacy" className="hover:underline">
            Privacy
          </a>
          <span>|</span>
          <a href="/terms" className="hover:underline">
            Terms
          </a>
        </nav>
      </footer>
    </div>
  )
}
