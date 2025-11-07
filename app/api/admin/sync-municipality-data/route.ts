import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncMunicipalityDataToDatabase } from '@/lib/opendata-swiss'

/**
 * POST /api/admin/sync-municipality-data
 *
 * Admin endpoint to sync official Swiss municipality data from BFS/opendata.swiss
 * to the local Supabase database.
 *
 * This should be run:
 * - On initial setup
 * - Quarterly when BFS updates their data
 * - When adding new municipalities to the system
 *
 * Query parameters:
 * - force: Set to 'true' to force refresh even if data was recently synced
 *
 * Returns:
 * - Success: Statistics about inserted/updated records
 * - Error: Detailed error information
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Optional: Add basic auth or admin key check here
    // const adminKey = request.headers.get('x-admin-key')
    // if (adminKey !== process.env.ADMIN_API_KEY) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const force = searchParams.get('force') === 'true'

    console.log('🚀 Starting municipality data sync...')
    console.log(`⚙️ Force refresh: ${force}`)

    // Check when data was last synced (if not forced)
    if (!force) {
      const { data: lastSync } = await supabase
        .from('municipality_master_data')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSync?.updated_at) {
        const lastSyncDate = new Date(lastSync.updated_at)
        const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60)

        if (hoursSinceSync < 24) {
          return NextResponse.json({
            message: 'Data was recently synced, use ?force=true to override',
            last_sync: lastSync.updated_at,
            hours_since_sync: Math.round(hoursSinceSync),
          })
        }
      }
    }

    // Perform the sync
    const startTime = Date.now()
    const result = await syncMunicipalityDataToDatabase(supabase)
    const duration = Date.now() - startTime

    console.log(`✅ Sync completed in ${duration}ms`)

    // Return success response
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      statistics: result,
      message: `Successfully synced ${result.inserted} municipality records`,
    })

  } catch (error) {
    console.error('❌ Municipality sync failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/sync-municipality-data
 *
 * Get information about the current municipality data sync status
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get sync statistics
    const [totalCount, lastSync, kantonsCount] = await Promise.all([
      supabase
        .from('municipality_master_data')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('municipality_master_data')
        .select('updated_at, gemeinde_name')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),

      supabase
        .from('municipality_master_data')
        .select('kanton')
        .then(({ data }) => {
          const uniqueKantons = new Set(data?.map(d => d.kanton) || [])
          return uniqueKantons.size
        })
    ])

    return NextResponse.json({
      total_municipalities: totalCount.count || 0,
      last_sync: lastSync.data?.updated_at || null,
      last_updated_municipality: lastSync.data?.gemeinde_name || null,
      kantons_covered: kantonsCount,
      hours_since_last_sync: lastSync.data?.updated_at
        ? Math.round((Date.now() - new Date(lastSync.data.updated_at).getTime()) / (1000 * 60 * 60))
        : null,
      data_source: 'BFS (Federal Statistical Office) via opendata.swiss',
    })

  } catch (error) {
    console.error('❌ Failed to get sync status:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get sync status',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}