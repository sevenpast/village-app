import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentProcessor } from '@/lib/vault/document-processor'
import sharp from 'sharp'

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

    // Generate unique file path
    const fileExt = file.name.split('.').pop() || 'pdf'
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `documents/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: uploadError.message },
        { status: 500 }
      )
    }

    console.log('✅ File uploaded to storage:', uploadData.path)

    // Process document (OCR + AI Classification) in background
    // For now, mark as processing
    const documentId = crypto.randomUUID()

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        processing_status: 'processing',
      })
      .select()
      .single()

    if (docError) {
      console.error('❌ Error creating document record:', docError)
      // Try to delete uploaded file
      await supabase.storage.from('documents').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to create document record', details: docError.message },
        { status: 500 }
      )
    }

    // Process document asynchronously (don't block response)
    processDocumentAsync(documentId, fileBuffer, file.name, file.type, storagePath, supabase)

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        processing_status: document.processing_status,
      },
      message: 'File uploaded successfully. Processing in background...',
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
 */
async function processDocumentAsync(
  documentId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  storagePath: string,
  supabase: any
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

    // Update document record with processing results
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        document_type: processed.documentType,
        tags: processed.tags,
        confidence_score: processed.confidence,
        extracted_text: processed.extractedText.substring(0, 50000), // Limit text size
        extracted_fields: processed.extractedFields,
        language_detected: processed.language,
        thumbnail_url: thumbnailUrl,
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
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

