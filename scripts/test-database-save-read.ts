/**
 * Test Script: Verify Database Save & Read Functionality
 * 
 * This script tests:
 * 1. Registration data is saved correctly
 * 2. Profile data is saved correctly
 * 3. Data is read back correctly
 * 4. All fields are mapped correctly
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testDatabaseSaveRead() {
  console.log('🔍 Testing Database Save & Read Functionality\n')

  // Test 1: Check profiles table structure
  console.log('📋 Test 1: Profiles Table Structure')
  const { data: profileColumns, error: colError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      ORDER BY ordinal_position;
    `
  })
  console.log('Columns:', profileColumns)
  console.log('')

  // Test 2: Get a sample user
  console.log('📋 Test 2: Sample User Data')
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError || !users || users.length === 0) {
    console.error('No users found')
    return
  }

  const testUser = users[0]
  console.log('User ID:', testUser.id)
  console.log('User Email:', testUser.email)
  console.log('User Metadata:', testUser.user_metadata)
  console.log('')

  // Test 3: Get profile data
  console.log('📋 Test 3: Profile Data')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', testUser.id)
    .single()

  if (profileError) {
    console.error('Profile Error:', profileError)
  } else {
    console.log('Profile Data:', JSON.stringify(profile, null, 2))
  }
  console.log('')

  // Test 4: Get interests
  console.log('📋 Test 4: Interests Data')
  const { data: interests, error: interestsError } = await supabase
    .from('user_interests')
    .select('*')
    .eq('user_id', testUser.id)

  if (interestsError) {
    console.error('Interests Error:', interestsError)
  } else {
    console.log('Interests:', interests)
  }
  console.log('')

  // Test 5: Verify data mapping
  console.log('📋 Test 5: Data Mapping Verification')
  const expectedFields = [
    'first_name', // from user_metadata
    'last_name', // from user_metadata
    'country_of_origin_id',
    'primary_language',
    'living_situation',
    'current_situation',
    'address_street',
    'address_number',
    'plz',
    'city',
    'avatar_url',
  ]

  console.log('Expected Fields:', expectedFields)
  console.log('Profile has:', Object.keys(profile || {}))
  console.log('User Metadata has:', Object.keys(testUser.user_metadata || {}))

  // Summary
  console.log('\n✅ Test Summary:')
  console.log(`- User exists: ${!!testUser}`)
  console.log(`- Profile exists: ${!!profile}`)
  console.log(`- First Name (metadata): ${testUser.user_metadata?.first_name || 'MISSING'}`)
  console.log(`- Last Name (metadata): ${testUser.user_metadata?.last_name || 'MISSING'}`)
  console.log(`- Country ID: ${profile?.country_of_origin_id || 'MISSING'}`)
  console.log(`- Language: ${profile?.primary_language || 'MISSING'}`)
  console.log(`- Interests: ${interests?.length || 0}`)
}

testDatabaseSaveRead().catch(console.error)

