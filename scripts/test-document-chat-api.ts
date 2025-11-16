/**
 * Test script for Document Chat APIs
 * 
 * Usage:
 *   npm run test:chat-api
 *   OR
 *   npx tsx scripts/test-document-chat-api.ts
 * 
 * Prerequisites:
 *   - User must be logged in (get session from browser)
 *   - At least one document must exist in the vault
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// You need to get these from your browser session
// 1. Open browser DevTools → Application → Cookies
// 2. Copy the value of 'sb-<project-ref>-auth-token' cookie
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || ''

// Document ID to test with (get from /api/vault/list)
const DOCUMENT_ID = process.env.TEST_DOCUMENT_ID || ''

async function testAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  console.log(`\n📡 Testing: ${options.method || 'GET'} ${endpoint}`)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-jfldmfpbewiuahdhvjvc-auth-token=${AUTH_TOKEN}`,
        ...options.headers,
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error(`❌ Error (${response.status}):`, data)
      return { success: false, data, status: response.status }
    }

    console.log(`✅ Success (${response.status}):`, JSON.stringify(data, null, 2))
    return { success: true, data, status: response.status }
  } catch (error) {
    console.error(`❌ Request failed:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function main() {
  console.log('🧪 Testing Document Chat APIs\n')
  console.log('=' .repeat(60))

  if (!AUTH_TOKEN) {
    console.error('❌ AUTH_TOKEN not set!')
    console.log('\n📝 To get your auth token:')
    console.log('   1. Open browser DevTools → Application → Cookies')
    console.log('   2. Copy value of "sb-jfldmfpbewiuahdhvjvc-auth-token"')
    console.log('   3. Set TEST_AUTH_TOKEN environment variable')
    console.log('   4. OR add it to .env.local: TEST_AUTH_TOKEN=your-token')
    process.exit(1)
  }

  if (!DOCUMENT_ID) {
    console.log('📋 Step 1: Listing documents to find a test document...')
    const listResult = await testAPI('/api/vault/list')
    
    if (!listResult.success || !listResult.data?.documents || listResult.data.documents.length === 0) {
      console.error('❌ No documents found. Please upload a document first.')
      process.exit(1)
    }

    const firstDoc = listResult.data.documents[0]
    console.log(`\n✅ Found document: ${firstDoc.file_name} (ID: ${firstDoc.id})`)
    console.log(`   Using this document for testing...\n`)
    
    const testDocId = firstDoc.id
    await runTests(testDocId)
  } else {
    await runTests(DOCUMENT_ID)
  }
}

async function runTests(documentId: string) {
  console.log('=' .repeat(60))
  console.log(`📄 Testing with document ID: ${documentId}\n`)

  // Test 1: Extract text
  console.log('🔍 Test 1: Extract Text from Document')
  console.log('-'.repeat(60))
  const extractResult = await testAPI(`/api/documents/${documentId}/extract-text`, {
    method: 'POST',
  })

  if (!extractResult.success) {
    console.error('❌ Text extraction failed. Cannot continue with chat tests.')
    return
  }

  const textLength = extractResult.data?.text_length || 0
  console.log(`\n✅ Text extracted: ${textLength} characters`)
  if (extractResult.data?.cached) {
    console.log('   (Text was already cached)')
  }

  // Test 2: Get chat history (should be empty initially)
  console.log('\n\n💬 Test 2: Get Chat History (should be empty)')
  console.log('-'.repeat(60))
  const historyResult = await testAPI(`/api/documents/${documentId}/chat`)

  if (historyResult.success) {
    const messageCount = historyResult.data?.messages?.length || 0
    console.log(`\n✅ Chat history retrieved: ${messageCount} messages`)
  }

  // Test 3: Send first question
  console.log('\n\n❓ Test 3: Send First Question')
  console.log('-'.repeat(60))
  const question1 = 'What is this document about?'
  console.log(`   Question: "${question1}"`)
  
  const chatResult1 = await testAPI(`/api/documents/${documentId}/chat`, {
    method: 'POST',
    body: JSON.stringify({
      question: question1,
      language: 'en',
    }),
  })

  if (chatResult1.success) {
    console.log(`\n✅ Response received:`)
    console.log(`   Response: ${chatResult1.data.response.substring(0, 200)}...`)
    console.log(`   Source Page: ${chatResult1.data.source_page || 'N/A'}`)
    console.log(`   Source Section: ${chatResult1.data.source_section || 'N/A'}`)
    console.log(`   Tokens Used: ${chatResult1.data.tokens_used || 'N/A'}`)
    console.log(`   Response Time: ${chatResult1.data.response_time_ms}ms`)
  }

  // Test 4: Send follow-up question
  console.log('\n\n❓ Test 4: Send Follow-up Question')
  console.log('-'.repeat(60))
  const question2 = 'Can you summarize the key points?'
  console.log(`   Question: "${question2}"`)
  
  const chatResult2 = await testAPI(`/api/documents/${documentId}/chat`, {
    method: 'POST',
    body: JSON.stringify({
      question: question2,
      language: 'en',
    }),
  })

  if (chatResult2.success) {
    console.log(`\n✅ Response received:`)
    console.log(`   Response: ${chatResult2.data.response.substring(0, 200)}...`)
    console.log(`   Tokens Used: ${chatResult2.data.tokens_used || 'N/A'}`)
  }

  // Test 5: Get chat history again (should have messages now)
  console.log('\n\n💬 Test 5: Get Chat History (should have messages)')
  console.log('-'.repeat(60))
  const historyResult2 = await testAPI(`/api/documents/${documentId}/chat`)

  if (historyResult2.success) {
    const messages = historyResult2.data?.messages || []
    console.log(`\n✅ Chat history retrieved: ${messages.length} messages`)
    messages.forEach((msg: any, idx: number) => {
      console.log(`   ${idx + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ All tests completed!')
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { testAPI, runTests }




















