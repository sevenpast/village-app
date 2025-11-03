import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import archiver from 'archiver'
import { Readable } from 'stream'

/**
 * Bulk download documents as ZIP
 * POST /api/vault/bulk-download
 * Body: { documentIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { documentIds } = await request.json()

    console.log('📦 Bulk download requested for documents:', documentIds)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'No documents specified' },
        { status: 400 }
      )
    }

    // Get documents metadata
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('id, file_name, storage_path, mime_type')
      .in('id', documentIds)
      .eq('user_id', user.id)
      .is('deleted_at', null)

    if (dbError || !documents) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'No valid documents found' },
        { status: 404 }
      )
    }

    console.log(`📄 Found ${documents.length} documents to download`)

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })

    // Set up response headers for ZIP download
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="documents-${new Date().toISOString().split('T')[0]}.zip"`,
      'Cache-Control': 'no-cache',
    })

    // Create a readable stream from the archive
    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        archive.on('end', () => {
          console.log('✅ ZIP archive created successfully')
          controller.close()
        })

        archive.on('error', (err) => {
          console.error('❌ Archive error:', err)
          controller.error(err)
        })

        // Add files to archive
        processDocuments()
      }
    })

    async function processDocuments() {
      try {
        for (const doc of documents) {
          console.log(`📄 Processing document: ${doc.file_name}`)

          // Download file from Supabase Storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(doc.storage_path)

          if (downloadError) {
            console.warn(`⚠️ Failed to download ${doc.file_name}:`, downloadError)
            continue
          }

          // Convert blob to buffer
          const buffer = Buffer.from(await fileData.arrayBuffer())

          // Add file to ZIP with sanitized filename
          const sanitizedFileName = sanitizeFileName(doc.file_name)
          archive.append(buffer, { name: sanitizedFileName })

          console.log(`✅ Added ${sanitizedFileName} to ZIP`)
        }

        // Finalize the archive
        await archive.finalize()
      } catch (error) {
        console.error('❌ Error processing documents:', error)
        archive.destroy()
      }
    }

    return new Response(stream, { headers })

  } catch (error) {
    console.error('❌ Bulk download error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function sanitizeFileName(fileName: string): string {
  // Remove or replace invalid characters for ZIP files
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255) // Limit filename length
}