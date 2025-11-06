/**
 * Setup Script: Municipality Master Data
 * 
 * This script fetches BFS data and enriches it with OpenPLZ and website information.
 * Run once to populate the municipality_master_data table.
 * 
 * Usage:
 *   npx tsx scripts/setup-municipality-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Fetch all Swiss municipalities from BFS
 * Source: Federal Statistical Office (Bundesamt für Statistik)
 * 
 * Note: This is a placeholder - you'll need to implement actual BFS API call
 * or use opendata.swiss as fallback
 */
async function fetchBFSMunicipalities() {
  console.log('📥 Fetching BFS municipality data...')

  // TODO: Implement actual BFS API call
  // For now, return sample data structure
  console.log('⚠️  BFS API integration not yet implemented')
  console.log('📋 Please use opendata.swiss or manual CSV import')
  
  return []
}

/**
 * Enrich municipalities with postal codes and localities
 * Source: OpenPLZ API (Open Source, kostenlos)
 * API: https://openplzapi.org/ch/
 */
async function enrichWithOpenPLZ() {
  console.log('📥 Enriching with OpenPLZ data...')

  const { data: municipalities, error } = await supabase
    .from('municipality_master_data')
    .select('*')
    .is('plz', null) // Only enrich municipalities without PLZ data

  if (error) {
    console.error('❌ Error fetching municipalities:', error)
    return
  }

  if (!municipalities || municipalities.length === 0) {
    console.log('✅ All municipalities already enriched')
    return
  }

  console.log(`📋 Enriching ${municipalities.length} municipalities...`)

  for (const muni of municipalities) {
    try {
      // Search by municipality name
      const response = await fetch(
        `https://openplzapi.org/ch/Municipalities?name=${encodeURIComponent(muni.gemeinde_name)}`
      )

      if (!response.ok) {
        console.warn(`⚠️  Failed to fetch OpenPLZ data for ${muni.gemeinde_name}`)
        continue
      }

      const data = await response.json()

      if (data && data.length > 0) {
        const localities = data[0].localities || []
        const postalCodes = data[0].postalCodes || []

        // Update database
        const { error: updateError } = await supabase
          .from('municipality_master_data')
          .update({
            ortsteile: localities,
            plz: postalCodes,
          })
          .eq('id', muni.id)

        if (updateError) {
          console.error(`❌ Failed to update ${muni.gemeinde_name}:`, updateError)
        } else {
          console.log(`✅ Enriched ${muni.gemeinde_name}: ${localities.length} localities, ${postalCodes.length} PLZ`)
        }
      }

      // Rate limiting (be nice to OpenPLZ API)
      await sleep(100)
    } catch (error) {
      console.error(`❌ Error enriching ${muni.gemeinde_name}:`, error)
    }
  }
}

/**
 * Find official website for each municipality
 * Strategy: Test common patterns, then use AI as fallback
 */
async function findOfficialWebsite(gemeinde: string, canton: string): Promise<string | null> {
  // Clean municipality name for URL
  const cleanName = gemeinde
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  // Common Swiss municipality URL patterns
  const patterns = [
    `https://www.${cleanName}.ch`,
    `https://${cleanName}.ch`,
    `https://www.gemeinde-${cleanName}.ch`,
    `https://${cleanName}.${canton.toLowerCase()}.ch`,
    `https://www.${cleanName}-${canton.toLowerCase()}.ch`,
  ]

  // Test each pattern
  for (const url of patterns) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000), // 5s timeout
      })

      if (response.ok && response.status === 200) {
        console.log(`✅ Found: ${url}`)
        return url
      }
    } catch (error) {
      // Continue to next pattern
      continue
    }
  }

  return null
}

/**
 * Find websites for all municipalities
 */
async function findAllWebsites() {
  const { data: municipalities, error } = await supabase
    .from('municipality_master_data')
    .select('*')
    .is('official_website', null)

  if (error) {
    console.error('❌ Error fetching municipalities:', error)
    return
  }

  if (!municipalities || municipalities.length === 0) {
    console.log('✅ All municipalities already have websites')
    return
  }

  console.log(`🔍 Finding websites for ${municipalities.length} municipalities...`)

  for (const muni of municipalities) {
    const website = await findOfficialWebsite(muni.gemeinde_name, muni.kanton)

    if (website) {
      const { error: updateError } = await supabase
        .from('municipality_master_data')
        .update({ official_website: website })
        .eq('id', muni.id)

      if (updateError) {
        console.error(`❌ Failed to update website for ${muni.gemeinde_name}:`, updateError)
      } else {
        console.log(`✅ ${muni.gemeinde_name}: ${website}`)
      }
    } else {
      console.log(`❌ ${muni.gemeinde_name}: NOT FOUND`)
    }

    // Rate limiting (be nice to servers)
    await sleep(500)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting municipality data setup...\n')

  // Step 1: Fetch BFS data (placeholder)
  // const bfsData = await fetchBFSMunicipalities()
  // await insertMunicipalityData(bfsData)

  // Step 2: Enrich with OpenPLZ
  await enrichWithOpenPLZ()

  // Step 3: Find official websites
  await findAllWebsites()

  console.log('\n✅ Setup complete!')
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { fetchBFSMunicipalities, enrichWithOpenPLZ, findAllWebsites }

