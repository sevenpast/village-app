/**
 * Script to reset user password
 * Run with: npx tsx scripts/reset-password.ts
 */
import { createAdminClient } from '../lib/supabase/admin'

const USER_EMAIL = 'hublaizel@mac.com'
const NEW_PASSWORD = '4tV?vEfh7I0psoZ0' // Generated secure password

async function resetPassword() {
  try {
    const supabase = createAdminClient()

    // 1. Find user by email
    const { data: users, error: searchError } = await supabase.auth.admin.listUsers()
    
    if (searchError) {
      console.error('Error searching for user:', searchError)
      process.exit(1)
    }

    const user = users.users.find((u) => u.email === USER_EMAIL)

    if (!user) {
      console.error(`User with email ${USER_EMAIL} not found`)
      process.exit(1)
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})`)

    // 2. Update password using admin API
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: NEW_PASSWORD,
      }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      process.exit(1)
    }

    console.log('\n✅ Password successfully updated!')
    console.log('\n📧 Login Credentials:')
    console.log(`   Email: ${USER_EMAIL}`)
    console.log(`   Password: ${NEW_PASSWORD}`)
    console.log('\n⚠️  Please save this password securely!')
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

resetPassword()


