import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentProcessor } from '@/lib/vault/document-processor'

/**
 * POST /api/test/reprocess-documents
 * Test endpoint to reprocess all documents with improved OCR
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all PDF documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, mime_type, storage_path, processing_status')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('mime_type', 'application/pdf')

    if (docError) {
      console.error('❌ Error fetching documents:', docError)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: docError.message },
        { status: 500 }
      )
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No PDF documents found to reprocess',
        processed: 0
      })
    }

    console.log(`🔄 Starting reprocessing of ${documents.length} documents...`)

    // Clear existing extracted_text to force reprocessing
    const { error: clearError } = await supabase
      .from('documents')
      .update({
        extracted_text: null,
        processing_status: 'pending',
        processing_error: null
      })
      .eq('user_id', user.id)
      .eq('mime_type', 'application/pdf')
      .is('deleted_at', null)

    if (clearError) {
      console.error('❌ Error clearing extracted text:', clearError)
      return NextResponse.json(
        { error: 'Failed to clear existing extracted text', details: clearError.message },
        { status: 500 }
      )
    }

    // Process each document
    const results = []
    const processor = new DocumentProcessor()

    for (const doc of documents) {
      console.log(`\n🔍 Reprocessing document: ${doc.file_name} (${doc.id})`)

      try {
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(doc.storage_path)

        if (downloadError || !fileData) {
          console.error(`❌ Error downloading ${doc.file_name}:`, downloadError)
          results.push({
            id: doc.id,
            file_name: doc.file_name,
            success: false,
            text_length: 0,
            error: `Failed to download: ${downloadError?.message || 'Unknown error'}`
          })
          continue
        }

        // Convert Blob to Buffer
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        console.log(`📄 Processing ${doc.file_name} (${buffer.length} bytes)...`)

        // Process document with improved OCR
        const processed = await processor.processDocument(
          buffer,
          doc.file_name,
          doc.mime_type
        )

        const extractedText = processed.extractedText || ''

        if (!extractedText || extractedText.length === 0) {
          console.error(`❌ No text extracted from ${doc.file_name}`)
          results.push({
            id: doc.id,
            file_name: doc.file_name,
            success: false,
            text_length: 0,
            error: 'Unable to extract text from this document. It may be scanned or unreadable.'
          })

          // Update document status
          await supabase
            .from('documents')
            .update({
              processing_status: 'failed',
              processing_error: 'Unable to extract text from this document. It may be scanned or unreadable.'
            })
            .eq('id', doc.id)

          continue
        }

        // Update document with extracted text
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            extracted_text: extractedText,
            processing_status: 'completed',
            processing_error: null
          })
          .eq('id', doc.id)

        if (updateError) {
          console.error(`❌ Error updating ${doc.file_name}:`, updateError)
          results.push({
            id: doc.id,
            file_name: doc.file_name,
            success: false,
            text_length: extractedText.length,
            error: `Failed to save: ${updateError.message}`
          })
        } else {
          console.log(`✅ ${doc.file_name}: ${extractedText.length} chars extracted and saved`)
          results.push({
            id: doc.id,
            file_name: doc.file_name,
            success: true,
            text_length: extractedText.length,
            error: null
          })
        }

      } catch (error) {
        console.error(`❌ Error processing ${doc.file_name}:`, error)
        results.push({
          id: doc.id,
          file_name: doc.file_name,
          success: false,
          text_length: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        // Update document status
        await supabase
          .from('documents')
          .update({
            processing_status: 'failed',
            processing_error: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', doc.id)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`\n🏁 Reprocessing complete: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Reprocessing complete: ${successCount} documents processed successfully, ${failCount} failed`,
      total_documents: documents.length,
      successful: successCount,
      failed: failCount,
      results
    })

  } catch (error) {
    console.error('❌ Reprocess error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


