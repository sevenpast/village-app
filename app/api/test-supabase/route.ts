import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Direct Supabase connection test
 * This bypasses the SSR wrapper to test if it's an RLS issue or env issue
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check env vars
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing environment variables',
        env: {
          has_url: !!supabaseUrl,
          has_anon_key: !!supabaseAnonKey,
          url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
          anon_key_length: supabaseAnonKey?.length || 0,
        },
      },
      { status: 500 }
    )
  }

  try {
    // Create direct client (bypass SSR wrapper)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Test query
    const { data, error } = await supabase
      .from('form_schemas')
      .select('id, version')
      .limit(1)

    return NextResponse.json({
      success: true,
      connected: true,
      error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      } : null,
      data: data,
      rls_test: {
        can_read: !!data && data.length > 0,
        row_count: data?.length || 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}


