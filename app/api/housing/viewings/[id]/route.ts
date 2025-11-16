import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/housing/viewings/[id] - Get a single viewing with photos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: viewing, error } = await supabase
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
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !viewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })
    }

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

    // Get linked documents from vault
    const { data: viewingDocs, error: docsError } = await supabase
      .from('viewing_documents')
      .select(`
        document_id,
        documents!inner (
          id,
          file_name,
          mime_type,
          file_size,
          document_type,
          tags,
          created_at,
          storage_path,
          deleted_at
        )
      `)
      .eq('viewing_id', id)
      .is('documents.deleted_at', null)

    if (docsError) {
      console.error('Error fetching viewing documents:', docsError)
    } else {
      console.log(`📄 Found ${viewingDocs?.length || 0} viewing_documents for viewing ${id}`)
      console.log('Viewing docs raw:', viewingDocs)
    }

    // Format documents with signed download URLs (bucket is private)
    const documents = await Promise.all(
      (viewingDocs || [])
        .map((vd: any) => {
          console.log('Processing viewing_document:', vd)
          return vd.documents
        })
        .filter((doc: any) => {
          const isValid = doc !== null
          if (!isValid) {
            console.warn('Filtered out document (is null):', doc)
          }
          return isValid
        })
        .map(async (doc: any) => {
          console.log('Processing document for signed URL:', doc.id, doc.file_name)
          try {
            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('documents')
              .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry
            
            const downloadUrl = signedUrlData?.signedUrl || null
            
            if (urlError) {
              console.error(`Error creating signed URL for document ${doc.id}:`, urlError)
            }

            return {
              id: doc.id,
              file_name: doc.file_name,
              mime_type: doc.mime_type,
              file_size: doc.file_size,
              document_type: doc.document_type,
              tags: doc.tags,
              created_at: doc.created_at,
              download_url: downloadUrl,
            }
          } catch (error) {
            console.error(`Error processing document ${doc.id}:`, error)
            return {
              id: doc.id,
              file_name: doc.file_name,
              mime_type: doc.mime_type,
              file_size: doc.file_size,
              document_type: doc.document_type,
              tags: doc.tags,
              created_at: doc.created_at,
              download_url: null,
            }
          }
        })
    )

    console.log(`✅ Returning viewing with ${photos.length} photos and ${documents.length} documents`)
    
    return NextResponse.json({ 
      viewing: {
        ...viewing,
        photos,
        documents,
      }
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/housing/viewings/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/housing/viewings/[id] - Update a viewing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: existingViewing, error: checkError } = await supabase
      .from('apartment_viewings')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingViewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })
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

    // Build update object (only include fields that are provided)
    const updateData: any = {}
    if (address !== undefined) updateData.address = address
    if (viewing_date !== undefined) updateData.viewing_date = viewing_date
    if (rent_chf !== undefined) updateData.rent_chf = rent_chf || null
    if (room_count !== undefined) updateData.room_count = room_count || null
    if (contact_person !== undefined) updateData.contact_person = contact_person || null
    if (contact_email !== undefined) updateData.contact_email = contact_email || null
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone || null
    if (rating_condition !== undefined) updateData.rating_condition = rating_condition || null
    if (rating_neighborhood !== undefined) updateData.rating_neighborhood = rating_neighborhood || null
    if (rating_commute !== undefined) updateData.rating_commute = rating_commute || null
    if (rating_amenities !== undefined) updateData.rating_amenities = rating_amenities || null
    if (rating_value !== undefined) updateData.rating_value = rating_value || null
    if (notes !== undefined) updateData.notes = notes || null
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite

    // Only update if there are fields to update (not just document_ids)
    let viewing = existingViewing
    if (Object.keys(updateData).length > 0) {
      const { data: updatedViewing, error } = await supabase
        .from('apartment_viewings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating viewing:', error)
        return NextResponse.json(
          { 
            error: 'Failed to update viewing',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        )
      }
      
      viewing = updatedViewing
    }

    // Handle document_ids if provided (sync viewing_documents)
    if (document_ids !== undefined && Array.isArray(document_ids)) {
      console.log(`📎 Processing document_ids: ${document_ids.length} document(s)`)
      
      // Verify all documents belong to the user
      if (document_ids.length > 0) {
        const { data: userDocuments, error: docsError } = await supabase
          .from('documents')
          .select('id')
          .in('id', document_ids)
          .eq('user_id', user.id)
          .is('deleted_at', null)

        if (docsError) {
          console.error('❌ Error verifying documents:', docsError)
          return NextResponse.json(
            { 
              error: 'Failed to verify documents',
              details: docsError.message,
              code: docsError.code
            },
            { status: 500 }
          )
        }

        if (!userDocuments || userDocuments.length === 0) {
          console.warn('⚠️ No valid documents found for user')
          return NextResponse.json(
            { 
              error: 'No valid documents found',
              details: 'The selected documents do not exist or do not belong to you'
            },
            { status: 400 }
          )
        }

        if (userDocuments.length !== document_ids.length) {
          console.warn(`⚠️ Only ${userDocuments.length} of ${document_ids.length} documents are valid`)
        }

        // Delete existing viewing_documents for this viewing
        const { error: deleteError } = await supabase
          .from('viewing_documents')
          .delete()
          .eq('viewing_id', id)

        if (deleteError) {
          console.error('❌ Error deleting existing viewing documents:', deleteError)
          return NextResponse.json(
            { 
              error: 'Failed to update document attachments',
              details: deleteError.message,
              code: deleteError.code
            },
            { status: 500 }
          )
        }

        // Insert new viewing_documents
        const viewingDocInserts = userDocuments.map(doc => ({
          viewing_id: id,
          document_id: doc.id,
        }))

        console.log(`💾 Inserting ${viewingDocInserts.length} document attachment(s)`)

        const { error: insertError } = await supabase
          .from('viewing_documents')
          .insert(viewingDocInserts)

        if (insertError) {
          console.error('❌ Error adding documents to viewing:', insertError)
          return NextResponse.json(
            { 
              error: 'Failed to attach documents',
              details: insertError.message,
              code: insertError.code
            },
            { status: 500 }
          )
        }

        console.log(`✅ Successfully attached ${viewingDocInserts.length} document(s)`)
      } else {
        // Empty array: remove all documents
        console.log('🗑️ Removing all document attachments')
        const { error: deleteError } = await supabase
          .from('viewing_documents')
          .delete()
          .eq('viewing_id', id)

        if (deleteError) {
          console.error('❌ Error removing documents from viewing:', deleteError)
          return NextResponse.json(
            { 
              error: 'Failed to remove documents',
              details: deleteError.message,
              code: deleteError.code
            },
            { status: 500 }
          )
        }
      }
    }

    // Fetch updated viewing with documents
    const { data: updatedViewing, error: fetchError } = await supabase
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
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching updated viewing:', fetchError)
      return NextResponse.json({ 
        viewing: {
          ...viewing,
          documents: [],
          photos: [],
        }
      })
    }

    // Generate signed URLs for photos (bucket is private)
    const photos = await Promise.all(
      ((updatedViewing?.viewing_photos || []) as any[]).map(async (photo: any) => {
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(photo.storage_path, 3600) // 1 hour expiry
        
        const photoUrl = signedUrlData?.signedUrl || photo.thumbnail_url || photo.storage_path
      
        return {
          ...photo,
          thumbnail_url: photoUrl,
          storage_path: photo.storage_path,
        }
      })
    )

    // Get linked documents
    const { data: viewingDocs, error: viewingDocsError } = await supabase
      .from('viewing_documents')
      .select(`
        document_id,
        documents!inner (
          id,
          file_name,
          mime_type,
          file_size,
          document_type,
          tags,
          created_at,
          storage_path,
          deleted_at
        )
      `)
      .eq('viewing_id', id)
      .is('documents.deleted_at', null)

    if (viewingDocsError) {
      console.error('Error fetching viewing documents in PUT:', viewingDocsError)
    } else {
      console.log(`📄 PUT: Found ${viewingDocs?.length || 0} viewing_documents for viewing ${id}`)
      console.log('PUT: Viewing docs raw:', JSON.stringify(viewingDocs, null, 2))
    }

    // Format documents with signed download URLs (bucket is private)
    const documents = await Promise.all(
      (viewingDocs || [])
        .map((vd: any) => {
          console.log('PUT: Processing viewing_document:', vd)
          return vd.documents
        })
        .filter((doc: any) => {
          const isValid = doc !== null
          if (!isValid) {
            console.warn('PUT: Filtered out document (is null):', doc)
          }
          return isValid
        })
        .map(async (doc: any) => {
          console.log('PUT: Processing document for signed URL:', doc.id, doc.file_name)
          try {
            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('documents')
              .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry
            
            const downloadUrl = signedUrlData?.signedUrl || null
            
            if (urlError) {
              console.error(`Error creating signed URL for document ${doc.id}:`, urlError)
            }

            return {
              id: doc.id,
              file_name: doc.file_name,
              mime_type: doc.mime_type,
              file_size: doc.file_size,
              document_type: doc.document_type,
              tags: doc.tags,
              created_at: doc.created_at,
              download_url: downloadUrl,
            }
          } catch (error) {
            console.error(`Error processing document ${doc.id}:`, error)
            return {
              id: doc.id,
              file_name: doc.file_name,
              mime_type: doc.mime_type,
              file_size: doc.file_size,
              document_type: doc.document_type,
              tags: doc.tags,
              created_at: doc.created_at,
              download_url: null,
            }
          }
        })
    )

    console.log(`✅ PUT: Returning viewing with ${photos.length} photos and ${documents.length} documents`)
    console.log('PUT: Documents array:', JSON.stringify(documents, null, 2))
    
    return NextResponse.json({ 
      viewing: {
        ...updatedViewing,
        photos,
        documents,
      }
    })
  } catch (error) {
    console.error('Unexpected error in PUT /api/housing/viewings/[id]:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error stack:', errorStack)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/housing/viewings/[id] - Delete a viewing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: existingViewing, error: checkError } = await supabase
      .from('apartment_viewings')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingViewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })
    }

    // Delete viewing (photos will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('apartment_viewings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting viewing:', error)
      return NextResponse.json({ error: 'Failed to delete viewing' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Viewing deleted successfully' })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/housing/viewings/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

