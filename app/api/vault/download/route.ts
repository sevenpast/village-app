import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/vault/download?url=...
 * Proxy endpoint to download documents from Supabase Storage
 * This avoids CORS and authentication issues when fetching from the client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storageUrl = searchParams.get('url')

    if (!storageUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
    }

    // Extract storage path from Supabase public URL
    // Format: https://project.supabase.co/storage/v1/object/public/bucket/path
    const urlObj = new URL(storageUrl)
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/(.+)$/)
    
    if (!pathMatch) {
      return NextResponse.json({ error: 'Invalid storage URL format' }, { status: 400 })
    }

    const bucketAndPath = pathMatch[1]
    const [bucket, ...pathParts] = bucketAndPath.split('/')
    const storagePath = pathParts.join('/')

    // Download file from Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(storagePath)

    if (error) {
      console.error('Error downloading file from storage:', error)
      return NextResponse.json(
        { error: 'Failed to download file', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine content type from file extension
    const extension = storagePath.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    if (extension === 'pdf') contentType = 'application/pdf'
    else if (['jpg', 'jpeg'].includes(extension || '')) contentType = 'image/jpeg'
    else if (extension === 'png') contentType = 'image/png'
    else if (extension === 'heic') contentType = 'image/heic'

    // Return file with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${storagePath.split('/').pop()}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Unexpected error in download endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

