/**
 * School Registration Scraper
 * Scrapes school registration information from authority websites using Gemini AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface SchoolRegistrationInfo {
  registration_process: string | null
  required_documents: string[] | null
  registration_deadline: string | null
  age_requirements: {
    kindergarten?: string
    primary?: string
  } | null
  fees: {
    registration_fee?: number
    materials_fee?: number
  } | null
  special_notes: string | null
  registration_form_url: string | null
  registration_form_pdf_url: string | null
}

/**
 * Scrape school registration information from authority website
 */
export async function scrapeSchoolRegistrationInfo(
  websiteUrl: string,
  municipality: string
): Promise<SchoolRegistrationInfo> {
  if (!websiteUrl) {
    console.warn(`No website URL for ${municipality}, returning default info`)
    return getDefaultRegistrationInfo()
  }

  console.log(`🕷️ Scraping school registration info for ${municipality}`)

  try {
    // Fetch page content
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Village App Bot 1.0)',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.warn(`Failed to fetch ${websiteUrl}: ${response.status}`)
      return getDefaultRegistrationInfo()
    }

    const html = await response.text()
    const textContent = stripHtmlAndClean(html)

    if (textContent.length < 100) {
      console.warn(`Insufficient content from ${websiteUrl}`)
      return getDefaultRegistrationInfo()
    }

    // Extract with Gemini
    const extractedInfo = await extractWithGemini(municipality, textContent, websiteUrl)

    return extractedInfo
  } catch (error) {
    console.error(`Error scraping school registration info for ${municipality}:`, error)
    return getDefaultRegistrationInfo()
  }
}

/**
 * Clean HTML to plain text
 */
function stripHtmlAndClean(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000)
}

/**
 * Extract structured data using Gemini AI
 */
async function extractWithGemini(
  municipality: string,
  pageContent: string,
  sourceUrl: string
): Promise<SchoolRegistrationInfo> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set')
    return getDefaultRegistrationInfo()
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash-001',
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 2000,
    },
  })

  const prompt = `You are a Swiss school registration expert specializing in extracting information for parents registering their children.

**TASK:** Extract school registration information from this municipality website.

**Municipality:** ${municipality}
**Source URL:** ${sourceUrl}

**Website Content:**
${pageContent}

**CRITICAL INSTRUCTIONS:**
1. Extract ONLY information explicitly stated
2. Focus on PUBLIC schools (ignore private schools)
3. Extract information for Kindergarten and Primarschule
4. If information not found, return null
5. Return valid JSON only

**OUTPUT FORMAT (strict JSON):**
{
  "registration_process": "Step-by-step description of how to register" or null,
  "required_documents": [
    "Child's passport or ID",
    "Birth certificate",
    "Proof of residence",
    "Immunization records",
    "Previous school reports (if applicable)"
  ] or null,
  "registration_deadline": "Describe deadline (e.g., 'Before start of school year', 'By April 15')" or null,
  "age_requirements": {
    "kindergarten": "Age 4-6",
    "primary": "Age 6-12"
  } or null,
  "fees": {
    "registration_fee": 0,
    "materials_fee": 50
  } or null,
  "special_notes": "Any important notices (holidays, special procedures for foreigners, etc.)" or null,
  "registration_form_url": "https://example.ch/form" or null,
  "registration_form_pdf_url": "https://example.ch/form.pdf" or null
}

**RULES:**
- Be precise and concise
- Extract ALL documents mentioned
- Focus on information relevant to foreign nationals moving to Switzerland
- If multiple options exist (online/in-person), mention both
- Return ONLY the JSON object, no explanation

JSON:`

  try {
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    const jsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim()

    const parsed = JSON.parse(jsonText)

    // Validate and return
    return {
      registration_process: parsed.registration_process || null,
      required_documents: parsed.required_documents || null,
      registration_deadline: parsed.registration_deadline || null,
      age_requirements: parsed.age_requirements || null,
      fees: parsed.fees || null,
      special_notes: parsed.special_notes || null,
      registration_form_url: parsed.registration_form_url || null,
      registration_form_pdf_url: parsed.registration_form_pdf_url || null,
    }
  } catch (error) {
    console.error('Gemini extraction failed:', error)
    return getDefaultRegistrationInfo()
  }
}

/**
 * Default registration info when scraping fails
 */
function getDefaultRegistrationInfo(): SchoolRegistrationInfo {
  return {
    registration_process: null,
    required_documents: [
      "Child's passport or ID",
      'Birth certificate',
      'Proof of residence (rental contract)',
      'Immunization/vaccination records',
    ],
    registration_deadline: 'Contact authority for details',
    age_requirements: {
      kindergarten: 'Age 4-6 (varies by canton)',
      primary: 'Age 6-12',
    },
    fees: null,
    special_notes: 'Please verify information on official website',
    registration_form_url: null,
    registration_form_pdf_url: null,
  }
}

