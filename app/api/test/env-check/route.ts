import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/test/env-check
 * Test endpoint to check if environment variables are loaded correctly
 */
export async function GET(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY
  const hasGeminiKey = !!geminiKey
  
  // Get all env vars that contain GEMINI or API
  const relevantEnvVars = Object.keys(process.env)
    .filter(key => key.includes('GEMINI') || key.includes('API'))
    .reduce((acc, key) => {
      const value = process.env[key]
      acc[key] = value ? `${value.substring(0, 10)}...` : 'NOT SET'
      return acc
    }, {} as Record<string, string>)

  return NextResponse.json({
    gemini_api_key_configured: hasGeminiKey,
    gemini_api_key_preview: geminiKey ? `${geminiKey.substring(0, 15)}...` : 'NOT SET',
    gemini_api_key_length: geminiKey?.length || 0,
    relevant_env_vars: relevantEnvVars,
    node_env: process.env.NODE_ENV,
    all_env_keys_count: Object.keys(process.env).length,
  })
}



















