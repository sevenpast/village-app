import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/documents/reprocess-all
 *
 * Forces reprocessing of all documents to extract text with fixed OCR
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

    // Get all user documents
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, mime_type, processing_status')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('mime_type', 'application/pdf')

    if (docError) {
      console.error('❌ Error fetching documents:', docError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
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
        { error: 'Failed to clear existing extracted text' },
        { status: 500 }
      )
    }

    // Process each document
    const results = []
    for (const doc of documents) {
      console.log(`🔍 Reprocessing document: ${doc.file_name} (${doc.id})`)

      try {
        // Call the extract-text API for each document
        const extractResponse = await fetch(`${request.nextUrl.origin}/api/documents/${doc.id}/extract-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          }
        })

        const extractResult = await extractResponse.json()

        results.push({
          id: doc.id,
          file_name: doc.file_name,
          success: extractResponse.ok,
          text_length: extractResult.text_length || 0,
          error: extractResponse.ok ? null : extractResult.error
        })

        console.log(`${extractResponse.ok ? '✅' : '❌'} ${doc.file_name}: ${extractResponse.ok ? `${extractResult.text_length || 0} chars extracted` : extractResult.error}`)

      } catch (error) {
        console.error(`❌ Error processing ${doc.file_name}:`, error)
        results.push({
          id: doc.id,
          file_name: doc.file_name,
          success: false,
          text_length: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`🏁 Reprocessing complete: ${successCount} success, ${failCount} failed`)

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
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}