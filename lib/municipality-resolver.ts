/**
 * Municipality Resolver
 * Resolves user input (PLZ, Ortsteil, municipality name) to official municipality data
 */

import { createClient } from '@/lib/supabase/server'
import { findMunicipalityInOpenData, fetchSwissMunicipalityData } from '@/lib/opendata-swiss'

export interface ResolvedMunicipality {
  gemeinde_name: string
  ortsteil: string
  bfs_nummer: number
  website_url: string | null
  registration_pages: string[]
  kanton: string
}

/**
 * Resolve user input to official municipality
 * Handles: PLZ, Ortsteil names, Municipality names
 */
export async function resolveMunicipality(
  userInput: string,
  canton?: string
): Promise<ResolvedMunicipality> {
  const supabase = await createClient()

  // Case 1: Is it a PLZ? (4 digits)
  if (/^\d{4}$/.test(userInput.trim())) {
    let { data, error } = await supabase
      .from('municipality_master_data')
      .select('*')
      .contains('plz', [userInput.trim()])
      .maybeSingle()

    // If table doesn't exist, try alternative table name
    if (error && error.code === 'PGRST205') {
      console.log('🔄 Trying alternative table name for PLZ: municipalities')
      const result1 = await supabase
        .from('municipalities')
        .select('*')
        .contains('plz', [userInput.trim()])
        .maybeSingle()

      data = result1.data
      error = result1.error
    }

    if (error) {
      console.log(`⚠ PLZ lookup failed (${error.code}): ${error.message}`)
      console.log('📋 Falling back to web scraping for PLZ resolution')
      return null  // Fallback to web scraping
    }

    if (data) {
      return {
        gemeinde_name: data.gemeinde_name,
        ortsteil: (data.ortsteile as string[])?.[0] || data.gemeinde_name,
        bfs_nummer: data.bfs_nummer,
        website_url: data.official_website || null,
        registration_pages: data.registration_pages || [],
        kanton: data.kanton,
      }
    }
  }

  // Case 2: Direct municipality name match (case-insensitive, with Umlaut normalization)
  // Normalize Umlaute for better matching: ü -> ue, ö -> oe, ä -> ae
  const normalizeForSearch = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/ü/g, 'ue')
      .replace(/ö/g, 'oe')
      .replace(/ä/g, 'ae')
      .replace(/ß/g, 'ss')
      .trim()
  }
  
  const normalizedInput = normalizeForSearch(userInput.trim())
  console.log(`🔍 Resolving municipality: "${userInput}" (normalized: "${normalizedInput}")`)
  
  // First try exact match with ilike (handles case-insensitive)
  let { data, error } = await supabase
    .from('municipality_master_data')
    .select('*')
    .ilike('gemeinde_name', userInput.trim())
    .maybeSingle()

  // If table doesn't exist, try alternative table names
  if (error && error.code === 'PGRST205') {
    console.log('🔄 Trying alternative table name: municipalities')
    const result2 = await supabase
      .from('municipalities')
      .select('*')
      .ilike('gemeinde_name', userInput.trim())
      .maybeSingle()

    data = result2.data
    error = result2.error
  }

  // If both tables don't exist or other errors, gracefully return null for fallback scraping
  if (error) {
    console.log(`⚠ Municipality table not accessible (${error.code}): ${error.message}`)
    console.log('📋 Falling back to web scraping for municipality data')
    return null  // This will trigger fallback scraping
  }

  if (data) {
    console.log(`✓ Found exact match: ${data.gemeinde_name} (BFS: ${data.bfs_nummer})`)
    return {
      gemeinde_name: data.gemeinde_name,
      ortsteil: userInput.trim(),
      bfs_nummer: data.bfs_nummer,
      website_url: data.official_website || null,
      registration_pages: data.registration_pages || [],
      kanton: data.kanton,
    }
  }
  
  // Try with normalized search if exact match failed
  // Get all municipalities and filter client-side for better Umlaut handling
  let { data: allMunicipalities, error: allError } = await supabase
    .from('municipality_master_data')
    .select('*')

  // If table doesn't exist, try alternative table name
  if (allError && allError.code === 'PGRST205') {
    console.log('🔄 Trying alternative table name for all municipalities: municipalities')
    const result3 = await supabase
      .from('municipalities')
      .select('*')

    allMunicipalities = result3.data
    allError = result3.error
  }

  if (allError) {
    console.log(`⚠ Municipality lookup failed (${allError.code}): ${allError.message}`)
    console.log('📋 Falling back to web scraping for municipality data')
    return null  // Fallback to web scraping
  }

  if (allMunicipalities) {
    // Find match with normalized comparison
    const match = allMunicipalities.find(muni => {
      const normalizedMuni = normalizeForSearch(muni.gemeinde_name)
      const isExactMatch = normalizedMuni === normalizedInput
      const isPartialMatch = normalizedMuni.includes(normalizedInput) || normalizedInput.includes(normalizedMuni)
      
      if (isExactMatch || isPartialMatch) {
        console.log(`  → Checking: "${muni.gemeinde_name}" (normalized: "${normalizedMuni}")`)
      }
      
      return isExactMatch || isPartialMatch
    })

    if (match) {
      console.log(`✓ Found normalized match: ${match.gemeinde_name} (BFS: ${match.bfs_nummer})`)
      return {
        gemeinde_name: match.gemeinde_name,
        ortsteil: userInput.trim(),
        bfs_nummer: match.bfs_nummer,
        website_url: match.official_website || null,
        registration_pages: match.registration_pages || [],
        kanton: match.kanton,
      }
    } else {
      console.log(`⚠ No normalized match found in ${allMunicipalities.length} municipalities`)
    }
  }

  // Case 3: Search in Ortsteile (CRITICAL for Kleindöttingen → Böttstein)
  let { data: ortsteilData, error: ortsteilError } = await supabase
    .from('municipality_master_data')
    .select('*')

  // If table doesn't exist, try alternative table name
  if (ortsteilError && ortsteilError.code === 'PGRST205') {
    console.log('🔄 Trying alternative table name for Ortsteile: municipalities')
    const result4 = await supabase
      .from('municipalities')
      .select('*')

    ortsteilData = result4.data
    ortsteilError = result4.error
  }

  if (ortsteilError) {
    console.log(`⚠ Ortsteile lookup failed (${ortsteilError.code}): ${ortsteilError.message}`)
    console.log('📋 Falling back to web scraping for Ortsteile resolution')
    return null  // Fallback to web scraping
  }

  if (ortsteilData) {
    for (const muni of ortsteilData) {
      const ortsteile = (muni.ortsteile as string[]) || []
      const normalizedInput = userInput.trim().toLowerCase()
      
      for (const ortsteil of ortsteile) {
        if (ortsteil.toLowerCase() === normalizedInput) {
          return {
            gemeinde_name: muni.gemeinde_name, // "Böttstein"
            ortsteil: userInput.trim(), // "Kleindöttingen"
            bfs_nummer: muni.bfs_nummer,
            website_url: muni.official_website || null,
            registration_pages: muni.registration_pages || [],
            kanton: muni.kanton,
          }
        }
      }
    }
  }

  // Case 4: Fuzzy search (typo-tolerant)
  const { data: fuzzyData, error: fuzzyError } = await supabase.rpc(
    'fuzzy_search_municipality',
    {
      search_term: userInput.trim(),
      threshold: 0.6,
    }
  )

  if (fuzzyError) {
    console.error('Error in fuzzy search:', fuzzyError)
  }

  if (fuzzyData && fuzzyData.length > 0) {
    const match = fuzzyData[0]
    return {
      gemeinde_name: match.gemeinde_name,
      ortsteil: match.ortsteil || userInput.trim(),
      bfs_nummer: match.bfs_nummer,
      website_url: match.official_website || null,
      registration_pages: match.registration_pages || [],
      kanton: match.kanton,
    }
  }

  console.log(`🔄 Database search failed, trying opendata.swiss fallback for "${userInput}"`)

  // Case 5: Fallback to opendata.swiss if database is empty or doesn't have the municipality
  try {
    const opendataMunicipality = await findMunicipalityInOpenData(userInput)

    if (opendataMunicipality) {
      console.log(`✅ Found in opendata.swiss: ${opendataMunicipality.gemeinde_name} (BFS: ${opendataMunicipality.bfs_nummer})`)

      return {
        gemeinde_name: opendataMunicipality.gemeinde_name,
        ortsteil: userInput.trim(),
        bfs_nummer: opendataMunicipality.bfs_nummer,
        website_url: opendataMunicipality.official_website || null,
        registration_pages: [], // Will be discovered during scraping
        kanton: opendataMunicipality.kanton,
      }
    }
  } catch (opendataError) {
    console.error('❌ opendata.swiss fallback also failed:', opendataError)
  }

  console.error(`❌ Municipality "${userInput}" not found in database or opendata.swiss`)
  throw new Error(`Municipality "${userInput}" not found. Please check the spelling or try using the postal code (PLZ) instead.`)
}

