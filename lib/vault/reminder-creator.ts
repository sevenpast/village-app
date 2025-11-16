/**
 * Reminder Creator
 * Automatically creates reminders for document deadlines based on extracted fields
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface ExtractedFields {
  expiry_date?: string | null
  cancellation_deadline?: string | null
  end_date?: string | null
  renewal_date?: string | null
  [key: string]: any
}

/**
 * Parse date string to Date object
 * Handles various date formats
 */
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null

  try {
    // Try ISO format first
    const isoDate = new Date(dateString)
    if (!isNaN(isoDate.getTime())) {
      return isoDate
    }

    // Try common formats
    const formats = [
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
      /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    ]

    for (const format of formats) {
      const match = dateString.match(format)
      if (match) {
        if (format === formats[0]) {
          // YYYY-MM-DD
          return new Date(`${match[1]}-${match[2]}-${match[3]}`)
        } else if (format === formats[1]) {
          // DD.MM.YYYY
          return new Date(`${match[3]}-${match[2]}-${match[1]}`)
        } else if (format === formats[2]) {
          // DD/MM/YYYY
          return new Date(`${match[3]}-${match[2]}-${match[1]}`)
        }
      }
    }

    // Fallback: try Date constructor
    const fallbackDate = new Date(dateString)
    if (!isNaN(fallbackDate.getTime())) {
      return fallbackDate
    }

    return null
  } catch (error) {
    console.warn('⚠️ Failed to parse date:', dateString, error)
    return null
  }
}

/**
 * Calculate reminder date based on deadline and reminder type
 */
function calculateReminderDate(deadlineDate: Date, reminderType: '30_days' | '14_days' | '7_days' | '1_day'): Date {
  const reminderDate = new Date(deadlineDate)
  
  switch (reminderType) {
    case '30_days':
      reminderDate.setDate(reminderDate.getDate() - 30)
      break
    case '14_days':
      reminderDate.setDate(reminderDate.getDate() - 14)
      break
    case '7_days':
      reminderDate.setDate(reminderDate.getDate() - 7)
      break
    case '1_day':
      reminderDate.setDate(reminderDate.getDate() - 1)
      break
  }
  
  return reminderDate
}

/**
 * Create reminders for a document based on extracted fields
 */
export async function createDocumentReminders(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  documentType: string,
  extractedFields: ExtractedFields
): Promise<{ created: number; errors: number }> {
  let created = 0
  let errors = 0

  try {
    // Find relevant date fields based on document type
    let deadlineDate: Date | null = null
    let dateFieldName = ''

    if (documentType === 'passport' || documentType === 'residence_permit') {
      // Look for expiry_date
      if (extractedFields.expiry_date) {
        deadlineDate = parseDate(extractedFields.expiry_date)
        dateFieldName = 'expiry_date'
      }
    } else if (documentType === 'rental_contract' || documentType === 'employment_contract') {
      // Look for cancellation_deadline or end_date
      if (extractedFields.cancellation_deadline) {
        deadlineDate = parseDate(extractedFields.cancellation_deadline)
        dateFieldName = 'cancellation_deadline'
      } else if (extractedFields.end_date) {
        deadlineDate = parseDate(extractedFields.end_date)
        dateFieldName = 'end_date'
      }
    } else if (documentType === 'insurance_documents') {
      // Look for renewal_date or expiry_date
      if (extractedFields.renewal_date) {
        deadlineDate = parseDate(extractedFields.renewal_date)
        dateFieldName = 'renewal_date'
      } else if (extractedFields.expiry_date) {
        deadlineDate = parseDate(extractedFields.expiry_date)
        dateFieldName = 'expiry_date'
      }
    }

    // If no deadline found, return early
    if (!deadlineDate) {
      console.log(`ℹ️ No deadline date found for document ${documentId} (type: ${documentType})`)
      return { created: 0, errors: 0 }
    }

    // Check if deadline is in the future
    const now = new Date()
    if (deadlineDate <= now) {
      console.log(`ℹ️ Deadline ${deadlineDate.toISOString()} is in the past, skipping reminder creation`)
      return { created: 0, errors: 0 }
    }

    console.log(`📅 Creating reminders for document ${documentId}: deadline ${deadlineDate.toISOString()}`)

    // Create reminders for different time periods
    const reminderTypes: Array<'30_days' | '14_days' | '7_days' | '1_day'> = ['30_days', '14_days', '7_days', '1_day']

    const reminderInserts = []

    for (const reminderType of reminderTypes) {
      const reminderDate = calculateReminderDate(deadlineDate, reminderType)

      // Only create reminder if reminder date is in the future
      if (reminderDate > now) {
        reminderInserts.push({
          document_id: documentId,
          user_id: userId,
          reminder_type: reminderType,
          reminder_date: reminderDate.toISOString(),
          deadline_date: deadlineDate.toISOString(),
          status: 'pending',
        })
      }
    }

    if (reminderInserts.length === 0) {
      console.log(`ℹ️ No reminders to create (all reminder dates are in the past)`)
      return { created: 0, errors: 0 }
    }

    // Insert reminders in batch
    const { error: insertError } = await supabase
      .from('document_reminders')
      .insert(reminderInserts)

    if (insertError) {
      console.error('❌ Error creating reminders:', insertError)
      // Check if table doesn't exist (migration not run yet)
      if (insertError.message?.includes('relation') || insertError.message?.includes('does not exist')) {
        console.warn('⚠️ document_reminders table does not exist. Please run migration 048_create_document_reminders.sql')
        return { created: 0, errors: reminderInserts.length }
      }
      return { created: 0, errors: reminderInserts.length }
    }

    created = reminderInserts.length
    console.log(`✅ Created ${created} reminder(s) for document ${documentId}`)

    return { created, errors: 0 }
  } catch (error) {
    console.error('❌ Unexpected error creating reminders:', error)
    return { created, errors: errors + 1 }
  }
}


