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
    <header className="w-full" style={{ backgroundColor: '#2D5016' }}>
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

        {/* Center: Logo */}
        <div className="flex-1 flex justify-center">
          <Link href="/" className="flex items-center justify-center">
            <VillageLogo />
          </Link>
        </div>

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

// Village Logo Component - Colorful abstract flower/star
function VillageLogo() {
  return (
    <div className="w-12 h-12 relative">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Center circle */}
        <circle cx="24" cy="24" r="8" fill="#F2B75B" />
        
        {/* V-shaped petals around center */}
        <path
          d="M24 8 L28 20 L24 16 L20 20 Z"
          fill="#2D5016"
        />
        <path
          d="M40 24 L28 20 L32 24 L28 28 Z"
          fill="#3D6A20"
        />
        <path
          d="M24 40 L28 28 L24 32 L20 28 Z"
          fill="#22C55E"
        />
        <path
          d="M8 24 L20 28 L16 24 L20 20 Z"
          fill="#10B981"
        />
        {/* Additional petals for more colors */}
        <path
          d="M35 15 L30 22 L32 20 L34 18 Z"
          fill="#3B82F6"
        />
        <path
          d="M35 33 L30 26 L32 28 L34 30 Z"
          fill="#8B5CF6"
        />
        <path
          d="M13 15 L18 22 L16 20 L14 18 Z"
          fill="#EC4899"
        />
        <path
          d="M13 33 L18 26 L16 28 L14 30 Z"
          fill="#F59E0B"
        />
      </svg>
    </div>
  )
}

