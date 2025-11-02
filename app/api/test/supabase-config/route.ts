import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const config = {
      hasUrl,
      hasAnonKey,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...`
        : 'MISSING',
    }

    // Try to create client
    let clientError = null
    try {
      const supabase = await createClient()
      
      // Try a simple auth check
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      return NextResponse.json({
        success: true,
        config,
        auth: {
          hasUser: !!user,
          userId: user?.id || null,
          error: authError ? {
            message: authError.message,
            status: authError.status,
          } : null,
        },
      })
    } catch (err: any) {
      clientError = {
        message: err.message,
        name: err.name,
      }
    }

    return NextResponse.json({
      success: false,
      config,
      error: clientError,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      },
      { status: 500 }
    )
  }
}

