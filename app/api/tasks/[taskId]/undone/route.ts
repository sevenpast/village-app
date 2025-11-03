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

    const updatedAt = new Date().toISOString()

    // Try to unarchive the task in user_tasks table
    try {
      // Find task UUID by module and order
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('module_id', 'welcome_to_switzerland')
        .order('created_at', { ascending: true })
        .limit(5)
      
      if (tasks && tasks.length >= taskId && tasks[taskId - 1]) {
        const taskUuid = tasks[taskId - 1].id
        
        // Update existing entry - unarchive by setting archived_at to NULL
        const { error: updateError } = await supabase
          .from('user_tasks')
          .update({
            archived_at: null, // Unarchive the task
            status: 'todo', // Reset status to todo
            updated_at: updatedAt,
          })
          .eq('user_id', user.id)
          .eq('task_id', taskUuid)

        if (updateError) {
          console.warn('Could not update user_tasks:', updateError.message)
          // Continue - localStorage will handle it
        } else {
          console.log(`Task ${taskId} unarchived successfully`)
        }
      } else {
        console.log(`Task ${taskId} UUID not found in tasks table - using localStorage only`)
      }
    } catch (dbError: any) {
      // Table might not exist or schema mismatch - graceful degradation
      console.log('Database storage not available, using localStorage only:', dbError.message)
    }

    // Note: localStorage updates should be handled by the client
    // This API only updates the database

    return NextResponse.json({
      success: true,
      task_id: taskId,
      status: 'todo',
      archived_at: null,
    })
  } catch (error) {
    console.error('Error unarchiving task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

