import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Get all profiles to see what data exists
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5)

    if (profileError) {
      return NextResponse.json({
        success: false,
        error: 'Profile error: ' + profileError.message,
        code: profileError.code,
        details: profileError.details,
      })
    }

    // Get form schema
    const { data: formSchema, error: schemaError } = await supabase
      .from('form_schemas')
      .select('*')
      .eq('id', 'registration')
      .single()

    if (schemaError) {
      return NextResponse.json({
        success: false,
        error: 'Schema error: ' + schemaError.message,
        profiles: profiles,
      })
    }

    return NextResponse.json({
      success: true,
      profileCount: profiles?.length || 0,
      profiles: profiles,
      schemaExists: !!formSchema,
      schemaVersion: formSchema?.version,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}