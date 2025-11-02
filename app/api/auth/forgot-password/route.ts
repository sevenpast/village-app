import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordReset } from '@/lib/email'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validation = forgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const { email } = validation.data
    const supabase = createAdminClient()

    // Check if user exists
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers()
    
    if (searchError) {
      console.error('Error searching for user:', searchError)
      // Don't reveal if user exists (security best practice)
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we sent you a password reset link.',
      })
    }

    const user = users.users.find((u) => u.email === email)

    // Security: Always return success message, even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we sent you a password reset link.',
      })
    }

    // Generate password reset link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
    const redirectTo = `${baseUrl}/reset-password`
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo,
      },
    })

    if (linkError) {
      console.error('Error generating reset link:', linkError)
      // Still return success for security
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we sent you a password reset link.',
      })
    }

    // Extract reset URL from generated link
    // Supabase's generateLink returns action_link which contains the token
    // The action_link is a Supabase Auth URL, we need to extract the token or use redirectTo
    let resetUrl = linkData?.properties?.action_link
    
    if (!resetUrl) {
      // Fallback: construct URL manually if action_link is missing
      const token = linkData?.properties?.hashed_token || ''
      resetUrl = `${redirectTo}?token=${token}`
    } else {
      // Extract token from Supabase's action_link URL
      // Format: https://xxx.supabase.co/auth/v1/verify?token=XXX&type=recovery&redirect_to=...
      try {
        const url = new URL(resetUrl)
        const token = url.searchParams.get('token')
        if (token) {
          // Construct our own reset URL with the token
          resetUrl = `${redirectTo}?token=${encodeURIComponent(token)}`
        }
      } catch (e) {
        // If URL parsing fails, use action_link as-is (user will be redirected)
        console.warn('Could not parse action_link URL, using as-is:', e)
      }
    }

    // Send password reset email via Resend
    const emailResult = await sendPasswordReset({
      to: email,
      firstName: user.user_metadata?.first_name || 'there',
      resetUrl: resetUrl,
    })

    if (!emailResult.success) {
      console.warn('Failed to send password reset email via Resend:', emailResult.error)
      // Still return success for security (don't reveal email sending failed)
    }

    // Always return success (security best practice - don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we sent you a password reset link.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    // Still return success for security
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we sent you a password reset link.',
    })
  }
}

