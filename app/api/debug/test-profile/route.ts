import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Get the test user profile
    const testUserId = '53a84967-9e9f-4583-9acb-c0075f096b5c' // From created test user

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', testUserId)
      .single()

    if (profileError) {
      return NextResponse.json({
        success: false,
        error: 'Profile error: ' + profileError.message,
        testUserId,
      })
    }

    // Get interests
    const { data: interests, error: interestsError } = await supabase
      .from('user_interests')
      .select('interest_key')
      .eq('user_id', testUserId)

    if (interestsError) {
      return NextResponse.json({
        success: false,
        error: 'Interests error: ' + interestsError.message,
        profile,
      })
    }

    // Mock mapped data (similar to what settings page does)
    const mappedProfile = {
      ...profile,
      interests: interests?.map(i => i.interest_key) || [],
      children: profile?.children || [],
      // Handle both old and new field names for backward compatibility
      country_of_origin_id: profile?.country_of_origin_id,
      primary_language: profile?.primary_language,
      // Keep legacy fields if they exist
      country: profile?.country,
      language: profile?.language,
    }

    return NextResponse.json({
      success: true,
      testUserId,
      rawProfile: profile,
      mappedProfile,
      interests: interests || [],
      formMapping: {
        country_of_origin: profile?.country_of_origin_id?.toString() || profile?.country,
        primary_language: profile?.primary_language || profile?.language,
      }
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