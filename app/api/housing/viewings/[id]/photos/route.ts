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

    console.log(`📸 Received ${photos.length} photo(s) for viewing ${id}`)

    if (photos.length === 0) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 })
    }

    // Check if viewing_photos bucket exists, if not we'll use a default one
    // For now, we'll store photos in the 'documents' bucket with a specific path
    const uploadedPhotos = []
    const errors: string[] = []

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      
      console.log(`📤 Processing photo ${i + 1}/${photos.length}: ${photo.name} (${photo.size} bytes, ${photo.type})`)
      
      if (!photo.type.startsWith('image/')) {
        errors.push(`Skipped non-image file: ${photo.name}`)
        console.warn(`⚠️ Skipping non-image file: ${photo.name}`)
        continue
      }

      try {
        // Convert file to buffer
        const arrayBuffer = await photo.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Generate storage path
        // Note: Storage policies require path to start with user_id
        // Format: {user_id}/viewing_photos/{viewing_id}/{filename}
        const fileExt = photo.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}_${i}.${fileExt}`
        const storagePath = `${user.id}/viewing_photos/${viewing.id}/${fileName}`

        console.log(`📁 Uploading to storage path: ${storagePath}`)

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, buffer, {
            contentType: photo.type,
            upsert: true,
          })

        if (uploadError) {
          // Check if bucket exists
          const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
          let bucketInfo = 'Unknown'
          if (!bucketError && buckets) {
            const documentsBucket = buckets.find(b => b.name === 'documents')
            bucketInfo = documentsBucket ? `Bucket exists (public: ${documentsBucket.public})` : 'Bucket does not exist'
          }
          
          const errorMsg = `Error uploading photo ${photo.name}: ${uploadError.message || JSON.stringify(uploadError)}. Bucket status: ${bucketInfo}. Path: ${storagePath}`
          console.error(`❌ ${errorMsg}`, {
            uploadError,
            storagePath,
            userId: user.id,
            bucketInfo
          })
          errors.push(errorMsg)
          continue
        }

        console.log(`✅ Photo uploaded to storage: ${uploadData?.path}`)

        // Get signed URL (bucket is private)
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 3600) // 1 hour expiry

        // Create thumbnail (simple - just use the same image for now, or generate one)
        // For now, we'll use the same URL as thumbnail
        const thumbnailUrl = signedUrlData?.signedUrl || ''

        console.log(`💾 Saving photo metadata to database...`)

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
          const errorMsg = `Error saving photo metadata for ${photo.name}: ${dbError.message || dbError}`
          console.error(`❌ ${errorMsg}`, dbError)
          errors.push(errorMsg)
          // Try to delete the uploaded file
          console.log(`🗑️ Attempting to clean up uploaded file: ${storagePath}`)
          await supabase.storage.from('documents').remove([storagePath])
          continue
        }

        console.log(`✅ Photo metadata saved: ${photoRecord.id}`)

        uploadedPhotos.push({
          id: photoRecord.id,
          file_name: photoRecord.file_name,
          storage_path: photoRecord.storage_path,
          thumbnail_url: photoRecord.thumbnail_url,
          display_order: photoRecord.display_order,
        })
      } catch (photoError) {
        const errorMsg = `Unexpected error processing photo ${photo.name}: ${photoError instanceof Error ? photoError.message : 'Unknown error'}`
        console.error(`❌ ${errorMsg}`, photoError)
        errors.push(errorMsg)
      }
    }

    // Return partial success if some photos were uploaded
    if (uploadedPhotos.length > 0) {
      return NextResponse.json({
        success: true,
        photos: uploadedPhotos,
        message: `Successfully uploaded ${uploadedPhotos.length} of ${photos.length} photo(s)`,
        errors: errors.length > 0 ? errors : undefined,
      })
    }

    // If no photos were uploaded, return error
    return NextResponse.json(
      { 
        error: 'Failed to upload any photos',
        details: errors.length > 0 ? errors.join('; ') : 'Unknown error',
        errors
      },
      { status: 500 }
    )
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

