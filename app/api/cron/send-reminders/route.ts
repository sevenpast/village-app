import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTaskReminder } from '@/lib/email'

/**
 * CRON JOB: Send task reminder emails
 * This endpoint should be called daily (e.g., via Vercel Cron Jobs)
 * 
 * Security: Use a secret token to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  // Security: Verify cron secret (if set)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    
    // Get current date/time (UTC)
    const now = new Date()
    const nowISO = now.toISOString()
    
    // Find all pending reminders that should be sent now
    // We check for reminders scheduled within the last hour to handle timing
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    
    console.log(`🔍 Checking for reminders between ${oneHourAgo} and ${nowISO}`)
    
    const { data: reminders, error: fetchError } = await supabase
      .from('task_reminders')
      .select(`
        id,
        user_id,
        task_id,
        scheduled_at,
        status
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', nowISO)
      .gte('scheduled_at', oneHourAgo)
      .order('scheduled_at', { ascending: true })
    
    if (fetchError) {
      console.error('❌ Error fetching reminders:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch reminders', details: fetchError.message },
        { status: 500 }
      )
    }
    
    if (!reminders || reminders.length === 0) {
      console.log('✅ No reminders to send')
      return NextResponse.json({
        success: true,
        message: 'No reminders to send',
        count: 0,
      })
    }
    
    console.log(`📧 Found ${reminders.length} reminder(s) to send`)
    
    // Task titles mapping
    const taskTitles: Record<number, { title: string; number: number }> = {
      1: { title: 'Secure residence permit / visa', number: 1 },
      2: { title: 'Register at the Gemeinde (municipality)', number: 2 },
      3: { title: 'Find a place that fits your needs', number: 3 },
      4: { title: 'Register your kids at school / kindergarten', number: 4 },
      5: { title: 'Receive residence permit card', number: 5 },
    }
    
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }
    
    // Process each reminder
    for (const reminder of reminders) {
      try {
        // Get user information
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(reminder.user_id)
        
        if (userError || !user) {
          console.error(`❌ User not found for reminder ${reminder.id}:`, userError)
          results.failed++
          results.errors.push(`Reminder ${reminder.id}: User not found`)
          
          // Mark as cancelled (can't send without user)
          await supabase
            .from('task_reminders')
            .update({ status: 'cancelled' })
            .eq('id', reminder.id)
          
          continue
        }
        
        // Get user profile for firstName
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', reminder.user_id)
          .single()
        
        const firstName = profile?.first_name || user.email?.split('@')[0] || 'there'
        const taskInfo = taskTitles[reminder.task_id as keyof typeof taskTitles]
        
        if (!taskInfo) {
          console.error(`❌ Unknown task ID: ${reminder.task_id}`)
          results.failed++
          results.errors.push(`Reminder ${reminder.id}: Unknown task ID ${reminder.task_id}`)
          continue
        }
        
        // Build task URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expatvillage.ch'
        const taskUrl = `${baseUrl}/essentials?task=${reminder.task_id}`
        
        // Send email
        console.log(`📧 Sending reminder email to ${user.email} for task ${reminder.task_id}`)
        const emailResult = await sendTaskReminder({
          to: user.email!,
          firstName,
          taskTitle: taskInfo.title,
          taskNumber: taskInfo.number,
          taskUrl,
        })
        
        if (emailResult.success) {
          // Mark reminder as sent
          await supabase
            .from('task_reminders')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', reminder.id)
          
          console.log(`✅ Reminder ${reminder.id} sent successfully`)
          results.sent++
        } else {
          console.error(`❌ Failed to send reminder ${reminder.id}:`, emailResult.error)
          results.failed++
          results.errors.push(`Reminder ${reminder.id}: ${emailResult.error || 'Unknown error'}`)
          
          // Don't mark as sent if email failed - will retry next time
        }
      } catch (error) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error)
        results.failed++
        results.errors.push(
          `Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
    
    // Process document reminders
    console.log('📄 Processing document reminders...')
    
    const docReminderResults = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }
    
    // Get pending document reminders
    const { data: docReminders, error: docReminderError } = await supabase
      .from('document_reminders')
      .select(`
        id,
        document_id,
        user_id,
        reminder_type,
        reminder_date,
        deadline_date,
        documents (
          file_name,
          document_type
        )
      `)
      .eq('status', 'pending')
      .lte('reminder_date', nowISO)
      .gte('reminder_date', oneHourAgo)
      .order('reminder_date', { ascending: true })
    
    if (docReminderError) {
      // Check if table doesn't exist (migration not run yet)
      if (docReminderError.message?.includes('relation') || docReminderError.message?.includes('does not exist')) {
        console.log('ℹ️ document_reminders table does not exist yet (migration not run)')
      } else {
        console.error('❌ Error fetching document reminders:', docReminderError)
        docReminderResults.errors.push(`Failed to fetch: ${docReminderError.message}`)
      }
    } else if (docReminders && docReminders.length > 0) {
      console.log(`📧 Found ${docReminders.length} document reminder(s) to send`)
      
      for (const reminder of docReminders) {
        try {
          // Get user information
          const { data: user, error: userError } = await supabase.auth.admin.getUserById(reminder.user_id)
          
          if (userError || !user) {
            console.error(`❌ User not found for document reminder ${reminder.id}:`, userError)
            docReminderResults.failed++
            docReminderResults.errors.push(`Reminder ${reminder.id}: User not found`)
            continue
          }
          
          // Get user profile for firstName
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('user_id', reminder.user_id)
            .single()
          
          const firstName = profile?.first_name || user.email?.split('@')[0] || 'there'
          const document = reminder.documents as any
          const deadlineDate = new Date(reminder.deadline_date)
          const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          // Build document URL
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://expatvillage.ch'
          const documentUrl = `${baseUrl}/vault`
          
          // Send email (using task reminder template for now, can be customized later)
          console.log(`📧 Sending document reminder email to ${user.email} for document ${reminder.document_id}`)
          const emailResult = await sendTaskReminder({
            to: user.email!,
            firstName,
            taskTitle: `${document?.file_name || 'Document'} - Deadline approaching`,
            taskNumber: daysRemaining,
            taskUrl: documentUrl,
          })
          
          if (emailResult.success) {
            // Mark reminder as sent
            await supabase
              .from('document_reminders')
              .update({
                status: 'sent',
              })
              .eq('id', reminder.id)
            
            console.log(`✅ Document reminder ${reminder.id} sent successfully`)
            docReminderResults.sent++
          } else {
            console.error(`❌ Failed to send document reminder ${reminder.id}:`, emailResult.error)
            docReminderResults.failed++
            docReminderResults.errors.push(`Reminder ${reminder.id}: ${emailResult.error || 'Unknown error'}`)
          }
        } catch (error) {
          console.error(`❌ Error processing document reminder ${reminder.id}:`, error)
          docReminderResults.failed++
          docReminderResults.errors.push(
            `Reminder ${reminder.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    } else {
      console.log('✅ No document reminders to send')
    }
    
    console.log(`✅ Cron job completed: ${results.sent} task reminders sent, ${docReminderResults.sent} document reminders sent`)
    
    return NextResponse.json({
      success: true,
      message: `Processed ${reminders.length} task reminder(s) and ${docReminders?.length || 0} document reminder(s)`,
      results: {
        task_reminders: {
          total: reminders.length,
          sent: results.sent,
          failed: results.failed,
          errors: results.errors,
        },
        document_reminders: {
          total: docReminders?.length || 0,
          sent: docReminderResults.sent,
          failed: docReminderResults.failed,
          errors: docReminderResults.errors,
        },
      },
    })
  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

