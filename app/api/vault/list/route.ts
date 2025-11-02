import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * List user's documents
 * GET /api/vault/list?type=passport&status=completed
 */
export async function GET(request: NextRequest) {
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

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const documentType = searchParams.get('type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    if (status) {
      query = query.eq('processing_status', status)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('❌ Error listing documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: error.message },
        { status: 500 }
      )
    }

    // Get download URLs for each document
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc) => {
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(doc.storage_path)

        return {
          ...doc,
          download_url: publicUrl,
        }
      })
    )

    return NextResponse.json({
      success: true,
      documents: documentsWithUrls,
      count: documentsWithUrls.length,
    })
  } catch (error) {
    console.error('❌ List documents error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

