import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './dashboard-client'

export default async function Home() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    // User not authenticated - redirect to login
    redirect('/login')
  }
  
  // User is authenticated - load profile data and show dashboard
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('first_name, avatar_url')
    .eq('user_id', user.id)
    .single()
  
  // Get firstName from profile or user metadata
  const firstName = profile?.first_name || user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
  
  // Get avatar URL - check for valid non-empty string
  let avatarUrl: string | null = null
  if (profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.trim() !== '') {
    avatarUrl = profile.avatar_url
  }
  
  return <DashboardClient firstName={firstName} avatarUrl={avatarUrl} />
}
