import { NextResponse } from 'next/server'
import { getDictionary } from '@/lib/config/form-reader'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const searchParams = new URL(request.url).searchParams
    const locale = searchParams.get('locale') || 'en'

    // Special handling for countries - fetch from countries table
    if (key === 'countries') {
      const supabase = createAdminClient()
      const { data: countries, error } = await supabase
        .from('countries')
        .select('id, iso_code, name_en, visa_status')
        .order('name_en', { ascending: true })

      if (error) {
        console.error('Error fetching countries:', error)
        return NextResponse.json(
          { error: 'Failed to fetch countries', details: error.message },
          { status: 500 }
        )
      }

      // Transform to dictionary format
      const items = countries.map((country) => ({
        value: country.id.toString(), // Store country ID
        label: country.name_en,
        // Include visa_status for later use (metadata, not shown in dropdown)
        visa_status: country.visa_status,
      }))

      return NextResponse.json({ key, locale, items })
    }

    // For other dictionaries, use existing form-reader
    const items = await getDictionary(key, locale)

    if (!items) {
      return NextResponse.json(
        { error: 'Dictionary not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ key, locale, items })
  } catch (error) {
    console.error('Error fetching dictionary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




