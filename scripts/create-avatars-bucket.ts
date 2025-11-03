#!/usr/bin/env ts-node

/**
 * Script to create the 'avatars' storage bucket in Supabase
 * This script uses the Supabase Storage API to create the bucket
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function createAvatarsBucket() {
  console.log('🔄 Creating avatars storage bucket...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables:')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey)
    console.error('\n💡 Make sure .env.local exists and contains these variables')
    process.exit(1)
  }
  
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError)
      throw listError
    }
    
    const avatarsBucket = existingBuckets?.find(b => b.name === 'avatars')
    
    if (avatarsBucket) {
      console.log('✅ Avatars bucket already exists!')
      console.log('   Name:', avatarsBucket.name)
      console.log('   Public:', avatarsBucket.public)
      console.log('   ID:', avatarsBucket.id)
      return
    }
    
    // Create the bucket
    console.log('📦 Creating new avatars bucket...')
    const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', {
      public: true, // Make bucket public so avatars are accessible via URL
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'], // Restrict to image types
      fileSizeLimit: 5242880, // 5MB max file size
    })
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError)
      throw createError
    }
    
    if (newBucket) {
      console.log('✅ Avatars bucket created successfully!')
      console.log('   Name:', newBucket.name)
      console.log('   Public:', newBucket.public)
      console.log('   ID:', newBucket.id)
      
      console.log('\n📋 Next steps:')
      console.log('   1. Run the migration 024_setup_avatars_storage.sql to set up RLS policies')
      console.log('   2. Or set up policies manually in Supabase Dashboard')
    } else {
      console.log('⚠️  Bucket creation returned no data')
    }
    
  } catch (error) {
    console.error('❌ Failed to create avatars bucket:', error)
    process.exit(1)
  }
}

// Run the script
createAvatarsBucket()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

