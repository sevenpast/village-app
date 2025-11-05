/**
 * Email Service - Environment-aware email sending
 * 
 * Development (localhost): Logs emails to console (no real emails sent)
 * Production (Vercel): Uses Resend to send real emails
 * 
 * Optional: Use MailDev for local testing (npm run maildev)
 */

export interface EmailResult {
  success: boolean
  error?: string
  id?: string
  previewUrl?: string // For development
}

export interface SendEmailVerificationParams {
  to: string
  firstName?: string
  confirmationUrl: string
}

export interface SendPasswordResetParams {
  to: string
  firstName?: string
  resetUrl: string
}

export interface SendTaskReminderParams {
  to: string
  firstName?: string
  taskTitle: string
  taskNumber: number
  taskUrl: string
}

/**
 * Main email sending function - automatically chooses provider based on environment
 */
export async function sendEmailVerification(params: SendEmailVerificationParams): Promise<EmailResult> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const forceProduction = process.env.FORCE_PRODUCTION_EMAILS === 'true'

  if (isDevelopment && !forceProduction) {
    return sendEmailVerificationDevelopment(params)
  } else {
    return sendEmailVerificationProduction(params)
  }
}

export async function sendPasswordReset(params: SendPasswordResetParams): Promise<EmailResult> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const forceProduction = process.env.FORCE_PRODUCTION_EMAILS === 'true'

  if (isDevelopment && !forceProduction) {
    return sendPasswordResetDevelopment(params)
  } else {
    return sendPasswordResetProduction(params)
  }
}

export async function sendTaskReminder(params: SendTaskReminderParams): Promise<EmailResult> {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const forceProduction = process.env.FORCE_PRODUCTION_EMAILS === 'true'

  if (isDevelopment && !forceProduction) {
    return sendTaskReminderDevelopment(params)
  } else {
    return sendTaskReminderProduction(params)
  }
}

/**
 * DEVELOPMENT: Log email to console (no real email sent)
 */
async function sendEmailVerificationDevelopment({
  to,
  firstName = 'there',
  confirmationUrl,
}: SendEmailVerificationParams): Promise<EmailResult> {
  console.log('\n📧 [DEV] EMAIL VERIFICATION (NOT SENT)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('To:', to)
  console.log('Subject: Confirm your Village account')
  console.log('Name:', firstName)
  console.log('Confirmation URL:', confirmationUrl)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Optional: If MailDev is running, send to it
  if (process.env.MAILDEV_ENABLED === 'true') {
    return sendEmailViaMailDev({
      to,
      subject: 'Confirm your Village account',
      html: generateEmailVerificationHTML(firstName, confirmationUrl),
    })
  }

  return {
    success: true,
    id: `dev-${Date.now()}`,
    previewUrl: confirmationUrl, // For easy clicking in development
  }
}

async function sendPasswordResetDevelopment({
  to,
  firstName = 'there',
  resetUrl,
}: SendPasswordResetParams): Promise<EmailResult> {
  console.log('\n📧 [DEV] PASSWORD RESET (NOT SENT)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('To:', to)
  console.log('Subject: Reset your Village password')
  console.log('Name:', firstName)
  console.log('Reset URL:', resetUrl)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Optional: If MailDev is running, send to it
  if (process.env.MAILDEV_ENABLED === 'true') {
    return sendEmailViaMailDev({
      to,
      subject: 'Reset your Village password',
      html: generatePasswordResetHTML(firstName, resetUrl),
    })
  }

  return {
    success: true,
    id: `dev-${Date.now()}`,
    previewUrl: resetUrl, // For easy clicking in development
  }
}

async function sendTaskReminderDevelopment({
  to,
  firstName = 'there',
  taskTitle,
  taskNumber,
  taskUrl,
}: SendTaskReminderParams): Promise<EmailResult> {
  console.log('\n📧 [DEV] TASK REMINDER (NOT SENT)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('To:', to)
  console.log('Subject: Reminder: Task reminder')
  console.log('Name:', firstName)
  console.log('Task:', taskNumber, '-', taskTitle)
  console.log('Task URL:', taskUrl)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Optional: If MailDev is running, send to it
  if (process.env.MAILDEV_ENABLED === 'true') {
    return sendEmailViaMailDev({
      to,
      subject: `Reminder: ${taskTitle}`,
      html: generateTaskReminderHTML(firstName, taskTitle, taskNumber, taskUrl),
    })
  }

  return {
    success: true,
    id: `dev-${Date.now()}`,
    previewUrl: taskUrl,
  }
}

/**
 * PRODUCTION: Send email via Gmail SMTP (fallback to Resend)
 */
async function sendEmailVerificationProduction({
  to,
  firstName = 'there',
  confirmationUrl,
}: SendEmailVerificationParams): Promise<EmailResult> {
  // Try Gmail SMTP first (no domain restrictions)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const { sendEmailVerification: sendGmail } = await import('./gmail')
    return sendGmail({
      to,
      firstName,
      confirmationUrl,
    })
  }

  // Fallback to Resend
  const { sendEmailVerification: sendResend } = await import('./resend')
  return sendResend({
    to,
    firstName,
    confirmationUrl,
  })
}

async function sendPasswordResetProduction({
  to,
  firstName = 'there',
  resetUrl,
}: SendPasswordResetParams): Promise<EmailResult> {
  // Try Gmail SMTP first (no domain restrictions)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const { sendPasswordReset: sendGmail } = await import('./gmail')
    return sendGmail({
      to,
      firstName,
      resetUrl,
    })
  }

  // Fallback to Resend
  const { sendPasswordReset: sendResend } = await import('./resend')
  return sendResend({
    to,
    firstName,
    resetUrl,
  })
}

async function sendTaskReminderProduction({
  to,
  firstName = 'there',
  taskTitle,
  taskNumber,
  taskUrl,
}: SendTaskReminderParams): Promise<EmailResult> {
  // Use Gmail SMTP only
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Gmail SMTP not configured. Cannot send task reminder email.')
    return {
      success: false,
      error: 'Gmail SMTP not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.',
    }
  }

  const { sendTaskReminder: sendGmail } = await import('./gmail')
  return sendGmail({
    to,
    firstName,
    taskTitle,
    taskNumber,
    taskUrl,
  })
}

/**
 * Optional: Send via MailDev (localhost:1080) for better testing experience
 */
async function sendEmailViaMailDev({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<EmailResult> {
  try {
    // MailDev SMTP runs on localhost:1025
    const nodemailer = await import('nodemailer')
    
    const transporter = nodemailer.default.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      // No auth needed for MailDev
    })

    const info = await transporter.sendMail({
      from: 'Village <noreply@expatvillage.ch>',
      to,
      subject,
      html,
    })

    console.log('✅ Email sent via MailDev:', info.messageId)
    console.log('📬 View emails at: http://localhost:1080\n')

    return {
      success: true,
      id: info.messageId,
      previewUrl: `http://localhost:1080`, // MailDev web interface
    }
  } catch (error) {
    console.warn('⚠️ MailDev not running, falling back to console logging')
    return {
      success: true,
      id: `dev-${Date.now()}`,
    }
  }
}

/**
 * HTML Templates
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


