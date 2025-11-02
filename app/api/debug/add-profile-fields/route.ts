import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = createAdminClient()

    // Get the test user ID
    const testUserId = '53a84967-9e9f-4583-9acb-c0075f096b5c'

    // Update the profile with additional fields that might be missing
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        // Add user_metadata fields to the profile
        first_name: 'Test',
        last_name: 'User',
        gender: 'male',
        date_of_birth: '1990-01-01',
        arrival_date: '2024-01-01',
        living_duration: 'permanent',
        current_situation: 'working',
        has_children: 'no',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', testUserId)
      .select()

    if (profileError) {
      console.error('Profile update error:', profileError)

      // Try to add missing columns to profiles table (this might fail if columns don't exist)
      return NextResponse.json({
        success: false,
        error: 'Failed to update profile: ' + profileError.message,
        suggestion: 'The profiles table might be missing some columns. Check the database schema.'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated with additional fields',
      profile: profile,
      testUserId
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