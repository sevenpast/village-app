import { GoogleGenerativeAI } from '@google/generative-ai'
import { getMunicipalityUrl } from './municipality-urls'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Simple in-memory cache (for MVP - later can use Redis)
const cache = new Map<string, { data: any; expires: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface MunicipalityInfo {
  einwohnerdienste: {
    hours: {
      [key: string]: { morning?: string; afternoon?: string; closed?: boolean }
    }
    phone?: string
    email?: string
    website?: string
    registration_url?: string // URL to the registration page (found by AI scraping)
  }
  schulverwaltung?: {
    hours?: {
      [key: string]: { morning?: string; afternoon?: string; closed?: boolean }
    }
    phone?: string
    email?: string
    website?: string
  }
  confidence: number
  last_checked: string
}


/**
 * Get municipality info with caching
 */
export async function getMunicipalityInfo(
  municipalityName: string | null
): Promise<MunicipalityInfo | null> {
  if (!municipalityName) return null

  const cacheKey = `municipality:${municipalityName.toLowerCase()}`
  
  // Check cache first
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    console.log(`✅ Cache HIT for ${municipalityName}`)
    return cached.data
  }

  console.log(`🔄 Cache MISS for ${municipalityName} - Fetching...`)

  // Not in cache → Fetch live
  const info = await scrapeMunicipalityInfo(municipalityName)

  // Cache for 24h
  if (info) {
    cache.set(cacheKey, {
      data: info,
      expires: Date.now() + CACHE_DURATION,
    })
  }

  return info
}

/**
 * Keywords for finding registration pages (multilingual)
 */
const REGISTRATION_KEYWORDS = {
  de: ['anmeldung', 'einwohner', 'einwohneramt', 'wohnhaft', 'meldung', 'ummeldung', 'anmeldeformular', 'meldeformular', 'wohnsitz'],
  fr: ['inscription', 'population', 'bureau des habitants', 'déclaration de domicile', 'habitant'],
  it: ['iscrizione', 'anagrafe', 'comune', 'segnalazione domicilio'],
  en: ['registration', 'residence registration'],
}

const REGISTRATION_URL_PATTERNS = [
  '/anmeldung',
  '/einwohner',
  '/einwohneramt',
  '/einwohnerdienste',
  '/meldung',
  '/formular',
  '/dienstleistungen',
  '/services',
  '/verwaltung',
  '/kontakt',
  '/inscription',
  '/population',
  '/iscrizione',
  '/anagrafe',
]

/**
 * Fetch and parse sitemap.xml to find candidate URLs
 */
async function fetchSitemap(domain: string): Promise<string[]> {
  const sitemapPaths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-1.xml']
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`
  
  for (const path of sitemapPaths) {
    try {
      const url = `${baseUrl}${path}`
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Village/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      
      if (response.ok) {
        const xml = await response.text()
        // Extract <loc> tags from XML
        const locMatches = xml.match(/<loc>(.*?)<\/loc>/gi) || []
        const urls = locMatches.map(match => {
          const url = match.replace(/<\/?loc>/gi, '').trim()
          return url
        })
        if (urls.length > 0) {
          console.log(`✅ Found sitemap with ${urls.length} URLs`)
          return urls
        }
      }
    } catch (error) {
      // Continue to next path
      continue
    }
  }
  
  return []
}

/**
 * Score a page for relevance to residence registration
 */
function scorePageForRegistration(
  html: string,
  url: string,
  municipalityName: string
): number {
  let score = 0.0
  
  // Extract text content
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
  
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].toLowerCase() : ''
  
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i)
  const h1 = h1Match ? h1Match[1].toLowerCase() : ''
  
  // Check if municipality name appears (authoritative signal)
  if (municipalityName && textContent.includes(municipalityName.toLowerCase())) {
    score += 0.15
  }
  
  // Title/H1 exact match with keywords (high confidence)
  const allKeywords = [
    ...REGISTRATION_KEYWORDS.de,
    ...REGISTRATION_KEYWORDS.fr,
    ...REGISTRATION_KEYWORDS.it,
    ...REGISTRATION_KEYWORDS.en,
  ]
  
  for (const keyword of allKeywords) {
    if (title.includes(keyword) || h1.includes(keyword)) {
      score += 0.25
      break // Only count once
    }
    if (textContent.includes(keyword)) {
      score += 0.05 // Lower weight for body text
    }
  }
  
  // URL pattern matching
  for (const pattern of REGISTRATION_URL_PATTERNS) {
    if (url.toLowerCase().includes(pattern)) {
      score += 0.2
      break
    }
  }
  
  // Structured data (JSON-LD)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gi) || []
  if (jsonLdMatches.length > 0) {
    score += 0.15
    // Check if structured data contains service info
    for (const match of jsonLdMatches) {
      if (match.toLowerCase().includes('service') || match.toLowerCase().includes('contactpoint')) {
        score += 0.1
      }
    }
  }
  
  // Meta description check
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i)
  if (metaDescMatch) {
    const desc = metaDescMatch[1].toLowerCase()
    if (allKeywords.some(kw => desc.includes(kw))) {
      score += 0.1
    }
  }
  
  return Math.min(score, 1.0)
}

/**
 * Find candidate registration URLs using sitemap or homepage links
 */
async function findRegistrationCandidates(
  domain: string,
  municipalityName: string
): Promise<Array<{ url: string; score: number }>> {
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`
  const candidates: Array<{ url: string; score: number }> = []
  
  // Strategy 1: Try sitemap.xml first
  console.log(`🔍 Checking sitemap for ${domain}...`)
  const sitemapUrls = await fetchSitemap(domain)
  
  if (sitemapUrls.length > 0) {
    // Filter to relevant URLs
    const relevantUrls = sitemapUrls.filter(url => {
      const urlLower = url.toLowerCase()
      return REGISTRATION_URL_PATTERNS.some(pattern => urlLower.includes(pattern)) ||
             REGISTRATION_KEYWORDS.de.some(kw => urlLower.includes(kw)) ||
             REGISTRATION_KEYWORDS.fr.some(kw => urlLower.includes(kw))
    })
    
    // Score each candidate URL
    for (const url of relevantUrls.slice(0, 20)) { // Limit to 20 for performance
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Village/1.0)' },
          signal: AbortSignal.timeout(5000),
        })
        
        if (response.ok) {
          const html = await response.text()
          const score = scorePageForRegistration(html, url, municipalityName)
          if (score > 0.3) { // Only include reasonable candidates
            candidates.push({ url, score })
          }
        }
      } catch (error) {
        // Skip failed requests
        continue
      }
    }
  }
  
  // Strategy 2: If no sitemap results, crawl homepage links (depth 1)
  if (candidates.length === 0) {
    console.log(`🔍 Crawling homepage links for ${domain}...`)
    try {
      const response = await fetch(baseUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Village/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      
      if (response.ok) {
        const html = await response.text()
        const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi) || []
        const links: string[] = []
        
        linkMatches.forEach((match) => {
          const hrefMatch = match.match(/href=["']([^"']+)["']/i)
          if (hrefMatch) {
            let href = hrefMatch[1]
            // Convert relative URLs to absolute
            if (href.startsWith('/')) {
              href = `${baseUrl}${href}`
            } else if (href.startsWith('http') && href.includes(new URL(baseUrl).hostname)) {
              // Same domain
            } else if (!href.startsWith('http')) {
              href = `${baseUrl}/${href}`
            }
            
            // Check if link is relevant
            const hrefLower = href.toLowerCase()
            if (REGISTRATION_URL_PATTERNS.some(p => hrefLower.includes(p)) ||
                REGISTRATION_KEYWORDS.de.some(kw => hrefLower.includes(kw))) {
              links.push(href)
            }
          }
        })
        
        // Score each link
        for (const link of links.slice(0, 15)) { // Limit to 15 for performance
          try {
            const linkResponse = await fetch(link, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Village/1.0)' },
              signal: AbortSignal.timeout(5000),
            })
            
            if (linkResponse.ok) {
              const linkHtml = await linkResponse.text()
              const score = scorePageForRegistration(linkHtml, link, municipalityName)
              if (score > 0.3) {
                candidates.push({ url: link, score })
              }
            }
          } catch (error) {
            continue
          }
        }
      }
    } catch (error) {
      console.error(`Failed to crawl homepage:`, error)
    }
  }
  
  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)
  
  return candidates
}

/**
 * Scrape municipality info using Gemini AI
 * This function uses intelligent discovery: sitemap → keyword search → AI extraction
 */
async function scrapeMunicipalityInfo(
  municipalityName: string
): Promise<MunicipalityInfo | null> {
  try {
    // Get base URL first (for scraping)
    const website = getMunicipalityUrl(municipalityName, false)
    if (!website || website === '#') return null
    
    // Extract domain from URL
    let domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    
    // Step 1: Intelligent URL Discovery (NEW - First Fallback)
    console.log(`🔍 Step 1: Discovering registration URL for ${municipalityName}...`)
    const candidates = await findRegistrationCandidates(domain, municipalityName)
    let bestRegistrationUrl: string | null = null
    
    if (candidates.length > 0 && candidates[0].score >= 0.7) {
      // High confidence match - use it directly
      bestRegistrationUrl = candidates[0].url
      console.log(`✅ Found high-confidence registration URL: ${bestRegistrationUrl} (score: ${candidates[0].score.toFixed(2)})`)
    } else if (candidates.length > 0) {
      // Medium confidence - store for AI review
      bestRegistrationUrl = candidates[0].url
      console.log(`⚠️ Found medium-confidence URL: ${bestRegistrationUrl} (score: ${candidates[0].score.toFixed(2)})`)
    }

    // Step 2: Fetch main website for other info (opening hours, contact)
    console.log(`📡 Step 2: Fetching ${website} for additional info...`)
    const response = await fetch(website, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Village/1.0)',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`Failed to fetch ${website}: ${response.status}`)
      // If we found a registration URL, still return fallback info
      if (bestRegistrationUrl) {
        const fallback = getFallbackInfo(municipalityName, website)
        fallback.einwohnerdienste.registration_url = bestRegistrationUrl
        return fallback
      }
      return null
    }

    const html = await response.text()

    // Step 3: Extract relevant content for AI analysis
    let mainContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
    
    // Keep only relevant sections
    const keywords = ['öffnungszeit', 'office hour', 'kontakt', 'contact', 'einwohner', 'verwaltung', 'administrat']
    const lines = mainContent.split('.').filter(line => 
      keywords.some(keyword => line.toLowerCase().includes(keyword))
    )
    mainContent = lines.join('. ').substring(0, 4000)
    
    // Add discovered registration URL to context
    if (bestRegistrationUrl) {
      mainContent += `\n\nDiscovered registration URL: ${bestRegistrationUrl}`
    }

    // Final cleanup: limit content length
    mainContent = mainContent.substring(0, 4000)

    // 3. AI Extraction with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
Extract opening hours, contact info, and registration page URL for the Swiss municipality "${municipalityName}".

Website Content:
${mainContent}

Return ONLY valid JSON (no markdown) with this structure:
{
  "einwohnerdienste": {
    "hours": {
      "monday": {"morning": "08:00-12:00", "afternoon": "14:00-17:00"} or {"closed": true},
      "tuesday": {...},
      "wednesday": {...},
      "thursday": {...},
      "friday": {...},
      "saturday": {"closed": true},
      "sunday": {"closed": true}
    },
    "phone": "phone number or null",
    "email": "email or null",
    "website": "${website}",
    "registration_url": "full URL to registration page if found, or null"
  },
  "schulverwaltung": {
    "hours": {...} or null,
    "phone": "phone or null",
    "email": "email or null",
    "website": "url or null"
  },
  "confidence": 0.0 to 1.0,
  "last_checked": "${new Date().toISOString()}"
}

IMPORTANT:
- Use 24-hour format (HH:MM)
- Mark closed days as {"closed": true}
- Try to find the registration page URL (look for links like "Anmeldung", "Wohnsitzanmeldung", "inscription")
- If information is unclear, set confidence lower (0.5-0.7)
- Extract ONLY what you find, don't invent data
- Return ONLY the JSON object, no other text
`

    const result = await model.generateContent(prompt)
    const text = result.response
      .text()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    try {
      const parsed = JSON.parse(text)
      
      // Priority order for registration URL:
      // 1. Best discovered URL from sitemap/keyword search (highest confidence)
      // 2. AI-found URL from structured data
      // 3. Fallback to mapping table / pattern
      if (bestRegistrationUrl && (!parsed.einwohnerdienste?.registration_url || 
          (candidates.length > 0 && candidates[0].score >= 0.7))) {
        // Use discovered URL if we have high confidence
        parsed.einwohnerdienste = {
          ...parsed.einwohnerdienste,
          registration_url: bestRegistrationUrl,
        }
        console.log(`✅ Using discovered registration URL (score: ${candidates[0]?.score.toFixed(2) || 'N/A'})`)
      } else if (!parsed.einwohnerdienste?.registration_url) {
        // Fallback to mapping table / pattern
        parsed.einwohnerdienste = {
          ...parsed.einwohnerdienste,
          registration_url: getMunicipalityUrl(municipalityName, true),
        }
      }
      
      console.log(`✅ Successfully extracted info for ${municipalityName}`)
      if (parsed.einwohnerdienste?.registration_url) {
        console.log(`   Final registration URL: ${parsed.einwohnerdienste.registration_url}`)
      }
      
      return parsed as MunicipalityInfo
    } catch (parseError) {
      console.error('Failed to parse AI response:', text)
      // Return fallback with best discovered registration URL
      const fallback = getFallbackInfo(municipalityName, website)
      if (bestRegistrationUrl) {
        fallback.einwohnerdienste.registration_url = bestRegistrationUrl
      }
      return fallback
    }
  } catch (error: any) {
    console.error(`Error scraping ${municipalityName}:`, error.message)
    // Return fallback with registration URL from mapping/fallback logic
    const fallbackUrl = getMunicipalityUrl(municipalityName, true)
    const fallback = getFallbackInfo(municipalityName, website || fallbackUrl)
    // Ensure registration URL is always set (from mapping or fallback pattern)
    if (!fallback.einwohnerdienste.registration_url) {
      fallback.einwohnerdienste.registration_url = fallbackUrl
    }
    return fallback
  }
}

/**
 * Fallback info when scraping fails
 * This provides default values that work for most Swiss municipalities
 * Used for all 2000+ municipalities not in the mapping table
 */
function getFallbackInfo(
  municipalityName: string,
  website: string | null
): MunicipalityInfo {
  // Get registration URL using fallback logic (works for all municipalities)
  const registrationUrl = getMunicipalityUrl(municipalityName, true)
  
  return {
    einwohnerdienste: {
      hours: {
        monday: { morning: '08:00-12:00', afternoon: '14:00-17:00' },
        tuesday: { morning: '08:00-12:00', afternoon: '14:00-17:00' },
        wednesday: { morning: '08:00-12:00', afternoon: '14:00-17:00' },
        thursday: { morning: '08:00-12:00', afternoon: '14:00-17:00' },
        friday: { morning: '08:00-12:00' },
        saturday: { closed: true },
        sunday: { closed: true },
      },
      website: website || null,
      registration_url: registrationUrl, // Always include registration URL (from mapping or fallback)
    },
    schulverwaltung: null,
    confidence: 0.5,
    last_checked: new Date().toISOString(),
  }
}

/**
 * Format office hours for display
 */
export function formatOfficeHours(hours: MunicipalityInfo['einwohnerdienste']['hours']): string {
  const dayMap: { [key: string]: string } = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  }

  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  
  // Check if all weekdays have same hours
  const firstDayHours = hours.monday
  const allSame = weekdays.every(day => {
    const dayHours = hours[day as keyof typeof hours]
    return JSON.stringify(dayHours) === JSON.stringify(firstDayHours)
  })

  if (allSame && !firstDayHours?.closed) {
    const morning = firstDayHours.morning
    const afternoon = firstDayHours.afternoon
    
    if (morning && afternoon) {
      return `Monday - Friday: ${morning}, ${afternoon}`
    } else if (morning) {
      return `Monday - Friday: ${morning}`
    }
  }

  // Different hours per day - return detailed schedule
  const lines: string[] = []
  Object.entries(hours).forEach(([day, dayHours]) => {
    if (dayHours?.closed) {
      lines.push(`${dayMap[day] || day}: Closed`)
    } else {
      const parts: string[] = []
      if (dayHours.morning) parts.push(dayHours.morning)
      if (dayHours.afternoon) parts.push(dayHours.afternoon)
      lines.push(`${dayMap[day] || day}: ${parts.join(', ')}`)
    }
  })
  
  return lines.join('\n')
}

