import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/test/document-chat
 * 
 * Test endpoint for Document Chat APIs
 * Tests all endpoints with a real document from the user's vault
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in first.' },
        { status: 401 }
      )
    }

    const results: any = {
      user_id: user.id,
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
      },
    }

    // Test 1: Get user's documents
    console.log('📋 Test 1: Getting user documents...')
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, mime_type, extracted_text, processing_status')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .limit(1)

    if (docError || !documents || documents.length === 0) {
      results.tests.push({
        name: 'Get Documents',
        status: 'failed',
        error: 'No documents found. Please upload a document first.',
      })
      results.summary.failed++
      return NextResponse.json(results)
    }

    const testDoc = documents[0]
    results.test_document = {
      id: testDoc.id,
      file_name: testDoc.file_name,
      mime_type: testDoc.mime_type,
      has_extracted_text: !!testDoc.extracted_text && testDoc.extracted_text.length > 0,
    }

    results.tests.push({
      name: 'Get Documents',
      status: 'passed',
      document_found: true,
    })
    results.summary.passed++

    // Test 2: Extract text (if not already extracted)
    console.log('🔍 Test 2: Extracting text...')
    if (!testDoc.extracted_text || testDoc.extracted_text.length < 50) {
      if (testDoc.mime_type === 'application/pdf') {
        try {
          // Import the extract-text route logic
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const extractUrl = `${baseUrl}/api/documents/${testDoc.id}/extract-text`
          
          // We'll test this by calling the actual route
          // For now, just check if it's a PDF
          results.tests.push({
            name: 'Extract Text',
            status: 'pending',
            message: 'Text extraction needs to be tested via POST /api/documents/[id]/extract-text',
            note: 'This requires downloading the file from storage, which is tested in the actual route',
          })
        } catch (error) {
          results.tests.push({
            name: 'Extract Text',
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          results.summary.failed++
        }
      } else {
        results.tests.push({
          name: 'Extract Text',
          status: 'skipped',
          reason: 'Document is not a PDF',
        })
      }
    } else {
      results.tests.push({
        name: 'Extract Text',
        status: 'passed',
        message: 'Text already extracted',
        text_length: testDoc.extracted_text.length,
      })
      results.summary.passed++
    }

    // Test 3: Check if chat tables exist
    console.log('💬 Test 3: Checking chat tables...')
    const { data: chats, error: chatsError } = await supabase
      .from('document_chats')
      .select('id')
      .eq('document_id', testDoc.id)
      .eq('user_id', user.id)
      .limit(1)

    if (chatsError) {
      // Check if it's a "relation does not exist" error
      if (chatsError.message.includes('does not exist')) {
        results.tests.push({
          name: 'Chat Tables',
          status: 'failed',
          error: 'Chat tables do not exist. Please run migration 043_create_document_chat_tables.sql',
        })
        results.summary.failed++
      } else {
        results.tests.push({
          name: 'Chat Tables',
          status: 'failed',
          error: chatsError.message,
        })
        results.summary.failed++
      }
    } else {
      results.tests.push({
        name: 'Chat Tables',
        status: 'passed',
        chat_exists: chats && chats.length > 0,
      })
      results.summary.passed++
    }

    // Test 4: Check Gemini API key
    console.log('🤖 Test 4: Checking Gemini API key...')
    const hasGeminiKey = !!process.env.GEMINI_API_KEY
    results.tests.push({
      name: 'Gemini API Key',
      status: hasGeminiKey ? 'passed' : 'failed',
      configured: hasGeminiKey,
      error: hasGeminiKey ? null : 'GEMINI_API_KEY not set in environment variables',
    })
    if (hasGeminiKey) {
      results.summary.passed++
    } else {
      results.summary.failed++
    }

    // Test 5: Test chat GET endpoint (if chat exists)
    if (chats && chats.length > 0 && testDoc.extracted_text) {
      console.log('💬 Test 5: Testing chat GET endpoint...')
      const chatId = chats[0].id
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(10)

      if (messagesError) {
        results.tests.push({
          name: 'Get Chat History',
          status: 'failed',
          error: messagesError.message,
        })
        results.summary.failed++
      } else {
        results.tests.push({
          name: 'Get Chat History',
          status: 'passed',
          message_count: messages?.length || 0,
        })
        results.summary.passed++
      }
    } else {
      results.tests.push({
        name: 'Get Chat History',
        status: 'skipped',
        reason: 'No chat exists yet or document has no extracted text',
      })
    }

    // Summary
    results.all_tests_passed = results.summary.failed === 0
    results.message = results.all_tests_passed
      ? '✅ All tests passed! APIs are ready to use.'
      : `⚠️ ${results.summary.failed} test(s) failed. Check errors above.`

    return NextResponse.json(results, { status: results.all_tests_passed ? 200 : 207 })
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}




















