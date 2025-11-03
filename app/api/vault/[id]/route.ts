import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get, Update, or Delete a specific document
 * GET /api/vault/[id]
 * PATCH /api/vault/[id]
 * DELETE /api/vault/[id]
 */
export async function GET(
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

    // Get document
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get download URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(document.storage_path)

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        download_url: publicUrl,
      },
    })
  } catch (error) {
    console.error('❌ Get document error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate ownership
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Update document (only allowed fields)
    const updateData: any = {}
    if (body.file_name) updateData.file_name = body.file_name
    if (body.document_type) updateData.document_type = body.document_type
    if (body.tags) updateData.tags = body.tags

    const { data: document, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update document', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    console.error('❌ Update document error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 DELETE /api/vault/[id] called')
  try {
    const supabase = await createClient()
    const { id } = await params
    console.log('📝 Document ID:', id)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 User:', user?.id, 'Auth error:', authError)
    
    if (authError || !user) {
      console.log('❌ Unauthorized - no user')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get document to delete
    console.log('🔍 Fetching document to delete...')
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('storage_path, thumbnail_url, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    console.log('📄 Document found:', document, 'Fetch error:', fetchError)

    if (fetchError || !document) {
      console.log('❌ Document not found')
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Hard delete the document record
    // We'll delete from storage separately if needed
    console.log('🗑️ Attempting to delete document record...')

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure ownership check

    console.log('📊 Delete result - Error:', deleteError)

    if (deleteError) {
      console.error('❌ Delete error details:', {
        message: deleteError.message,
        code: deleteError.code,
        hint: deleteError.hint,
        details: deleteError.details
      })
      
      // Check if it's an RLS policy violation
      if (deleteError.message && deleteError.message.includes('row-level security')) {
        console.error('🚫 RLS policy violation detected')
        return NextResponse.json(
          { 
            success: false,
            error: 'Permission denied: Cannot delete this document', 
            details: 'Row-level security policy violation. Please ensure you own this document.',
            code: deleteError.code,
            hint: deleteError.hint
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to delete document', 
          details: deleteError.message,
          code: deleteError.code,
          hint: deleteError.hint
        },
        { status: 500 }
      )
    }

    // If we reach this point, the delete was successful
    // (if there was an error, it would have been caught above)

    console.log('✅ Document deleted successfully:', id)

    // Also delete from storage
    try {
      console.log('🗂️ Deleting file from storage:', document.storage_path)
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storage_path])

      if (storageError) {
        console.warn('⚠️ Storage deletion warning:', storageError)
        // Don't fail the whole operation if storage deletion fails
      } else {
        console.log('✅ File deleted from storage successfully')
      }

      // Delete thumbnail if it exists
      if (document.thumbnail_url) {
        const thumbPath = document.thumbnail_url.split('/').pop()
        if (thumbPath) {
          const { error: thumbError } = await supabase.storage
            .from('documents')
            .remove([thumbPath])

          if (thumbError) {
            console.warn('⚠️ Thumbnail deletion warning:', thumbError)
          } else {
            console.log('✅ Thumbnail deleted successfully')
          }
        }
      }
    } catch (storageErr) {
      console.warn('⚠️ Storage cleanup error:', storageErr)
      // Don't fail the operation if storage cleanup fails
    }

    const successResponse = {
      success: true,
      message: 'Document deleted successfully',
    }
    console.log('📤 Sending success response:', successResponse)
    return NextResponse.json(successResponse)
  } catch (error) {
    console.error('❌ Delete document error:', error)
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
    console.log('📤 Sending error response:', errorResponse)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

