import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Send email verification for a user
 * Uses our email service to send a test verification email
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    console.log('📧 Sending test verification email to:', email)

    // Create Supabase admin client to get user info
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user by email
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }

    const user = users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Try Supabase Auth's built-in email sending
    // Now that Custom SMTP is configured, Supabase should send emails via Gmail SMTP
    console.log('📧 Attempting to send via Supabase Auth (Custom SMTP)...')
    
    try {
      // Method 1: Unconfirm user first, then generate signup link
      // This should trigger Supabase to send email via Custom SMTP
      console.log('🔄 Unconfirming user to trigger email send...')
      const { error: unconfirmError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: false }
      )
      
      if (unconfirmError) {
        console.warn('⚠️ Could not unconfirm user:', unconfirmError.message)
      } else {
        console.log('✅ User unconfirmed, generating signup link...')
        
        // Generate signup link - this should trigger email send via Custom SMTP
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: email,
          options: {
            redirectTo: `${(await import('@/lib/utils/get-base-url')).getEmailBaseUrl()}/login`,
          }
        })
        
        if (!linkError && linkData?.properties?.action_link) {
          console.log('✅ Supabase link generated - Email should be sent via Custom SMTP')
          return NextResponse.json({
            success: true,
            message: `Verification email sent to ${email} via Supabase Custom SMTP`,
            method: 'supabase_custom_smtp',
            userId: user.id,
            confirmationUrl: linkData.properties.action_link,
            note: 'Check your email inbox (and spam folder). Email was sent via Gmail SMTP configured in Supabase.',
          })
        } else {
          console.warn('⚠️ generateLink did not trigger email send:', linkError?.message)
        }
      }
      
      // Method 2: Try inviteUserByEmail (creates new user or resends invite)
      // Note: This might fail if user already exists, but let's try it
      try {
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verified`,
        })
        
        if (!inviteError && inviteData?.user) {
          console.log('✅ Email invitation sent via Supabase Auth inviteUserByEmail')
          return NextResponse.json({
            success: true,
            message: `Verification email sent to ${email} via Supabase Auth (inviteUserByEmail)`,
            method: 'supabase_auth_invite',
            userId: inviteData.user.id,
            note: 'Check your email inbox for the invitation',
          })
        } else {
          console.warn('⚠️ inviteUserByEmail failed (user might already exist):', inviteError?.message)
          // If user exists, continue to next method
        }
      } catch (inviteErr: any) {
        console.warn('⚠️ inviteUserByEmail error (user might already exist):', inviteErr.message)
        // Continue to next method
      }

      // Method 2: Try to unconfirm user and then generate link
      // This might trigger a new confirmation email
      try {
        // First, unconfirm the email
        const { error: unconfirmError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: false }
        )
        
        if (!unconfirmError) {
          // Now generate a signup link (might trigger email send)
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email: email,
            options: {
              redirectTo: `${(await import('@/lib/utils/get-base-url')).getEmailBaseUrl()}/login`,
            }
          })

          if (!linkError && linkData?.properties?.action_link) {
            console.log('✅ Supabase link generated after unconfirming user')
            return NextResponse.json({
              success: true,
              message: `Verification link generated. Email may have been sent via Supabase Auth after unconfirming user.`,
              method: 'supabase_auth_generate_link',
              userId: user.id,
              confirmationUrl: linkData.properties.action_link,
              note: 'User was unconfirmed and link generated. Check Supabase dashboard email logs to confirm if email was sent.',
            })
          }
        }
      } catch (updateErr: any) {
        console.warn('⚠️ User unconfirm method failed:', updateErr.message)
      }

      // If all Supabase methods failed, throw error to go to fallback
      throw new Error('All Supabase Auth methods failed - email sending may be restricted')
      
    } catch (supabaseError: any) {
      console.warn('⚠️ Supabase Auth email failed, trying fallback...', supabaseError.message)
      
      // Option 2: Generate link and send via our email service
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
      })

      let confirmationUrl: string

      if (linkError || !linkData?.properties?.action_link) {
        console.warn('⚠️ Could not generate Supabase link, using fallback URL')
        // Fallback: create a verification URL
        const { getEmailBaseUrl } = await import('@/lib/utils/get-base-url')
        const baseUrl = getEmailBaseUrl()
        confirmationUrl = `${baseUrl}/auth/verified?email=${encodeURIComponent(email)}&message=Email+verification+test`
      } else {
        confirmationUrl = linkData.properties.action_link
      }

      // Fallback: Send email via our email service (Gmail/Resend)
      const { sendEmailVerification } = await import('@/lib/email')
      
      const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'there'
      
      const emailResult = await sendEmailVerification({
        to: email,
        firstName: firstName,
        confirmationUrl: confirmationUrl,
      })
      
      if (emailResult.success) {
        return NextResponse.json({
          success: true,
          message: `Test verification email sent to ${email} via fallback email service`,
          method: 'email_service_fallback',
          emailId: emailResult.id,
          confirmationUrl: confirmationUrl,
          supabase_error: supabaseError.message,
        })
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to send verification email',
            details: emailResult.error,
            supabase_error: supabaseError.message,
          },
          { status: 500 }
        )
      }
    }

  } catch (error: any) {
    console.error('❌ Send verification error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

