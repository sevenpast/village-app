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
        { error: 'Validation failed', details: validation.error.errors },
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

    // For password reset, we need to verify the recovery token
    // The token from the URL is actually a token_hash that needs to be verified
    // We'll use the Supabase admin API to verify and update
    
    try {
      // The token parameter from the URL might be a token_hash or full token
      // We need to verify it using verifyOtp with type='recovery'
      // Since we're in a server context, we'll create a temporary client
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const tempSupabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

      // Verify the recovery token
      const { data: verifyData, error: verifyError } = await tempSupabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      })

      if (verifyError || !verifyData.user) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token. Please request a new password reset.' },
          { status: 400 }
        )
      }

      // Update password using admin API
      const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
        verifyData.user.id,
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

