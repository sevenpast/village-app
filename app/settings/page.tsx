'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import RegistrationFooter from '@/components/forms/RegistrationFooter'
import ProfileEditForm from '@/components/forms/ProfileEditForm'
import AppHeader from '@/components/AppHeader'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState<any>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('User')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (!mounted) return
      await loadProfileData()
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [])

  const loadProfileData = async () => {
    try {
      console.log('🔄 Loading profile data...')
      const supabase = createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('❌ User error:', userError)
        console.log('🔄 No authenticated user - redirecting to login')
        router.push('/login')
        setLoading(false)
        return
      }

      console.log('✅ User authenticated:', user.id)
      setUserEmail(user.email || null)
      
      // Set firstName from user metadata
      const name = user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
      setFirstName(name)

      // Load profile
      const { data: profile, error: profileError } = await (supabase
        .from('profiles') as any)
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No profile found - create empty profile
          console.log('⚠️ No profile found, using empty profile')
          const mappedProfile = {
            user_id: user.id,
            interests: [],
            children: [],
            address_street: null,
            address_number: null,
            plz: null,
            city: null,
            municipality_name: null,
          }
          setProfileData(mappedProfile)
          setLoading(false)
          return
        } else {
          console.error('❌ Error loading profile:', profileError)
          // Continue with empty profile instead of blocking
        }
      }

      console.log('✅ Profile loaded:', profile)
      console.log('🖼️ Avatar URL from profile:', profile?.avatar_url)
      
      // Set avatar URL if available (check for non-empty string)
      if (profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.trim() !== '') {
        console.log('✅ Setting avatar URL:', profile.avatar_url)
        setAvatarUrl(profile.avatar_url)
      } else {
        console.log('⚠️ No valid avatar URL found, using fallback')
        setAvatarUrl(null)
      }

      // Load interests
      const { data: interests, error: interestsError } = await (supabase
        .from('user_interests') as any)
        .select('interest_key')
        .eq('user_id', user.id)

      if (interestsError) {
        console.error('⚠️ Error loading interests:', interestsError)
      }

      // Load children if exists (may not exist in DB yet)
      const children = profile?.children || []

      // Get user metadata for fields like first_name, last_name, etc.
      const userMetadata = user.user_metadata || {}

      // Map profile data to include all necessary fields
      const mappedProfile = {
        ...(profile || {}),
        interests: interests?.map(i => i.interest_key) || [],
        children: children,
        // User metadata fields (from auth.users table)
        first_name: userMetadata.first_name || profile?.first_name || null,
        last_name: userMetadata.last_name || profile?.last_name || null,
        gender: profile?.gender || null,
        date_of_birth: profile?.date_of_birth || null,
        // Ensure address fields are available
        address_street: profile?.address_street || null,
        address_number: profile?.address_number || null,
        plz: profile?.plz || null,
        city: profile?.city || null,
        municipality_name: profile?.municipality_name || profile?.city || null,
        // Handle both old and new field names for backward compatibility
        country_of_origin_id: profile?.country_of_origin_id,
        primary_language: profile?.primary_language,
        // Keep legacy fields if they exist
        country: profile?.country,
        language: profile?.language,
      }

      console.log('✅ Mapped profile data:', mappedProfile)
      setProfileData(mappedProfile)

    } catch (error) {
      console.error('❌ Unexpected error loading profile:', error)
      // Even on error, set loading to false and show form with empty data
      setProfileData({
        interests: [],
        children: [],
        address_street: null,
        address_number: null,
        plz: null,
        city: null,
        municipality_name: null,
      })
    } finally {
      console.log('✅ Setting loading to false')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#FAF6F0' }}>
        <div className="text-lg mb-4" style={{ color: '#2D5016' }}>Loading your profile...</div>
        <div className="text-sm" style={{ color: '#6B7280' }}>
          If this takes too long, please make sure you are logged in.
        </div>
        <div className="mt-4">
          <a href="/login" className="text-blue-600 underline hover:no-underline">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      <AppHeader firstName={firstName} avatarUrl={avatarUrl} showHome={true} />
      <div className="flex-1 py-8">
        <ProfileEditForm 
          initialData={profileData} 
          userEmail={userEmail}
          onSave={loadProfileData}
        />
      </div>
      <RegistrationFooter />
    </div>
  )
}

