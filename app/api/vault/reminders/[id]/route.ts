import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/vault/reminders/[id]/snooze
 * Snooze a reminder for a specified number of days
 * Body: { days: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    const { action, days } = body

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: existingReminder } = await supabase
      .from('document_reminders')
      .select('id, reminder_date, deadline_date')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      )
    }

    if (action === 'snooze') {
      if (!days || typeof days !== 'number' || days < 1 || days > 30) {
        return NextResponse.json(
          { error: 'Days must be between 1 and 30' },
          { status: 400 }
        )
      }

      const snoozedUntil = new Date()
      snoozedUntil.setDate(snoozedUntil.getDate() + days)

      const { data: updatedReminder, error: updateError } = await supabase
        .from('document_reminders')
        .update({
          status: 'snoozed',
          snoozed_until: snoozedUntil.toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error snoozing reminder:', updateError)
        return NextResponse.json(
          { error: 'Failed to snooze reminder', details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        reminder: updatedReminder,
      })
    } else if (action === 'complete') {
      const { data: updatedReminder, error: updateError } = await supabase
        .from('document_reminders')
        .update({
          status: 'completed',
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error completing reminder:', updateError)
        return NextResponse.json(
          { error: 'Failed to complete reminder', details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        reminder: updatedReminder,
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "snooze" or "complete"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('❌ Reminder action error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/vault/reminders/[id]
 * Cancel/delete a reminder
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const { data: existingReminder } = await supabase
      .from('document_reminders')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      )
    }

    // Delete reminder
    const { error: deleteError } = await supabase
      .from('document_reminders')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('❌ Error deleting reminder:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete reminder', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder deleted successfully',
    })
  } catch (error) {
    console.error('❌ Delete reminder error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


