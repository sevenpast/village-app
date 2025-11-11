/**
 * Script to check if all municipality URLs are still valid
 * Tests all URLs from database and code
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface URLTestResult {
  url: string
  status: number | null
  error: string | null
  redirect?: string
}

async function testUrl(url: string, timeout = 10000): Promise<URLTestResult> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to save bandwidth
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Village App URL Checker 1.0)',
      },
    })

    clearTimeout(timeoutId)

    const result: URLTestResult = {
      url,
      status: response.status,
      error: null,
    }

    // Check if redirected
    if (response.url !== url && response.redirected) {
      result.redirect = response.url
    }

    return result
  } catch (error: any) {
    return {
      url,
      status: null,
      error: error.message || String(error),
    }
  }
}

async function checkAllUrls() {
  console.log('🔍 Checking all municipality URLs...\n')

  // Get all URLs from database
  const { data: municipalities, error } = await supabase
    .from('municipality_master_data')
    .select('gemeinde_name, bfs_nummer, official_website, registration_pages')
    .not('registration_pages', 'is', null)

  if (error) {
    console.error('Error fetching municipalities:', error)
    return
  }

  if (!municipalities || municipalities.length === 0) {
    console.log('No municipalities with stored URLs found')
    return
  }

  const results: Array<{
    gemeinde: string
    bfs: number
    website: string
    urls: URLTestResult[]
  }> = []

  for (const muni of municipalities) {
    const urls: string[] = [
      muni.official_website,
      ...(muni.registration_pages || []),
    ].filter(Boolean) as string[]

    console.log(`Testing ${muni.gemeinde_name} (${urls.length} URLs)...`)

    const urlResults: URLTestResult[] = []
    for (const url of urls) {
      const result = await testUrl(url)
      urlResults.push(result)
      
      // Show status immediately
      if (result.status === 200) {
        process.stdout.write('  ✓ ')
      } else if (result.status && result.status < 400) {
        process.stdout.write(`  ⚠ ${result.status} `)
      } else {
        process.stdout.write(`  ✗ ${result.status || 'ERROR'} `)
      }
      console.log(url)
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    results.push({
      gemeinde: muni.gemeinde_name,
      bfs: muni.bfs_nummer,
      website: muni.official_website || '',
      urls: urlResults,
    })

    console.log('')
  }

  // Summary
  console.log('\n📊 SUMMARY\n')
  console.log('='.repeat(80))

  let totalUrls = 0
  let workingUrls = 0
  let brokenUrls = 0
  let redirectedUrls = 0

  const broken: Array<{ gemeinde: string; url: string; status: number | null; error: string | null }> = []

  for (const result of results) {
    for (const urlResult of result.urls) {
      totalUrls++
      if (urlResult.status === 200) {
        workingUrls++
      } else if (urlResult.redirect) {
        redirectedUrls++
        console.log(`⚠ REDIRECT: ${result.gemeinde} - ${urlResult.url}`)
        console.log(`   → ${urlResult.redirect}\n`)
      } else {
        brokenUrls++
        broken.push({
          gemeinde: result.gemeinde,
          url: urlResult.url,
          status: urlResult.status,
          error: urlResult.error,
        })
      }
    }
  }

  console.log(`Total URLs tested: ${totalUrls}`)
  console.log(`✓ Working (200): ${workingUrls}`)
  console.log(`⚠ Redirected: ${redirectedUrls}`)
  console.log(`✗ Broken: ${brokenUrls}`)

  if (broken.length > 0) {
    console.log('\n❌ BROKEN URLS:\n')
    for (const b of broken) {
      console.log(`${b.gemeinde}:`)
      console.log(`  URL: ${b.url}`)
      console.log(`  Status: ${b.status || 'N/A'}`)
      if (b.error) {
        console.log(`  Error: ${b.error}`)
      }
      console.log('')
    }
  }

  // Check code URLs from municipality-scraper.ts
  console.log('\n📝 NOTE: Also check URLs in municipality-scraper.ts topMunicipalities map')
  console.log('   These are hardcoded in the code and should match the database URLs\n')
}

checkAllUrls()
  .then(() => {
    console.log('✅ URL check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })



















