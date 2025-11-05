import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const taskIdNum = parseInt(taskId, 10)
    if (isNaN(taskIdNum)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      )
    }

    // Find task UUID by module and order
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('module_id', 'welcome_to_switzerland')
      .order('created_at', { ascending: true })
      .limit(5)

    if (!tasks || tasks.length < taskIdNum || !tasks[taskIdNum - 1]) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const taskUuid = tasks[taskIdNum - 1].id

    // Update user_task: remove archived_at and completed_at (mark as active again)
    const { error: updateError } = await supabase
      .from('user_tasks')
      .update({
        archived_at: null,
        completed_at: null,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('task_id', taskUuid)

    if (updateError) {
      console.error('Error marking task as undone:', updateError)
      return NextResponse.json(
        { error: 'Failed to mark task as undone' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Task marked as undone',
    })
  } catch (error) {
    console.error('Error in undone route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

