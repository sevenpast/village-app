/**
 * Municipality Resolver
 * Resolves user input (PLZ, Ortsteil, municipality name) to official municipality data
 */

import { createClient } from '@/lib/supabase/server'

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
    const { data, error } = await supabase
      .from('municipality_master_data')
      .select('*')
      .contains('plz', [userInput.trim()])
      .maybeSingle()

    if (error) {
      console.error('Error resolving PLZ:', error)
      throw new Error(`Failed to resolve PLZ: ${userInput}`)
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

  // Case 2: Direct municipality name match (case-insensitive)
  let { data, error } = await supabase
    .from('municipality_master_data')
    .select('*')
    .ilike('gemeinde_name', userInput.trim())
    .maybeSingle()

  if (error) {
    console.error('Error resolving municipality name:', error)
    throw new Error(`Failed to resolve municipality: ${userInput}`)
  }

  if (data) {
    return {
      gemeinde_name: data.gemeinde_name,
      ortsteil: userInput.trim(),
      bfs_nummer: data.bfs_nummer,
      website_url: data.official_website || null,
      registration_pages: data.registration_pages || [],
      kanton: data.kanton,
    }
  }

  // Case 3: Search in Ortsteile (CRITICAL for Kleindöttingen → Böttstein)
  const { data: ortsteilData, error: ortsteilError } = await supabase
    .from('municipality_master_data')
    .select('*')

  if (ortsteilError) {
    console.error('Error searching Ortsteile:', ortsteilError)
    throw new Error(`Failed to search Ortsteile: ${userInput}`)
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

  throw new Error(`Municipality "${userInput}" not found`)
}

