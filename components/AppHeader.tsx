'use client'

import Link from '@/lib/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AppHeaderProps {
  firstName: string
  avatarUrl?: string | null
  showHome?: boolean
}

export default function AppHeader({ firstName, avatarUrl, showHome = false }: AppHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="w-full" style={{ backgroundColor: '#294F3F' }}>
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side: Home button (optional) */}
        <div className="flex items-center">
          {showHome && (
            <Link
              href="/"
              className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity font-medium"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </Link>
          )}
        </div>

        {/* Center: Empty (Logo removed) */}
        <div className="flex-1"></div>

        {/* Right side: Profile Picture, Settings & Logout */}
        <div className="flex flex-col items-end gap-2">
          {/* Profile Picture */}
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${firstName}'s profile`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: '#C85C1A' }}
              >
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Settings & Logout Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="text-sm font-medium text-white hover:text-gray-200 underline decoration-white/80 hover:decoration-white transition-colors"
              style={{ textUnderlineOffset: '2px' }}
            >
              settings
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-white hover:text-gray-200 underline decoration-white/80 hover:decoration-white transition-colors"
              style={{ textUnderlineOffset: '2px' }}
            >
              logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}


