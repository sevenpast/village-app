import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/housing/viewings/[id]/photos/[photoId] - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the photo record to verify ownership and get storage path
    const { data: photo, error: photoError } = await supabase
      .from('viewing_photos')
      .select('*, apartment_viewings!inner(user_id)')
      .eq('id', photoId)
      .eq('viewing_id', id)
      .single()

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Verify ownership through the viewing
    if ((photo.apartment_viewings as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([photo.storage_path])

    if (storageError) {
      console.error('Error deleting photo from storage:', storageError)
      // Continue anyway to delete the database record
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('viewing_photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('Error deleting photo from database:', deleteError)
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Photo deleted successfully' })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/housing/viewings/[id]/photos/[photoId]:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

