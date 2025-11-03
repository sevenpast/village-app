/**
 * Get the base URL for the application
 * Automatically detects Vercel production URL or uses environment variable
 */
export function getBaseUrl(): string {
  // 1. Check explicit environment variable (highest priority)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = process.env.NEXT_PUBLIC_APP_URL.trim()
    // Remove trailing slash
    return url.endsWith('/') ? url.slice(0, -1) : url
  }

  // 2. Check Vercel URL (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 3. Check APP_BASE_URL (legacy)
  if (process.env.APP_BASE_URL) {
    const url = process.env.APP_BASE_URL.trim()
    return url.endsWith('/') ? url.slice(0, -1) : url
  }

  // 4. Check if we're in production on Vercel
  // Vercel automatically sets VERCEL environment variable
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production') {
    // If VERCEL_URL is available, use it (most reliable)
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    // Otherwise, use hardcoded production URL
    console.warn('⚠️ Running on Vercel but no VERCEL_URL, using hardcoded production URL')
    return 'https://village-app-phi.vercel.app'
  }

  // 5. Check if we're in production (but not on Vercel - should not happen)
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ Production environment detected but not on Vercel, using hardcoded URL')
    return 'https://village-app-phi.vercel.app'
  }

  // 6. Fallback to localhost for development
  return 'http://localhost:3000'
}

/**
 * Get the base URL for server-side operations
 * Similar to getBaseUrl but can use server-only environment variables
 */
export function getServerBaseUrl(): string {
  return getBaseUrl()
}

/**
 * Get the base URL specifically for email confirmations
 * Always uses production URL for email links to ensure they work correctly
 * IMPORTANT: Never uses VERCEL_URL or NEXT_PUBLIC_APP_URL as they might point to preview deployments
 */
export function getEmailBaseUrl(): string {
  // 1. Check explicit email environment variable (highest priority)
  // Only use if it explicitly points to production URL
  if (process.env.NEXT_PUBLIC_EMAIL_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_EMAIL_BASE_URL.trim()
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url
    // Only use if it's the production URL, otherwise ignore it
    if (cleanUrl === 'https://village-app-phi.vercel.app') {
      return cleanUrl
    }
    // If it's not the production URL, log warning and use production anyway
    console.warn('⚠️ NEXT_PUBLIC_EMAIL_BASE_URL is set but not pointing to production URL, using production URL instead:', cleanUrl)
  }

  // 2. ALWAYS use hardcoded production URL for emails
  // We do NOT use VERCEL_URL or NEXT_PUBLIC_APP_URL because they might be preview deployments
  // This ensures all email links always point to the production URL
  return 'https://village-app-phi.vercel.app'
}

