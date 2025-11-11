import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserUsageStats } from '@/lib/usage-tracking'

/**
 * GET /api/usage/stats
 *
 * Get current user's usage statistics including:
 * - Daily usage (requests, tokens, cost)
 * - Remaining quotas
 * - Usage limits
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user usage statistics
    const stats = await getUserUsageStats(user.id)

    if (!stats) {
      // Return default stats for new users
      return NextResponse.json({
        success: true,
        usage: {
          dailyRequests: 0,
          dailyTokens: 0,
          dailyCostCents: 0,
          requestsRemaining: 100,
          tokensRemaining: 1000000,
          costRemainingCents: 1000,
        },
        limits: {
          dailyRequestsLimit: 100,
          dailyTokensLimit: 1000000,
          dailyCostLimitCents: 1000,
        },
        costInDollars: {
          dailyCost: 0,
          costRemaining: 10.0,
          dailyCostLimit: 10.0,
        },
      })
    }

    // Convert cents to dollars for display
    const costInDollars = {
      dailyCost: stats.dailyCostCents / 100,
      costRemaining: stats.costRemainingCents / 100,
      dailyCostLimit: stats.limits.dailyCostLimitCents / 100,
    }

    return NextResponse.json({
      success: true,
      usage: {
        dailyRequests: stats.dailyRequests,
        dailyTokens: stats.dailyTokens,
        dailyCostCents: stats.dailyCostCents,
        requestsRemaining: stats.requestsRemaining,
        tokensRemaining: stats.tokensRemaining,
        costRemainingCents: stats.costRemainingCents,
      },
      limits: stats.limits,
      costInDollars,
      percentages: {
        requestsUsed: Math.round((stats.dailyRequests / stats.limits.dailyRequestsLimit) * 100),
        tokensUsed: Math.round((stats.dailyTokens / stats.limits.dailyTokensLimit) * 100),
        costUsed: Math.round((stats.dailyCostCents / stats.limits.dailyCostLimitCents) * 100),
      },
    })

  } catch (error) {
    console.error('❌ Error fetching usage stats:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch usage statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}