/**
 * Municipality Live Data Scraper
 * Scrapes official municipality websites and extracts structured data using Gemini AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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
 */
export async function scrapeMunicipalityLive(
  gemeinde: string,
  websiteUrl: string | null,
  registrationPages: string[] = []
): Promise<MunicipalityLiveData> {
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

  console.log(`🕷️ Scraping ${gemeinde} from ${websiteUrl}`)

  // Step 1: Find relevant pages if not provided
  if (!registrationPages || registrationPages.length === 0) {
    registrationPages = await findRegistrationPages(websiteUrl)
  }

  // Step 2: Fetch all relevant pages
  const pageContents: string[] = []

  for (const url of registrationPages.slice(0, 3)) {
    // Max 3 pages
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Village App Bot 1.0)',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (response.ok) {
        const html = await response.text()
        const text = stripHtmlAndClean(html)
        if (text.length > 100) {
          // Only add if meaningful content
          pageContents.push(text)
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error)
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

  // Step 3: Extract structured data with AI
  const extractedData = await extractWithGemini(
    gemeinde,
    pageContents.join('\n\n---\n\n'),
    registrationPages
  )

  return extractedData
}

/**
 * Find registration-related pages on municipality website
 */
async function findRegistrationPages(baseUrl: string): Promise<string[]> {
  const keywords = [
    'anmeldung',
    'einwohnerkontrolle',
    'gemeindekanzlei',
    'verwaltung',
    'oeffnungszeiten',
    'kontakt',
    'zuzug',
    'registration',
  ]

  try {
    const response = await fetch(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Village App Bot 1.0)',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return [baseUrl] // Fallback to just the base URL
    }

    const html = await response.text()

    // Extract all links
    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi
    const links: string[] = []
    let match

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1]

      // Skip external links, anchors, mailto, etc.
      if (
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        continue
      }

      // Make absolute URL
      try {
        const fullUrl = new URL(href, baseUrl).toString()

        // Only include links with relevant keywords
        if (keywords.some((kw) => fullUrl.toLowerCase().includes(kw))) {
          links.push(fullUrl)
        }
      } catch (error) {
        // Invalid URL, skip
        continue
      }
    }

    // Return unique links
    const uniqueLinks = [...new Set(links)].slice(0, 5)

    // If no relevant links found, return base URL
    return uniqueLinks.length > 0 ? uniqueLinks : [baseUrl]
  } catch (error) {
    console.error('Failed to find registration pages:', error)
    return [baseUrl] // Fallback to just the base URL
  }
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

**OUTPUT FORMAT (strict JSON):**
{
  "opening_hours": {
    "Montag": "08:00-11:30, 13:30-18:30",
    "Dienstag": "08:00-11:30",
    "Mittwoch": "08:00-11:30, 13:30-16:00",
    "Donnerstag": "08:00-11:30",
    "Freitag": "07:00-14:00"
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
- Opening hours: Use German day names (Montag, Dienstag, etc.)
- Phone: Format as +41 XX XXX XX XX
- Email: Lowercase
- Documents: List ALL mentioned for foreigner registration ("Anmeldung")
- Fee: Extract only the number (e.g., "CHF 50-100" → 75)
- Special notices: Closures, holidays, important announcements
- Return ONLY the JSON object, no explanation

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

    return {
      opening_hours: parsed.opening_hours || null,
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
    
    // Try to get response text for debugging
    try {
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      console.error('Response text:', responseText)
    } catch (e) {
      // Ignore - already logged above
    }

    // Return null structure on failure
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
