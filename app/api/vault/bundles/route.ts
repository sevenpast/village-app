import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/vault/bundles
 * Create a new document bundle
 * Body: { bundle_name: string, description?: string, document_ids?: string[] }
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

    const body = await request.json()
    const { bundle_name, description, document_ids } = body

    if (!bundle_name || typeof bundle_name !== 'string' || bundle_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'bundle_name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Create bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('document_bundles')
      .insert({
        user_id: user.id,
        bundle_name: bundle_name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (bundleError || !bundle) {
      console.error('❌ Error creating bundle:', bundleError)
      return NextResponse.json(
        { error: 'Failed to create bundle', details: bundleError?.message },
        { status: 500 }
      )
    }

    // If document_ids provided, add them to the bundle
    let documents: any[] = []
    if (document_ids && Array.isArray(document_ids) && document_ids.length > 0) {
      // Verify all documents belong to the user
      const { data: userDocuments, error: docsError } = await supabase
        .from('documents')
        .select('id')
        .in('id', document_ids)
        .eq('user_id', user.id)
        .is('deleted_at', null)

      if (docsError) {
        console.error('❌ Error verifying documents:', docsError)
        // Continue without documents, bundle is still created
      } else if (userDocuments && userDocuments.length > 0) {
        // Insert bundle_documents
        const bundleDocInserts = userDocuments.map(doc => ({
          bundle_id: bundle.id,
          document_id: doc.id,
        }))

        const { error: insertError } = await supabase
          .from('bundle_documents')
          .insert(bundleDocInserts)

        if (insertError) {
          console.error('❌ Error adding documents to bundle:', insertError)
          // Continue, bundle is still created
        } else {
          // Fetch full document details
          const { data: fullDocuments } = await supabase
            .from('documents')
            .select('id, file_name, mime_type, file_size, document_type, tags, created_at')
            .in('id', userDocuments.map(d => d.id))
            .is('deleted_at', null)

          documents = fullDocuments || []
        }
      }
    }

    console.log(`✅ Bundle created: ${bundle.id} with ${documents.length} documents`)

    return NextResponse.json({
      success: true,
      bundle: {
        id: bundle.id,
        bundle_name: bundle.bundle_name,
        description: bundle.description,
        created_at: bundle.created_at,
        updated_at: bundle.updated_at,
        document_count: documents.length,
      },
      documents,
    })
  } catch (error) {
    console.error('❌ Create bundle error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vault/bundles
 * List all bundles for the authenticated user
 * Query: ?include_documents=true (optional)
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

    const { searchParams } = new URL(request.url)
    const includeDocuments = searchParams.get('include_documents') === 'true'

    // Get bundles
    const { data: bundles, error: bundlesError } = await supabase
      .from('document_bundles')
      .select(`
        id,
        bundle_name,
        description,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (bundlesError) {
      console.error('❌ Error fetching bundles:', bundlesError)
      // Check if table doesn't exist (migration not run yet)
      if (bundlesError.message?.includes('relation') || bundlesError.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          bundles: [],
          count: 0,
          message: 'Bundles feature not yet initialized. Please run migration 046_create_document_bundles.sql',
        })
      }
      return NextResponse.json(
        { error: 'Failed to fetch bundles', details: bundlesError.message },
        { status: 500 }
      )
    }

    // Get document count for each bundle
    const formattedBundles = await Promise.all(
      (bundles || []).map(async (bundle) => {
        const { data: bundleDocs, error: countError } = await supabase
          .from('bundle_documents')
          .select('document_id')
          .eq('bundle_id', bundle.id)

        const document_count = countError ? 0 : (bundleDocs?.length || 0)

        return {
          id: bundle.id,
          bundle_name: bundle.bundle_name,
          description: bundle.description,
          created_at: bundle.created_at,
          updated_at: bundle.updated_at,
          document_count,
        }
      })
    )

    // If include_documents, fetch document details for each bundle
    if (includeDocuments) {
      const bundlesWithDocs = await Promise.all(
        formattedBundles.map(async (bundle) => {
          const { data: bundleDocs } = await supabase
            .from('bundle_documents')
            .select(`
              document_id,
              documents (
                id,
                file_name,
                mime_type,
                file_size,
                document_type,
                tags,
                created_at
              )
            `)
            .eq('bundle_id', bundle.id)

          const documents = (bundleDocs || [])
            .map((bd: any) => bd.documents)
            .filter((doc: any) => doc !== null)

          return {
            ...bundle,
            documents,
          }
        })
      )

      return NextResponse.json({
        success: true,
        bundles: bundlesWithDocs,
        count: bundlesWithDocs.length,
      })
    }

    return NextResponse.json({
      success: true,
      bundles: formattedBundles,
      count: formattedBundles.length,
    })
  } catch (error) {
    console.error('❌ List bundles error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

