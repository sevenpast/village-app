import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/housing/viewings/[id]/photos - Upload photos for a viewing
export async function POST(
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

    // Verify that the viewing belongs to the user
    const { data: viewing, error: viewingError } = await supabase
      .from('apartment_viewings')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (viewingError || !viewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const photos = formData.getAll('photos') as File[]

    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 })
    }

    // Check if viewing_photos bucket exists, if not we'll use a default one
    // For now, we'll store photos in the 'documents' bucket with a specific path
    const uploadedPhotos = []

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      
      if (!photo.type.startsWith('image/')) {
        console.warn(`Skipping non-image file: ${photo.name}`)
        continue
      }

      // Convert file to buffer
      const arrayBuffer = await photo.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Generate storage path
      const fileExt = photo.name.split('.').pop() || 'jpg'
      const fileName = `${viewing.id}/${Date.now()}_${i}.${fileExt}`
      const storagePath = `viewing_photos/${fileName}`

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: photo.type,
          upsert: true,
        })

      if (uploadError) {
        console.error(`Error uploading photo ${photo.name}:`, uploadError)
        continue
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath)

      // Create thumbnail (simple - just use the same image for now, or generate one)
      // For now, we'll use the same URL as thumbnail
      const thumbnailUrl = publicUrl

      // Save photo metadata to database
      const { data: photoRecord, error: dbError } = await supabase
        .from('viewing_photos')
        .insert({
          viewing_id: viewing.id,
          file_name: photo.name,
          file_size: photo.size,
          mime_type: photo.type,
          storage_path: storagePath,
          display_order: i,
          thumbnail_url: thumbnailUrl,
        })
        .select()
        .single()

      if (dbError) {
        console.error(`Error saving photo metadata for ${photo.name}:`, dbError)
        // Try to delete the uploaded file
        await supabase.storage.from('documents').remove([storagePath])
        continue
      }

      uploadedPhotos.push({
        id: photoRecord.id,
        file_name: photoRecord.file_name,
        storage_path: photoRecord.storage_path,
        thumbnail_url: photoRecord.thumbnail_url,
        display_order: photoRecord.display_order,
      })
    }

    if (uploadedPhotos.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any photos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      photos: uploadedPhotos,
      message: `Successfully uploaded ${uploadedPhotos.length} photo(s)`,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/housing/viewings/[id]/photos:', error)
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

