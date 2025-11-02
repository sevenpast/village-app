import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = createAdminClient()

    // Create a test user
    const testEmail = 'test@example.com'
    const testPassword = 'TestPass123!'

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser.users.find(u => u.email === testEmail)

    if (userExists) {
      return NextResponse.json({
        success: true,
        message: 'Test user already exists',
        userId: userExists.id,
        email: testEmail,
      })
    }

    // Create user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Skip email verification for test user
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
      },
    })

    if (authError || !authData.user) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create test user: ' + authError?.message,
      })
    }

    const userId = authData.user.id

    // Create profile with test data
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: userId,
      country_of_origin_id: 5, // Some test country
      primary_language: 'en',
      living_situation: 'with_family',
      current_situation: 'working',
      address_street: 'Bahnhofstrasse',
      address_number: '42',
      plz: '8001',
      city: 'Zürich',
    })

    if (profileError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create profile: ' + profileError.message,
      })
    }

    // Add test interests
    await supabase.from('user_interests').insert([
      { user_id: userId, interest_key: 'sports' },
      { user_id: userId, interest_key: 'culture' },
    ])

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      userId: userId,
      email: testEmail,
      password: testPassword,
      instructions: 'You can now login with this user to test the settings page',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}