import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Public route - no authentication required
export async function GET(request: NextRequest) {
  try {
    const faviconPath = join(process.cwd(), 'public', 'favicon.ico')
    const fileBuffer = await readFile(faviconPath)
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving favicon:', error)
    return new NextResponse('Favicon not found', { status: 404 })
  }
}


