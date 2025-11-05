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

    // Update user_task: remove archived_at (mark as active again)
    const { error: updateError } = await supabase
      .from('user_tasks')
      .update({
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('task_id', taskIdNum)

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

