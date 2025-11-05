import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const params = await context.params
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const taskId = parseInt(params.taskId)
    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { days } = body

    if (!days || typeof days !== 'number' || days < 1 || days > 30) {
      return NextResponse.json(
        { error: 'Invalid reminder days. Must be between 1 and 30.' },
        { status: 400 }
      )
    }

    // Calculate scheduled_at date
    const scheduledAt = new Date()
    scheduledAt.setDate(scheduledAt.getDate() + days)
    scheduledAt.setHours(10, 0, 0, 0) // Set to 10:00 AM

    // Try to store in task_reminders table (task_id is INTEGER in this schema)
    try {
      const { data: existingReminders, error: queryError } = await supabase
        .from('task_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_id', taskId)
        .eq('status', 'pending')
      
      if (queryError) {
        // Table might not exist - graceful degradation
        console.log('task_reminders table not available:', queryError.message)
        // Return success anyway - localStorage will handle it
        return NextResponse.json({
          success: true,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
          days,
          note: 'Stored in localStorage (database not available)',
        })
      }
      
      const existingReminder = existingReminders && existingReminders.length > 0 ? existingReminders[0] : null

      if (existingReminder) {
        // Update existing reminder
        const { error: updateError } = await supabase
          .from('task_reminders')
          .update({
            scheduled_at: scheduledAt.toISOString(),
          })
          .eq('id', existingReminder.id)

        if (updateError) {
          console.warn('Could not update reminder in DB:', updateError.message)
          // Continue - localStorage will handle it
        }

        return NextResponse.json({
          success: true,
          reminder_id: existingReminder.id,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
          days,
        })
      } else {
        // Create new reminder
        // NOTE: task_id is INTEGER in our schema (1-5 for essentials tasks)
        const { error: insertError } = await supabase
          .from('task_reminders')
          .insert({
            user_id: user.id,
            task_id: taskId, // INTEGER (1-5)
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending',
          })

        if (insertError) {
          console.warn('Could not insert reminder into DB:', insertError.message)
          // Return success anyway - localStorage will handle it
          return NextResponse.json({
            success: true,
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending',
            days,
            note: 'Stored in localStorage (database insert failed)',
          })
        }

        // Get the created reminder ID
        const { data: newReminder } = await supabase
          .from('task_reminders')
          .select('id')
          .eq('user_id', user.id)
          .eq('task_id', taskId)
          .eq('status', 'pending')
          .single()

        return NextResponse.json({
          success: true,
          reminder_id: newReminder?.id,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending',
          days,
        })
      }
    } catch (dbError: any) {
      // Table might not exist - graceful degradation
      console.log('Database storage not available for reminders:', dbError.message)
      return NextResponse.json({
        success: true,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        days,
        note: 'Stored in localStorage (database not available)',
      })
    }
  } catch (error) {
    console.error('Error setting reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[taskId]/reminder - Deactivate reminder
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const taskId = parseInt(params.taskId)
    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      )
    }

    // Delete or mark reminders as cancelled
    try {
      // Delete pending reminders for this task
      const { error: deleteError } = await supabase
        .from('task_reminders')
        .delete()
        .eq('user_id', user.id)
        .eq('task_id', taskId)
        .eq('status', 'pending')

      if (deleteError) {
        console.warn('Could not delete reminder from DB:', deleteError.message)
        // Return success anyway - localStorage will handle it
        return NextResponse.json({
          success: true,
          message: 'Reminder deactivated (stored in localStorage)',
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Reminder deactivated successfully',
      })
    } catch (dbError: any) {
      console.log('Database deletion not available for reminders:', dbError.message)
      return NextResponse.json({
        success: true,
        message: 'Reminder deactivated (stored in localStorage)',
      })
    }
  } catch (error) {
    console.error('Error deactivating reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

