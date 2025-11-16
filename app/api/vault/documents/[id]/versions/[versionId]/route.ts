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

    // Get specific version by ID (versionId is unique)
    // We don't need to check documentId ownership first - we'll check version ownership instead
    console.log(`🔍 Looking for version ${versionId} (documentId in URL: ${documentId})`)
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
      .single()

    if (error || !version) {
      console.error(`❌ Version ${versionId} not found:`, error?.message || 'No version returned')
      return NextResponse.json(
        { error: 'Version not found', details: error?.message },
        { status: 404 }
      )
    }

    // Type assertion for version
    const versionData = version as {
      id: string
      version_number: number
      parent_version_id: string | null
      is_current: boolean
      uploaded_by: string
      uploaded_at: string
      change_summary: string | null
      metadata: {
        new_document_id?: string
        parent_document_id?: string
        [key: string]: any
      } | null
      document_id: string
    }

    console.log(`✅ Found version ${versionId}: document_id=${versionData.document_id}, version_number=${versionData.version_number}`)

    // Verify that the user owns at least one of the documents linked to this version
    // Check: document_id, metadata.new_document_id, metadata.parent_document_id
    const documentIdsToCheck = [
      versionData.document_id,
      versionData.metadata?.new_document_id,
      versionData.metadata?.parent_document_id,
    ].filter(Boolean) as string[]

    console.log(`🔍 Checking ownership for document IDs:`, documentIdsToCheck)
    const { data: userDocuments, error: ownershipError } = await supabase
      .from('documents')
      .select('id')
      .in('id', documentIdsToCheck)
      .eq('user_id', user.id)

    console.log(`📊 User owns ${userDocuments?.length || 0} of ${documentIdsToCheck.length} documents`)

    if (!userDocuments || userDocuments.length === 0) {
      console.error(`❌ Access denied: User ${user.id} does not own any of the linked documents`)
      return NextResponse.json(
        { error: 'Version not found or access denied' },
        { status: 404 }
      )
    }

    // Determine which document this version represents
    // Version 1: document_id is the parent document
    // Version 2+: metadata.new_document_id is the child document
    const versionDocumentId = versionData.metadata?.new_document_id || versionData.document_id
    
    // Verify that versionDocumentId is owned by the user
    const userDocs = userDocuments as { id: string }[]
    const userOwnsVersionDoc = userDocs.some(doc => doc.id === versionDocumentId)
    if (!userOwnsVersionDoc) {
      return NextResponse.json(
        { error: 'Version not found or access denied' },
        { status: 404 }
      )
    }
    
    // Get the actual document to retrieve download URL, extracted_fields, and extracted_text
    const { data: versionDocument, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, mime_type, file_size, storage_path, extracted_fields, extracted_text, processing_status')
      .eq('id', versionDocumentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !versionDocument) {
      console.error(`❌ Document ${versionDocumentId} not found:`, docError?.message || 'No document returned')
      return NextResponse.json(
        { error: 'Document for this version not found' },
        { status: 404 }
      )
    }

    // Type assertion for document
    let documentData = versionDocument as {
      id: string
      file_name: string
      mime_type: string | null
      file_size: number
      storage_path: string
      extracted_fields: Record<string, any> | null
      extracted_text: string | null
      processing_status: string | null
    }

    // If extracted_text is missing and document is a PDF, try to extract it now
    if (!documentData.extracted_text && documentData.mime_type === 'application/pdf' && documentData.processing_status !== 'processing') {
      console.log(`📄 No extracted_text found for document ${versionDocumentId}, attempting extraction...`)
      try {
        // Import DocumentProcessor dynamically
        const { DocumentProcessor } = await import('@/lib/vault/document-processor')
        
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(documentData.storage_path)

        if (!downloadError && fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer())
          const processor = new DocumentProcessor()
          const processed = await processor.processDocument(
            buffer,
            documentData.file_name,
            documentData.mime_type || 'application/pdf'
          )

          if (processed.extractedText && processed.extractedText.length > 0) {
            // Update document with extracted text
            const { error: updateError } = (await supabase
              .from('documents')
              .update({
                extracted_text: processed.extractedText.substring(0, 50000), // Limit text size
                processing_status: 'completed',
              } as never)
              .eq('id', versionDocumentId)) as { error: any }

            if (!updateError) {
              documentData.extracted_text = processed.extractedText.substring(0, 50000)
              console.log(`✅ Extracted and saved ${documentData.extracted_text.length} characters for document ${versionDocumentId}`)
            } else {
              console.warn(`⚠️ Failed to save extracted text: ${updateError.message}`)
            }
          }
        }
      } catch (extractionError) {
        console.warn(`⚠️ Failed to extract text on-the-fly: ${extractionError instanceof Error ? extractionError.message : String(extractionError)}`)
        // Continue without extracted_text - comparison will still work with extracted_fields
      }
    }

    // Generate download URL (signed URL for private bucket)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(documentData.storage_path, 3600) // 1 hour expiry

    const downloadUrl = signedUrlData?.signedUrl || null

    // Merge extracted_fields from document into metadata for comparison
    const metadataWithFields = {
      ...versionData.metadata,
      extracted_fields: documentData.extracted_fields || versionData.metadata?.extracted_fields || {},
    }

    const formattedVersion = {
      id: versionData.id,
      version_number: versionData.version_number,
      parent_version_id: versionData.parent_version_id,
      is_current: versionData.is_current,
      uploaded_by: versionData.uploaded_by,
      uploaded_by_name: null, // Can be enhanced later with profiles join if needed
      uploaded_at: versionData.uploaded_at,
      change_summary: versionData.change_summary,
      metadata: metadataWithFields,
      document: {
        id: documentData.id,
        file_name: documentData.file_name,
        mime_type: documentData.mime_type,
        file_size: documentData.file_size,
        download_url: downloadUrl,
        extracted_text: documentData.extracted_text || null, // Include extracted_text for text comparison
      },
    }

    console.log(`✅ Returning version ${versionId} with extracted_fields:`, Object.keys(metadataWithFields.extracted_fields || {}).length, 'fields, extracted_text length:', documentData.extracted_text?.length || 0)

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
    const { data: updatedVersion, error: updateError } = (await supabase
      .from('document_versions')
      .update({ is_current: true } as never)
      .eq('id', versionId)
      .select()
      .single()) as { data: any; error: any }

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

