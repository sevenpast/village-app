import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ArchiveClient from './archive-client'

export default async function ArchivePage() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // Load profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, avatar_url')
    .eq('user_id', user.id)
    .single()

  const firstName = profile?.first_name || user.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatar_url || null

  return <ArchiveClient firstName={firstName} avatarUrl={avatarUrl} />
}

