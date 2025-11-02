import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityInfo, formatOfficeHours } from '@/lib/municipality-scraper'
import { getMunicipalityUrl } from '@/lib/municipality-urls'

/**
 * GET /api/municipality/[name]
 * 
 * Fetches municipality information (opening hours, contact info)
 * Uses Gemini AI to scrape website if not in cache
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const params = await context.params
    const municipalityName = decodeURIComponent(params.name)

    if (!municipalityName) {
      return NextResponse.json(
        { error: 'Municipality name is required' },
        { status: 400 }
      )
    }

    const info = await getMunicipalityInfo(municipalityName)

    if (!info) {
      return NextResponse.json(
        { error: 'Could not fetch municipality information' },
        { status: 404 }
      )
    }

    // Format hours for easier display
    const formattedHours = formatOfficeHours(info.einwohnerdienste.hours)

    // Get registration URL: use AI-found URL if available, otherwise use mapping/fallback
    const registrationUrl = info.einwohnerdienste.registration_url || 
      getMunicipalityUrl(municipalityName, true)

    return NextResponse.json({
      municipality: municipalityName,
      einwohnerdienste: {
        ...info.einwohnerdienste,
        formatted_hours: formattedHours,
        registration_url: registrationUrl, // Always include registration URL
      },
      schulverwaltung: info.schulverwaltung,
      confidence: info.confidence,
      last_checked: info.last_checked,
    })
  } catch (error: any) {
    console.error('Error fetching municipality info:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch municipality information',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

