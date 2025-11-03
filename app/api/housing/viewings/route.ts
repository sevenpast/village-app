import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/housing/viewings - List all viewings for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: viewings, error } = await supabase
      .from('apartment_viewings')
      .select(`
        *,
        viewing_photos (
          id,
          file_name,
          storage_path,
          thumbnail_url,
          display_order
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching viewings:', error)
      return NextResponse.json({ error: 'Failed to fetch viewings' }, { status: 500 })
    }

    return NextResponse.json({ viewings: viewings || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/housing/viewings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/housing/viewings - Create a new viewing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      address,
      viewing_date,
      rent_chf,
      room_count,
      contact_person,
      contact_email,
      contact_phone,
      rating_condition,
      rating_neighborhood,
      rating_commute,
      rating_amenities,
      rating_value,
      notes,
      is_favorite,
    } = body

    if (!address || !viewing_date) {
      return NextResponse.json(
        { error: 'Address and viewing_date are required' },
        { status: 400 }
      )
    }

    const { data: viewing, error } = await supabase
      .from('apartment_viewings')
      .insert({
        user_id: user.id,
        address,
        viewing_date,
        rent_chf: rent_chf || null,
        room_count: room_count || null,
        contact_person: contact_person || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        rating_condition: rating_condition || null,
        rating_neighborhood: rating_neighborhood || null,
        rating_commute: rating_commute || null,
        rating_amenities: rating_amenities || null,
        rating_value: rating_value || null,
        notes: notes || null,
        is_favorite: is_favorite || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating viewing:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create viewing',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ viewing }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/housing/viewings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

