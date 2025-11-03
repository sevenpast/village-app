import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/housing/viewings/[id] - Get a single viewing with photos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: viewing, error } = await supabase
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
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !viewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })
    }

    return NextResponse.json({ viewing })
  } catch (error) {
    console.error('Unexpected error in GET /api/housing/viewings/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/housing/viewings/[id] - Update a viewing
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: existingViewing, error: checkError } = await supabase
      .from('apartment_viewings')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingViewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })
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

    // Build update object (only include fields that are provided)
    const updateData: any = {}
    if (address !== undefined) updateData.address = address
    if (viewing_date !== undefined) updateData.viewing_date = viewing_date
    if (rent_chf !== undefined) updateData.rent_chf = rent_chf || null
    if (room_count !== undefined) updateData.room_count = room_count || null
    if (contact_person !== undefined) updateData.contact_person = contact_person || null
    if (contact_email !== undefined) updateData.contact_email = contact_email || null
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone || null
    if (rating_condition !== undefined) updateData.rating_condition = rating_condition || null
    if (rating_neighborhood !== undefined) updateData.rating_neighborhood = rating_neighborhood || null
    if (rating_commute !== undefined) updateData.rating_commute = rating_commute || null
    if (rating_amenities !== undefined) updateData.rating_amenities = rating_amenities || null
    if (rating_value !== undefined) updateData.rating_value = rating_value || null
    if (notes !== undefined) updateData.notes = notes || null
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite

    const { data: viewing, error } = await supabase
      .from('apartment_viewings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating viewing:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update viewing',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ viewing })
  } catch (error) {
    console.error('Unexpected error in PUT /api/housing/viewings/[id]:', error)
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

// DELETE /api/housing/viewings/[id] - Delete a viewing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: existingViewing, error: checkError } = await supabase
      .from('apartment_viewings')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingViewing) {
      return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })
    }

    // Delete viewing (photos will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('apartment_viewings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting viewing:', error)
      return NextResponse.json({ error: 'Failed to delete viewing' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Viewing deleted successfully' })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/housing/viewings/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

