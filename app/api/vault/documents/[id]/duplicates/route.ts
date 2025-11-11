import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectSimilarDocuments } from '@/lib/vault/duplicate-detector'

/**
 * GET /api/vault/documents/[id]/duplicates
 * Find similar documents that could be versions of this document
 * Query: ?threshold=0.75 (optional, default 0.75)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params
    const { searchParams } = new URL(request.url)
    const threshold = parseFloat(searchParams.get('threshold') || '0.75')

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, document_type, extracted_text')
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

    // Detect similar documents
    const similarDocs = await detectSimilarDocuments(
      supabase,
      user.id,
      document.file_name,
      document.extracted_text,
      document.document_type,
      threshold
    )

    // Filter out the document itself
    const filteredSimilar = similarDocs.filter(doc => doc.id !== documentId)

    return NextResponse.json({
      success: true,
      similar_documents: filteredSimilar,
      count: filteredSimilar.length,
      threshold,
    })
  } catch (error) {
    console.error('❌ Find duplicates error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

