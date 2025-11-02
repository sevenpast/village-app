import { NextResponse } from 'next/server'
import { getFormSchema } from '@/lib/config/form-reader'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schema = await getFormSchema(id)

    if (!schema) {
      return NextResponse.json(
        { error: 'Form schema not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(schema, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error) {
    console.error('Error fetching form schema:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}




