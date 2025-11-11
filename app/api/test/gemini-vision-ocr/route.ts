import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentProcessor } from '@/lib/vault/document-processor'

/**
 * POST /api/test/gemini-vision-ocr
 * Test endpoint to directly test Gemini Vision OCR on a document
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check GEMINI_API_KEY
    const hasKey = !!process.env.GEMINI_API_KEY
    const keyLength = process.env.GEMINI_API_KEY?.length || 0
    console.log(`🔍 GEMINI_API_KEY check: exists=${hasKey}, length=${keyLength}`)

    if (!hasKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY not configured',
        hasKey: false
      }, { status: 500 })
    }

    // Download file
    console.log(`📥 Downloading file: ${document.storage_path}`)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({
        error: 'Failed to download file',
        details: downloadError?.message
      }, { status: 500 })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`📄 File downloaded: ${buffer.length} bytes, mimeType: ${document.mime_type}`)

    // Test Gemini Vision OCR directly
    const processor = new DocumentProcessor()
    
    // Access private method via type assertion (for testing)
    const geminiOcrText = await (processor as any).performGeminiVisionOCR(buffer, document.mime_type)

    return NextResponse.json({
      success: true,
      hasGeminiKey: hasKey,
      geminiKeyLength: keyLength,
      fileSize: buffer.length,
      mimeType: document.mime_type,
      ocrText: geminiOcrText || '',
      ocrTextLength: geminiOcrText?.length || 0,
      preview: geminiOcrText?.substring(0, 500) || 'No text extracted'
    })

  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

