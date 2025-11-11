import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromPDF, getDocumentStats } from '@/lib/pdf-extraction'

/**
 * POST /api/documents/extract-text
 *
 * Extracts text content from uploaded PDF documents
 * Updates the documents table with extracted text and metadata
 *
 * Request body:
 * - document_id: UUID of the document in the database
 *
 * Returns:
 * - Success: Extracted text content, page breakdown, and statistics
 * - Error: Detailed error information
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { document_id } = await request.json()

    if (!document_id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get document from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if document is a PDF
    if (document.content_type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF documents are supported' }, { status: 400 })
    }

    // Download PDF from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({
        error: 'Failed to download document from storage',
        details: downloadError?.message
      }, { status: 500 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer())

    // Extract text from PDF
    console.log(`📖 Extracting text from PDF: ${document.name}`)
    const extraction = await extractTextFromPDF(buffer)

    // Get document statistics
    const stats = getDocumentStats(extraction)

    console.log(`✅ Extracted ${stats.totalWords} words from ${stats.totalPages} pages`)

    // Store extracted text in database
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extracted_text: extraction.text,
        text_metadata: {
          pages: extraction.pages.map(p => ({
            pageNumber: p.pageNumber,
            wordCount: p.wordCount,
            textLength: p.text.length
          })),
          stats,
          extraction_metadata: extraction.metadata,
          extracted_at: new Date().toISOString()
        }
      })
      .eq('id', document_id)

    if (updateError) {
      console.error('Failed to update document with extracted text:', updateError)
      return NextResponse.json({
        error: 'Failed to save extracted text',
        details: updateError.message
      }, { status: 500 })
    }

    // Return extraction result
    return NextResponse.json({
      success: true,
      document_id: document.id,
      document_name: document.name,
      extraction: {
        total_pages: extraction.metadata.totalPages,
        total_words: stats.totalWords,
        total_characters: stats.totalCharacters,
        detected_language: stats.language,
        estimated_reading_time: stats.estimatedReadingTime
      },
      pages: extraction.pages.map(page => ({
        page_number: page.pageNumber,
        word_count: page.wordCount,
        text_preview: page.text.substring(0, 200) + (page.text.length > 200 ? '...' : '')
      })),
      metadata: extraction.metadata
    })

  } catch (error) {
    console.error('Text extraction error:', error)

    return NextResponse.json(
      {
        error: 'Failed to extract text from document',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/documents/extract-text?document_id=...
 *
 * Get extraction status and cached text for a document
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const document_id = searchParams.get('document_id')

    if (!document_id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get document with extracted text
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, name, content_type, extracted_text, text_metadata')
      .eq('id', document_id)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if text has been extracted
    const hasExtractedText = !!document.extracted_text

    return NextResponse.json({
      document_id: document.id,
      document_name: document.name,
      content_type: document.content_type,
      has_extracted_text: hasExtractedText,
      text_length: document.extracted_text?.length || 0,
      metadata: document.text_metadata || null,
      extracted_at: document.text_metadata?.extracted_at || null
    })

  } catch (error) {
    console.error('Get extraction status error:', error)

    return NextResponse.json(
      {
        error: 'Failed to get extraction status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}