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

    const completedAt = new Date().toISOString()

    // Try to store in user_tasks table (if it exists and schema matches)
    // Since we use numeric IDs (1-5) but tasks table uses UUIDs, we'll try a flexible approach
    try {
      // Option 1: Try to find task UUID by module and order
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('module_id', 'welcome_to_switzerland')
        .order('created_at', { ascending: true })
        .limit(5)
      
      if (tasks && tasks.length >= taskId && tasks[taskId - 1]) {
        const taskUuid = tasks[taskId - 1].id
        
        // Check if user_tasks entry exists
        const { data: existingTask } = await supabase
          .from('user_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('task_id', taskUuid)
          .maybeSingle()

        if (existingTask) {
          // Update existing entry - mark as done and archive it
          const { error: updateError } = await supabase
            .from('user_tasks')
            .update({
              status: 'done',
              completed_at: completedAt,
              archived_at: completedAt, // Archive the task when marked as done
              updated_at: completedAt,
            })
            .eq('user_id', user.id)
            .eq('task_id', taskUuid)

          if (updateError) {
            console.warn('Could not update user_tasks:', updateError.message)
            // Continue - localStorage will handle it
          }
        } else {
          // Create new entry - mark as done and archive it
          const { error: insertError } = await supabase
            .from('user_tasks')
            .insert({
              user_id: user.id,
              task_id: taskUuid,
              status: 'done',
              completed_at: completedAt,
              archived_at: completedAt, // Archive the task when marked as done
            })

          if (insertError) {
            console.warn('Could not insert into user_tasks:', insertError.message)
            // Continue - localStorage will handle it
          }
        }
      } else {
        console.log(`Task ${taskId} UUID not found in tasks table - using localStorage only`)
      }
    } catch (dbError: any) {
      // Table might not exist or schema mismatch - graceful degradation
      console.log('Database storage not available, using localStorage only:', dbError.message)
    }

    return NextResponse.json({
      success: true,
      task_id: taskId,
      status: 'done',
      completed_at: completedAt,
    })
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

