import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/vault/bundles/[id]/documents
 * Add documents to a bundle
 * Body: { document_ids: string[] }
 */
export async function POST(
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
    const { document_ids } = body

    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'document_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    // Verify bundle belongs to user
    const { data: bundle, error: bundleError } = await supabase
      .from('document_bundles')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (bundleError || !bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // Verify all documents belong to the user
    const { data: userDocuments, error: docsError } = await supabase
      .from('documents')
      .select('id')
      .in('id', document_ids)
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (docsError) {
      console.error('❌ Error verifying documents:', docsError)
      return NextResponse.json(
        { error: 'Failed to verify documents', details: docsError.message },
        { status: 500 }
      )
    }

    if (!userDocuments || userDocuments.length === 0) {
      return NextResponse.json(
        { error: 'No valid documents found' },
        { status: 400 }
      )
    }

    // Check which documents are already in the bundle
    const { data: existingDocs, error: existingError } = await supabase
      .from('bundle_documents')
      .select('document_id')
      .eq('bundle_id', id)
      .in('document_id', userDocuments.map(d => d.id))

    if (existingError) {
      console.error('❌ Error checking existing documents:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing documents', details: existingError.message },
        { status: 500 }
      )
    }

    const existingDocIds = new Set((existingDocs || []).map(d => d.document_id))
    const newDocIds = userDocuments
      .map(d => d.id)
      .filter(docId => !existingDocIds.has(docId))

    if (newDocIds.length === 0) {
      return NextResponse.json({
        success: true,
        added_count: 0,
        message: 'All documents are already in the bundle',
      })
    }

    // Insert new bundle_documents
    const bundleDocInserts = newDocIds.map(docId => ({
      bundle_id: id,
      document_id: docId,
    }))

    const { error: insertError } = await supabase
      .from('bundle_documents')
      .insert(bundleDocInserts)

    if (insertError) {
      console.error('❌ Error adding documents to bundle:', insertError)
      return NextResponse.json(
        { error: 'Failed to add documents to bundle', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Added ${newDocIds.length} documents to bundle ${id}`)

    return NextResponse.json({
      success: true,
      added_count: newDocIds.length,
      message: `Added ${newDocIds.length} document(s) to bundle`,
    })
  } catch (error) {
    console.error('❌ Add documents to bundle error:', error)
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
 * DELETE /api/vault/bundles/[id]/documents
 * Remove documents from a bundle
 * Body: { document_ids: string[] }
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

    const body = await request.json()
    const { document_ids } = body

    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'document_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    // Verify bundle belongs to user
    const { data: bundle, error: bundleError } = await supabase
      .from('document_bundles')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (bundleError || !bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // Delete bundle_documents (RLS ensures user can only delete from their own bundles)
    const { error: deleteError } = await supabase
      .from('bundle_documents')
      .delete()
      .eq('bundle_id', id)
      .in('document_id', document_ids)

    if (deleteError) {
      console.error('❌ Error removing documents from bundle:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove documents from bundle', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Removed documents from bundle ${id}`)

    return NextResponse.json({
      success: true,
      removed_count: document_ids.length,
      message: `Removed ${document_ids.length} document(s) from bundle`,
    })
  } catch (error) {
    console.error('❌ Remove documents from bundle error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

