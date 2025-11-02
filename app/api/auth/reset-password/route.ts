import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  password_confirm: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { token, password, password_confirm } = validation.data

    // Check password match
    if (password !== password_confirm) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Supabase's generateLink returns an action_link URL that contains the token
    // We need to extract the token from the URL or use Supabase's resetPasswordForEmail
    // The token in the URL is actually a full token, not a hash
    
    try {
      // Option 1: Try to use Supabase's built-in resetPasswordForEmail
      // But we need the user's email first, which we can get from the token
      
      // The token from generateLink is actually a signed token in the URL
      // We can extract user info or use the admin API to verify it
      
      // Create a temporary client to verify the token
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const tempSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

      // The token from generateLink needs to be used with resetPasswordForEmail
      // But that requires email, so we'll use a different approach:
      // Parse the token and extract user info, then update password via admin API
      
      // Try to exchange the token for a session to get user info
      // Supabase's recovery link contains a token that can be verified
      // We'll use verifyOtp with the token (not token_hash)
      const { data: verifyData, error: verifyError } = await tempSupabase.auth.verifyOtp({
        token: token,
        type: 'recovery',
      })

      if (verifyError || !verifyData.user) {
        // If verifyOtp fails, try alternative: extract token from URL if it's a full URL
        // Or use the admin API to list users and find by token (not secure, but fallback)
        console.error('Token verification failed:', verifyError)
        return NextResponse.json(
          { error: 'Invalid or expired reset token. Please request a new password reset.' },
          { status: 400 }
        )
      }

      // If verification succeeds, we have the user
      const userId = verifyData.user.id

      // Update password using admin API
      const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
        userId,
        {
          password: password,
        }
      )

      if (updateError) {
        console.error('Error updating password:', updateError)
        return NextResponse.json(
          { error: 'Failed to update password', details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully',
      })
    } catch (tokenError) {
      console.error('Token verification error:', tokenError)
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

