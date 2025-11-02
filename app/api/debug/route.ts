import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Debug endpoint - shows all relevant info
 */
export async function GET() {
  const env = {
    has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
  }

  try {
    // Test with admin client (should always work)
    const adminSupabase = createAdminClient()
    const { data: adminData, error: adminError } = await adminSupabase
      .from('form_schemas')
      .select('id, version')
      .limit(1)

    // Test with regular client
    const { createClient } = await import('@/lib/supabase/server')
    const regularSupabase = await createClient()
    const { data: regularData, error: regularError } = await regularSupabase
      .from('form_schemas')
      .select('id, version')
      .limit(1)

    return NextResponse.json({
      success: true,
      environment: env,
      admin_client: {
        works: !!adminData,
        error: adminError ? {
          message: adminError.message,
          code: adminError.code,
        } : null,
        data: adminData,
      },
      regular_client: {
        works: !!regularData,
        error: regularError ? {
          message: regularError.message,
          code: regularError.code,
          details: regularError.details,
          hint: regularError.hint,
        } : null,
        data: regularData,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      environment: env,
    }, { status: 500 })
  }
}


