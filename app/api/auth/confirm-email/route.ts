import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Admin endpoint to confirm user email (for MVP - email verification is optional)
 * This allows users to login without email confirmation
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Find user by email
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers()

    if (searchError) {
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

    // Confirm email by setting email_confirmed_at
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email_confirm: true,
      }
    )

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to confirm email', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email confirmed successfully',
      email: email,
    })
  } catch (error) {
    console.error('Email confirmation error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


