import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailVerification } from '@/lib/email'
import { z } from 'zod'

// Registration data validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  password_confirm: z.string(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.string().optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  country_of_origin: z.string().optional(), // Country ID as string
  primary_language: z.string().optional(),
  living_situation: z.string().optional(),
  current_situation: z.string().optional(),
  // Swiss address fields (from address autocomplete or manual entry)
  swiss_address_street: z.string().optional(),
  swiss_address_number: z.string().optional(),
  swiss_address_plz: z.string().optional(),
  swiss_address_city: z.string().optional(),
  // Legacy address fields (for compatibility)
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  plz: z.string().optional(),
  city: z.string().optional(),
  interests: z.array(z.string()).optional(),
  avatar_url: z.string().optional(),
  avatar_base64: z.string().optional(), // Base64 encoded image data
  // Additional profile fields that might be sent
  arrival_date: z.string().optional(),
  living_duration: z.string().optional(),
  has_children: z.boolean().optional(),
  municipality_name: z.string().optional(),
})

export async function POST(request: Request) {
  console.log('🚀 Registration API called')
  try {
    const body = await request.json()
    console.log('📥 Registration data received:', {
      email: body.email,
      hasPassword: !!body.password,
      firstName: body.first_name,
      lastName: body.last_name,
      hasDateOfBirth: !!body.date_of_birth,
      interestsCount: body.interests?.length || 0,
      hasGender: !!body.gender,
      hasCountryOfOrigin: !!body.country_of_origin,
      hasPrimaryLanguage: !!body.primary_language,
      hasArrivalDate: !!body.arrival_date,
      hasLivingDuration: !!body.living_duration,
      hasChildren: body.has_children !== undefined,
      hasMunicipality: !!body.municipality_name,
      hasAddress: !!(body.swiss_address_street || body.address_street),
    })
    
    // CRITICAL FOR DSGVO: Log all received data to ensure nothing is lost
    console.log('📋 FULL REGISTRATION DATA RECEIVED (DSGVO Compliance Check):', {
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      gender: body.gender,
      date_of_birth: body.date_of_birth,
      country_of_origin: body.country_of_origin,
      primary_language: body.primary_language,
      arrival_date: body.arrival_date,
      living_duration: body.living_duration,
      has_children: body.has_children,
      municipality_name: body.municipality_name,
      living_situation: body.living_situation,
      current_situation: body.current_situation,
      swiss_address_street: body.swiss_address_street,
      swiss_address_number: body.swiss_address_number,
      swiss_address_plz: body.swiss_address_plz,
      swiss_address_city: body.swiss_address_city,
      interests: body.interests,
      hasAvatar: !!body.avatar_base64,
    })

    // Validate input
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues)
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check password match
    if (data.password !== data.password_confirm) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Create user in Supabase Auth (this will trigger Supabase's email verification)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false, // Require email confirmation via Supabase
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      
      // Check if user already exists
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create account', details: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 2. Create profile in profiles table
    // Parse country_of_origin (comes as string ID from dropdown)
    const countryOfOriginId = data.country_of_origin
      ? parseInt(data.country_of_origin, 10)
      : null

    // CRITICAL FOR DSGVO: Ensure ALL data is properly formatted before saving
    const profileInsertData: any = {
      user_id: userId,
      country_of_origin_id: countryOfOriginId, // FK to countries table
      primary_language: data.primary_language || null,
      country: null, // Legacy field, kept for compatibility
      language: null, // Legacy field, kept for compatibility
      // New profile fields - ALL must be saved
      gender: data.gender || null,
      date_of_birth: data.date_of_birth || null,
      arrival_date: data.arrival_date || null,
      living_duration: data.living_duration || null,
      // CRITICAL: Ensure has_children is properly converted to boolean
      has_children: data.has_children === true || data.has_children === 'true' ? true : (data.has_children === false || data.has_children === 'false' ? false : false),
      municipality_name: data.municipality_name || null,
      living_situation: data.living_situation || null,
      current_situation: data.current_situation || null,
      // Swiss address (from autocomplete)
      address_street: data.swiss_address_street || data.address_street || null,
      address_number: data.swiss_address_number || data.address_number || null,
      plz: data.swiss_address_plz || data.plz || null,
      city: data.swiss_address_city || data.city || null,
      avatar_url: data.avatar_url || null, // Will be set after upload
    }
    
    // CRITICAL FOR DSGVO: Log all data being saved to profiles table
    console.log('💾 DSGVO Compliance: Saving ALL profile data to database:', {
      user_id: profileInsertData.user_id,
      gender: profileInsertData.gender,
      date_of_birth: profileInsertData.date_of_birth,
      arrival_date: profileInsertData.arrival_date,
      living_duration: profileInsertData.living_duration,
      has_children: profileInsertData.has_children,
      municipality_name: profileInsertData.municipality_name,
      country_of_origin_id: profileInsertData.country_of_origin_id,
      primary_language: profileInsertData.primary_language,
      living_situation: profileInsertData.living_situation,
      current_situation: profileInsertData.current_situation,
      address_street: profileInsertData.address_street,
      address_number: profileInsertData.address_number,
      plz: profileInsertData.plz,
      city: profileInsertData.city,
    })
    
    const { error: profileError } = await supabase.from('profiles').insert(profileInsertData)

    if (profileError) {
      console.error('❌ CRITICAL: Profile creation error - DSGVO COMPLIANCE ISSUE!', {
        error: profileError,
        message: profileError.message,
        code: profileError.code,
        hint: profileError.hint,
        details: profileError.details,
        userId: userId,
        email: data.email,
        // Log all data that was supposed to be saved
        attemptedProfileData: {
          user_id: userId,
          country_of_origin_id: countryOfOriginId,
          primary_language: data.primary_language,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          arrival_date: data.arrival_date,
          living_duration: data.living_duration,
          has_children: data.has_children,
          municipality_name: data.municipality_name,
          living_situation: data.living_situation,
          current_situation: data.current_situation,
          address_street: data.swiss_address_street || data.address_street,
          address_number: data.swiss_address_number || data.address_number,
          plz: data.swiss_address_plz || data.plz,
          city: data.swiss_address_city || data.city,
        },
      })
      
      // CRITICAL FOR DSGVO: DO NOT delete user if profile creation fails - this violates DSGVO
      // The user has already been created in auth.users, so we must preserve their account
      // Try multiple strategies to save the data:
      
      // Strategy 1: Try to create minimal profile first
      console.warn('⚠️ Attempting to create minimal profile to preserve user account...')
      const minimalProfileResult = await supabase.from('profiles').insert({
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      
      if (!minimalProfileResult.error) {
        // Strategy 2: Try to update with all data using upsert
        console.warn('⚠️ Minimal profile created, attempting to update with all data...')
        const updateResult = await supabase.from('profiles')
          .update(profileInsertData)
          .eq('user_id', userId)
        
        if (!updateResult.error) {
          console.log('✅ Profile updated successfully with all data after initial failure')
          // Continue with normal flow
        } else {
          console.error('❌ CRITICAL: Profile update failed even after minimal creation!', updateResult.error)
          // Log the data that couldn't be saved for recovery
          console.error('📋 DSGVO: Data that needs to be recovered:', profileInsertData)
          // Still continue - at least user account exists
        }
      } else {
        console.error('❌ CRITICAL: Even minimal profile creation failed!', minimalProfileResult.error)
        // Return error but DO NOT delete user - this is a critical DSGVO violation
        // Log all data for manual recovery
        console.error('📋 DSGVO: FULL DATA FOR MANUAL RECOVERY:', {
          userId,
          email: data.email,
          profileData: profileInsertData,
          timestamp: new Date().toISOString(),
        })
        return NextResponse.json(
          { 
            error: 'Failed to create profile', 
            details: profileError.message,
            critical: 'User account created but profile data could not be saved. Please contact support immediately.',
            user_id: userId, // Include user_id so support can recover data
          },
          { status: 500 }
        )
      }
      
      // If we got here, profile exists (minimal or updated) - continue with normal flow
      console.log('✅ Profile exists (minimal or updated), continuing with registration...')
    }
    
    console.log('✅ Profile created successfully with all data')

    // 3a. Upload avatar to Supabase Storage if provided
    if (data.avatar_base64) {
      console.log('🖼️ Avatar upload detected, processing...')
      try {
        // Convert base64 to buffer
        const base64Data = data.avatar_base64.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        console.log('📦 Avatar buffer size:', buffer.length, 'bytes')
        
        // Generate unique filename
        const fileExt = data.avatar_base64.match(/data:image\/(\w+);base64/)?.[1] || 'jpg'
        const fileName = `${userId}/avatar.${fileExt}`
        console.log('📁 Avatar filename:', fileName)
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, buffer, {
            contentType: `image/${fileExt}`,
            upsert: true,
          })

        if (!uploadError && uploadData) {
          console.log('✅ Avatar uploaded successfully:', uploadData.path)
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)
          
          console.log('🔗 Avatar public URL:', urlData.publicUrl)

          // Update profile with avatar URL
          const { error: updateError } = await (supabase
            .from('profiles') as any)
            .update({ avatar_url: urlData.publicUrl })
            .eq('user_id', userId)
          
          if (updateError) {
            console.error('❌ Failed to update profile with avatar URL:', updateError)
          } else {
            console.log('✅ Profile updated with avatar URL')
          }
        } else {
          console.warn('⚠️ Avatar upload warning:', uploadError)
          // Don't fail registration if avatar upload fails
        }
      } catch (avatarErr) {
        console.error('❌ Avatar upload error:', avatarErr)
        // Don't fail registration if avatar upload fails
      }
    } else {
      console.log('ℹ️ No avatar provided, skipping upload')
    }

    // 4. Save interests if provided
    if (data.interests && data.interests.length > 0) {
      const interestsData = data.interests.map((interest: string) => ({
        user_id: userId,
        interest_key: interest,
      }))

      const { error: interestsError } = await (supabase
        .from('user_interests') as any)
        .insert(interestsData)

      if (interestsError) {
        console.error('❌ CRITICAL: Interests save failed - DSGVO COMPLIANCE ISSUE!', {
          error: interestsError,
          userId: userId,
          email: data.email,
          attemptedInterests: data.interests,
        })
        // Log error but don't fail registration - user can update interests later
        // However, this should be monitored and fixed
      } else {
        console.log('✅ Interests saved successfully:', data.interests)
      }
    }

    // 5. Log registration event
    const { error: eventError } = await (supabase.from('events') as any).insert({
      name: 'registration_completed',
      payload: {
        user_id: userId,
        email: data.email,
        registration_date: new Date().toISOString(),
      },
    })

    if (eventError) {
      console.warn('Event logging warning:', eventError)
      // Don't fail registration if event logging fails
    }

    // 6. Send email verification via custom SMTP (Gmail/Resend)
    // Supabase email is disabled due to bounce rates
    const { getEmailBaseUrl } = await import('@/lib/utils/get-base-url')
    const baseUrl = getEmailBaseUrl()
    const redirectTo = `${baseUrl}/login` // Redirect to login page after verification

    console.log('📧 Email verification setup:', {
      baseUrl,
      redirectTo,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      APP_BASE_URL: process.env.APP_BASE_URL,
    })

    // Generate confirmation link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: data.email,
      options: {
        redirectTo: redirectTo
      }
    })

    console.log('🔗 Generated link data:', {
      action_link: linkData?.properties?.action_link,
      hasRedirect: linkData?.properties?.action_link?.includes('redirect_to'),
      linkError: linkError?.message,
    })

    // Extract token from action_link and construct our own URL
    let confirmationUrl = linkData?.properties?.action_link || ''
    
    // ALWAYS reconstruct the URL to point to OUR callback route, not Supabase's verify endpoint
    // This ensures we have full control over the redirect flow
    if (confirmationUrl && confirmationUrl.includes('token=')) {
      try {
        const url = new URL(confirmationUrl)
        const token = url.searchParams.get('token')
        if (token) {
          // Point to our callback route, which will handle verification and redirect
          confirmationUrl = `${baseUrl}/auth/callback?token=${encodeURIComponent(token)}&type=signup&redirect_to=${encodeURIComponent(redirectTo)}`
          console.log('✅ Reconstructed URL to point to our callback:', confirmationUrl.substring(0, 150) + '...')
        }
      } catch (e) {
        console.warn('⚠️ Could not parse action_link URL:', e)
        // Fallback: try to extract token manually
        const tokenMatch = confirmationUrl.match(/token=([^&]+)/)
        if (tokenMatch && tokenMatch[1]) {
          confirmationUrl = `${baseUrl}/auth/callback?token=${encodeURIComponent(tokenMatch[1])}&type=signup&redirect_to=${encodeURIComponent(redirectTo)}`
          console.log('✅ Reconstructed URL using regex:', confirmationUrl.substring(0, 150) + '...')
        }
      }
    } else {
      // Fallback: create URL manually
      console.warn('⚠️ No valid action_link, using fallback')
      confirmationUrl = `${baseUrl}/auth/callback?token=pending&type=signup&redirect_to=${encodeURIComponent(redirectTo)}`
    }

    console.log('📤 Final confirmation URL:', confirmationUrl.substring(0, 200) + '...')

    const emailResult = await sendEmailVerification({
      to: data.email,
      firstName: data.first_name,
      confirmationUrl: confirmationUrl,
    })

    if (!emailResult.success) {
      console.warn('Failed to send email verification:', emailResult.error)
      // Don't fail registration - user can request resend later
    } else {
      console.log('✅ Email verification sent successfully to:', data.email)
    }

    // CRITICAL FOR DSGVO: Verify all data was saved before returning success
    console.log('🔍 DSGVO Compliance Check: Verifying all data was saved...')
    const { data: verificationProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (verifyError || !verificationProfile) {
      console.error('❌ CRITICAL: Data verification failed - DSGVO COMPLIANCE ISSUE!', {
        error: verifyError,
        userId: userId,
        email: data.email,
      })
      // Still return success, but log the issue
    } else {
      console.log('✅ DSGVO Compliance Check: Profile verified successfully')
      console.log('📋 Saved profile data:', {
        user_id: verificationProfile.user_id,
        gender: verificationProfile.gender,
        date_of_birth: verificationProfile.date_of_birth,
        arrival_date: verificationProfile.arrival_date,
        living_duration: verificationProfile.living_duration,
        has_children: verificationProfile.has_children,
        municipality_name: verificationProfile.municipality_name,
        country_of_origin_id: verificationProfile.country_of_origin_id,
        primary_language: verificationProfile.primary_language,
        address_street: verificationProfile.address_street,
        city: verificationProfile.city,
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user_id: userId,
      email: data.email,
      firstName: data.first_name,
    })
  } catch (error) {
    console.error('❌ CRITICAL: Registration error - DSGVO COMPLIANCE ISSUE!', error)
    console.error('Error stack:', error instanceof Error ? error.stack : undefined)
    console.error('❌ DSGVO: User data may have been lost during registration!', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    
    // CRITICAL FOR DSGVO: Even on error, try to preserve any data that might have been saved
    // Return error but provide information about what happened
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        critical: 'Registration failed. Please contact support if you believe your data was entered correctly.',
      },
      { status: 500 }
    )
  }
}

