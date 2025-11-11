import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/vault/documents/[id]/versions/[versionId]
 * Get a specific version of a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId, versionId } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify document ownership
    const { data: document } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get specific version
    // Check both direct document_id match and linked versions (via metadata)
    const { data: version, error } = await supabase
      .from('document_versions')
      .select(`
        id,
        version_number,
        parent_version_id,
        is_current,
        uploaded_by,
        uploaded_at,
        change_summary,
        metadata,
        document_id
      `)
      .eq('id', versionId)
      .or(`document_id.eq.${documentId},metadata->>new_document_id.eq.${documentId},metadata->>parent_document_id.eq.${documentId}`)
      .single()

    if (error || !version) {
      return NextResponse.json(
        { error: 'Version not found', details: error?.message },
        { status: 404 }
      )
    }

    // Verify that the user owns either the version's document or the linked document
    const versionDocumentId = version.document_id
    const linkedDocumentId = version.metadata?.new_document_id || version.metadata?.parent_document_id
    
    const { data: versionDoc } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', versionDocumentId)
      .eq('user_id', user.id)
      .single()

    if (!versionDoc) {
      // Check if linked document belongs to user
      if (linkedDocumentId) {
        const { data: linkedDoc } = await supabase
          .from('documents')
          .select('id, user_id')
          .eq('id', linkedDocumentId)
          .eq('user_id', user.id)
          .single()
        
        if (!linkedDoc) {
          return NextResponse.json(
            { error: 'Version not found or access denied' },
            { status: 404 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Version not found or access denied' },
          { status: 404 }
        )
      }
    }

    const formattedVersion = {
      id: version.id,
      version_number: version.version_number,
      parent_version_id: version.parent_version_id,
      is_current: version.is_current,
      uploaded_by: version.uploaded_by,
      uploaded_by_name: null, // Can be enhanced later with profiles join if needed
      uploaded_at: version.uploaded_at,
      change_summary: version.change_summary,
      metadata: version.metadata,
    }

    return NextResponse.json({
      success: true,
      version: formattedVersion,
    })
  } catch (error) {
    console.error('❌ Get version error:', error)
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
 * POST /api/vault/documents/[id]/versions/[versionId]/restore
 * Restore a specific version (make it the current version)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId, versionId } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify document ownership
    const { data: document } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Verify version exists and belongs to this document
    const { data: version } = await supabase
      .from('document_versions')
      .select('id, document_id')
      .eq('id', versionId)
      .eq('document_id', documentId)
      .single()

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Set this version as current (trigger will unset others)
    const { data: updatedVersion, error: updateError } = await supabase
      .from('document_versions')
      .update({ is_current: true })
      .eq('id', versionId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error restoring version:', updateError)
      return NextResponse.json(
        { error: 'Failed to restore version', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      version: updatedVersion,
      message: 'Version restored successfully',
    })
  } catch (error) {
    console.error('❌ Restore version error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

