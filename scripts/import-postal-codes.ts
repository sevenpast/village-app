/**
 * Script to import Swiss postal codes data
 * 
 * Usage:
 * 1. Download official postal codes CSV from Post CH or opendata.swiss
 * 2. Format: postalcode,place_name,municipality_name,bfs_number,canton_abbr,lat,lng
 * 3. Run: tsx scripts/import-postal-codes.ts path/to/data.csv
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
// Note: For CSV parsing, you may need to install: npm install csv-parse
// If csv-parse is not available, use a simpler CSV parser or manual parsing

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function importPostalCodes(csvFilePath: string) {
  console.log('Reading CSV file...')
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8')
  
  // Simple CSV parser (assuming comma-separated with header)
  const lines = csvContent.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const records = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const record: any = {}
    headers.forEach((header, index) => {
      record[header] = values[index] || ''
    })
    return record
  })

  console.log(`Found ${records.length} records to import`)

  // Prepare data for insertion
  const postalCodesData = records.map((record: any) => ({
    postalcode: record.postalcode || record.postcode || record.plz,
    place_name: record.place_name || record.city || record.place,
    municipality_name: record.municipality_name || record.municipality || record.place_name,
    bfs_number: parseInt(record.bfs_number || record.bfs || '0', 10),
    canton_abbr: record.canton_abbr || record.canton || '',
    lat: record.lat ? parseFloat(record.lat) : null,
    lng: record.lng ? parseFloat(record.lng) : null,
  })).filter((item: any) => item.postalcode && item.place_name && item.bfs_number > 0)

  console.log(`Prepared ${postalCodesData.length} valid records`)

  // Insert in batches of 1000
  const batchSize = 1000
  let inserted = 0

  for (let i = 0; i < postalCodesData.length; i += batchSize) {
    const batch = postalCodesData.slice(i, i + batchSize)
    
    const { error } = await supabase
      .from('postal_codes')
      .upsert(batch, { onConflict: 'postalcode,place_name,bfs_number' })

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
    } else {
      inserted += batch.length
      console.log(`Inserted batch ${i / batchSize + 1} (${inserted}/${postalCodesData.length})`)
    }
  }

  console.log(`✅ Import complete: ${inserted} records inserted`)
}

async function importPlaceAliases(csvFilePath?: string) {
  if (!csvFilePath) {
    console.log('No aliases file provided, skipping...')
    return
  }

  console.log('Reading aliases CSV file...')
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8')
  
  // Simple CSV parser
  const lines = csvContent.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const records = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const record: any = {}
    headers.forEach((header, index) => {
      record[header] = values[index] || ''
    })
    return record
  })

  console.log(`Found ${records.length} alias records to import`)

  const aliasesData = records.map((record: any) => ({
    bfs_number: parseInt(record.bfs_number || record.bfs || '0', 10),
    alias: record.alias || record.name || '',
  })).filter((item: any) => item.bfs_number > 0 && item.alias)

  if (aliasesData.length === 0) {
    console.log('No valid aliases to import')
    return
  }

  const { error } = await supabase
    .from('place_aliases')
    .upsert(aliasesData, { onConflict: 'bfs_number,alias' })

  if (error) {
    console.error('Error inserting aliases:', error)
  } else {
    console.log(`✅ Aliases import complete: ${aliasesData.length} records inserted`)
  }
}

// Main execution
const args = process.argv.slice(2)
const postalCodesFile = args[0]
const aliasesFile = args[1]

if (!postalCodesFile) {
  console.error('Usage: tsx scripts/import-postal-codes.ts <postal-codes.csv> [aliases.csv]')
  process.exit(1)
}

if (!fs.existsSync(postalCodesFile)) {
  console.error(`File not found: ${postalCodesFile}`)
  process.exit(1)
}

importPostalCodes(postalCodesFile)
  .then(() => {
    if (aliasesFile && fs.existsSync(aliasesFile)) {
      return importPlaceAliases(aliasesFile)
    }
  })
  .then(() => {
    console.log('✅ All imports completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })

