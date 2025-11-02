import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/places/autocomplete?q=...
 * 
 * Autocomplete endpoint for Swiss postal codes and places
 * Uses Supabase RPC function with fuzzy search (trigram)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const supabase = await createClient()

    // Call RPC function
    const { data, error } = await supabase.rpc('autocomplete_places', {
      q: query,
      limit_count: Math.min(limit, 20) // Max 20 results
    })

    if (error) {
      console.error('Error calling autocomplete_places:', error)
      return NextResponse.json(
        { error: 'Failed to search places', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error in autocomplete endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

