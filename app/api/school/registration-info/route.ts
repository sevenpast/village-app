import { NextRequest, NextResponse } from 'next/server'
import { resolveSchoolAuthority } from '@/lib/school-authority-resolver'
import { scrapeSchoolRegistrationInfo } from '@/lib/school-registration-scraper'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/school/registration-info
 *
 * Query parameters:
 * - address: User's street address
 * - plz: Postal code
 * - municipality: Municipality name
 * - childAge: Age of child (optional, for guidance)
 *
 * Returns school authority and registration information
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')
  const plz = searchParams.get('plz')
  const municipality = searchParams.get('municipality')
  const childAge = parseInt(searchParams.get('childAge') || '5')

  if (!municipality) {
    return NextResponse.json({ error: 'Municipality parameter required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    // Step 1: Resolve school authority
    const authority = await resolveSchoolAuthority(address || '', plz || '', municipality)

    // Step 2: Check cache (7 day TTL)
    const cacheKey =
      authority.authority_type === 'schulkreis'
        ? `school_district_${authority.school_district?.name}`
        : `municipality_${municipality}`

    // Get municipality ID for cache lookup
    const { data: muniData } = await supabase
      .from('municipality_master_data')
      .select('id')
      .ilike('gemeinde_name', municipality)
      .maybeSingle()

    let cachedData = null
    if (muniData) {
      const { data: cache } = await supabase
        .from('school_registration_cache')
        .select('*')
        .eq('municipality_id', muniData.id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (cache) {
        cachedData = {
          registration_process: cache.registration_process,
          required_documents: cache.required_documents,
          registration_deadline: cache.registration_deadline,
          age_requirements: cache.age_requirements,
          fees: cache.fees,
          special_notes: cache.special_notes,
          registration_form_url: cache.registration_form_url,
          registration_form_pdf_url: cache.registration_form_pdf_url,
        }
      }
    }

    if (cachedData) {
      return NextResponse.json({
        authority,
        registration_info: cachedData,
        cached: true,
        guidance: determineGuidance(childAge, cachedData),
      })
    }

    // Step 3: Scrape registration info
    const registrationInfo = await scrapeSchoolRegistrationInfo(authority.website_url, municipality)

    // Step 4: Cache for 7 days
    if (muniData) {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await supabase.from('school_registration_cache').upsert(
        {
          municipality_id: muniData.id,
          school_district_id: null, // TODO: Get district ID if applicable
          registration_process: registrationInfo.registration_process,
          required_documents: registrationInfo.required_documents,
          registration_deadline: registrationInfo.registration_deadline,
          age_requirements: registrationInfo.age_requirements,
          fees: registrationInfo.fees,
          special_notes: registrationInfo.special_notes,
          registration_form_url: registrationInfo.registration_form_url,
          registration_form_pdf_url: registrationInfo.registration_form_pdf_url,
          source_url: authority.website_url,
          expires_at: expiresAt.toISOString(),
        },
        {
          onConflict: 'municipality_id',
        }
      )
    }

    // Step 5: Return combined data
    return NextResponse.json({
      authority,
      registration_info: registrationInfo,
      cached: false,
      guidance: determineGuidance(childAge, registrationInfo),
    })
  } catch (error) {
    console.error('School registration API error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch school registration info',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Provide age-specific guidance
 */
function determineGuidance(childAge: number, info: any) {
  if (childAge < 4) {
    return {
      level: 'too_young',
      message: 'Your child is not yet school age. Kindergarten typically starts at age 4-5.',
      action: 'Explore daycare and preschool options in the meantime.',
    }
  } else if (childAge >= 4 && childAge < 6) {
    return {
      level: 'kindergarten',
      message: 'Your child should be registered for Kindergarten.',
      action: 'Contact the school authority as soon as possible after arrival.',
      age_requirement: info.age_requirements?.kindergarten || 'Age 4-6',
    }
  } else if (childAge >= 6 && childAge < 12) {
    return {
      level: 'primary',
      message: 'Your child should be registered for Primarschule (Primary School).',
      action: 'Contact the school authority immediately. Registration is mandatory.',
      age_requirement: info.age_requirements?.primary || 'Age 6-12',
    }
  } else {
    return {
      level: 'secondary',
      message: 'Your child should be registered for Sekundarstufe (Secondary School).',
      action: 'Contact the municipal or cantonal school authority for secondary school registration.',
      note: 'Secondary school registration may involve the canton, not just the municipality.',
    }
  }
}

