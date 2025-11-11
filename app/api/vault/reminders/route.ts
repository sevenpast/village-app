import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/vault/reminders
 * List all reminders for the authenticated user
 * Query: ?status=pending (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // Build query - fetch reminders first without join to avoid RLS issues
    let query = supabase
      .from('document_reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('deadline_date', { ascending: true })

    // Apply status filter if provided
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: reminders, error } = await query

    if (error) {
      console.error('❌ Error fetching reminders:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      
      // ALWAYS return empty list instead of error - no reminders is not an error
      // Check if table doesn't exist (migration not run yet)
      if (error.message?.includes('relation') || error.message?.includes('does not exist') || error.code === '42P01') {
        console.log('ℹ️ document_reminders table does not exist yet (migration not run)')
        return NextResponse.json({
          success: true,
          reminders: [],
          count: 0,
          message: 'Reminders feature not yet initialized. Please run migration 048_create_document_reminders.sql',
        })
      }
      
      // For any other error, also return empty list (user-friendly)
      console.warn('⚠️ Error fetching reminders, returning empty list:', error.message)
      return NextResponse.json({
        success: true,
        reminders: [],
        count: 0,
      })
    }

    // Fetch document details separately for each reminder
    const formattedReminders = await Promise.all(
      (reminders || []).map(async (reminder: any) => {
        const deadlineDate = new Date(reminder.deadline_date)
        const now = new Date()
        const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Try to fetch document details
        let documentInfo: any = null
        try {
          const { data: document, error: docError } = await supabase
            .from('documents')
            .select('id, file_name, document_type, tags, storage_path')
            .eq('id', reminder.document_id)
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .single()

          if (!docError && document) {
            // Get download URL
            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl((document as any).storage_path)

            documentInfo = {
              id: (document as any).id,
              file_name: (document as any).file_name,
              document_type: (document as any).document_type,
              tags: (document as any).tags,
              download_url: publicUrl,
            }
          }
        } catch (docError) {
          console.warn(`⚠️ Could not fetch document ${reminder.document_id} for reminder:`, docError)
          // Continue without document info
        }

        return {
          id: reminder.id,
          document_id: reminder.document_id,
          reminder_type: reminder.reminder_type,
          reminder_date: reminder.reminder_date,
          deadline_date: reminder.deadline_date,
          status: reminder.status,
          snoozed_until: reminder.snoozed_until,
          created_at: reminder.created_at,
          updated_at: reminder.updated_at,
          days_remaining: daysRemaining,
          is_overdue: daysRemaining < 0,
          documents: documentInfo,
        }
      })
    )

    return NextResponse.json({
      success: true,
      reminders: formattedReminders,
      count: formattedReminders.length,
    })
  } catch (error) {
    console.error('❌ List reminders error:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // If it's a table not found error, return empty list gracefully
    if (error instanceof Error && (
      error.message?.includes('relation') || 
      error.message?.includes('does not exist') ||
      error.message?.includes('42P01')
    )) {
      return NextResponse.json({
        success: true,
        reminders: [],
        count: 0,
        message: 'Reminders feature not yet initialized. Please run migration 048_create_document_reminders.sql',
      })
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

