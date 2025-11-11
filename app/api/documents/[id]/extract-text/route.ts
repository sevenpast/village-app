import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentProcessor } from '@/lib/vault/document-processor'

/**
 * POST /api/documents/[id]/extract-text
 * 
 * Extracts text from a PDF document and stores it in the database.
 * If text is already extracted, returns cached text.
 */
export async function POST(
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

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if text is already extracted
    if (document.extracted_text && document.extracted_text.length > 0) {
      console.log(`✅ Text already extracted for document ${documentId} (${document.extracted_text.length} chars)`)
      return NextResponse.json({
        success: true,
        extracted_text: document.extracted_text,
        cached: true,
        text_length: document.extracted_text.length,
      })
    }

    // Check if document is a PDF
    if (document.mime_type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Text extraction is only supported for PDF files' },
        { status: 400 }
      )
    }

    // Note: We no longer block "failed" documents here - they can be retried with improved OCR
    // The DocumentProcessor will attempt OCR even for scanned documents
    // Only skip if text is already successfully extracted

    // Download PDF from storage
    console.log(`📥 Downloading PDF from storage: ${document.storage_path}`)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      console.error('❌ Error downloading file:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download document from storage' },
        { status: 500 }
      )
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text using DocumentProcessor
    console.log(`🔍 Extracting text from PDF...`)
    const processor = new DocumentProcessor()
    
    try {
      // Use the existing processDocument method, but we only need the text
      const processed = await processor.processDocument(
        buffer,
        document.file_name,
        document.mime_type
      )

      const extractedText = processed.extractedText

      // Lower threshold: accept even very short text (OCR might extract partial text)
      // But log a warning if it's very short
      if (!extractedText || extractedText.length === 0) {
        // Really no text found even after OCR
        console.error(`❌ No text extracted after all OCR attempts (Tesseract + Gemini Vision)`)
        return NextResponse.json(
          {
            error: 'Unable to extract text from this document. It may be scanned or unreadable.',
            is_scanned: true,
            extracted_text: extractedText || '',
            text_length: 0
          },
          { status: 400 }
        )
      }

      // Log warning if text is very short (but still accept it)
      if (extractedText.length < 50) {
        console.warn(`⚠️ Extracted text is very short (${extractedText.length} chars) - OCR may be partial`)
      } else {
        console.log(`✅ Extracted text length: ${extractedText.length} chars`)
      }

      // Update document with extracted text
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          extracted_text: extractedText,
          processing_status: 'completed',
        })
        .eq('id', documentId)

      if (updateError) {
        console.error('❌ Error updating document:', updateError)
        return NextResponse.json(
          { error: 'Failed to save extracted text' },
          { status: 500 }
        )
      }

      console.log(`✅ Text extracted and saved: ${extractedText.length} chars`)

      return NextResponse.json({
        success: true,
        extracted_text: extractedText,
        cached: false,
        text_length: extractedText.length,
      })
    } catch (error) {
      console.error('❌ Error extracting text:', error)
      
      // Update document status to failed
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          processing_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', documentId)

      return NextResponse.json(
        { 
          error: 'Failed to extract text from document',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Extract text error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

