import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentProcessor } from '@/lib/vault/document-processor'
import { generateSmartTags, getDocumentType, getClassificationConfidence } from '@/lib/utils/documentClassifier'
import { detectSimilarDocuments, checkExactDuplicate } from '@/lib/vault/duplicate-detector'
import { createHash } from 'crypto'

/**
 * Upload document to Vault
 * POST /api/vault/upload
 * 
 * FormData:
 * - file: File (required)
 * - documentType?: string (optional, will be auto-detected)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
        // Get document_id from FormData if provided (ID-based tagging)
        const documentIdParam = formData.get('document_id') as string | null
        const documentId = documentIdParam ? parseInt(documentIdParam, 10) : null
        // Get document_type from FormData if provided (direct type tagging)
        const providedDocumentType = formData.get('document_type') as string | null
        // Get fulfilled_requirement from FormData if provided (requirement-based matching)
        const fulfilledRequirement = formData.get('fulfilled_requirement') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/heic',
      'image/heif',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}. Allowed: PDF, JPEG, PNG, HEIC` },
        { status: 400 }
      )
    }

    console.log(`📤 Uploading file: ${file.name} (${file.size} bytes, ${file.type})`)

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Check for exact duplicate BEFORE uploading
    console.log('🔍 Checking for exact duplicate...')
    const duplicate = await checkExactDuplicate(
      supabase,
      user.id,
      file.name,
      file.size,
      fileBuffer
    )

    if (duplicate) {
      console.log(`⚠️ Exact duplicate found: ${duplicate.id} (${duplicate.file_name})`)
      return NextResponse.json(
        {
          success: false,
          error: 'This file has already been uploaded',
          duplicate: {
            id: duplicate.id,
            file_name: duplicate.file_name,
          },
          message: `A file with the same name and size already exists. Please check your document vault.`,
        },
        { status: 409 } // 409 Conflict
      )
    }

    // Generate unique file path
    // Path structure: {user_id}/{timestamp}-{random}.{ext}
    // The bucket is already 'documents', so we don't need to include it in the path
    const fileExt = file.name.split('.').pop() || 'pdf'
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = fileName // Just the file path, bucket name is in .from()

    // Upload to Supabase Storage
    console.log('📤 Uploading to storage bucket "documents" with path:', storagePath)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError,
      })
      
      // Check if bucket exists
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
      if (bucketError) {
        console.error('❌ Error listing buckets:', bucketError)
      } else {
        const documentsBucket = buckets?.find(b => b.name === 'documents')
        if (!documentsBucket) {
          console.error('❌ Storage bucket "documents" does not exist!')
          return NextResponse.json(
            { 
              error: 'Storage bucket "documents" does not exist',
              details: 'Please create the "documents" bucket in Supabase Dashboard under Storage',
              hint: 'The bucket needs to be created manually in Supabase Dashboard'
            },
            { status: 500 }
          )
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to upload file to storage', 
          details: uploadError.message,
          statusCode: uploadError.statusCode,
        },
        { status: 500 }
      )
    }

    if (!uploadData) {
      console.error('❌ Upload returned no data')
      return NextResponse.json(
        { error: 'Upload failed: No data returned from storage' },
        { status: 500 }
      )
    }

    console.log('✅ File uploaded to storage:', uploadData.path)

    // Document type priority:
    // 1. document_id → mapped to document_type via ID mapping (highest priority, confidence = 1.0)
    // 2. provided document_type (from FormData - high priority, confidence = 1.0)
    // 3. Auto-detected from filename (confidence = 0.7-0.9)
    
    let detectedType: string
    let initialTags: string[]
    let confidence: number

    // First, try ID-based mapping
    // Note: We don't have taskId in the upload API, so we'll try all tasks
    // The client-side should ensure the correct taskId is used
    if (documentId && !isNaN(documentId)) {
      try {
        const { getDocumentTypeById } = await import('@/lib/utils/document-id-mapping')
        // Try without taskId first (will search all tasks)
        const idMappedType = getDocumentTypeById(documentId)
        if (idMappedType) {
          detectedType = idMappedType
          initialTags = [idMappedType]
          confidence = 1.0 // Maximum confidence when mapped via ID
          console.log(`🏷️ Using document_id ${documentId} → mapped type: ${detectedType} (confidence: ${confidence})`)
        } else {
          // ID not found in mapping, fall through to other methods
          throw new Error(`Document ID ${documentId} not found in mapping`)
        }
      } catch (error) {
        console.warn(`⚠️ Could not map document_id ${documentId}, falling back to other methods`)
        // Fall through to other methods
      }
    }

    // If ID mapping didn't work, try provided document_type
    if (!detectedType && providedDocumentType && providedDocumentType.trim() !== '') {
      detectedType = providedDocumentType.trim()
      initialTags = [providedDocumentType.trim()]
      confidence = 1.0 // Maximum confidence when explicitly provided
      console.log(`🏷️ Using provided document_type: ${detectedType} (confidence: ${confidence})`)
    }

    // Finally, auto-detect from filename if no explicit type was provided
    if (!detectedType) {
      console.log('🤖 Performing initial document classification...')
      detectedType = getDocumentType(file.name)
      initialTags = generateSmartTags(file.name)
      confidence = getClassificationConfidence(file.name)
      console.log(`📋 Auto-detected type: ${detectedType}, Tags: ${initialTags.join(', ')}, Confidence: ${confidence}`)
    }

    // Process document (OCR + AI Classification) in background
    // For now, mark as processing
    const documentUuid = crypto.randomUUID()

    // Calculate file hash for duplicate detection
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex')

    // Check if there's an existing document with the same filename (for version linking)
    let parentDocumentId: string | null = null
    const { data: existingDocsWithSameName } = await supabase
      .from('documents')
      .select('id, file_name, file_hash')
      .eq('user_id', user.id)
      .eq('file_name', file.name)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingDocsWithSameName && existingDocsWithSameName.length > 0) {
      const existingDoc = existingDocsWithSameName[0]
      // Only link as version if hash is different (different content)
      if (existingDoc.file_hash && existingDoc.file_hash !== fileHash) {
        parentDocumentId = existingDoc.id
        console.log(`🔗 Found existing document with same name but different content - will link as version: ${parentDocumentId}`)
      }
    }

    // Create document record with initial classification
    console.log('💾 Creating document record in database...')
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentUuid,
        user_id: user.id,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        document_type: detectedType,
        tags: initialTags,
        confidence: confidence,
        processing_status: 'processing',
        fulfilled_requirement: fulfilledRequirement || null, // Store which requirement this fulfills
        file_hash: fileHash, // Store hash for future duplicate detection
      } as any) // Type assertion to bypass TypeScript type checking
      .select()
      .single()

    if (docError) {
      console.error('❌ Error creating document record:', {
        message: docError.message,
        code: docError.code,
        hint: docError.hint,
        details: docError.details,
      })
      
      // Try to delete uploaded file
      console.log('🧹 Cleaning up uploaded file...')
      const { error: cleanupError } = await supabase.storage.from('documents').remove([storagePath])
      if (cleanupError) {
        console.warn('⚠️ Failed to cleanup uploaded file:', cleanupError)
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create document record', 
          details: docError.message,
          code: docError.code,
          hint: docError.hint || 'Check if the documents table exists and RLS policies are correct',
        },
        { status: 500 }
      )
    }

    if (!document) {
      console.error('❌ Document insert returned no data')
      return NextResponse.json(
        { error: 'Failed to create document record: No data returned' },
        { status: 500 }
      )
    }

    console.log('✅ Document record created:', document.id)

    // If parent document found, automatically link as version
    let versionLinked = false
    if (parentDocumentId) {
      try {
        // Check if parent document already has versions
        const { data: existingVersions } = await supabase
          .from('document_versions')
          .select('id, version_number, is_current')
          .eq('document_id', parentDocumentId)
          .order('version_number', { ascending: false })

        // Get the parent document info to create version 1 for it if it doesn't exist
        const { data: parentDoc } = await supabase
          .from('documents')
          .select('file_name, mime_type, file_size, created_at')
          .eq('id', parentDocumentId)
          .single()

        let parentVersion1Id: string | null = null
        let nextVersionNumber = 2 // New document will be version 2

        // If parent document has no versions, create version 1 for it first
        if (!existingVersions || existingVersions.length === 0) {
          // Create version 1 for the parent document (the old document)
          const { data: parentVersion1, error: parentV1Error } = await supabase
            .from('document_versions')
            .insert({
              document_id: parentDocumentId,
              version_number: 1,
              parent_version_id: null,
              is_current: false, // Old version is not current
              uploaded_by: user.id,
              change_summary: 'Original version (auto-created when new version was uploaded)',
              metadata: {
                file_name: parentDoc?.file_name || file.name,
                mime_type: parentDoc?.mime_type || file.type,
                file_size: parentDoc?.file_size || file.size,
              },
            })
            .select('id')
            .single()

          if (!parentV1Error && parentVersion1) {
            parentVersion1Id = parentVersion1.id
            console.log(`✅ Created version 1 for parent document ${parentDocumentId}`)
          }
        } else {
          // Parent already has versions, find the highest version number
          const maxVersion = Math.max(...existingVersions.map(v => v.version_number))
          nextVersionNumber = maxVersion + 1

          // Find the current version to use as parent
          const currentVersion = existingVersions.find(v => v.is_current)
          if (currentVersion) {
            parentVersion1Id = currentVersion.id
            // Mark old current version as not current
            await supabase
              .from('document_versions')
              .update({ is_current: false })
              .eq('id', currentVersion.id)
          }
        }

        // Create version record for the parent document (linking to the new document)
        // This way, when viewing versions of the parent document, the new document will appear
        const { error: versionError } = await supabase
          .from('document_versions')
          .insert({
            document_id: parentDocumentId,
            version_number: nextVersionNumber,
            parent_version_id: parentVersion1Id,
            is_current: true,
            uploaded_by: user.id,
            change_summary: 'Auto-linked as new version (same filename, different content)',
            metadata: {
              new_document_id: documentUuid, // Reference to the new document
              file_name: file.name,
              mime_type: file.type,
              file_size: file.size,
            },
          })

        // Also create a version record for the new document itself
        // This allows viewing versions from the new document's perspective
        if (!versionError) {
          await supabase
            .from('document_versions')
            .insert({
              document_id: documentUuid,
              version_number: nextVersionNumber,
              parent_version_id: parentVersion1Id,
              is_current: true,
              uploaded_by: user.id,
              change_summary: 'Auto-linked as new version (same filename, different content)',
              metadata: {
                parent_document_id: parentDocumentId, // Reference to the parent document
                file_name: file.name,
                mime_type: file.type,
                file_size: file.size,
              },
            })
        }

        if (!versionError) {
          versionLinked = true
          console.log(`✅ Automatically linked as version ${nextVersionNumber} of document ${parentDocumentId}`)
        } else {
          console.warn('⚠️ Failed to create version link:', versionError)
        }
      } catch (versionError) {
        console.warn('⚠️ Error linking as version (non-critical):', versionError)
        // Don't fail the upload if version linking fails
      }
    }

    // Process document asynchronously (don't block response)
    // Don't await - let it run in background
    // Pass document_id (table ID 1-6) and providedDocumentType to preserve explicit tagging
    processDocumentAsync(
      documentUuid, 
      fileBuffer, 
      file.name, 
      file.type, 
      storagePath, 
      supabase,
      user.id, // Pass user ID for reminder creation
      documentId || undefined, // Pass document_id (1-6) from table for ID-based mapping
      providedDocumentType || undefined, // Pass direct type if provided
      confidence
    ).catch((error) => {
      console.error(`❌ Background processing failed for ${documentUuid}:`, error)
      // Update status to failed with error message
      supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Processing failed',
        })
        .eq('id', documentUuid)
        .then(() => {
          console.log(`✅ Document ${documentUuid} marked as failed`)
        })
    })

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        processing_status: document.processing_status,
      },
      version_linked: versionLinked,
      parent_document_id: parentDocumentId || undefined,
      message: versionLinked 
        ? `File uploaded successfully and linked as new version. Processing in background...`
        : 'File uploaded successfully. Processing in background...',
    })
  } catch (error) {
    console.error('❌ Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Process document asynchronously
 * @param documentId - UUID of the document record
 * @param fileBuffer - File buffer
 * @param fileName - Original file name
 * @param mimeType - MIME type
 * @param storagePath - Storage path in Supabase
 * @param supabase - Supabase client
 * @param userId - User ID for reminder creation
 * @param providedDocumentId - Document ID from table (1-6) for ID-based mapping
 * @param providedDocumentType - Document type provided via FormData
 * @param providedConfidence - Confidence score of the provided type
 */
async function processDocumentAsync(
  documentId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  storagePath: string,
  supabase: any,
  userId: string,
  providedDocumentId?: number,
  providedDocumentType?: string,
  providedConfidence: number = 1.0
) {
  try {
    console.log(`🔄 Processing document ${documentId}...`)

    const processor = new DocumentProcessor()

    // Process document (OCR + Classification)
    const processed = await processor.processDocument(fileBuffer, fileName, mimeType)

    // Generate thumbnail
    let thumbnailUrl: string | null = null
    try {
      const thumbnailBuffer = await processor.generateThumbnail(fileBuffer, mimeType)
      if (thumbnailBuffer.length > 0) {
        // Thumbnail path: same structure as original file
        const thumbnailPath = storagePath.replace(/\.\w+$/, '_thumb.jpg')
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('documents')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (!thumbError && thumbData) {
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(thumbnailPath)
          thumbnailUrl = publicUrl
        }
      }
    } catch (thumbError) {
      console.warn('⚠️ Thumbnail generation failed:', thumbError)
    }

    // Priority order for document type:
    // 1. Provided document_id → mapped to document_type (from upload button) - ALWAYS use if provided
    // 2. Provided document_type (from FormData) - ALWAYS use if provided
    // 3. Enhanced classification (with OCR text) - higher confidence
    // 4. Initial classification (filename only) - lower confidence
    
    let finalType: string
    let finalConfidence: number
    let allTags: string[]

    // First priority: ID-based mapping
    if (providedDocumentId && providedConfidence >= 1.0) {
      try {
        const { getDocumentTypeById } = await import('@/lib/utils/document-id-mapping')
        const idMappedType = getDocumentTypeById(providedDocumentId)
        if (idMappedType) {
          finalType = idMappedType
          finalConfidence = providedConfidence
          allTags = [idMappedType, ...processed.tags, ...generateSmartTags(fileName, processed.extractedText)]
          console.log(`🏷️ Using document_id ${providedDocumentId} → mapped type: ${finalType} (confidence: ${finalConfidence})`)
        } else {
          throw new Error(`Document ID ${providedDocumentId} not found in mapping`)
        }
      } catch (error) {
        console.warn(`⚠️ Could not map document_id ${providedDocumentId}, trying other methods`)
        // Fall through to other methods
      }
    }

    // Second priority: Explicit document_type provided
    if (!finalType && providedDocumentType && providedConfidence >= 1.0) {
      finalType = providedDocumentType
      finalConfidence = providedConfidence
      allTags = [providedDocumentType, ...processed.tags, ...generateSmartTags(fileName, processed.extractedText)]
      console.log(`🏷️ Using provided document_type: ${finalType} (confidence: ${finalConfidence})`)
    }

    // Third priority: Auto-classify with OCR enhancement
    if (!finalType) {
      console.log('🔍 Enhancing classification with extracted text...')
      const enhancedType = getDocumentType(fileName, processed.extractedText)
      const enhancedTags = generateSmartTags(fileName, processed.extractedText)
      const enhancedConfidence = getClassificationConfidence(fileName, processed.extractedText)

      // Merge processed tags with enhanced tags
      allTags = Array.from(new Set([...processed.tags, ...enhancedTags]))

      // Use the higher confidence type
      finalType = enhancedConfidence > processed.confidence ? enhancedType : processed.documentType
      finalConfidence = Math.max(enhancedConfidence, processed.confidence)
      console.log(`📊 Auto-classified: ${finalType}, Tags: ${allTags.join(', ')}, Confidence: ${finalConfidence}`)
    }

    // Update document record with processing results
    // Preserve fulfilled_requirement if it was set during upload
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('fulfilled_requirement')
      .eq('id', documentId)
      .single()
    
    const updateData: any = {
      document_type: finalType,
      tags: allTags,
      confidence: finalConfidence,
      extracted_text: processed.extractedText.substring(0, 50000), // Limit text size
      extracted_fields: processed.extractedFields,
      language: processed.language,
      thumbnail_url: thumbnailUrl,
      processing_status: 'completed',
    }
    
    // Preserve fulfilled_requirement if it exists (don't overwrite)
    if (existingDoc?.fulfilled_requirement) {
      updateData.fulfilled_requirement = existingDoc.fulfilled_requirement
    }
    
    const { error: updateError } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', documentId)

    if (updateError) {
      console.error('❌ Error updating document:', updateError)
      // Update status to failed
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          processing_error: updateError.message,
        })
        .eq('id', documentId)
    } else {
      console.log(`✅ Document ${documentId} processed successfully`)
      
      // Create automatic reminders if dates are found in extracted_fields
      if (processed.extractedFields && Object.keys(processed.extractedFields).length > 0) {
        try {
          const { createDocumentReminders } = await import('@/lib/vault/reminder-creator')
          const reminderResult = await createDocumentReminders(
            supabase,
            documentId,
            userId,
            finalType,
            processed.extractedFields
          )
          if (reminderResult.created > 0) {
            console.log(`✅ Created ${reminderResult.created} automatic reminder(s) for document ${documentId}`)
          }
        } catch (reminderError) {
          console.warn('⚠️ Failed to create automatic reminders (non-critical):', reminderError)
          // Don't fail the upload if reminder creation fails
        }
      }

      // Detect similar documents for version suggestion (non-blocking)
      try {
        const similarDocs = await detectSimilarDocuments(
          supabase,
          userId,
          fileName,
          processed.extractedText,
          finalType,
          0.75 // 75% similarity threshold
        )
        
        if (similarDocs.length > 0) {
          console.log(`🔍 Found ${similarDocs.length} similar document(s) for ${documentId}`)
          // Store similar documents in document metadata for later retrieval
          await supabase
            .from('documents')
            .update({
              metadata: {
                similar_documents: similarDocs.map(doc => ({
                  id: doc.id,
                  file_name: doc.file_name,
                  similarity_score: doc.similarity_score,
                  match_type: doc.match_type,
                })),
                duplicate_check_at: new Date().toISOString(),
              },
            } as any)
            .eq('id', documentId)
        }
      } catch (duplicateError) {
        console.warn('⚠️ Duplicate detection failed (non-critical):', duplicateError)
        // Don't fail the upload if duplicate detection fails
      }
    }
  } catch (error) {
    console.error(`❌ Error processing document ${documentId}:`, error)
    // Update status to failed
    await supabase
      .from('documents')
      .update({
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', documentId)
  }
}

