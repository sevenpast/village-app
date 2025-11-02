import { NextResponse } from 'next/server'
import { sendEmailVerification } from '@/lib/email'

/**
 * Direct email sending test endpoint
 */
export async function POST(request: Request) {
  try {
    const { email, firstName } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    console.log('🧪 Testing email sending to:', email)

    // Generate a test confirmation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const confirmationUrl = `${baseUrl}/auth/verified?message=Email verification test successful`

    // Send test email
    const emailResult = await sendEmailVerification({
      to: email,
      firstName: firstName || 'Test User',
      confirmationUrl: confirmationUrl,
    })

    console.log('📧 Email test result:', emailResult)

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        emailId: emailResult.id,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: emailResult.error,
        message: 'Email sending failed',
      })
    }
  } catch (error: any) {
    console.error('❌ Email test error:', error)
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