import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Auth callback handler for email verification and other Supabase auth flows
 * Handles both token (from Supabase /auth/v1/verify) and token_hash formats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const redirect_to = searchParams.get('redirect_to') || '/login'

    console.log('🔐 Auth callback received:', { 
      hasToken: !!token, 
      hasTokenHash: !!token_hash, 
      type, 
      redirect_to 
    })

    // Handle token from email verification links
    // We need to verify the token with Supabase's auth API
    if (token && type) {
      console.log('🔑 Processing token verification...')
      
      try {
        // Use Supabase's verifyOtp with the token directly
        // The token from generateLink is the full token, not a hash
        const supabase = createAdminClient()
        
        const { data, error } = await supabase.auth.verifyOtp({
          token: token,
          type: type as 'signup' | 'email',
        })

        if (error) {
          console.error('❌ Token verification failed:', error)
          return NextResponse.redirect(
            new URL(`/auth/error?message=${encodeURIComponent(error.message || 'Email verification failed')}`, request.url)
          )
        }

        if (data.user) {
          console.log('✅ Email verified successfully for user:', data.user.email)

          // Redirect to the specified redirect_to URL (or /login)
          const finalRedirect = redirect_to || '/login'
          console.log('📤 Redirecting to:', finalRedirect)
          return NextResponse.redirect(new URL(finalRedirect, request.url))
        }
      } catch (error) {
        console.error('❌ Token verification error:', error)
        return NextResponse.redirect(
          new URL(`/auth/error?message=${encodeURIComponent('Token verification failed')}`, request.url)
        )
      }
    }

    // Handle token_hash (legacy format from Resend emails)
    if (token_hash && type) {
      console.log('🔑 Processing token_hash verification...')
      const supabase = createAdminClient()

      // Verify the token hash with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (error) {
        console.error('❌ Email verification failed:', error)
        return NextResponse.redirect(
          new URL(`/auth/error?message=${encodeURIComponent('Email verification failed')}`, request.url)
        )
      }

      if (data.user) {
        console.log('✅ Email verified successfully for user:', data.user.email)

        // Redirect to login page
        const finalRedirect = redirect_to || '/login'
        return NextResponse.redirect(new URL(finalRedirect, request.url))
      }
    }

    // If no token/token_hash, redirect to login
    console.log('⚠️ No token provided, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error) {
    console.error('🚨 Auth callback error:', error)
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent('Authentication error')}`, request.url)
    )
  }
}