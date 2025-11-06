import { NextRequest, NextResponse } from 'next/server'
import { resolveMunicipality } from '@/lib/municipality-resolver'
import { scrapeMunicipalityLive } from '@/lib/municipality-scraper'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/municipality/info
 * 
 * Query parameters:
 * - query: Municipality name, Ortsteil, or PLZ
 * - canton: Optional canton code (AG, ZH, etc.)
 * - forceRefresh: Set to 'true' to bypass cache
 * 
 * Returns municipality information including:
 * - Opening hours
 * - Contact information
 * - Required documents
 * - Registration fees
 * - Special notices
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')
  const canton = searchParams.get('canton')
  const forceRefresh = searchParams.get('forceRefresh') === 'true'

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // Step 1: Resolve municipality (Kleindöttingen → Böttstein)
    let resolved
    try {
      resolved = await resolveMunicipality(query, canton || undefined)
    } catch (resolveError) {
      console.error('Municipality resolution failed:', resolveError)
      // Return a graceful error response instead of 500
      return NextResponse.json(
        {
          error: `Municipality "${query}" not found in database`,
          details: resolveError instanceof Error ? resolveError.message : String(resolveError),
          suggestion: 'Please check the spelling or try using the postal code (PLZ) instead',
        },
        { status: 404 }
      )
    }

    // Step 2: Check cache (4 hour TTL)
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('municipality_cache')
        .select('*')
        .eq('bfs_nummer', resolved.bfs_nummer)
        .gt('cached_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()) // 4 hours ago
        .maybeSingle()

      if (cachedData) {
        return NextResponse.json({
          ...(cachedData.data as any),
          gemeinde_name: resolved.gemeinde_name,
          ortsteil: resolved.ortsteil,
          bfs_nummer: resolved.bfs_nummer,
          website_url: resolved.website_url,
          kanton: resolved.kanton,
          cached: true,
          cached_at: cachedData.cached_at,
        })
      }
    }

    // Step 3: Live scraping
    const liveData = await scrapeMunicipalityLive(
      resolved.gemeinde_name,
      resolved.website_url,
      resolved.registration_pages
    )

    // Step 4: Cache for 4 hours (upsert)
    const dataToCache = {
      ...liveData,
    }

    await supabase
      .from('municipality_cache')
      .upsert(
        {
          bfs_nummer: resolved.bfs_nummer,
          data: dataToCache,
          cached_at: new Date().toISOString(),
        },
        {
          onConflict: 'bfs_nummer',
        }
      )

    // Step 5: Return response
    return NextResponse.json({
      ...liveData,
      gemeinde_name: resolved.gemeinde_name,
      ortsteil: resolved.ortsteil,
      bfs_nummer: resolved.bfs_nummer,
      website_url: resolved.website_url,
      kanton: resolved.kanton,
      cached: false,
      cached_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Municipality API error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch municipality data',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}

