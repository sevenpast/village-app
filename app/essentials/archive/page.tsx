import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArchiveClient from './archive-client'

export default async function ArchivePage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Load user profile for header
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, avatar_url')
    .eq('id', user.id)
    .single()

  const firstName = profile?.first_name || user.user_metadata?.first_name || 'User'
  const avatarUrl = profile?.avatar_url || null

  return <ArchiveClient firstName={firstName} avatarUrl={avatarUrl} />
}

