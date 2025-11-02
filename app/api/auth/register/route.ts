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
  date_of_birth: z.string().optional(),
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
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
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

    // 1. Create user in Supabase Auth (this will trigger email verification)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false, // Require email confirmation
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

    // 2. Generate email confirmation link
    // Since Supabase email sending is restricted due to bounce rates,
    // we use Resend to send the verification email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000'

    // Generate confirmation link using Supabase Admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: data.email,
      options: {
        redirectTo: `${baseUrl}/auth/callback`
      }
    })

    if (linkError) {
      console.error('Error generating confirmation link:', linkError)
      // Don't fail registration if link generation fails - we can try to construct it manually
    }

    // Use generated link with proper callback URL
    const confirmationUrl = linkData?.properties?.action_link ||
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=pending&type=signup&redirect_to=${encodeURIComponent(baseUrl + '/auth/callback')}`

    // 3. Create profile in profiles table
    // Parse country_of_origin (comes as string ID from dropdown)
    const countryOfOriginId = data.country_of_origin
      ? parseInt(data.country_of_origin, 10)
      : null

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: userId,
      country_of_origin_id: countryOfOriginId, // FK to countries table
      primary_language: data.primary_language || null,
      country: null, // Legacy field, kept for compatibility
      language: null, // Legacy field, kept for compatibility
      living_situation: data.living_situation || null,
      current_situation: data.current_situation || null,
      // Swiss address (from autocomplete)
      address_street: data.swiss_address_street || data.address_street || null,
      address_number: data.swiss_address_number || data.address_number || null,
      plz: data.swiss_address_plz || data.plz || null,
      city: data.swiss_address_city || data.city || null,
      avatar_url: data.avatar_url || null, // Will be set after upload
    })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create profile', details: profileError.message },
        { status: 500 }
      )
    }

    // 3a. Upload avatar to Supabase Storage if provided
    if (data.avatar_base64) {
      try {
        // Convert base64 to buffer
        const base64Data = data.avatar_base64.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Generate unique filename
        const fileExt = data.avatar_base64.match(/data:image\/(\w+);base64/)?.[1] || 'jpg'
        const fileName = `${userId}/avatar.${fileExt}`
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, buffer, {
            contentType: `image/${fileExt}`,
            upsert: true,
          })

        if (!uploadError && uploadData) {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

          // Update profile with avatar URL
          await supabase
            .from('profiles')
            .update({ avatar_url: urlData.publicUrl })
            .eq('user_id', userId)
        } else {
          console.warn('Avatar upload warning:', uploadError)
          // Don't fail registration if avatar upload fails
        }
      } catch (avatarErr) {
        console.warn('Avatar upload error:', avatarErr)
        // Don't fail registration if avatar upload fails
      }
    }

    // 4. Save interests if provided
    if (data.interests && data.interests.length > 0) {
      const interestsData = data.interests.map((interest: string) => ({
        user_id: userId,
        interest_key: interest,
      }))

      const { error: interestsError } = await supabase
        .from('user_interests')
        .insert(interestsData)

      if (interestsError) {
        console.warn('Interests save warning:', interestsError)
        // Don't fail registration if interests can't be saved
      }
    }

    // 5. Log registration event
    const { error: eventError } = await supabase.from('events').insert({
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

    // 6. Send email verification via Resend (since Supabase email sending is restricted)
    const emailResult = await sendEmailVerification({
      to: data.email,
      firstName: data.first_name,
      confirmationUrl: confirmationUrl,
    })

    if (!emailResult.success) {
      console.warn('Failed to send email verification via Resend:', emailResult.error)
      // Don't fail registration - user can request resend later
      // But log it for monitoring
    } else {
      console.log('Email verification sent successfully via Resend to:', data.email)
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user_id: userId,
      email: data.email,
      firstName: data.first_name,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

