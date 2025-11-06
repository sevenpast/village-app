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

    // Check if RPC function exists and table has data
    // First, check if postal_codes table exists and has data
    const { data: tableCheck, error: tableError } = await supabase
      .from('postal_codes')
      .select('id')
      .limit(1)

    if (tableError) {
      console.error('Error checking postal_codes table:', tableError)
      // If table doesn't exist or has issues, return empty array instead of error
      // This allows the form to still work without autocomplete
      return NextResponse.json([])
    }

    // If table is empty, return empty array
    if (!tableCheck || tableCheck.length === 0) {
      console.warn('postal_codes table is empty - autocomplete will not work')
      return NextResponse.json([])
    }

    // Call RPC function
    const { data, error } = await supabase.rpc('autocomplete_places', {
      q: query,
      limit_count: Math.min(limit, 20) // Max 20 results
    })

    if (error) {
      console.error('Error calling autocomplete_places:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        query,
      })
      
      // If function doesn't exist or has issues, return empty array instead of error
      // This allows the form to still work without autocomplete
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('autocomplete_places function does not exist - returning empty array')
        return NextResponse.json([])
      }
      
      // For other errors, still return empty array to prevent form breaking
      return NextResponse.json([])
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Error in autocomplete endpoint:', {
      error,
      message: error?.message,
      stack: error?.stack,
    })
    // Return empty array instead of error to prevent form breaking
    return NextResponse.json([])
  }
}

