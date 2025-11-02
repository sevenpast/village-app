import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Test Supabase connection
    const supabase = await createClient()
    
    // Test query (should work with anon key)
    const { data, error } = await supabase
      .from('form_schemas')
      .select('id, version')
      .limit(1)

    return NextResponse.json({
      success: true,
      supabase_connected: !!data,
      error: error?.message,
      data: data,
      env_check: {
        has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        url_length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}





