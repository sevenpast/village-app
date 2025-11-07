/**
 * Municipality Live Data Scraper
 * Scrapes official municipality websites and extracts structured data using Gemini AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { 
  searchOpendataSwissDatasets, 
  findMunicipalityContactFromOpendata 
} from '@/lib/opendata-swiss'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Fallback function to extract opening hours using regex when Gemini AI fails
 */
function extractOpeningHoursFallback(htmlContent: string): Record<string, string> | null {
  console.log('🔄 Using fallback opening hours extraction')

  const days = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag']
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const openingHours: Record<string, string> = {}

  // Remove HTML tags and normalize whitespace
  const cleanText = htmlContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')

  let foundAny = false

  for (let i = 0; i < days.length; i++) {
    const day = days[i]
    const dayName = dayNames[i]

    // Look for patterns like "Montag 9.00 bis 13.00 Uhr" or "Montag</strong> 9.00 bis 12.00"
    const patterns = [
      // Standard pattern: "Montag 9.00 bis 13.00 Uhr"
      new RegExp(`${day}[^\\d]*([\\d\\.]+)\\s*bis\\s*([\\d\\.]+)\\s*uhr(?:[^\\d]*und\\s*([\\d\\.]+)\\s*bis\\s*([\\d\\.]+)\\s*uhr)?`, 'gi'),
      // Table pattern: "Montag</strong> 9.00 bis 13.00 Uhr"
      new RegExp(`${day}[^\\d]*?([\\d\\.]+)\\s*bis\\s*([\\d\\.]+)\\s*uhr(?:[^\\d]*?und\\s*([\\d\\.]+)\\s*bis\\s*([\\d\\.]+)\\s*uhr)?`, 'gi'),
      // Alternative pattern: "Montag: 09:00-17:00"
      new RegExp(`${day}[^\\d]*([\\d:]+)\\s*[-–]\\s*([\\d:]+)`, 'gi')
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(cleanText)
      if (match) {
        let timeStr = ''
        if (match[1] && match[2]) {
          timeStr = `${match[1]} bis ${match[2]} Uhr`
          if (match[3] && match[4]) {
            timeStr += ` und ${match[3]} bis ${match[4]} Uhr`
          }
        }

        if (timeStr) {
          // Translate common German terms to English
          const translatedTime = timeStr
            .replace(/bis/g, 'to')
            .replace(/und/g, 'and')
            .replace(/Uhr/g, '')
            .replace(/\s+/g, ' ')
            .trim()

          openingHours[dayName] = translatedTime
          foundAny = true
          console.log(`📅 Found ${dayName}: ${translatedTime}`)
          break
        }
      }
    }

    // Also check for "geschlossen" patterns
    const closedPattern = new RegExp(`${day}[^\\n]*geschlossen`, 'gi')
    const closedMatch = closedPattern.exec(cleanText)
    if (closedMatch && !openingHours[dayName]) {
      const fullMatch = closedMatch[0]
      // Extract any time info before "geschlossen"
      const timeBeforeClosed = fullMatch.match(/([\\d\\.]+)\s*bis\s*([\\d\\.]+)\s*uhr[^\\d]*geschlossen/i)
      if (timeBeforeClosed) {
        const translatedClosed = `${timeBeforeClosed[1]} to ${timeBeforeClosed[2]} – closed afternoons`
        openingHours[dayName] = translatedClosed
        foundAny = true
        console.log(`📅 Found ${dayName}: ${translatedClosed}`)
      }
    }
  }

  if (foundAny) {
    console.log(`✅ Fallback extraction found ${Object.keys(openingHours).length} days with opening hours`)
    return openingHours
  }

  console.log('❌ Fallback extraction found no opening hours')
  return null
}

export interface MunicipalityLiveData {
  opening_hours: Record<string, string> | null
  phone: string | null
  email: string | null
  address: string | null
  required_documents: string[] | null
  registration_fee_chf: number | null
  special_notices: string | null
  registration_url: string | null
}

/**
 * Scrape live data from municipality website
 * 
 * @param gemeinde - Municipality name
 * @param websiteUrl - Base website URL
 * @param registrationPages - Pre-stored pages from database (for high-traffic municipalities)
 * @returns Municipality data and discovered pages (for storage)
 */
export async function scrapeMunicipalityLive(
  gemeinde: string,
  websiteUrl: string | null,
  registrationPages: string[] = []
): Promise<MunicipalityLiveData & { discovered_pages?: string[] }> {
  console.log(`🔍 scrapeMunicipalityLive called for: ${gemeinde}, URL: ${websiteUrl}, stored pages: ${registrationPages.length}`)
  
  if (!websiteUrl) {
    console.warn(`No website URL for ${gemeinde}, returning null data`)
    return {
      opening_hours: null,
      phone: null,
      email: null,
      address: null,
      required_documents: null,
      registration_fee_chf: null,
      special_notices: null,
      registration_url: null,
    }
  }

  const hasStoredPages = registrationPages && registrationPages.length > 0
  let discoveredPages: string[] = []

  // Add pre-configured pages for top municipalities (80%+ of expats) BEFORE dynamic discovery
  // Based on statistics: Top 10 cities = 84% of expats in Switzerland
  // Source: https://www.watson.ch/schweiz/wirtschaft/524955752-was-expats-an-der-schweiz-stoert
  const gemeindeLower = gemeinde.toLowerCase()
  const topMunicipalities: Record<string, string[]> = {
    // Top 1: Zürich (19% of expats)
    'zürich': [
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten.html', // Fallback old URL
    ],
    'zuerich': [
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste',
      'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten.html', // Fallback old URL
    ],
    // Top 2: Genf (18% of expats)
    'genf': [
      'https://www.geneve.ch/fr/themes/administration/etat-civil/contact-et-horaires',
      'https://www.geneve.ch/fr/themes/administration/etat-civil',
    ],
    'genève': [
      'https://www.geneve.ch/fr/themes/administration/etat-civil/contact-et-horaires',
      'https://www.geneve.ch/fr/themes/administration/etat-civil',
    ],
    'geneve': [
      'https://www.geneve.ch/fr/themes/administration/etat-civil/contact-et-horaires',
      'https://www.geneve.ch/fr/themes/administration/etat-civil',
    ],
    // Top 3: Basel (12% of expats) - Use official Staatskalender link with correct opening hours
    'basel': [
      'https://staatskalender.bs.ch/organization/regierung-und-verwaltung/justiz-und-sicherheitsdepartement/bevoelkerungsdienste-und-migration/bevoelkerungsamt/einwohneramt',
      'https://www.bs.ch/jsd/bdm/bevoelkerungsamt/einwohneramt',
      'https://www.bs.ch/jsd/bdm/migrationsamt',
    ],
    // Top 4: Lausanne (9% of expats)
    'lausanne': [
      'https://www.lausanne.ch/officiel/administration/etat-civil/contact-et-horaires',
      'https://www.lausanne.ch/officiel/administration/etat-civil',
    ],
    // Top 5: Bern (6% of expats)
    'bern': [
      'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/oeffnungszeiten',
      'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/kontakt',
    ],
    // Top 6: Lugano (6% of expats)
    'lugano': [
      'https://www.lugano.ch/temi/popolazione/anagrafe/orari',
      'https://www.lugano.ch/temi/popolazione/anagrafe/contatti',
      'https://www.lugano.ch/temi/popolazione/anagrafe',
    ],
    // Top 7: Zug (6% of expats)
    'zug': [
      'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/kontakt',
      'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste',
    ],
    // Top 8: Luzern (3% of expats)
    'luzern': [
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
    'lucerne': [
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
    // Top 9: Neuenburg (3% of expats)
    'neuenburg': [
      'https://www.neuchatelville.ch/fr/administration/etat-civil/contact-et-horaires',
      'https://www.neuchatelville.ch/fr/administration/etat-civil',
    ],
    'neuchâtel': [
      'https://www.neuchatelville.ch/fr/administration/etat-civil/contact-et-horaires',
      'https://www.neuchatelville.ch/fr/administration/etat-civil',
    ],
    // Top 10: St. Gallen (2% of expats)
    'st. gallen': [
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
    'st gallen': [
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
    'sankt gallen': [
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
    // Additional high-traffic municipalities in Basel region
    'allschwil': [
      'https://www.allschwil.ch/de/verwaltung/oeffnungszeiten/',
    ],
    // Winterthur (major city, many expats)
    'winterthur': [
      'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
      'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
      'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste',
    ],
  }
  
  const topPages = topMunicipalities[gemeindeLower]
  if (topPages) {
    if (hasStoredPages) {
      console.log(`📚 ${gemeinde} has stored pages, but also has top municipality config - merging`)
      // Merge top pages with stored pages (top pages have priority)
      registrationPages = [...topPages, ...registrationPages]
    } else {
      // Add top municipality pages if not already stored in DB
      registrationPages = [...topPages, ...registrationPages]
      console.log(`🎯 Added ${topPages.length} pre-configured pages for ${gemeinde} (high-traffic municipality)`)
    }
  }

  if (hasStoredPages) {
    // Use pre-stored pages (for high-traffic municipalities with 80%+ of expats)
    // NO dynamic discovery needed - direct access to known URLs
    console.log(`📚 Using ${registrationPages.length} stored pages for ${gemeinde} (skipping dynamic search)`)
  } else {
    // Dynamic discovery for other municipalities
    console.log(`🔍 Dynamically discovering pages for ${gemeinde} from ${websiteUrl}`)
    discoveredPages = await findRegistrationPages(websiteUrl)
    // Merge discovered pages with top pages (if any)
    registrationPages = [...registrationPages, ...discoveredPages]
  }

  // Step 2: Fetch all relevant pages (with smart prioritization)
  const pageContents: string[] = []
  const maxPages = 6 // Increased to get more comprehensive data

  console.log(`📋 Total pages to fetch for ${gemeinde}: ${registrationPages.length}`)
  console.log(`📋 Pages: ${registrationPages.slice(0, 5).join(', ')}${registrationPages.length > 5 ? '...' : ''}`)
  
  // Prioritize pages: Öffnungszeiten pages FIRST, then base URL, then contact pages
  const prioritizedPages = [...registrationPages].sort((a, b) => {
    const aLower = a.toLowerCase()
    const bLower = b.toLowerCase()
    
    // Öffnungszeiten pages have highest priority
    const aHasOeffnungszeiten = aLower.includes('oeffnungszeiten') || aLower.includes('heures-ouverture') || aLower.includes('orari')
    const bHasOeffnungszeiten = bLower.includes('oeffnungszeiten') || bLower.includes('heures-ouverture') || bLower.includes('orari')
    
    if (aHasOeffnungszeiten && !bHasOeffnungszeiten) return -1
    if (!aHasOeffnungszeiten && bHasOeffnungszeiten) return 1
    
    // Base URL second priority
    if (a === websiteUrl) return -1
    if (b === websiteUrl) return 1
    
    // Contact pages third priority
    const aHasKontakt = aLower.includes('kontakt') || aLower.includes('contact') || aLower.includes('contatto')
    const bHasKontakt = bLower.includes('kontakt') || bLower.includes('contact') || bLower.includes('contatto')
    
    if (aHasKontakt && !bHasKontakt) return -1
    if (!aHasKontakt && bHasKontakt) return 1
    
    return 0
  })
  
  console.log(`📋 Prioritized pages for ${gemeinde}:`, prioritizedPages.slice(0, 6).map((url, i) => `${i + 1}. ${url}`).join('\n'))

  for (const url of prioritizedPages.slice(0, maxPages)) {
    try {
      console.log(`📥 Fetching ${url}...`)
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Village App Bot 1.0)',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (response.ok) {
        const html = await response.text()
        const text = stripHtmlAndClean(html)
        
        // Check if content contains time-related keywords (for debugging)
        const hasTimeKeywords = /(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so|uhr|h|:|\d{1,2}\.\d{2}|\d{1,2}:\d{2})/i.test(text)
        console.log(`   Content check: ${text.length} chars, has time keywords: ${hasTimeKeywords}`)
        
        if (text.length > 100) {
          // Only add if meaningful content
          pageContents.push(`URL: ${url}\n\n${text}`)
          console.log(`✓ Fetched ${url} (${text.length} chars, time keywords: ${hasTimeKeywords})`)
        } else {
          console.log(`⚠ Skipped ${url} (too short: ${text.length} chars)`)
        }
      } else {
        console.log(`⚠ Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error instanceof Error ? error.message : error)
    }
  }

  if (pageContents.length === 0) {
    console.warn(`No content fetched for ${gemeinde}`)
    return {
      opening_hours: null,
      phone: null,
      email: null,
      address: null,
      required_documents: null,
      registration_fee_chf: null,
      special_notices: null,
      registration_url: null,
    }
  }

  // Step 3: Try to get data from opendata.swiss first (as additional source)
  let opendataContactData: MunicipalityLiveData | null = null
  try {
    console.log(`🔍 Checking opendata.swiss for ${gemeinde}...`)
    const opendataData = await findMunicipalityContactFromOpendata(gemeinde)
    if (opendataData && (opendataData.phone || opendataData.email || opendataData.address || opendataData.opening_hours)) {
      console.log(`✅ Found contact data from opendata.swiss for ${gemeinde}`)
      opendataContactData = {
        opening_hours: opendataData.opening_hours || null,
        phone: opendataData.phone || null,
        email: opendataData.email || null,
        address: opendataData.address || null,
        required_documents: null,
        registration_fee_chf: null,
        special_notices: null,
        registration_url: null,
      }
    }
  } catch (error) {
    console.log(`⚠️ opendata.swiss lookup failed for ${gemeinde}:`, error)
  }

  // Step 4: Extract structured data with AI from scraped pages
  console.log(`🤖 Extracting data with Gemini for ${gemeinde} from ${pageContents.length} pages (${pageContents.join('\n\n---\n\n').length} chars total)`)
  let extractedData = await extractWithGemini(
    gemeinde,
    pageContents.join('\n\n---\n\n'),
    registrationPages
  )
  console.log(`🤖 Gemini extraction result for ${gemeinde}:`)
  console.log(`   Opening hours: ${extractedData.opening_hours ? Object.keys(extractedData.opening_hours).length + ' days' : 'null'}`)
  if (extractedData.opening_hours) {
    console.log(`   Opening hours details:`, extractedData.opening_hours)
  }
  
  // Step 5: Merge opendata.swiss data with scraped data (opendata takes precedence for contact info)
  if (opendataContactData) {
    extractedData = {
      ...extractedData,
      // Use opendata data if available, otherwise use scraped data
      opening_hours: opendataContactData.opening_hours || extractedData.opening_hours,
      phone: opendataContactData.phone || extractedData.phone,
      email: opendataContactData.email || extractedData.email,
      address: opendataContactData.address || extractedData.address,
    }
    console.log(`📊 Merged opendata.swiss data with scraped data for ${gemeinde}`)
  }

  // Step 6: If no opening hours found, try to fetch Öffnungszeiten page explicitly
  if (!extractedData.opening_hours || Object.keys(extractedData.opening_hours).length === 0) {
    console.log(`⚠ No opening hours found in initial scrape, trying explicit Öffnungszeiten pages for ${gemeinde}`)
    console.log(`   Already tried ${pageContents.length} pages: ${registrationPages.slice(0, 3).join(', ')}`)
    
    // Try common Öffnungszeiten URLs (order matters - most common first)
    const oeffnungszeitenUrls = [
      `${websiteUrl}/oeffnungszeiten`, // Most common pattern
      `${websiteUrl}/_rtr/freieSeite_g156_oeffnungszeiten`, // CMS-specific pattern (found on Münchenstein)
      `${websiteUrl}/verwaltung/oeffnungszeiten`,
      `${websiteUrl}/kontakt`,
      `${websiteUrl}/verwaltung/kontakt`,
      `${websiteUrl}/buerger/oeffnungszeiten`,
      `${websiteUrl}/services/oeffnungszeiten`,
    ]
    
    // Skip URLs we already tried
    const alreadyTried = new Set(registrationPages.map(url => url.toLowerCase()))
    
    for (const url of oeffnungszeitenUrls) {
      if (alreadyTried.has(url.toLowerCase())) {
        console.log(`   ⏭ Skipping ${url} (already tried)`)
        continue
      }
      
      try {
        console.log(`   🔄 Trying ${url}...`)
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Village App Bot 1.0)',
          },
          signal: AbortSignal.timeout(10000),
        })
        
        if (response.ok) {
          const html = await response.text()
          const text = stripHtmlAndClean(html)
          if (text.length > 100) {
            console.log(`   ✓ Fetched ${url} (${text.length} chars)`)
            
            // Check if content actually contains time-related keywords
            const hasTimeKeywords = /(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so|uhr|h|:|\d{1,2}\.\d{2})/i.test(text)
            if (!hasTimeKeywords) {
              console.log(`   ⚠ No time keywords found in ${url}, skipping extraction`)
              continue
            }
            
            const retryData = await extractWithGemini(
              gemeinde,
              `URL: ${url}\n\n${text}`,
              [url]
            )
            
            console.log(`   📊 Retry extraction result:`, {
              has_opening_hours: retryData.opening_hours && Object.keys(retryData.opening_hours).length > 0,
              opening_hours_keys: retryData.opening_hours ? Object.keys(retryData.opening_hours) : []
            })
            
            // Merge: use retry data if it has opening hours
            if (retryData.opening_hours && Object.keys(retryData.opening_hours).length > 0) {
              console.log(`   ✅ SUCCESS! Found opening hours on retry: ${url}`)
              extractedData = {
                ...extractedData,
                opening_hours: retryData.opening_hours,
                // Also merge other data if available
                phone: extractedData.phone || retryData.phone,
                email: extractedData.email || retryData.email,
                address: extractedData.address || retryData.address,
              }
              break // Found it, stop trying
            } else {
              console.log(`   ❌ No opening hours extracted from ${url}`)
            }
          } else {
            console.log(`   ⚠ Content too short (${text.length} chars)`)
          }
        } else {
          console.log(`   ⚠ HTTP ${response.status} for ${url}`)
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${url}:`, error instanceof Error ? error.message : error)
      }
    }
    
    if (!extractedData.opening_hours || Object.keys(extractedData.opening_hours).length === 0) {
      console.log(`   ❌❌❌ FAILED: No opening hours found after retry attempts for ${gemeinde}`)
    }
  }

  // Return data with discovered pages (only if pages were discovered, not pre-stored)
  const result: MunicipalityLiveData & { discovered_pages?: string[] } = {
    ...extractedData,
  }
  
  // Only include discovered_pages if we actually discovered them (not using stored pages)
  if (!hasStoredPages && discoveredPages.length > 0) {
    result.discovered_pages = discoveredPages
  }
  
  return result
}

/**
 * Find registration-related pages on municipality website
 * Uses intelligent discovery: link analysis + common URL patterns
 */
async function findRegistrationPages(baseUrl: string): Promise<string[]> {
  // Comprehensive keywords in all Swiss languages
  const keywords = {
    high: [
      // German (most common)
      'anmeldung', 'einwohnerkontrolle', 'einwohnerdienste', 'oeffnungszeiten',
      'wohnsitzanmeldung', 'zuzug', 'gemeindekanzlei', 'verwaltung',
      // French
      'inscription', 'declaration-residence', 'heures-ouverture', 'contact',
      // Italian
      'iscrizione', 'anagrafe', 'orari', 'contatto',
    ],
    medium: [
      'kontakt', 'buerger', 'services', 'dienstleistungen', 'registration',
      'contact', 'service', 'servizi', 'ufficio', 'bureau',
    ],
  }

  const pages: Set<string> = new Set([baseUrl]) // Always include base URL first

  try {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Village App Bot 1.0)',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      // Fallback: try common URL patterns
      return tryCommonUrlPatterns(baseUrl)
    }

    const html = await response.text()

    // Extract all links with their text content
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)</gi
    const highPriorityLinks: string[] = []
    const mediumPriorityLinks: string[] = []
    let match

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1]
      const linkText = match[2]?.toLowerCase() || ''

      // Skip anchors, mailto, tel, javascript
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        continue
      }

      // Skip external links (different hostname)
      try {
        const baseHostname = new URL(baseUrl).hostname
        if (href.startsWith('http://') || href.startsWith('https://')) {
          const linkHostname = new URL(href, baseUrl).hostname
          if (linkHostname !== baseHostname) {
            continue // External link, skip
          }
        }
      } catch (e) {
        // Invalid URL, will be caught below
      }

      // Make absolute URL
      try {
        const fullUrl = new URL(href, baseUrl).toString()
        const urlLower = fullUrl.toLowerCase()
        const combinedText = `${urlLower} ${linkText}`

        // Check for high priority keywords
        const hasHighKeyword = keywords.high.some((kw) => 
          combinedText.includes(kw)
        )
        
        // Check for medium priority keywords
        const hasMediumKeyword = keywords.medium.some((kw) => 
          combinedText.includes(kw)
        )

        if (hasHighKeyword) {
          highPriorityLinks.push(fullUrl)
        } else if (hasMediumKeyword) {
          mediumPriorityLinks.push(fullUrl)
        }
      } catch (error) {
        // Invalid URL, skip
        continue
      }
    }

    // Add high priority links first (up to 5)
    const uniqueHighLinks = [...new Set(highPriorityLinks)].slice(0, 5)
    uniqueHighLinks.forEach(url => pages.add(url))

    // Add medium priority links if we have space (up to 3 more)
    const uniqueMediumLinks = [...new Set(mediumPriorityLinks)].slice(0, 3)
    uniqueMediumLinks.forEach(url => pages.add(url))

    // If we found very few pages, add common URL patterns as fallback
    if (pages.size < 3) {
      const commonPatterns = tryCommonUrlPatterns(baseUrl)
      commonPatterns.forEach(url => pages.add(url))
    }

    const finalPages = Array.from(pages).slice(0, 8) // Max 8 pages
    console.log(`Found ${finalPages.length} relevant pages for scraping (${uniqueHighLinks.length} high priority, ${uniqueMediumLinks.length} medium priority)`)
    return finalPages
  } catch (error) {
    console.error('Failed to find registration pages:', error)
    // Fallback: try common URL patterns
    return tryCommonUrlPatterns(baseUrl)
  }
}

/**
 * Try common URL patterns for Swiss municipality websites
 * This is a fallback when link discovery fails
 */
function tryCommonUrlPatterns(baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, '') // Remove trailing slash
  const commonPaths = [
    // German paths (most common) - Öffnungszeiten FIRST
    '/oeffnungszeiten', // Most common pattern for opening hours
    '/verwaltung/oeffnungszeiten',
    '/verwaltung/einwohnerdienste/anmeldung',
    '/verwaltung/einwohnerdienste',
    '/verwaltung/kontakt',
    '/einwohnerdienste/anmeldung',
    '/einwohnerdienste',
    '/kontakt',
    '/anmeldung',
    // French paths
    '/services/etat-civil/declaration-de-residence',
    '/services/etat-civil',
    '/themes/population/inscription-residence',
    '/contact',
    // Italian paths
    '/temi/popolazione/anagrafe/iscrizione-anagrafica',
    '/temi/popolazione/anagrafe',
    '/contatto',
  ]

  // Return base URL + top 4 most common paths
  return [base, ...commonPaths.slice(0, 4).map(path => `${base}${path}`)]
}

/**
 * Clean HTML to plain text
 */
function stripHtmlAndClean(html: string): string {
  return html
    // Remove scripts and styles
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    // Limit length for Gemini (max 10k chars per page)
    .slice(0, 10000)
}

/**
 * Normalize opening hours: convert English day names to German and normalize time formats
 * Also attempts to extract missing days from original content if extraction was incomplete
 */
function normalizeOpeningHours(
  openingHours: Record<string, string>,
  pageContent: string
): Record<string, string> | null {
  if (!openingHours || Object.keys(openingHours).length === 0) {
    return null
  }

  // Day name mapping (English → German, and common abbreviations)
  const dayMapping: Record<string, string> = {
    'Monday': 'Montag',
    'Tuesday': 'Dienstag',
    'Wednesday': 'Mittwoch',
    'Thursday': 'Donnerstag',
    'Friday': 'Freitag',
    'Saturday': 'Samstag',
    'Sunday': 'Sonntag',
    'Mo': 'Montag',
    'Di': 'Dienstag',
    'Mi': 'Mittwoch',
    'Do': 'Donnerstag',
    'Fr': 'Freitag',
    'Sa': 'Samstag',
    'So': 'Sonntag',
  }

  const normalized: Record<string, string> = {}

  // First pass: normalize existing entries
  for (const [day, time] of Object.entries(openingHours)) {
    const germanDay = dayMapping[day] || day
    const normalizedTime = normalizeTimeFormat(time)
    if (normalizedTime) {
      normalized[germanDay] = normalizedTime
      console.log(`✅ Normalized ${day} (${time}) → ${germanDay} (${normalizedTime})`)
    } else {
      console.log(`⚠️ Could not normalize time for ${day}: ${time}`)
    }
  }

  // If we have very few days (e.g., only 2), try to extract more from original content
  if (Object.keys(normalized).length < 3) {
    console.log(`⚠️ Only ${Object.keys(normalized).length} days extracted, attempting to find more in original content...`)
    console.log(`📄 Content length: ${pageContent.length} chars, preview: ${pageContent.substring(0, 200)}...`)
    
    // Look for common patterns in the content (case-insensitive)
    // pageContent might be a combined string with multiple pages, so search in all of it
    const content = pageContent
    
    // Pattern 1: "Mo, Di, Mi, Fr: 09:00 - 17:30 Uhr durchgehend" or similar
    // Match: Mo, Di, Mi, Fr followed by times (with flexible spacing)
    const multiDayPattern = /\b(Mo|Montag)[,\s]+(Di|Dienstag)[,\s]+(Mi|Mittwoch)[,\s]+(Fr|Freitag)[:\s]+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/i
    let multiDayMatch = content.match(multiDayPattern)
    
    // Also try without commas: "Mo Di Mi Fr: 09:00 - 17:30"
    if (!multiDayMatch) {
      const multiDayPattern2 = /\b(Mo|Montag)\s+(Di|Dienstag)\s+(Mi|Mittwoch)\s+(Fr|Freitag)[:\s]+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/i
      multiDayMatch = content.match(multiDayPattern2)
    }
    
    const multiDayMatchResult = multiDayMatch
    
    if (multiDayMatchResult) {
      const days = [multiDayMatchResult[1], multiDayMatchResult[2], multiDayMatchResult[3], multiDayMatchResult[4]]
      const startTime = normalizeTime(multiDayMatchResult[5])
      const endTime = normalizeTime(multiDayMatchResult[6])
      
      if (startTime && endTime) {
        const timeRange = `${startTime}-${endTime}`
        days.forEach(day => {
          const germanDay = dayMapping[day] || dayMapping[day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()]
          if (germanDay) {
            normalized[germanDay] = timeRange
          }
        })
        console.log(`✅ Extracted ${days.length} days (${Object.keys(normalized).join(', ')}) from multi-day pattern: ${timeRange}`)
      }
    }
    
    // Pattern 2: "Do: 13:00 - 17:30 Uhr" or "Donnerstag: 13:00 - 17:30"
    const singleDayPattern = /\b(Do|Donnerstag)[:\s]+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/i
    const singleDayMatch = content.match(singleDayPattern)
    
    if (singleDayMatch) {
      const day = singleDayMatch[1]
      const startTime = normalizeTime(singleDayMatch[2])
      const endTime = normalizeTime(singleDayMatch[3])
      
      if (startTime && endTime) {
        const germanDay = dayMapping[day] || dayMapping[day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()] || 'Donnerstag'
        normalized[germanDay] = `${startTime}-${endTime}`
        console.log(`✅ Extracted ${germanDay} from single-day pattern: ${startTime}-${endTime}`)
      }
    }
    
    // Pattern 3: Look for "Montag, Dienstag, Mittwoch, Freitag" with times
    const fullDayPattern = /\b(Montag|Dienstag|Mittwoch|Freitag)[,\s]+(Dienstag|Mittwoch|Freitag)[,\s]+(Mittwoch|Freitag)[,\s]+(Freitag)[:\s]+(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/i
    const fullDayMatch = content.match(fullDayPattern)
    
    if (fullDayMatch) {
      const days = [fullDayMatch[1], fullDayMatch[2], fullDayMatch[3], fullDayMatch[4]]
      const startTime = normalizeTime(fullDayMatch[5])
      const endTime = normalizeTime(fullDayMatch[6])
      
      if (startTime && endTime) {
        const timeRange = `${startTime}-${endTime}`
        days.forEach(day => {
          normalized[day] = timeRange
        })
        console.log(`✅ Extracted ${days.length} days from full day name pattern: ${timeRange}`)
      }
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null
}

/**
 * Normalize time format to HH:MM-HH:MM
 */
function normalizeTimeFormat(time: string): string | null {
  if (!time) return null
  
  // Handle "9 to 12" format
  if (time.match(/^\d+\s+to\s+\d+$/i)) {
    const match = time.match(/(\d+)\s+to\s+(\d+)/i)
    if (match) {
      const start = normalizeTime(match[1])
      const end = normalizeTime(match[2])
      if (start && end) {
        return `${start}-${end}`
      }
    }
  }
  
  // Handle "9-12" format
  if (time.match(/^\d+\s*[-–—]\s*\d+$/)) {
    const match = time.match(/(\d+)\s*[-–—]\s*(\d+)/)
    if (match) {
      const start = normalizeTime(match[1])
      const end = normalizeTime(match[2])
      if (start && end) {
        return `${start}-${end}`
      }
    }
  }
  
  // Handle "09:00-17:30" format (already normalized)
  if (time.match(/^\d{2}:\d{2}\s*[-–—]\s*\d{2}:\d{2}$/)) {
    return time.replace(/\s+/g, '').replace(/[–—]/g, '-')
  }
  
  // Handle "9.00 bis 13.00 Uhr" format
  if (time.match(/\d+\.\d+\s+bis\s+\d+\.\d+/i)) {
    const match = time.match(/(\d+)\.(\d+)\s+bis\s+(\d+)\.(\d+)/i)
    if (match) {
      const start = `${match[1].padStart(2, '0')}:${match[2]}`
      const end = `${match[3].padStart(2, '0')}:${match[4]}`
      return `${start}-${end}`
    }
  }
  
  // Return as-is if already in good format, or try to parse
  return time.trim()
}

/**
 * Normalize a single time value to HH:MM format
 */
function normalizeTime(time: string): string | null {
  if (!time) return null
  
  // Remove "Uhr" and whitespace
  time = time.replace(/uhr/gi, '').trim()
  
  // Handle "9" or "09" → "09:00"
  if (time.match(/^\d{1,2}$/)) {
    return `${time.padStart(2, '0')}:00`
  }
  
  // Handle "9.00" or "09.00" → "09:00"
  if (time.match(/^\d{1,2}\.\d{2}$/)) {
    const [hours, minutes] = time.split('.')
    return `${hours.padStart(2, '0')}:${minutes}`
  }
  
  // Handle "9:00" or "09:00" → "09:00"
  if (time.match(/^\d{1,2}:\d{2}$/)) {
    const [hours, minutes] = time.split(':')
    return `${hours.padStart(2, '0')}:${minutes}`
  }
  
  return null
}

/**
 * Extract structured data using Gemini AI
 * THIS IS THE CRITICAL PART - THE PROMPT QUALITY MATTERS!
 */
async function extractWithGemini(
  gemeinde: string,
  pageContent: string,
  sourceUrls: string[]
): Promise<MunicipalityLiveData> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set')
    return {
      opening_hours: null,
      phone: null,
      email: null,
      address: null,
      required_documents: null,
      registration_fee_chf: null,
      special_notices: null,
      registration_url: null,
    }
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0, // Deterministic output
      maxOutputTokens: 1500,
    },
  })

  const prompt = `You are a Swiss municipality data extraction expert specializing in extracting registration information for foreigners moving to Switzerland.

**TASK:** Extract structured information from this municipality website content.

**Municipality:** ${gemeinde}
**Source URLs:** ${sourceUrls.join(', ')}

**Website Content:**
${pageContent}

**CRITICAL INSTRUCTIONS:**
1. Extract ONLY information that is EXPLICITLY stated in the content
2. If information is not found or unclear, return null
3. Be precise with opening hours format
4. Return valid JSON only
5. **CRITICAL FOR OPENING HOURS - THIS IS THE MOST IMPORTANT FIELD:**
   - **MUST FIND**: Look for "Öffnungszeiten", "Opening hours", "Heures d'ouverture", "Orari"
   - **SEARCH FOR**: Office hours for "Einwohnerdienste", "Gemeindekanzlei", "Verwaltung", "Bürgerdienst", "Gemeindehaus", "Bürgerbüro"
   - **TIME FORMATS**: Accept any format: "08:00-11:30", "8-11.30 Uhr", "Mo-Fr 8-12", "9.00 bis 13.00 Uhr", "9:00-12:00 und 14:00-16:00"
   - **SEARCH EVERYWHERE**: Check ALL pages provided, especially pages with "oeffnungszeiten" or "kontakt" in the URL
   - **LOCATIONS**: Opening hours might be in tables, lists, paragraph text, or even in the page title/headings
   - **PRIORITY**: If you find ANY mention of times and days (even partial), extract them. Better to have partial data than null.
   - **EXAMPLES TO LOOK FOR**:
     * "Montag: 9.00 bis 13.00 Uhr"
     * "Mo-Fr: 8-12, 14-17"
     * "Mo, Di, Mi, Fr: 09:00 - 17:30 Uhr durchgehend" → Extract as: Montag: 09:00-17:30, Dienstag: 09:00-17:30, Mittwoch: 09:00-17:30, Freitag: 09:00-17:30
     * "Do: 13:00 - 17:30 Uhr" → Extract as: Donnerstag: 13:00-17:30
     * "Dienstag: 9.00 bis 12.00 Uhr und 14.00 bis 16.00 Uhr"
     * Any combination of day names (Montag, Dienstag, etc.) or abbreviations (Mo, Di, Mi, Do, Fr, Sa, So) with times
   - **DAY ABBREVIATIONS**: Recognize these abbreviations and expand them:
     * Mo = Montag, Di = Dienstag, Mi = Mittwoch, Do = Donnerstag, Fr = Freitag, Sa = Samstag, So = Sonntag
     * If you see "Mo, Di, Mi, Fr: 09:00-17:30", extract ALL four days separately with the same hours

**OUTPUT FORMAT (strict JSON):**
{
  "opening_hours": {
    "Montag": "09:00-17:30",
    "Dienstag": "09:00-17:30",
    "Mittwoch": "09:00-17:30",
    "Donnerstag": "13:00-17:30",
    "Freitag": "09:00-17:30"
  } or null,
  "phone": "+41 56 269 12 20" or null,
  "email": "gemeinde@boettstein.ch" or null,
  "address": "Kirchweg 16, 5314 Kleindöttingen" or null,
  "required_documents": [
    "Passport/ID for each family member",
    "Employment contract",
    "Rental agreement",
    "Passport photos",
    "Proof of health insurance"
  ] or null,
  "registration_fee_chf": 50 or null,
  "special_notices": "Office closed December 24-26" or null,
  "registration_url": "https://example.ch/anmeldung" or null
}

**RULES:**
- **Opening hours (HIGHEST PRIORITY)**: 
  * **MANDATORY: Use ONLY German day names**: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag
  * **NEVER use English names**: Do NOT use Monday, Tuesday, Wednesday, etc. ALWAYS use German names.
  * **EXPAND ABBREVIATIONS**: If you see "Mo, Di, Mi, Fr: 09:00-17:30", extract as separate entries:
    - Montag: 09:00-17:30
    - Dienstag: 09:00-17:30
    - Mittwoch: 09:00-17:30
    - Freitag: 09:00-17:30
  * **EXTRACT ALL DAYS**: If you see "Mo, Di, Mi, Fr: 09:00 - 17:30 Uhr durchgehend" and "Do: 13:00 - 17:30 Uhr", you MUST extract:
    - Montag: 09:00-17:30
    - Dienstag: 09:00-17:30
    - Mittwoch: 09:00-17:30
    - Donnerstag: 13:00-17:30
    - Freitag: 09:00-17:30
  * Normalize time formats to "HH:MM-HH:MM" format (always use 24-hour format with leading zeros)
  * Convert "9.00 bis 13.00 Uhr" → "09:00-13:00"
  * Convert "8-11.30 Uhr" → "08:00-11:30"
  * Convert "09:00 - 17:30 Uhr" → "09:00-17:30" (remove spaces and "Uhr")
  * Convert "9 to 12" → "09:00-12:00" (expand to full format)
  * **EXTRACT ALL DAYS**: If multiple days share the same hours, extract each day separately. Do NOT combine them.
  * If you see "nachmittags geschlossen" or "afternoon closed", only include morning hours
  * **CRITICAL**: If you find ANY opening hours information, you MUST extract ALL days mentioned with their COMPLETE time ranges. Do NOT return null for opening_hours unless you are absolutely certain there is NO time information anywhere in the content.
  * **COMPLETE EXTRACTION**: Extract the FULL time range (e.g., "09:00-17:30", not just "9-12" or "9 to 12")
  * **EXAMPLE**: If content says "Mo, Di, Mi, Fr: 09:00 - 17:30 Uhr durchgehend" and "Do: 13:00 - 17:30 Uhr", return:
    {
      "Montag": "09:00-17:30",
      "Dienstag": "09:00-17:30",
      "Mittwoch": "09:00-17:30",
      "Donnerstag": "13:00-17:30",
      "Freitag": "09:00-17:30"
    }
- Phone: Format as +41 XX XXX XX XX
- Email: Lowercase
- Documents: List ALL mentioned for foreigner registration ("Anmeldung", "Zuzug", "Einwohnerkontrolle")
- Fee: Extract only the number (e.g., "CHF 50-100" → 75, or use average if range)
- Special notices: Closures, holidays, important announcements
- Return ONLY the JSON object, no explanation

**REMINDER**: Opening hours are the MOST IMPORTANT field. Search thoroughly through ALL content. Even partial hours are better than null.

JSON:`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Clean up response (remove markdown code blocks if present)
    const jsonText = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    const parsed = JSON.parse(jsonText)

    // Validate structure
    if (typeof parsed !== 'object') {
      throw new Error('Invalid response structure')
    }

    // Validate opening_hours: must be an object with at least one entry
    const openingHours = parsed.opening_hours
    const validOpeningHours = 
      openingHours && 
      typeof openingHours === 'object' && 
      !Array.isArray(openingHours) &&
      Object.keys(openingHours).length > 0
        ? openingHours
        : null

    console.log('Extracted opening hours:', {
      raw: openingHours,
      valid: validOpeningHours,
      keys: openingHours ? Object.keys(openingHours) : []
    })

    // Post-process opening hours: normalize day names and time formats
    const normalizedOpeningHours = validOpeningHours ? normalizeOpeningHours(validOpeningHours, pageContent) : null

    return {
      opening_hours: normalizedOpeningHours,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null,
      required_documents: parsed.required_documents || null,
      registration_fee_chf: parsed.registration_fee_chf || null,
      special_notices: parsed.special_notices || null,
      registration_url: parsed.registration_url || null,
    }
  } catch (error) {
    console.error('Gemini extraction failed:', error)

    // Try fallback extraction for opening hours
    console.log('🔄 Attempting fallback extraction without AI...')
    const fallbackOpeningHours = extractOpeningHoursFallback(pageContent)

    if (fallbackOpeningHours) {
      console.log('✅ Fallback extraction successful!')
      return {
        opening_hours: fallbackOpeningHours,
        phone: null,
        email: null,
        address: null,
        required_documents: null,
        registration_fee_chf: null,
        special_notices: null,
        registration_url: null,
      }
    }

    // Return null structure on complete failure
    return {
      opening_hours: null,
      phone: null,
      email: null,
      address: null,
      required_documents: null,
      registration_fee_chf: null,
      special_notices: null,
      registration_url: null,
    }
  }
}
