import type { SendEmailVerificationParams, SendPasswordResetParams, SendTaskReminderParams, EmailResult } from './index'

/**
 * Gmail SMTP Email Service
 * Requires Gmail App Password (not regular password)
 */

const createGmailTransporter = async () => {
  const nodemailer = await import('nodemailer')
  // Remove spaces and hyphens from app password (Gmail App Passwords are 16 chars without separators)
  const appPassword = (process.env.GMAIL_APP_PASSWORD || '').replace(/[\s-]/g, '')
  
  return nodemailer.default.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Your Gmail address
      pass: appPassword, // Gmail App Password (spaces removed automatically)
    },
    // Zusätzliche Optionen für bessere Deliverability
    tls: {
      rejectUnauthorized: false, // Gmail verwendet TLS
    },
    // Pooling für bessere Performance
    pool: true,
    maxConnections: 1,
    maxMessages: 3,
  })
}

/**
 * Send email verification using Gmail SMTP
 */
export async function sendEmailVerification({
  to,
  firstName = 'there',
  confirmationUrl,
}: SendEmailVerificationParams): Promise<EmailResult> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail SMTP not configured, email not sent')
    return { success: false, error: 'Gmail SMTP not configured' }
  }

  try {
    const transporter = await createGmailTransporter()

    const mailOptions = {
      from: `"Village" <${process.env.GMAIL_USER}>`,
      to: to,
      replyTo: process.env.GMAIL_USER,
      subject: 'Confirm your Village account',
      html: generateEmailVerificationHTML(firstName, confirmationUrl),
      headers: {
        'X-Mailer': 'Village App',
      },
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('✅ Email verification sent successfully via Gmail:', info.messageId)
    return { success: true, id: info.messageId }
  } catch (error) {
    console.error('❌ Gmail email error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send password reset using Gmail SMTP
 */
export async function sendPasswordReset({
  to,
  firstName = 'there',
  resetUrl,
}: SendPasswordResetParams): Promise<EmailResult> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail SMTP not configured, email not sent')
    return { success: false, error: 'Gmail SMTP not configured' }
  }

  try {
    const transporter = await createGmailTransporter()

    const mailOptions = {
      from: `"Village" <${process.env.GMAIL_USER}>`,
      to: to,
      replyTo: process.env.GMAIL_USER,
      subject: 'Reset your Village password',
      html: generatePasswordResetHTML(firstName, resetUrl),
      headers: {
        'X-Mailer': 'Village App',
      },
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('✅ Password reset email sent successfully via Gmail:', info.messageId)
    return { success: true, id: info.messageId }
  } catch (error) {
    console.error('❌ Gmail password reset error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Email Templates
 */
function generateEmailVerificationHTML(firstName: string, confirmationUrl: string): string {
  return `
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
  `
}

/**
 * Send task reminder using Gmail SMTP
 */
export async function sendTaskReminder({
  to,
  firstName = 'there',
  taskTitle,
  taskNumber,
  taskUrl,
}: SendTaskReminderParams): Promise<EmailResult> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail SMTP not configured, email not sent')
    return { success: false, error: 'Gmail SMTP not configured' }
  }

  try {
    const transporter = await createGmailTransporter()

    const mailOptions = {
      from: `"Village" <${process.env.GMAIL_USER}>`,
      to: to,
      replyTo: process.env.GMAIL_USER, // Wichtig für Authentifizierung
      subject: `Reminder: ${taskTitle}`,
      html: generateTaskReminderHTML(firstName, taskTitle, taskNumber, taskUrl),
      // Zusätzliche Header für bessere E-Mail-Deliverability
      headers: {
        'X-Mailer': 'Village App',
        'X-Priority': '3', // Normal priority
        'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      // Text-Version für bessere Kompatibilität
      text: `Hi ${firstName},\n\nYou set a reminder for this task:\n\nTask ${taskNumber}: ${taskTitle}\n\nView Task: ${taskUrl}\n\nDon't forget to complete this important task in your Village journey!\n\nVillage - Your guide to life in Switzerland`,
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('✅ Task reminder email sent successfully via Gmail:', info.messageId)
    return { success: true, id: info.messageId }
  } catch (error) {
    console.error('❌ Gmail task reminder error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Email Templates
 */
function generateTaskReminderHTML(firstName: string, taskTitle: string, taskNumber: number, taskUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Reminder - ${taskTitle}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D5016; margin: 0;">🔔 Task Reminder</h1>
        </div>
        
        <div style="background-color: #FAF6F0; padding: 30px; border-radius: 8px; border: 1px solid #2D5016;">
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            Hi ${firstName},
          </p>
          
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            You set a reminder for this task:
          </p>
          
          <div style="background-color: #FFFFFF; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2D5016;">
            <p style="font-size: 18px; font-weight: bold; margin: 0 0 10px 0; color: #2D5016;">
              Task ${taskNumber}: ${taskTitle}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${taskUrl}" 
               style="display: inline-block; background-color: #2D5016; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              View Task
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin: 30px 0 0 0;">
            Don't forget to complete this important task in your Village journey!
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
  `
}

function generatePasswordResetHTML(firstName: string, resetUrl: string): string {
  return `
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
  `
}