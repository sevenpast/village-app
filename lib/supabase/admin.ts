/**
 * Admin Supabase Client (Service Role)
 * Use ONLY for server-side operations that need to bypass RLS
 * Never expose this to the client!
 */
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase admin credentials:', {
      has_url: !!supabaseUrl,
      has_service_key: !!serviceRoleKey,
      url: supabaseUrl?.substring(0, 30),
    })
    throw new Error('Missing Supabase admin credentials. Check SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

