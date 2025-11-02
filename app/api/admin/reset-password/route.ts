import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Admin endpoint to reset user password
 * WARNING: This should be protected in production!
 * For now, this is a temporary helper endpoint
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Find user by email
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers()

    if (searchError) {
      console.error('Error searching for user:', searchError)
      return NextResponse.json(
        { error: 'Failed to find user', details: searchError.message },
        { status: 500 }
      )
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      return NextResponse.json(
        { error: `User with email ${email} not found` },
        { status: 404 }
      )
    }

    // Update password
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
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
      message: 'Password updated successfully',
      email: email,
      // Don't return password in response
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


