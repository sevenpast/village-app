import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Test endpoint using Service Role (bypasses RLS)
 * This helps diagnose if the issue is with RLS or the client
 */
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('form_schemas')
      .select('id, version')
      .limit(1)

    return NextResponse.json({
      success: true,
      method: 'service_role (bypasses RLS)',
      error: error ? {
        message: error.message,
        details: error.details,
        code: error.code,
      } : null,
      data: data,
      note: 'If this works but /api/test fails, the issue is with anon key or RLS policies',
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


