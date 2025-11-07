'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/AppHeader'
import DocumentVault from '@/components/vault/DocumentVault'

export default function VaultPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [firstName, setFirstName] = useState('User')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        
        if (error || !currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)
        
        const name = currentUser.user_metadata?.first_name || currentUser.email?.split('@')[0] || 'User'
        setFirstName(name)

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('user_id', currentUser.id)
            .single()
          
          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url)
          }
        } catch (err) {
          // Continue without avatar
        }

        setLoading(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FEFAF6' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#294F3F' }}></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FEFAF6' }}>
      <AppHeader firstName={firstName} avatarUrl={avatarUrl} showHome={true} />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Tab Content - Only Documents now, Housing moved to Task 4 */}
          <DocumentVault userId={user.id} />
        </div>
      </main>
    </div>
  )
}

