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
 * 
 * Clean implementation:
 * 1. Find the parent document (original document with same filename)
 * 2. Get all versions for the parent document
 * 3. Mark which version corresponds to the document being viewed
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
      .select('id, file_name')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Step 1: Find the parent document ID
    // Check if this document is referenced as a child (has parent_document_id in metadata)
    const { data: childVersion } = await supabase
      .from('document_versions')
      .select('metadata')
      .eq('document_id', documentId)
      .not('metadata->>parent_document_id', 'is', null)
      .limit(1)
      .single()

    let parentDocumentId = documentId
    if (childVersion?.metadata?.parent_document_id) {
      parentDocumentId = childVersion.metadata.parent_document_id
    }

    // Step 2: Get all versions for the parent document
    // Only get versions where document_id matches the parent document
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
      .order('version_number', { ascending: true })

    if (error) {
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

    if (!versions || versions.length === 0) {
      return NextResponse.json({
        success: true,
        versions: [],
        count: 0,
      })
    }

    // Step 3: Deduplicate versions by version_number
    // For each version_number, keep only one entry:
    // - Version 1: Keep entry WITHOUT new_document_id (the original)
    // - Version 2+: Keep entry WITH new_document_id (links to child document)
    const versionMap = new Map<number, any>()
    
    for (const version of versions) {
      const versionNum = version.version_number
      const hasNewDocId = !!version.metadata?.new_document_id
      
      if (!versionMap.has(versionNum)) {
        versionMap.set(versionNum, version)
      } else {
        const existing = versionMap.get(versionNum)
        const existingHasNewDocId = !!existing.metadata?.new_document_id
        
        if (versionNum === 1) {
          // Version 1: Prefer entry WITHOUT new_document_id
          if (!hasNewDocId && existingHasNewDocId) {
            versionMap.set(versionNum, version)
          }
        } else {
          // Version 2+: Prefer entry WITH new_document_id
          if (hasNewDocId && !existingHasNewDocId) {
            versionMap.set(versionNum, version)
          }
        }
      }
    }

    // Step 4: Format versions and mark which one is being viewed
    const formattedVersions = Array.from(versionMap.values()).map((version: any) => {
      // Determine if this version represents the document being viewed
      let isViewing = false
      
      if (documentId === parentDocumentId) {
        // Viewing parent document: Version 1 is being viewed
        isViewing = version.version_number === 1
      } else {
        // Viewing child document: Find version that references this document
        isViewing = version.metadata?.new_document_id === documentId
      }

      return {
        id: version.id,
        document_id: version.document_id,
        version_number: version.version_number,
        parent_version_id: version.parent_version_id,
        is_current: version.is_current,
        is_viewing: isViewing,
        uploaded_by: version.uploaded_by,
        uploaded_by_name: null,
        uploaded_at: version.uploaded_at,
        change_summary: version.change_summary,
        metadata: version.metadata,
      }
    })

    // Sort by version number (already sorted by query, but ensure it)
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
