import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/vault/bundles/[id]
 * Get bundle details including all documents
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

    // Get bundle (RLS ensures user can only access their own bundles)
    const { data: bundle, error: bundleError } = await supabase
      .from('document_bundles')
      .select('id, bundle_name, description, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (bundleError || !bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // Get documents in bundle
    const { data: bundleDocs, error: docsError } = await supabase
      .from('bundle_documents')
      .select(`
        document_id,
        documents (
          id,
          file_name,
          mime_type,
          file_size,
          document_type,
          tags,
          created_at,
          storage_path
        )
      `)
      .eq('bundle_id', id)

    if (docsError) {
      console.error('❌ Error fetching bundle documents:', docsError)
      return NextResponse.json(
        { error: 'Failed to fetch bundle documents', details: docsError.message },
        { status: 500 }
      )
    }

    // Format documents and get download URLs
    const documents = (bundleDocs || [])
      .map((bd: any) => bd.documents)
      .filter((doc: any) => doc !== null && doc.deleted_at === null)
      .map((doc: any) => {
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(doc.storage_path)

        return {
          id: doc.id,
          file_name: doc.file_name,
          mime_type: doc.mime_type,
          file_size: doc.file_size,
          document_type: doc.document_type,
          tags: doc.tags,
          created_at: doc.created_at,
          download_url: publicUrl,
        }
      })

    return NextResponse.json({
      success: true,
      bundle: {
        ...bundle,
        document_count: documents.length,
      },
      documents,
    })
  } catch (error) {
    console.error('❌ Get bundle error:', error)
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
 * PATCH /api/vault/bundles/[id]
 * Update bundle name and/or description
 * Body: { bundle_name?: string, description?: string }
 */
export async function PATCH(
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

    const body = await request.json()
    const { bundle_name, description } = body

    // Build update object
    const updates: any = {}
    if (bundle_name !== undefined) {
      if (typeof bundle_name !== 'string' || bundle_name.trim().length === 0) {
        return NextResponse.json(
          { error: 'bundle_name must be a non-empty string' },
          { status: 400 }
        )
      }
      updates.bundle_name = bundle_name.trim()
    }
    if (description !== undefined) {
      updates.description = description === null || description === '' ? null : description.trim()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update bundle (RLS ensures user can only update their own bundles)
    const { data: bundle, error: updateError } = await supabase
      .from('document_bundles')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError || !bundle) {
      return NextResponse.json(
        { error: 'Bundle not found or update failed', details: updateError?.message },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      bundle: {
        id: bundle.id,
        bundle_name: bundle.bundle_name,
        description: bundle.description,
        created_at: bundle.created_at,
        updated_at: bundle.updated_at,
      },
    })
  } catch (error) {
    console.error('❌ Update bundle error:', error)
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
 * DELETE /api/vault/bundles/[id]
 * Delete a bundle (CASCADE deletes bundle_documents entries)
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

    // Delete bundle (RLS ensures user can only delete their own bundles, CASCADE handles bundle_documents)
    const { error: deleteError } = await supabase
      .from('document_bundles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('❌ Error deleting bundle:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete bundle', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bundle deleted successfully',
    })
  } catch (error) {
    console.error('❌ Delete bundle error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

