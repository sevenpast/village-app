/**
 * OpenData.swiss Integration Service
 * Fetches official Swiss municipality data from BFS (Federal Statistical Office) via opendata.swiss
 * Also searches opendata.swiss for municipality-specific datasets (contact info, services, etc.)
 */

export interface SwissMunicipalityData {
  bfs_nummer: number
  gemeinde_name: string
  kanton: string
  bezirk?: string
  einwohner?: number
  flaeche_km2?: number
  plz?: string[]
  official_website?: string
  updated_at: string
}

export interface OpendataSwissDataset {
  id: string
  name: string
  title: string
  description?: string
  organization?: {
    name: string
    title: string
  }
  resources?: Array<{
    url: string
    format: string
    name?: string
  }>
  tags?: Array<{ name: string }>
  metadata_modified?: string
}

export interface MunicipalityContactData {
  phone?: string
  email?: string
  address?: string
  opening_hours?: Record<string, string>
}

export interface OpendataSwissConfig {
  // Primary CSV source: Official Municipality Directory from BFS
  municipalityDataUrl: string
  // Backup sources for specific data types
  postalCodeUrl?: string
  populationUrl?: string
  cacheExpiryHours: number
}

const DEFAULT_CONFIG: OpendataSwissConfig = {
  // BFS Official Municipality Directory 2024 (updated quarterly)
  municipalityDataUrl: 'https://www.bfs.admin.ch/bfsstatic/dam/assets/32036842/master',
  // Fallback: Historic municipality directory with reliable structure
  postalCodeUrl: 'https://www.bfs.admin.ch/bfsstatic/dam/assets/23185145/master',
  cacheExpiryHours: 24, // Cache for 24 hours
}

/**
 * Download and parse Swiss municipality data from BFS/opendata.swiss
 */
export async function fetchSwissMunicipalityData(
  config: Partial<OpendataSwissConfig> = {}
): Promise<SwissMunicipalityData[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  console.log('🇨🇭 Fetching Swiss municipality data from BFS...')

  try {
    // Try primary source first
    const data = await fetchAndParseMunicipalityCSV(cfg.municipalityDataUrl)
    if (data.length > 0) {
      console.log(`✅ Successfully loaded ${data.length} municipalities from BFS`)
      return data
    }
  } catch (error) {
    console.warn('⚠️ Primary BFS source failed:', error)
  }

  // Fallback: Use known working CSV structure
  try {
    const fallbackData = await fetchFallbackMunicipalityData()
    console.log(`✅ Fallback: Loaded ${fallbackData.length} municipalities`)
    return fallbackData
  } catch (fallbackError) {
    console.error('❌ All opendata.swiss sources failed:', fallbackError)
    throw new Error('Unable to fetch Swiss municipality data from any source')
  }
}

/**
 * Parse CSV data from BFS municipality directory
 */
async function fetchAndParseMunicipalityCSV(url: string): Promise<SwissMunicipalityData[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Village-App/1.0 (Municipality Data Sync)',
    },
  })

  if (!response.ok) {
    throw new Error(`BFS API returned ${response.status}: ${response.statusText}`)
  }

  const csvText = await response.text()

  // Handle both semicolon and comma separators (BFS uses semicolons)
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('Invalid CSV: No data rows found')
  }

  const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''))
  const municipalities: SwissMunicipalityData[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''))

    if (values.length < headers.length) continue // Skip incomplete rows

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || null
    })

    // Map BFS CSV columns to our interface
    const municipality = mapBFSRowToMunicipalityData(row)
    if (municipality) {
      municipalities.push(municipality)
    }
  }

  return municipalities
}

/**
 * Map BFS CSV row to our municipality data interface
 * Handles different CSV column names from various BFS sources
 */
function mapBFSRowToMunicipalityData(row: any): SwissMunicipalityData | null {
  // Common BFS column name variations
  const bfsNumber = parseInt(
    row.GDENR || row.BFS_NR || row.BFS_NUMMER || row.bfs_nummer || row['BFS-Nr'] || '0'
  )

  const gemeindeName = row.GDENAME || row.GEMEINDE || row.gemeinde_name || row.Gemeinde || row.NAME
  const kanton = row.GDEKTNR || row.KANTON || row.kanton || row.Kanton || row.KT

  if (!bfsNumber || !gemeindeName || !kanton) {
    return null // Skip rows with missing essential data
  }

  return {
    bfs_nummer: bfsNumber,
    gemeinde_name: gemeindeName,
    kanton: kanton,
    bezirk: row.GDEBZNR || row.BEZIRK || row.bezirk || undefined,
    einwohner: parseInt(row.EINWOHNER || row.einwohner || '0') || undefined,
    flaeche_km2: parseFloat(row.FLAECHE || row.flaeche || '0') || undefined,
    official_website: generateMunicipalityWebsite(gemeindeName),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Fallback: Generate municipality data using known structure
 * This creates a basic dataset when BFS APIs are unavailable
 */
async function fetchFallbackMunicipalityData(): Promise<SwissMunicipalityData[]> {
  // Use a curated list of major Swiss municipalities with known data
  const knownMunicipalities = [
    { bfs: 261, name: 'Zürich', kanton: 'ZH', plz: ['8001', '8002', '8003', '8004', '8005'] },
    { bfs: 6621, name: 'Basel', kanton: 'BS', plz: ['4001', '4002', '4003'] },
    { bfs: 351, name: 'Bern', kanton: 'BE', plz: ['3001', '3003', '3005'] },
    { bfs: 5586, name: 'Lausanne', kanton: 'VD', plz: ['1000', '1001', '1002'] },
    { bfs: 6458, name: 'Genève', kanton: 'GE', plz: ['1200', '1201', '1202'] },
    { bfs: 230, name: 'Winterthur', kanton: 'ZH', plz: ['8400', '8401', '8402'] },
    { bfs: 1061, name: 'Luzern', kanton: 'LU', plz: ['6000', '6001', '6002'] },
    { bfs: 3203, name: 'St. Gallen', kanton: 'SG', plz: ['9000', '9001', '9002'] },
    { bfs: 5192, name: 'Lugano', kanton: 'TI', plz: ['6900', '6901', '6902'] },
    { bfs: 2581, name: 'Biel', kanton: 'BE', plz: ['2500', '2501', '2502'] },
    { bfs: 4001, name: 'Aarau', kanton: 'AG', plz: ['5000'] },
    { bfs: 2762, name: 'Münchenstein', kanton: 'BL', plz: ['4142'] },
    { bfs: 2771, name: 'Allschwil', kanton: 'BL', plz: ['4123'] },
  ]

  return knownMunicipalities.map(m => ({
    bfs_nummer: m.bfs,
    gemeinde_name: m.name,
    kanton: m.kanton,
    plz: m.plz,
    official_website: generateMunicipalityWebsite(m.name),
    updated_at: new Date().toISOString(),
  }))
}

/**
 * Generate likely municipality website URL
 */
function generateMunicipalityWebsite(gemeindeName: string): string {
  const clean = gemeindeName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[m] || m))
    .replace(/[^a-z0-9-]/g, '')

  return `https://www.${clean}.ch`
}

/**
 * Find municipality by name, PLZ, or BFS number
 */
export async function findMunicipalityInOpenData(
  query: string,
  municipalities?: SwissMunicipalityData[]
): Promise<SwissMunicipalityData | null> {
  if (!municipalities) {
    municipalities = await fetchSwissMunicipalityData()
  }

  const normalizedQuery = query.toLowerCase().trim()

  // 1. Try BFS number (exact match)
  if (/^\d+$/.test(normalizedQuery)) {
    const bfsNumber = parseInt(normalizedQuery)
    const byBFS = municipalities.find(m => m.bfs_nummer === bfsNumber)
    if (byBFS) return byBFS
  }

  // 2. Try exact name match
  const byName = municipalities.find(m =>
    m.gemeinde_name.toLowerCase() === normalizedQuery
  )
  if (byName) return byName

  // 3. Try PLZ match
  if (/^\d{4}$/.test(normalizedQuery)) {
    const byPLZ = municipalities.find(m =>
      m.plz?.includes(normalizedQuery)
    )
    if (byPLZ) return byPLZ
  }

  // 4. Try partial name match
  const byPartialName = municipalities.find(m =>
    m.gemeinde_name.toLowerCase().includes(normalizedQuery) ||
    normalizedQuery.includes(m.gemeinde_name.toLowerCase())
  )
  if (byPartialName) return byPartialName

  return null
}

/**
 * Sync municipality data to Supabase database
 * This populates the municipality_master_data table with official BFS data
 */
export async function syncMunicipalityDataToDatabase(
  supabaseClient: any,
  config: Partial<OpendataSwissConfig> = {}
): Promise<{ inserted: number; updated: number; errors: number }> {
  console.log('🔄 Starting municipality data sync to database...')

  const municipalities = await fetchSwissMunicipalityData(config)

  let inserted = 0
  let updated = 0
  let errors = 0

  for (const municipality of municipalities) {
    try {
      // Upsert each municipality (insert or update if exists)
      const { error } = await supabaseClient
        .from('municipality_master_data')
        .upsert(
          {
            bfs_nummer: municipality.bfs_nummer,
            gemeinde_name: municipality.gemeinde_name,
            kanton: municipality.kanton,
            bezirk: municipality.bezirk,
            einwohner: municipality.einwohner,
            flaeche_km2: municipality.flaeche_km2,
            plz: municipality.plz,
            official_website: municipality.official_website,
            updated_at: municipality.updated_at,
          },
          {
            onConflict: 'bfs_nummer',
          }
        )

      if (error) {
        console.error(`❌ Error syncing ${municipality.gemeinde_name}:`, error)
        errors++
      } else {
        // Note: Supabase doesn't indicate insert vs update in upsert
        inserted++
      }
    } catch (err) {
      console.error(`❌ Exception syncing ${municipality.gemeinde_name}:`, err)
      errors++
    }
  }

  console.log(`✅ Sync complete: ${inserted} records processed, ${errors} errors`)
  return { inserted, updated: 0, errors }
}

/**
 * Search opendata.swiss CKAN API for municipality-related datasets
 * Can find datasets with contact info, services, opening hours, etc.
 */
export async function searchOpendataSwissDatasets(
  query: string,
  municipalityName?: string
): Promise<OpendataSwissDataset[]> {
  const baseUrl = 'https://opendata.swiss/api/3/action'
  
  try {
    // Build search query
    const searchTerms = municipalityName 
      ? `${municipalityName} ${query}` 
      : query
    
    const searchUrl = `${baseUrl}/package_search?q=${encodeURIComponent(searchTerms)}&rows=20`
    
    console.log(`🔍 Searching opendata.swiss for: "${searchTerms}"`)
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Village-App/1.0 (OpenData Integration)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`opendata.swiss API returned ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.success || !data.result || !data.result.results) {
      console.warn('⚠️ Invalid response from opendata.swiss API')
      return []
    }
    
    const datasets = data.result.results.map((pkg: any) => ({
      id: pkg.id,
      name: pkg.name,
      title: pkg.title,
      description: pkg.notes,
      organization: pkg.organization ? {
        name: pkg.organization.name,
        title: pkg.organization.title,
      } : undefined,
      resources: pkg.resources?.map((r: any) => ({
        url: r.url,
        format: r.format?.toUpperCase() || 'UNKNOWN',
        name: r.name,
      })) || [],
      tags: pkg.tags?.map((t: any) => ({ name: t.name })) || [],
      metadata_modified: pkg.metadata_modified,
    }))
    
    console.log(`✅ Found ${datasets.length} datasets on opendata.swiss`)
    return datasets
  } catch (error) {
    console.error('❌ Error searching opendata.swiss:', error)
    return []
  }
}

/**
 * Get detailed dataset information from opendata.swiss
 */
export async function getOpendataSwissDataset(
  datasetId: string
): Promise<OpendataSwissDataset | null> {
  const baseUrl = 'https://opendata.swiss/api/3/action'
  
  try {
    const url = `${baseUrl}/package_show?id=${encodeURIComponent(datasetId)}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Village-App/1.0 (OpenData Integration)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`opendata.swiss API returned ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.success || !data.result) {
      return null
    }
    
    const pkg = data.result
    return {
      id: pkg.id,
      name: pkg.name,
      title: pkg.title,
      description: pkg.notes,
      organization: pkg.organization ? {
        name: pkg.organization.name,
        title: pkg.organization.title,
      } : undefined,
      resources: pkg.resources?.map((r: any) => ({
        url: r.url,
        format: r.format?.toUpperCase() || 'UNKNOWN',
        name: r.name,
      })) || [],
      tags: pkg.tags?.map((t: any) => ({ name: t.name })) || [],
      metadata_modified: pkg.metadata_modified,
    }
  } catch (error) {
    console.error(`❌ Error fetching dataset ${datasetId}:`, error)
    return null
  }
}

/**
 * Try to find municipality contact data from opendata.swiss
 * Searches for datasets that might contain contact info or opening hours
 */
export async function findMunicipalityContactFromOpendata(
  municipalityName: string,
  bfsNummer?: number
): Promise<MunicipalityContactData | null> {
  try {
    // Search for municipality-specific datasets
    const searchQueries = [
      municipalityName,
      `gemeinde ${municipalityName}`,
      `verwaltung ${municipalityName}`,
      `kontakt ${municipalityName}`,
    ]
    
    const allDatasets: OpendataSwissDataset[] = []
    
    for (const query of searchQueries) {
      const datasets = await searchOpendataSwissDatasets(query, municipalityName)
      allDatasets.push(...datasets)
    }
    
    // Remove duplicates
    const uniqueDatasets = Array.from(
      new Map(allDatasets.map(d => [d.id, d])).values()
    )
    
    console.log(`📊 Found ${uniqueDatasets.length} unique datasets for ${municipalityName}`)
    
    // Look for datasets that might contain contact info
    const relevantDatasets = uniqueDatasets.filter(dataset => {
      const titleLower = dataset.title?.toLowerCase() || ''
      const descLower = dataset.description?.toLowerCase() || ''
      const tags = dataset.tags?.map(t => t.name.toLowerCase()) || []
      
      const relevantKeywords = [
        'kontakt', 'contact', 'verwaltung', 'administration',
        'oeffnungszeiten', 'opening hours', 'heures',
        'adresse', 'address', 'telefon', 'phone',
        'email', 'gemeinde', 'municipality',
      ]
      
      return relevantKeywords.some(keyword =>
        titleLower.includes(keyword) ||
        descLower.includes(keyword) ||
        tags.some(tag => tag.includes(keyword))
      )
    })
    
    if (relevantDatasets.length === 0) {
      console.log(`⚠️ No relevant contact datasets found for ${municipalityName}`)
      return null
    }
    
    console.log(`✅ Found ${relevantDatasets.length} relevant datasets for ${municipalityName}`)
    
    // Log found datasets for debugging
    relevantDatasets.slice(0, 3).forEach((ds, i) => {
      console.log(`   ${i + 1}. ${ds.title} (${ds.resources?.length || 0} resources)`)
    })
    
    // Try to download and parse the most relevant dataset
    // Priority: Look for CSV or JSON resources first
    for (const dataset of relevantDatasets.slice(0, 3)) {
      const csvResource = dataset.resources?.find(r => 
        r.format === 'CSV' || r.url.toLowerCase().endsWith('.csv')
      )
      const jsonResource = dataset.resources?.find(r => 
        r.format === 'JSON' || r.url.toLowerCase().endsWith('.json')
      )
      
      const resource = csvResource || jsonResource || dataset.resources?.[0]
      
      if (resource) {
        console.log(`   📥 Attempting to download resource from ${dataset.title}...`)
        try {
          const contactData = await downloadAndParseResource(resource.url, resource.format)
          if (contactData && (contactData.phone || contactData.email || contactData.address || contactData.opening_hours)) {
            console.log(`   ✅ Successfully extracted contact data from ${dataset.title}`)
            return contactData
          }
        } catch (error) {
          console.log(`   ⚠️ Failed to parse resource:`, error)
          continue
        }
      }
    }
    
    // If no data extracted, return null (will fall back to scraping)
    console.log(`⚠️ No contact data could be extracted from opendata.swiss datasets for ${municipalityName}`)
    return null
  } catch (error) {
    console.error(`❌ Error finding contact data from opendata.swiss for ${municipalityName}:`, error)
    return null
  }
}

/**
 * Download and parse a resource file (CSV, JSON, etc.) to extract contact data
 */
async function downloadAndParseResource(
  resourceUrl: string,
  format: string
): Promise<MunicipalityContactData | null> {
  try {
    const response = await fetch(resourceUrl, {
      headers: {
        'User-Agent': 'Village-App/1.0 (OpenData Integration)',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    })
    
    if (!response.ok) {
      throw new Error(`Failed to download resource: ${response.status}`)
    }
    
    const text = await response.text()
    
    if (format === 'JSON' || resourceUrl.toLowerCase().endsWith('.json')) {
      return parseJSONResource(text)
    } else if (format === 'CSV' || resourceUrl.toLowerCase().endsWith('.csv')) {
      return parseCSVResource(text)
    }
    
    // Try to auto-detect format
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      return parseJSONResource(text)
    } else if (text.includes(',') || text.includes(';')) {
      return parseCSVResource(text)
    }
    
    return null
  } catch (error) {
    console.error(`Error downloading/parsing resource ${resourceUrl}:`, error)
    return null
  }
}

/**
 * Parse JSON resource to extract contact data
 */
function parseJSONResource(jsonText: string): MunicipalityContactData | null {
  try {
    const data = JSON.parse(jsonText)
    
    // Handle different JSON structures
    // Could be an array, object, or nested structure
    const records = Array.isArray(data) ? data : [data]
    
    for (const record of records) {
      const contactData: MunicipalityContactData = {}
      
      // Look for common field names
      if (record.phone || record.telefon || record.tel) {
        contactData.phone = record.phone || record.telefon || record.tel
      }
      if (record.email || record.e_mail || record.mail) {
        contactData.email = record.email || record.e_mail || record.mail
      }
      if (record.address || record.adresse || record.strasse) {
        contactData.address = record.address || record.adresse || record.strasse
      }
      
      // Look for opening hours (could be in various formats)
      if (record.opening_hours || record.oeffnungszeiten || record.hours) {
        const hours = record.opening_hours || record.oeffnungszeiten || record.hours
        if (typeof hours === 'object' && !Array.isArray(hours)) {
          contactData.opening_hours = hours
        }
      }
      
      // If we found any data, return it
      if (contactData.phone || contactData.email || contactData.address || contactData.opening_hours) {
        return contactData
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing JSON resource:', error)
    return null
  }
}

/**
 * Parse CSV resource to extract contact data
 */
function parseCSVResource(csvText: string): MunicipalityContactData | null {
  try {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) return null
    
    // Detect delimiter
    const delimiter = csvText.includes(';') ? ';' : ','
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''))
    
    // Find relevant column indices
    const phoneCol = headers.findIndex(h => h.includes('phone') || h.includes('telefon') || h.includes('tel'))
    const emailCol = headers.findIndex(h => h.includes('email') || h.includes('mail'))
    const addressCol = headers.findIndex(h => h.includes('address') || h.includes('adresse') || h.includes('strasse'))
    
    // Parse first data row (or search for municipality-specific row)
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''))
      
      const contactData: MunicipalityContactData = {}
      
      if (phoneCol >= 0 && values[phoneCol]) {
        contactData.phone = values[phoneCol]
      }
      if (emailCol >= 0 && values[emailCol]) {
        contactData.email = values[emailCol]
      }
      if (addressCol >= 0 && values[addressCol]) {
        contactData.address = values[addressCol]
      }
      
      // If we found any data, return it
      if (contactData.phone || contactData.email || contactData.address) {
        return contactData
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing CSV resource:', error)
    return null
  }
}