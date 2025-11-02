import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const supabase = createAdminClient()

    // Get the test user ID
    const testUserId = '53a84967-9e9f-4583-9acb-c0075f096b5c'

    console.log('🔍 Updating test user profile with missing data...')

    // First, let's see what's currently in the profile
    const { data: currentProfile, error: currentError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', testUserId)
      .single()

    console.log('📊 Current profile:', currentProfile)

    // Update the profile with test data for missing fields
    const updateData = {
      // Use the new field names based on the form schema
      primary_language: 'en',
      country_of_origin_id: 5, // Some test country ID
      living_situation: 'with_family',
      current_situation: 'working',
      // Address data
      address_street: 'Musterstrasse',
      address_number: '123',
      plz: '8001',
      city: 'Zürich',
      updated_at: new Date().toISOString()
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', testUserId)
      .select()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json({
        success: false,
        error: updateError.message,
        currentProfile,
        attemptedUpdate: updateData
      })
    }

    // Add some test interests
    const { error: deleteInterestsError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', testUserId)

    const { error: interestsError } = await supabase
      .from('user_interests')
      .insert([
        { user_id: testUserId, interest_key: 'sports' },
        { user_id: testUserId, interest_key: 'culture' },
        { user_id: testUserId, interest_key: 'networking' }
      ])

    if (interestsError) {
      console.warn('⚠️ Interests error:', interestsError)
    }

    // Try to update user metadata via auth admin (for fields like date_of_birth, gender)
    const { data: userUpdateData, error: userUpdateError } = await supabase.auth.admin.updateUserById(
      testUserId,
      {
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
          date_of_birth: '1990-01-15',
          gender: 'male'
        }
      }
    )

    if (userUpdateError) {
      console.warn('⚠️ User metadata update error:', userUpdateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Test user profile updated with sample data',
      currentProfile,
      updatedProfile,
      updateData,
      userMetadataUpdate: userUpdateData?.user?.user_metadata,
      testUserId
    })
  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}