import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/housing/viewings - List all viewings for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: viewings, error } = await supabase
      .from('apartment_viewings')
      .select(`
        *,
        viewing_photos (
          id,
          file_name,
          storage_path,
          thumbnail_url,
          display_order
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching viewings:', error)
      return NextResponse.json({ error: 'Failed to fetch viewings' }, { status: 500 })
    }

    // Get document counts and generate public URLs for photos for each viewing
    const viewingsWithDocs = await Promise.all(
      (viewings || []).map(async (viewing) => {
        const { data: viewingDocs } = await supabase
          .from('viewing_documents')
          .select('document_id')
          .eq('viewing_id', viewing.id)

        // Generate signed URLs for photos (bucket is private)
        const photos = await Promise.all(
          (viewing.viewing_photos || []).map(async (photo: any) => {
            try {
              const { data: signedUrlData, error: urlError } = await supabase.storage
                .from('documents')
                .createSignedUrl(photo.storage_path, 3600) // 1 hour expiry
              
              if (urlError) {
                console.error(`Error creating signed URL for photo ${photo.id}:`, urlError)
              }
              
              const photoUrl = signedUrlData?.signedUrl || null
              
              if (!photoUrl) {
                console.warn(`No signed URL generated for photo ${photo.id}, storage_path: ${photo.storage_path}`)
              }
            
              return {
                ...photo,
                thumbnail_url: photoUrl || photo.thumbnail_url || photo.storage_path,
                storage_path: photo.storage_path,
              }
            } catch (error) {
              console.error(`Error processing photo ${photo.id}:`, error)
              return {
                ...photo,
                thumbnail_url: photo.thumbnail_url || photo.storage_path,
                storage_path: photo.storage_path,
              }
            }
          })
        )

        return {
          ...viewing,
          photos,
          document_count: viewingDocs?.length || 0,
        }
      })
    )

    return NextResponse.json({ viewings: viewingsWithDocs || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/housing/viewings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/housing/viewings - Create a new viewing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      address,
      viewing_date,
      rent_chf,
      room_count,
      contact_person,
      contact_email,
      contact_phone,
      rating_condition,
      rating_neighborhood,
      rating_commute,
      rating_amenities,
      rating_value,
      notes,
      is_favorite,
      document_ids, // New: array of document IDs to link to this viewing
    } = body

    if (!address || !viewing_date) {
      return NextResponse.json(
        { error: 'Address and viewing_date are required' },
        { status: 400 }
      )
    }

    const { data: viewing, error } = await supabase
      .from('apartment_viewings')
      .insert({
        user_id: user.id,
        address,
        viewing_date,
        rent_chf: rent_chf || null,
        room_count: room_count || null,
        contact_person: contact_person || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        rating_condition: rating_condition || null,
        rating_neighborhood: rating_neighborhood || null,
        rating_commute: rating_commute || null,
        rating_amenities: rating_amenities || null,
        rating_value: rating_value || null,
        notes: notes || null,
        is_favorite: is_favorite || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating viewing:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create viewing',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    // Handle document_ids if provided
    if (document_ids && Array.isArray(document_ids) && document_ids.length > 0) {
      // Verify all documents belong to the user
      const { data: userDocuments, error: docsError } = await supabase
        .from('documents')
        .select('id')
        .in('id', document_ids)
        .eq('user_id', user.id)
        .is('deleted_at', null)

      if (!docsError && userDocuments && userDocuments.length > 0) {
        // Insert viewing_documents
        const viewingDocInserts = userDocuments.map(doc => ({
          viewing_id: viewing.id,
          document_id: doc.id,
        }))

        const { error: insertError } = await supabase
          .from('viewing_documents')
          .insert(viewingDocInserts)

        if (insertError) {
          console.error('Error adding documents to viewing:', insertError)
          // Continue, viewing is still created
        }
      }
    }

    // Fetch viewing with documents
    const { data: viewingWithDocs } = await supabase
      .from('apartment_viewings')
      .select(`
        *,
        viewing_photos (
          id,
          file_name,
          storage_path,
          thumbnail_url,
          display_order
        )
      `)
      .eq('id', viewing.id)
      .single()

    // Get linked documents
    const { data: viewingDocs } = await supabase
      .from('viewing_documents')
      .select(`
        document_id,
        documents (
          id,
          file_name,
          mime_type,
          file_size,
          document_type,
          tags,
          created_at,
          storage_path
        )
      `)
      .eq('viewing_id', viewing.id)

    const documents = (viewingDocs || [])
      .map((vd: any) => vd.documents)
      .filter((doc: any) => doc !== null && doc.deleted_at === null)
      .map((doc: any) => {
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(doc.storage_path)

        return {
          id: doc.id,
          file_name: doc.file_name,
          mime_type: doc.mime_type,
          file_size: doc.file_size,
          document_type: doc.document_type,
          tags: doc.tags,
          created_at: doc.created_at,
          download_url: publicUrl,
        }
      })

    return NextResponse.json({ 
      viewing: {
        ...(viewingWithDocs || viewing),
        documents,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/housing/viewings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

