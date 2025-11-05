import { NextRequest, NextResponse } from 'next/server'
import { sendTaskReminder } from '@/lib/email'

/**
 * TEST ENDPOINT: Send a test reminder email
 * Usage: GET /api/test/send-reminder?email=artosaari@example.com
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || 'artosaari@example.com'
    
    // Default test values
    const testData = {
      to: email,
      firstName: 'Test User',
      taskTitle: 'Secure residence permit / visa',
      taskNumber: 1,
      taskUrl: process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/essentials?task=1`
        : 'https://expatvillage.ch/essentials?task=1',
    }
    
    console.log('📧 Sending test reminder email to:', email)
    
    const result = await sendTaskReminder(testData)
    
    if (result.success) {
      console.log('✅ Test reminder email sent successfully!')
      return NextResponse.json({
        success: true,
        message: 'Test reminder email sent successfully',
        email: email,
        result: result,
      })
    } else {
      console.error('❌ Failed to send test reminder email:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
          email: email,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Error sending test reminder:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST: Send test reminder with custom data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      firstName = 'Test User',
      taskTitle = 'Secure residence permit / visa',
      taskNumber = 1,
    } = body
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    const taskUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/essentials?task=${taskNumber}`
      : `https://expatvillage.ch/essentials?task=${taskNumber}`
    
    console.log('📧 Sending test reminder email to:', email)
    
    const result = await sendTaskReminder({
      to: email,
      firstName,
      taskTitle,
      taskNumber,
      taskUrl,
    })
    
    if (result.success) {
      console.log('✅ Test reminder email sent successfully!')
      return NextResponse.json({
        success: true,
        message: 'Test reminder email sent successfully',
        email: email,
        result: result,
      })
    } else {
      console.error('❌ Failed to send test reminder email:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
          email: email,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Error sending test reminder:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

