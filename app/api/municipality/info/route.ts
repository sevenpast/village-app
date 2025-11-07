import { NextRequest, NextResponse } from 'next/server'
import { resolveMunicipality } from '@/lib/municipality-resolver'
import { scrapeMunicipalityLive } from '@/lib/municipality-scraper'
import { createClient } from '@/lib/supabase/server'
import { getMunicipalityUrl } from '@/lib/municipality-urls'

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
      if (resolved) {
        console.log(`✅ Resolved "${query}" to: ${resolved.gemeinde_name} (BFS: ${resolved.bfs_nummer})`)
        console.log(`   Website URL: ${resolved.website_url}`)
        console.log(`   Stored pages: ${resolved.registration_pages?.length || 0}`)
      }
    } catch (resolveError) {
      console.error('Municipality resolution failed:', resolveError)
      resolved = null // Set to null if error
    }

    // Handle case where resolver returns null (table doesn't exist or no match found)
    if (!resolved) {
      console.log(`⚠ Municipality "${query}" not in database, attempting fallback scraping`)
      const fallbackWebsiteUrl = getMunicipalityUrl(query, false)
      console.log(`   Fallback URL: ${fallbackWebsiteUrl}`)

      // Try to scrape with fallback URL
      const fallbackData = await scrapeMunicipalityLive(
        query,
        fallbackWebsiteUrl,
        []
      )

      // Return fallback data (without DB metadata)
      return NextResponse.json({
        ...fallbackData,
        gemeinde_name: query,
        ortsteil: query,
        bfs_nummer: null,
        website_url: fallbackWebsiteUrl,
        kanton: canton || null,
        cached: false,
        cached_at: new Date().toISOString(),
        fallback: true, // Indicate this is a fallback response
      })
    }

    // Step 2: Check cache (24 hour TTL for successful extractions, 1 hour for null results)
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('municipality_cache')
        .select('*')
        .eq('bfs_nummer', resolved.bfs_nummer)
        .maybeSingle()

      if (cachedData) {
        const cacheAge = Date.now() - new Date(cachedData.cached_at).getTime()
        const cachedOpeningHours = (cachedData.data as any)?.opening_hours
        
        // If we have valid opening hours, cache for 24 hours
        // If opening hours are null, only cache for 1 hour (to allow retry)
        const maxCacheAge = cachedOpeningHours && Object.keys(cachedOpeningHours).length > 0
          ? 24 * 60 * 60 * 1000 // 24 hours for successful extractions
          : 1 * 60 * 60 * 1000  // 1 hour for null results (allow retry)
        
        if (cacheAge < maxCacheAge) {
          console.log(`📦 Using cached data for ${resolved.gemeinde_name} (age: ${Math.round(cacheAge / 1000 / 60)}min, has opening hours: ${!!cachedOpeningHours})`)
          return NextResponse.json({
            ...(cachedData.data as any),
            gemeinde_name: resolved.gemeinde_name,
            ortsteil: resolved.ortsteil,
            bfs_nummer: resolved.bfs_nummer,
            website_url: (resolved.registration_pages && resolved.registration_pages.length > 0) 
              ? resolved.registration_pages[0] 
              : resolved.website_url, // Use Einwohneramt URL from cache
            kanton: resolved.kanton,
            cached: true,
            cached_at: cachedData.cached_at,
          })
        } else {
          console.log(`⏰ Cache expired for ${resolved.gemeinde_name} (age: ${Math.round(cacheAge / 1000 / 60)}min, max: ${Math.round(maxCacheAge / 1000 / 60)}min)`)
        }
      }
    }

    // Step 3: Live scraping
    // Use stored pages if available (for high-traffic municipalities), otherwise discover dynamically
    console.log(`🔄 Starting live scraping for ${resolved.gemeinde_name}`)
    console.log(`   Using website: ${resolved.website_url}`)
    console.log(`   Pre-stored pages: ${resolved.registration_pages?.length || 0}`)
    
    const liveData = await scrapeMunicipalityLive(
      resolved.gemeinde_name,
      resolved.website_url,
      resolved.registration_pages || []
    )
    
    console.log(`📊 Scraping result for ${resolved.gemeinde_name}:`)
    console.log(`   Opening hours: ${liveData.opening_hours ? Object.keys(liveData.opening_hours).length + ' days' : 'null'}`)
    console.log(`   Phone: ${liveData.phone || 'null'}`)
    console.log(`   Email: ${liveData.email || 'null'}`)

    // Step 4: If pages were discovered (not pre-stored), save them to database for future use
    const discoveredPages = liveData.discovered_pages
    if (discoveredPages && discoveredPages.length > 0) {
      console.log(`💾 Saving ${discoveredPages.length} discovered pages for ${resolved.gemeinde_name}`)
      await supabase
        .from('municipality_master_data')
        .update({
          registration_pages: discoveredPages,
          updated_at: new Date().toISOString(),
        })
        .eq('bfs_nummer', resolved.bfs_nummer)
    }

    // Step 5: Extract discovered_pages before caching (only used for DB update, not in cache/response)
    const { discovered_pages: _, ...dataToCache } = liveData

    // Step 6: Cache scraped data
    // Only cache if we have at least some useful data (opening hours, phone, or email)
    // This prevents caching null results that block future retries
    const hasUsefulData = 
      (dataToCache.opening_hours && Object.keys(dataToCache.opening_hours).length > 0) ||
      dataToCache.phone ||
      dataToCache.email ||
      dataToCache.address
    
    if (hasUsefulData) {
      console.log(`💾 Caching data for ${resolved.gemeinde_name} (has opening hours: ${!!(dataToCache.opening_hours && Object.keys(dataToCache.opening_hours).length > 0)})`)
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
    } else {
      console.log(`⚠️ Not caching null/empty result for ${resolved.gemeinde_name} - will retry on next request`)
    }

    // Step 7: Determine the best link to Einwohneramt (prefer registration_pages over base website_url)
    // Use the first registration page if available, otherwise fall back to website_url
    const einwohneramtUrl = 
      (resolved.registration_pages && resolved.registration_pages.length > 0) 
        ? resolved.registration_pages[0] 
        : resolved.website_url

    // Step 8: Return response (using dataToCache which already excludes discovered_pages)
    return NextResponse.json({
      ...dataToCache,
      gemeinde_name: resolved.gemeinde_name,
      ortsteil: resolved.ortsteil,
      bfs_nummer: resolved.bfs_nummer,
      website_url: einwohneramtUrl, // Use Einwohneramt URL instead of base website
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

