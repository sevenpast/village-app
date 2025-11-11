/**
 * Usage Tracking and Rate Limiting Service
 * Tracks API usage, token consumption, and enforces rate limits for cost control
 */

import { createClient } from '@/lib/supabase/server'

export interface UsageTrackingOptions {
  userId: string
  apiProvider: 'gemini' | 'openai' | 'anthropic' | 'other'
  apiModel: string
  operationType: 'document_chat' | 'global_chat' | 'text_extraction' | 'document_classification' | 'other'
  estimatedTokens?: number
  estimatedCostCents?: number
  documentId?: string
  chatId?: string
}

export interface UsageRecord {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostCents: number
  responseTimeMs: number
  requestSizeBytes?: number
  responseSizeBytes?: number
  success: boolean
  errorMessage?: string
}

export interface UsageLimits {
  canProceed: boolean
  reason: string
  dailyRequestsRemaining: number
  dailyTokensRemaining: number
  dailyCostRemainingCents: number
}

/**
 * Check if user can make an API call within their limits
 */
export async function checkUsageLimits(options: UsageTrackingOptions): Promise<UsageLimits> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('check_usage_limits', {
      p_user_id: options.userId,
      p_estimated_tokens: options.estimatedTokens || 0,
      p_estimated_cost_cents: options.estimatedCostCents || 0,
    })

    if (error) {
      console.error('❌ Error checking usage limits:', error)
      // Allow request but log error - don't block users due to DB issues
      return {
        canProceed: true,
        reason: 'Error checking limits - allowing request',
        dailyRequestsRemaining: 100,
        dailyTokensRemaining: 1000000,
        dailyCostRemainingCents: 1000,
      }
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No usage limits data returned')
      return {
        canProceed: true,
        reason: 'No limits data - allowing request',
        dailyRequestsRemaining: 100,
        dailyTokensRemaining: 1000000,
        dailyCostRemainingCents: 1000,
      }
    }

    const result = data[0]
    return {
      canProceed: result.can_proceed,
      reason: result.reason,
      dailyRequestsRemaining: result.daily_requests_remaining,
      dailyTokensRemaining: result.daily_tokens_remaining,
      dailyCostRemainingCents: result.daily_cost_remaining_cents,
    }
  } catch (error) {
    console.error('❌ Exception in checkUsageLimits:', error)
    // Fail open - allow request to prevent user frustration
    return {
      canProceed: true,
      reason: 'Exception in limits check - allowing request',
      dailyRequestsRemaining: 100,
      dailyTokensRemaining: 1000000,
      dailyCostRemainingCents: 1000,
    }
  }
}

/**
 * Track API usage after a successful or failed call
 */
export async function trackApiUsage(
  options: UsageTrackingOptions,
  usage: UsageRecord
): Promise<void> {
  const supabase = await createClient()

  try {
    // Record the usage
    const { error: insertError } = await supabase
      .from('api_usage_tracking')
      .insert({
        user_id: options.userId,
        api_provider: options.apiProvider,
        api_model: options.apiModel,
        operation_type: options.operationType,
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        total_tokens: usage.totalTokens,
        estimated_cost_cents: usage.estimatedCostCents,
        response_time_ms: usage.responseTimeMs,
        document_id: options.documentId || null,
        chat_id: options.chatId || null,
        request_size_bytes: usage.requestSizeBytes || null,
        response_size_bytes: usage.responseSizeBytes || null,
        success: usage.success,
        error_message: usage.errorMessage || null,
      })

    if (insertError) {
      console.error('❌ Error inserting usage record:', insertError)
      return
    }

    // Update user limits (only if successful)
    if (usage.success) {
      const { error: updateError } = await supabase
        .from('user_usage_limits')
        .update({
          daily_requests_used: supabase.sql`daily_requests_used + 1`,
          daily_tokens_used: supabase.sql`daily_tokens_used + ${usage.totalTokens}`,
          daily_cost_used_cents: supabase.sql`daily_cost_used_cents + ${usage.estimatedCostCents}`,
        })
        .eq('user_id', options.userId)

      if (updateError) {
        console.error('❌ Error updating usage limits:', updateError)
        // Try to create a new record for this user
        await supabase
          .from('user_usage_limits')
          .insert({
            user_id: options.userId,
            daily_requests_used: 1,
            daily_tokens_used: usage.totalTokens,
            daily_cost_used_cents: usage.estimatedCostCents,
          })
          .on_conflict('user_id')
          .do_update({
            set: {
              daily_requests_used: supabase.sql`daily_requests_used + 1`,
              daily_tokens_used: supabase.sql`daily_tokens_used + ${usage.totalTokens}`,
              daily_cost_used_cents: supabase.sql`daily_cost_used_cents + ${usage.estimatedCostCents}`,
            }
          })
      }
    }

    console.log(`✅ Tracked API usage: ${usage.totalTokens} tokens, $${(usage.estimatedCostCents / 100).toFixed(4)}, ${usage.responseTimeMs}ms`)
  } catch (error) {
    console.error('❌ Exception in trackApiUsage:', error)
  }
}

/**
 * Get user's current usage statistics
 */
export async function getUserUsageStats(userId: string): Promise<{
  dailyRequests: number
  dailyTokens: number
  dailyCostCents: number
  requestsRemaining: number
  tokensRemaining: number
  costRemainingCents: number
  limits: {
    dailyRequestsLimit: number
    dailyTokensLimit: number
    dailyCostLimitCents: number
  }
} | null> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('user_usage_limits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('❌ Error fetching usage stats:', error)
      return null
    }

    if (!data) {
      return null
    }

    // Reset counters if needed (client-side check)
    const today = new Date().toISOString().split('T')[0]
    const resetNeeded = data.last_reset_date !== today

    if (resetNeeded) {
      const { data: updatedData, error: resetError } = await supabase
        .from('user_usage_limits')
        .update({
          daily_requests_used: 0,
          daily_tokens_used: 0,
          daily_cost_used_cents: 0,
          last_reset_date: today,
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (resetError) {
        console.error('❌ Error resetting usage counters:', resetError)
      } else if (updatedData) {
        data.daily_requests_used = 0
        data.daily_tokens_used = 0
        data.daily_cost_used_cents = 0
      }
    }

    return {
      dailyRequests: data.daily_requests_used,
      dailyTokens: data.daily_tokens_used,
      dailyCostCents: data.daily_cost_used_cents,
      requestsRemaining: Math.max(0, data.daily_requests_limit - data.daily_requests_used),
      tokensRemaining: Math.max(0, data.daily_tokens_limit - data.daily_tokens_used),
      costRemainingCents: Math.max(0, data.daily_cost_limit_cents - data.daily_cost_used_cents),
      limits: {
        dailyRequestsLimit: data.daily_requests_limit,
        dailyTokensLimit: data.daily_tokens_limit,
        dailyCostLimitCents: data.daily_cost_limit_cents,
      },
    }
  } catch (error) {
    console.error('❌ Exception in getUserUsageStats:', error)
    return null
  }
}

/**
 * Estimate cost for Gemini API calls
 * Based on current Gemini pricing (as of 2024)
 */
export function estimateGeminiCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Pricing in USD per 1M tokens (as of 2024)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'gemini-1.5-pro': { prompt: 7.0, completion: 21.0 },
    'gemini-1.5-flash': { prompt: 0.35, completion: 1.05 },
    'gemini-1.5-flash-001': { prompt: 0.35, completion: 1.05 },
    'gemini-1.0-pro': { prompt: 3.5, completion: 10.5 },
    'gemini-pro': { prompt: 3.5, completion: 10.5 }, // fallback
  }

  const modelPricing = pricing[model] || pricing['gemini-1.5-flash'] // default to flash

  const promptCost = (promptTokens / 1000000) * modelPricing.prompt
  const completionCost = (completionTokens / 1000000) * modelPricing.completion

  const totalCostUsd = promptCost + completionCost
  const totalCostCents = Math.round(totalCostUsd * 100)

  return totalCostCents
}

/**
 * Estimate tokens from text (rough approximation)
 * 1 token ≈ 4 characters for most models
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Get usage analytics for admin dashboard
 */
export async function getUsageAnalytics(
  startDate?: string,
  endDate?: string
): Promise<{
  totalRequests: number
  totalTokens: number
  totalCostCents: number
  avgResponseTime: number
  successRate: number
  topOperations: Array<{ operation: string; count: number; tokens: number }>
} | null> {
  const supabase = await createClient()

  try {
    let query = supabase
      .from('api_usage_tracking')
      .select('*')

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching usage analytics:', error)
      return null
    }

    if (!data || data.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCostCents: 0,
        avgResponseTime: 0,
        successRate: 0,
        topOperations: [],
      }
    }

    const totalRequests = data.length
    const totalTokens = data.reduce((sum, record) => sum + record.total_tokens, 0)
    const totalCostCents = data.reduce((sum, record) => sum + record.estimated_cost_cents, 0)
    const successfulRequests = data.filter(record => record.success).length
    const successRate = successfulRequests / totalRequests
    const avgResponseTime = data.reduce((sum, record) => sum + (record.response_time_ms || 0), 0) / totalRequests

    // Group by operation type
    const operationStats = data.reduce((acc, record) => {
      const op = record.operation_type
      if (!acc[op]) {
        acc[op] = { count: 0, tokens: 0 }
      }
      acc[op].count += 1
      acc[op].tokens += record.total_tokens
      return acc
    }, {} as Record<string, { count: number; tokens: number }>)

    const topOperations = Object.entries(operationStats)
      .map(([operation, stats]) => ({ operation, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalRequests,
      totalTokens,
      totalCostCents,
      avgResponseTime: Math.round(avgResponseTime),
      successRate: Math.round(successRate * 100) / 100,
      topOperations,
    }
  } catch (error) {
    console.error('❌ Exception in getUsageAnalytics:', error)
    return null
  }
}