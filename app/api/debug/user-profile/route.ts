import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'No authenticated user',
        userError: userError?.message
      })
    }

    console.log('🔍 Fetching profile for user:', user.id)

    // Get user's profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    console.log('📊 Profile query result:', { profile, profileError })

    // Get user's interests
    const { data: interests, error: interestsError } = await supabase
      .from('user_interests')
      .select('interest_key')
      .eq('user_id', user.id)

    console.log('🎯 Interests query result:', { interests, interestsError })

    // Get user metadata from auth
    const userMetadata = user.user_metadata || {}

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: userMetadata
      },
      profile,
      profileError: profileError?.message,
      interests,
      interestsError: interestsError?.message,
      debug: {
        profileExists: !!profile,
        interestsCount: interests?.length || 0,
        userMetadataKeys: Object.keys(userMetadata)
      }
    })
  } catch (error: any) {
    console.error('❌ Debug error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}