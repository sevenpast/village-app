import { Resend } from 'resend'
import type { SendEmailVerificationParams, SendPasswordResetParams } from './index'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY || '')

/**
 * Send email verification email using Resend (PRODUCTION ONLY)
 * This is called from lib/email/index.ts which handles dev vs prod logic
 */
export async function sendEmailVerification({
  to,
  firstName = 'there',
  confirmationUrl,
}: SendEmailVerificationParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, email not sent')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      // Using Resend's default sandbox domain for testing
      from: 'Village <onboarding@resend.dev>',
      to: [to],
      subject: 'Confirm your Village account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm your Village account</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2D5016; margin: 0;">Welcome to Village!</h1>
            </div>
            
            <div style="background-color: #FAF6F0; padding: 30px; border-radius: 8px; border: 1px solid #2D5016;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                Thanks for registering at Village! To complete your registration, please confirm your email address by clicking the button below:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="display: inline-block; background-color: #2D5016; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Confirm Email Address
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin: 30px 0 10px 0;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; color: #666; word-break: break-all; margin: 0;">
                ${confirmationUrl}
              </p>
              
              <p style="font-size: 14px; color: #666; margin: 30px 0 0 0;">
                This link will expire in 24 hours. If you didn't create an account with Village, you can safely ignore this email.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                Village - Your guide to life in Switzerland<br>
                <a href="mailto:hello@expatvillage.ch" style="color: #C85C1A;">hello@expatvillage.ch</a>
              </p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend email error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email verification sent successfully via Resend:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending email via Resend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send password reset email using Resend (PRODUCTION ONLY)
 * This is called from lib/email/index.ts which handles dev vs prod logic
 */
export async function sendPasswordReset({
  to,
  firstName = 'there',
  resetUrl,
}: SendPasswordResetParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, email not sent')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Village <onboarding@resend.dev>',
      to: [to],
      subject: 'Reset your Village password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset your password</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2D5016; margin: 0;">Password Reset Request</h1>
            </div>
            
            <div style="background-color: #FAF6F0; padding: 30px; border-radius: 8px; border: 1px solid #2D5016;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                Hi ${firstName},
              </p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="display: inline-block; background-color: #2D5016; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin: 30px 0 10px 0;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; color: #666; word-break: break-all; margin: 0;">
                ${resetUrl}
              </p>
              
              <p style="font-size: 14px; color: #666; margin: 30px 0 0 0;">
                This link will expire in 60 minutes. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                Village - Your guide to life in Switzerland<br>
                <a href="mailto:hello@expatvillage.ch" style="color: #C85C1A;">hello@expatvillage.ch</a>
              </p>
            </div>
          </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend password reset email error:', error)
      return { success: false, error: error.message }
    }

    console.log('Password reset email sent successfully via Resend:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error sending password reset email via Resend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
