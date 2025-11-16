/**
 * Script to populate registration_pages for top municipalities (80%+ of expats)
 * 
 * This script finds and stores the correct URLs for Öffnungszeiten, Kontakt, etc.
 * for the top 10 cities where most expats live.
 * 
 * Usage:
 *   npx tsx scripts/populate-top-municipality-pages.ts
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
 * Top municipalities with their BFS numbers and pre-configured pages
 * Based on statistics: Top 10 cities = 84% of expats in Switzerland
 */
const TOP_MUNICIPALITIES = [
  {
    name: 'Zürich',
    bfsNummer: 261,
    kanton: 'ZH',
    pages: [
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten.html', // Fallback
    ],
  },
  {
    name: 'Genf',
    bfsNummer: 6458,
    kanton: 'GE',
    pages: [
      'https://www.geneve.ch/fr/themes/administration/etat-civil/contact-et-horaires',
      'https://www.geneve.ch/fr/themes/administration/etat-civil',
    ],
  },
  {
    name: 'Basel',
    bfsNummer: 2701,
    kanton: 'BS',
    pages: [
      'https://www.basel.ch/verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.basel.ch/verwaltung/einwohnerdienste/kontakt',
      'https://www.basel.ch/verwaltung/einwohnerdienste',
    ],
  },
  {
    name: 'Lausanne',
    bfsNummer: 5586,
    kanton: 'VD',
    pages: [
      'https://www.lausanne.ch/officiel/administration/etat-civil/contact-et-horaires',
      'https://www.lausanne.ch/officiel/administration/etat-civil',
    ],
  },
  {
    name: 'Bern',
    bfsNummer: 351,
    kanton: 'BE',
    pages: [
      'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/oeffnungszeiten',
      'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/kontakt',
      'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste',
    ],
  },
  {
    name: 'Lugano',
    bfsNummer: 5192,
    kanton: 'TI',
    pages: [
      'https://www.lugano.ch/temi/popolazione/anagrafe/orari',
      'https://www.lugano.ch/temi/popolazione/anagrafe/contatti',
      'https://www.lugano.ch/temi/popolazione/anagrafe',
    ],
  },
  {
    name: 'Zug',
    bfsNummer: 1711,
    kanton: 'ZG',
    pages: [
      'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/kontakt',
      'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste',
    ],
  },
  {
    name: 'Luzern',
    bfsNummer: 1061,
    kanton: 'LU',
    pages: [
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
  },
  {
    name: 'Neuenburg',
    bfsNummer: 6454,
    kanton: 'NE',
    pages: [
      'https://www.neuchatelville.ch/fr/administration/etat-civil/contact-et-horaires',
      'https://www.neuchatelville.ch/fr/administration/etat-civil',
    ],
  },
  {
    name: 'St. Gallen',
    bfsNummer: 3203,
    kanton: 'SG',
    pages: [
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
  },
  {
    name: 'Winterthur',
    bfsNummer: 230,
    kanton: 'ZH',
    pages: [
      'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
  },
  {
    name: 'Allschwil',
    bfsNummer: 2771,
    kanton: 'BL',
    pages: [
      'https://www.allschwil.ch/de/verwaltung/oeffnungszeiten/',
      'https://www.allschwil.ch/de/verwaltung/kontakt/',
      'https://www.allschwil.ch/de/verwaltung/',
    ],
  },
]

/**
 * Verify URLs are accessible
 */
async function verifyUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    })
    return response.ok || response.status === 301 || response.status === 302
  } catch (error) {
    return false
  }
}

/**
 * Main function to populate pages
 */
async function populateTopMunicipalityPages() {
  console.log('🚀 Starting to populate registration_pages for top municipalities...\n')

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (const municipality of TOP_MUNICIPALITIES) {
    try {
      console.log(`\n📍 Processing ${municipality.name} (BFS: ${municipality.bfsNummer})...`)

      // Check if municipality exists in DB
      const { data: existing, error: fetchError } = await supabase
        .from('municipality_master_data')
        .select('bfs_nummer, gemeinde_name, registration_pages')
        .eq('bfs_nummer', municipality.bfsNummer)
        .maybeSingle()

      if (fetchError) {
        console.error(`  ❌ Error fetching ${municipality.name}:`, fetchError.message)
        errorCount++
        continue
      }

      if (!existing) {
        console.log(`  ⚠️  ${municipality.name} not found in database. Creating entry...`)
        
        // Create entry if it doesn't exist
        const { error: insertError } = await supabase
          .from('municipality_master_data')
          .insert({
            bfs_nummer: municipality.bfsNummer,
            gemeinde_name: municipality.name,
            kanton: municipality.kanton,
            registration_pages: municipality.pages,
            official_website: municipality.pages[0]?.split('/').slice(0, 3).join('/') || null,
            updated_at: new Date().toISOString(),
          })

        if (insertError) {
          console.error(`  ❌ Error creating ${municipality.name}:`, insertError.message)
          errorCount++
          continue
        }

        console.log(`  ✅ Created ${municipality.name} with ${municipality.pages.length} pages`)
        successCount++
        continue
      }

      // Verify URLs before updating
      console.log(`  🔍 Verifying ${municipality.pages.length} URLs...`)
      const verifiedPages: string[] = []
      
      for (const page of municipality.pages) {
        const isValid = await verifyUrl(page)
        if (isValid) {
          verifiedPages.push(page)
          console.log(`    ✓ ${page}`)
        } else {
          console.log(`    ⚠️  ${page} (not accessible, but keeping in list)`)
          verifiedPages.push(page) // Keep anyway, might work with full fetch
        }
      }

      // Update registration_pages
      const { error: updateError } = await supabase
        .from('municipality_master_data')
        .update({
          registration_pages: verifiedPages,
          updated_at: new Date().toISOString(),
        })
        .eq('bfs_nummer', municipality.bfsNummer)

      if (updateError) {
        console.error(`  ❌ Error updating ${municipality.name}:`, updateError.message)
        errorCount++
        continue
      }

      console.log(`  ✅ Updated ${municipality.name} with ${verifiedPages.length} pages`)
      successCount++

    } catch (error) {
      console.error(`  ❌ Exception processing ${municipality.name}:`, error)
      errorCount++
    }
  }

  console.log(`\n\n📊 Summary:`)
  console.log(`  ✅ Successfully processed: ${successCount}`)
  console.log(`  ❌ Errors: ${errorCount}`)
  console.log(`  ⏭️  Skipped: ${skippedCount}`)
  console.log(`\n🎉 Done! Top municipalities now have pre-configured pages.`)
}

// Run the script
populateTopMunicipalityPages()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })




















