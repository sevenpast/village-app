/**
 * School Authority Resolver
 * Resolves user address to the correct school authority (Gemeinde or Schulkreis)
 */

import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface SchoolAuthorityInfo {
  authority_name: string
  authority_type: 'gemeinde' | 'schulkreis'
  contact_office: string
  address: string | null
  phone: string | null
  email: string | null
  website_url: string
  registration_url: string | null
  school_district?: {
    name: string
    boundaries: string
  }
}

/**
 * Main function: Resolve school authority for a given address
 */
export async function resolveSchoolAuthority(
  userAddress: string,
  userPLZ: string,
  municipality: string
): Promise<SchoolAuthorityInfo> {
  const supabase = await createClient()

  // Step 1: Get municipality data
  const { data: municipalityData, error: muniError } = await supabase
    .from('municipality_master_data')
    .select('*')
    .ilike('gemeinde_name', municipality)
    .maybeSingle()

  if (muniError || !municipalityData) {
    throw new Error(`Municipality ${municipality} not found`)
  }

  // Step 2: Check authority type
  if (!municipalityData.school_authority_type || municipalityData.school_authority_type === 'single') {
    // Simple case: Single school administration
    return {
      authority_name: `Schulverwaltung ${municipalityData.gemeinde_name}`,
      authority_type: 'gemeinde',
      contact_office: `Gemeindeverwaltung ${municipalityData.gemeinde_name}`,
      address: null, // Will be populated by scraping
      phone: null,
      email: null,
      website_url: municipalityData.school_administration_url || municipalityData.official_website || '',
      registration_url: null,
    }
  }

  // Step 3: Multi-district - find the right Schulkreis
  const district = await findSchoolDistrict(
    municipalityData.id,
    userPLZ,
    userAddress
  )

  if (!district) {
    // Fallback: Return municipality-level info
    return {
      authority_name: `Schulamt ${municipalityData.gemeinde_name}`,
      authority_type: 'gemeinde',
      contact_office: `Schulamt ${municipalityData.gemeinde_name}`,
      address: null,
      phone: null,
      email: null,
      website_url: municipalityData.school_administration_url || municipalityData.official_website || '',
      registration_url: null,
    }
  }

  return {
    authority_name: district.district_name,
    authority_type: 'schulkreis',
    contact_office: district.contact_office || district.district_name,
    address: district.office_address || null,
    phone: district.phone || null,
    email: district.email || null,
    website_url: district.website_url || municipalityData.official_website || '',
    registration_url: district.registration_url || null,
    school_district: {
      name: district.district_name,
      boundaries: district.postal_codes?.join(', ') || 'Contact office for confirmation',
    },
  }
}

/**
 * Find school district based on PLZ and address
 */
async function findSchoolDistrict(
  municipalityId: string,
  userPLZ: string,
  userAddress: string
): Promise<any | null> {
  const supabase = await createClient()

  // Method 1: Match by postal code
  if (userPLZ) {
    const { data: districtByPLZ } = await supabase
      .from('school_districts')
      .select('*')
      .eq('municipality_id', municipalityId)
      .contains('postal_codes', [userPLZ])
      .maybeSingle()

    if (districtByPLZ) {
      return districtByPLZ
    }
  }

  // Method 2: Get all districts and use AI to match
  const { data: allDistricts } = await supabase
    .from('school_districts')
    .select('*')
    .eq('municipality_id', municipalityId)

  if (!allDistricts || allDistricts.length === 0) {
    return null
  }

  // Use AI to match address to district
  const matchedDistrict = await matchAddressToDistrict(
    userAddress,
    userPLZ,
    allDistricts
  )

  return matchedDistrict
}

/**
 * AI-powered district matching
 */
async function matchAddressToDistrict(
  address: string,
  plz: string,
  districts: any[]
): Promise<any | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set, cannot use AI matching')
    return null
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const districtInfo = districts
    .map(
      (d) => `
${d.district_name}:
- Postal codes: ${d.postal_codes?.join(', ') || 'Unknown'}
- Boundary streets: ${d.boundary_streets?.join(', ') || 'Not defined'}
- Website: ${d.website_url}
  `
    )
    .join('\n\n')

  const prompt = `You are a Swiss school district expert.

**Task:** Determine which school district this address belongs to.

**Address:**
${address}
PLZ: ${plz}

**Available School Districts:**
${districtInfo}

**Instructions:**
1. Match the postal code first (most reliable)
2. If no PLZ match, analyze street names and boundaries
3. Return ONLY the district name from the list above
4. If uncertain, return "UNCERTAIN"

**Answer (district name only):`

  try {
    const result = await model.generateContent(prompt)
    const districtName = result.response.text().trim()

    if (districtName === 'UNCERTAIN' || !districtName) {
      return null
    }

    // Find matching district
    return (
      districts.find(
        (d) =>
          d.district_name.includes(districtName) ||
          districtName.includes(d.district_name_short || '')
      ) || null
    )
  } catch (error) {
    console.error('AI district matching failed:', error)
    return null
  }
}

