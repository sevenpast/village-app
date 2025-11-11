/**
 * Script to create a test user
 * Run with: npx tsx scripts/create-test-user.ts
 */
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

import { createAdminClient } from '../lib/supabase/admin'

const USER_EMAIL = 'seraina@email.com'
const USER_PASSWORD = 'Password!1'
const FIRST_NAME = 'Seraina'
const LAST_NAME = 'Test'

async function createTestUser() {
  try {
    const supabase = createAdminClient()

    // Check if user already exists
    console.log('🔍 Checking if user already exists...')
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers()
    
    if (searchError) {
      console.error('❌ Error searching for users:', searchError)
      process.exit(1)
    }

    const existingUser = existingUsers.users.find((u) => u.email === USER_EMAIL)

    if (existingUser) {
      console.log(`⚠️  User with email ${USER_EMAIL} already exists (ID: ${existingUser.id})`)
      console.log('✅ User is ready to use')
      console.log(`\n📧 Login Credentials:`)
      console.log(`   Email: ${USER_EMAIL}`)
      console.log(`   Password: ${USER_PASSWORD}`)
      return
    }

    console.log('📝 Creating new test user...')

    // Create user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: USER_EMAIL,
      password: USER_PASSWORD,
      email_confirm: true, // Skip email verification for test user
      user_metadata: {
        first_name: FIRST_NAME,
        last_name: LAST_NAME,
      },
    })

    if (authError || !authData.user) {
      console.error('❌ Error creating user:', authError)
      process.exit(1)
    }

    const userId = authData.user.id
    console.log(`✅ User created successfully (ID: ${userId})`)

    // Create profile with basic test data
    console.log('📝 Creating user profile...')
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: userId,
      country_of_origin_id: 5, // Default test country (can be adjusted)
      primary_language: 'en',
      living_situation: 'alone',
      current_situation: 'working',
    })

    if (profileError) {
      console.warn('⚠️  Warning: Failed to create profile:', profileError.message)
      console.log('   User was created but profile creation failed. You may need to complete registration.')
    } else {
      console.log('✅ Profile created successfully')
    }

    console.log('\n✅ Test user created successfully!')
    console.log('\n📧 Login Credentials:')
    console.log(`   Email: ${USER_EMAIL}`)
    console.log(`   Password: ${USER_PASSWORD}`)
    console.log('\n⚠️  Please save these credentials securely!')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

createTestUser()

