import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Auth callback handler for email verification and other Supabase auth flows
 * This is called when users click on email verification links from Resend emails
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const next = searchParams.get('next') ?? '/'

    console.log('🔐 Auth callback received:', { token_hash: !!token_hash, type, next })

    if (token_hash && type) {
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

        // Redirect to success page or dashboard
        return NextResponse.redirect(
          new URL('/auth/verified?message=Email verified successfully', request.url)
        )
      }
    }

    // If no token, just redirect to home
    return NextResponse.redirect(new URL(next, request.url))
  } catch (error) {
    console.error('🚨 Auth callback error:', error)
    return NextResponse.redirect(
      new URL(`/auth/error?message=${encodeURIComponent('Authentication error')}`, request.url)
    )
  }
}