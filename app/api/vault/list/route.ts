import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * List user's documents
 * GET /api/vault/list?type=passport&status=completed
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 GET /api/vault/list called')
    const supabase = await createClient()
    
    // Check authentication
    console.log('🔐 Checking authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          details: authError.message 
        },
        { status: 401 }
      )
    }
    
    if (!user) {
      console.error('❌ No user found')
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          details: 'User not authenticated' 
        },
        { status: 401 }
      )
    }

    console.log('✅ User authenticated:', user.id)

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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    if (status) {
      query = query.eq('processing_status', status)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('❌ Error listing documents:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
      })
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch documents', 
          details: error.message,
          code: error.code,
          hint: error.hint || 'Check if the documents table exists and RLS policies are configured',
        },
        { status: 500 }
      )
    }

    // Handle case where documents is null
    if (documents === null) {
      console.warn('⚠️ Documents query returned null')
      return NextResponse.json({
        success: true,
        documents: [],
        count: 0,
      })
    }

    console.log(`📄 Found ${documents.length} documents`)

    // Get download URLs and version counts for each document
    try {
      const documentsWithUrls = await Promise.all(
        (documents || []).map(async (doc) => {
          try {
            const { data: { publicUrl } } = supabase.storage
              .from('documents')
              .getPublicUrl(doc.storage_path)

            // Get version count for this document
            // Check both direct versions and versions where this document is referenced
            let versionCount = 0
            try {
              const { count, error: versionError } = await supabase
                .from('document_versions')
                .select('*', { count: 'exact', head: true })
                .or(`document_id.eq.${doc.id},metadata->>new_document_id.eq.${doc.id},metadata->>parent_document_id.eq.${doc.id}`)
              
              if (!versionError && typeof count === 'number') {
                versionCount = count
              }
            } catch (versionCountError) {
              console.warn(`⚠️ Failed to get version count for document ${doc.id}:`, versionCountError)
              versionCount = 0
            }

            return {
              ...doc,
              download_url: publicUrl,
              version_count: versionCount,
            }
          } catch (urlError) {
            console.warn(`⚠️ Failed to generate URL for document ${doc.id}:`, urlError)
            return {
              ...doc,
              download_url: null,
              version_count: 0,
            }
          }
        })
      )

      console.log('✅ Returning documents with URLs')
      return NextResponse.json({
        success: true,
        documents: documentsWithUrls,
        count: documentsWithUrls.length,
      })
    } catch (urlError) {
      console.error('❌ Error generating download URLs:', urlError)
      // Return documents without URLs if URL generation fails
      return NextResponse.json({
        success: true,
        documents: documents.map(doc => ({ ...doc, download_url: null })),
        count: documents.length,
        warning: 'Could not generate download URLs',
      })
    }
  } catch (error) {
    console.error('❌ List documents error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name,
    })
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage,
        // Only include stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    )
  }
}

