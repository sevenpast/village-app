import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EssentialsClient from './essentials-client'

export default async function EssentialsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in, redirect to login
  if (!user) {
    redirect('/login')
  }

  // Load user profile for avatar
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('user_id', user.id)
    .single()

  const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'there'
  const avatarUrl = profile?.avatar_url || null

  return <EssentialsClient firstName={firstName} avatarUrl={avatarUrl} />
}


