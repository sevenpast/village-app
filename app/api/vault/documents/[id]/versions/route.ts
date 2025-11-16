import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/vault/documents/[id]/versions
 * Create a new version of a document
 * Body: { parent_version_id?: UUID, change_summary?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params
    const body = await request.json()
    const { parent_version_id, change_summary } = body

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, mime_type, file_size, extracted_fields')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get next version number
    const { data: existingVersions } = await supabase
      .from('document_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = existingVersions 
      ? existingVersions.version_number + 1 
      : 1

    // Verify parent_version_id if provided
    if (parent_version_id) {
      const { data: parentVersion } = await supabase
        .from('document_versions')
        .select('id, document_id')
        .eq('id', parent_version_id)
        .eq('document_id', documentId)
        .single()

      if (!parentVersion) {
        return NextResponse.json(
          { error: 'Parent version not found' },
          { status: 400 }
        )
      }
    }

    // Create version record
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        version_number: nextVersionNumber,
        parent_version_id: parent_version_id || null,
        is_current: true, // New version becomes current
        uploaded_by: user.id,
        change_summary: change_summary?.trim() || null,
        metadata: {
          file_name: document.file_name,
          mime_type: document.mime_type,
          file_size: document.file_size,
          extracted_fields: document.extracted_fields,
        },
      })
      .select()
      .single()

    if (versionError) {
      console.error('❌ Error creating version:', versionError)
      // Check if table doesn't exist
      if (versionError.message?.includes('relation') || versionError.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'Versions feature not yet initialized. Please run migration 049_create_document_versions.sql',
        }, { status: 500 })
      }
      return NextResponse.json(
        { error: 'Failed to create version', details: versionError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      version,
    }, { status: 201 })
  } catch (error) {
    console.error('❌ Create version error:', error)
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
 * GET /api/vault/documents/[id]/versions
 * List all versions for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params

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

    // Get all versions for this document
    // This includes:
    // 1. Versions directly linked to this document (document_id = documentId)
    // 2. Versions where this document is referenced in metadata.new_document_id
    // 3. Versions where this document is referenced in metadata.parent_document_id
    const { data: allVersions, error: fetchError } = await supabase
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
      .or(`document_id.eq.${documentId},metadata->>new_document_id.eq.${documentId},metadata->>parent_document_id.eq.${documentId}`)

    if (fetchError) {
      console.error('❌ Error fetching versions:', fetchError)
      // Check if table doesn't exist
      if (fetchError.message?.includes('relation') || fetchError.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          versions: [],
          count: 0,
          message: 'Versions feature not yet initialized. Please run migration 049_create_document_versions.sql',
        })
      }
      return NextResponse.json(
        { error: 'Failed to fetch versions', details: fetchError.message },
        { status: 500 }
      )
    }

    // Group versions by the parent document (the original document with the same filename)
    // Find the parent document ID (either this document or the one referenced in metadata)
    let parentDocumentId = documentId
    const versionWithParent = allVersions?.find((v: any) => 
      v.metadata?.parent_document_id && v.metadata.parent_document_id !== documentId
    )
    if (versionWithParent?.metadata?.parent_document_id) {
      parentDocumentId = versionWithParent.metadata.parent_document_id
    }

    // Get all versions for the parent document only (not linked documents)
    // Only return versions where document_id matches the parent document
    const { data: versions, error } = await supabase
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
      .eq('document_id', parentDocumentId)
      .order('version_number', { ascending: true }) // Sort ascending: 1, 2, 3...

    if (error) {
      console.error('❌ Error fetching versions:', error)
      // Check if table doesn't exist
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          versions: [],
          count: 0,
          message: 'Versions feature not yet initialized. Please run migration 049_create_document_versions.sql',
        })
      }
      return NextResponse.json(
        { error: 'Failed to fetch versions', details: error.message },
        { status: 500 }
      )
    }

    // Format versions - only one version per version_number should exist
    // Group by version_number to ensure uniqueness
    const versionMap = new Map<number, any>()
    
    for (const version of versions || []) {
      const versionNum = version.version_number
      // If we already have a version with this number, keep the one that is_current
      if (!versionMap.has(versionNum)) {
        versionMap.set(versionNum, version)
      } else {
        const existing = versionMap.get(versionNum)
        // Prefer the one that is_current
        if (version.is_current && !existing.is_current) {
          versionMap.set(versionNum, version)
        }
      }
    }
    
    const formattedVersions = Array.from(versionMap.values()).map((version: any) => {
      // Check if this version represents the document being viewed
      // If metadata.new_document_id matches documentId, this version represents the new document
      // If document_id matches documentId and there's no new_document_id, this is the original document
      const isViewing = version.metadata?.new_document_id === documentId ||
                        (version.document_id === documentId && !version.metadata?.new_document_id)
      
      return {
        id: version.id,
        document_id: version.document_id,
        version_number: version.version_number,
        parent_version_id: version.parent_version_id,
        is_current: version.is_current,
        is_viewing: isViewing,
        uploaded_by: version.uploaded_by,
        uploaded_by_name: null, // Can be enhanced later with profiles join if needed
        uploaded_at: version.uploaded_at,
        change_summary: version.change_summary,
        metadata: version.metadata,
      }
    })
    
    // Sort by version number ascending (1, 2, 3...) so oldest is first
    formattedVersions.sort((a, b) => a.version_number - b.version_number)

    return NextResponse.json({
      success: true,
      versions: formattedVersions,
      count: formattedVersions.length,
    })
  } catch (error) {
    console.error('❌ List versions error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

