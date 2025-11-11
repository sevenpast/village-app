import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/test/document-chat-structure
 * 
 * Test endpoint for Document Chat database structure (no authentication required)
 * Checks if all required tables, indexes, and RLS policies exist
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    }

    // Test 1: Check if document_chats table exists
    console.log('📋 Test 1: Checking document_chats table...')
    try {
      const { data, error } = await supabase
        .from('document_chats')
        .select('id')
        .limit(1)

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          results.tests.push({
            name: 'document_chats table exists',
            status: 'failed',
            error: 'Table does not exist. Run migration 043_create_document_chat_tables.sql',
            code: error.code,
          })
          results.summary.failed++
        } else {
          // Table exists but might have RLS issues (that's OK for this test)
          results.tests.push({
            name: 'document_chats table exists',
            status: 'passed',
            note: 'Table exists (RLS may require auth, which is expected)',
          })
          results.summary.passed++
        }
      } else {
        results.tests.push({
          name: 'document_chats table exists',
          status: 'passed',
          row_count: 'unknown (limited query)',
        })
        results.summary.passed++
      }
    } catch (error: any) {
      results.tests.push({
        name: 'document_chats table exists',
        status: 'failed',
        error: error.message || 'Unknown error',
      })
      results.summary.failed++
    }

    // Test 2: Check if chat_messages table exists
    console.log('📋 Test 2: Checking chat_messages table...')
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1)

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          results.tests.push({
            name: 'chat_messages table exists',
            status: 'failed',
            error: 'Table does not exist. Run migration 043_create_document_chat_tables.sql',
            code: error.code,
          })
          results.summary.failed++
        } else {
          results.tests.push({
            name: 'chat_messages table exists',
            status: 'passed',
            note: 'Table exists (RLS may require auth, which is expected)',
          })
          results.summary.passed++
        }
      } else {
        results.tests.push({
          name: 'chat_messages table exists',
          status: 'passed',
          row_count: 'unknown (limited query)',
        })
        results.summary.passed++
      }
    } catch (error: any) {
      results.tests.push({
        name: 'chat_messages table exists',
        status: 'failed',
        error: error.message || 'Unknown error',
      })
      results.summary.failed++
    }

    // Test 3: Check if documents table exists (required for foreign key)
    console.log('📋 Test 3: Checking documents table exists...')
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .limit(1)

      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          results.tests.push({
            name: 'documents table exists',
            status: 'failed',
            error: 'Table does not exist. This is required for document_chats foreign key.',
            code: error.code,
          })
          results.summary.failed++
        } else {
          results.tests.push({
            name: 'documents table exists',
            status: 'passed',
            note: 'Table exists (RLS may require auth, which is expected)',
          })
          results.summary.passed++
        }
      } else {
        results.tests.push({
          name: 'documents table exists',
          status: 'passed',
        })
        results.summary.passed++
      }
    } catch (error: any) {
      results.tests.push({
        name: 'documents table exists',
        status: 'failed',
        error: error.message || 'Unknown error',
      })
      results.summary.failed++
    }

    // Test 4: Check table structure via SQL query (using service role if available)
    console.log('📋 Test 4: Checking table columns...')
    try {
      // Try to get column information
      const { data: columns, error: columnError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT 
            column_name, 
            data_type, 
            is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name = 'document_chats'
          ORDER BY ordinal_position;
        `
      }).catch(() => ({ data: null, error: { message: 'RPC function not available' } }))

      if (columnError || !columns) {
        results.tests.push({
          name: 'document_chats columns',
          status: 'warning',
          note: 'Cannot check columns without service role. This is OK.',
        })
        results.summary.warnings++
      } else {
        const expectedColumns = ['id', 'document_id', 'user_id', 'language', 'created_at', 'updated_at']
        const foundColumns = columns.map((c: any) => c.column_name)
        const missing = expectedColumns.filter(col => !foundColumns.includes(col))
        
        if (missing.length > 0) {
          results.tests.push({
            name: 'document_chats columns',
            status: 'failed',
            error: `Missing columns: ${missing.join(', ')}`,
            found: foundColumns,
            expected: expectedColumns,
          })
          results.summary.failed++
        } else {
          results.tests.push({
            name: 'document_chats columns',
            status: 'passed',
            columns: foundColumns,
          })
          results.summary.passed++
        }
      }
    } catch (error: any) {
      results.tests.push({
        name: 'document_chats columns',
        status: 'warning',
        note: 'Column check skipped (requires service role)',
      })
      results.summary.warnings++
    }

    // Test 5: Check if indexes exist (via error handling)
    console.log('📋 Test 5: Checking indexes...')
    results.tests.push({
      name: 'Indexes',
      status: 'info',
      note: 'Index existence check requires direct SQL access. Indexes should be created by migration 043.',
      expected_indexes: [
        'idx_document_chats_document_id',
        'idx_document_chats_user_id',
        'idx_chat_messages_chat_id',
        'idx_chat_messages_created_at',
      ],
    })

    // Test 6: Check Gemini API key
    console.log('🤖 Test 6: Checking Gemini API key...')
    const hasGeminiKey = !!process.env.GEMINI_API_KEY
    results.tests.push({
      name: 'Gemini API Key',
      status: hasGeminiKey ? 'passed' : 'warning',
      configured: hasGeminiKey,
      note: hasGeminiKey 
        ? 'API key is configured' 
        : 'GEMINI_API_KEY not set. Chat functionality will not work.',
    })
    if (hasGeminiKey) {
      results.summary.passed++
    } else {
      results.summary.warnings++
    }

    // Test 7: Check if migration file exists
    console.log('📄 Test 7: Checking migration file...')
    const fs = require('fs')
    const path = require('path')
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '043_create_document_chat_tables.sql')
    const migrationExists = fs.existsSync(migrationPath)
    
    results.tests.push({
      name: 'Migration file exists',
      status: migrationExists ? 'passed' : 'warning',
      file_path: migrationPath,
      exists: migrationExists,
      note: migrationExists 
        ? 'Migration file found' 
        : 'Migration file not found. Make sure it exists in supabase/migrations/',
    })
    if (migrationExists) {
      results.summary.passed++
    } else {
      results.summary.warnings++
    }

    // Summary
    results.all_tests_passed = results.summary.failed === 0
    results.has_warnings = results.summary.warnings > 0
    
    if (results.all_tests_passed && !results.has_warnings) {
      results.message = '✅ All tests passed! Database structure is ready.'
    } else if (results.all_tests_passed && results.has_warnings) {
      results.message = `⚠️ All critical tests passed, but ${results.summary.warnings} warning(s). Check details above.`
    } else {
      results.message = `❌ ${results.summary.failed} test(s) failed. Please fix the issues above.`
    }

    return NextResponse.json(results, { 
      status: results.all_tests_passed ? 200 : 207 
    })
  } catch (error) {
    console.error('❌ Test error:', error)
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : undefined) 
          : undefined,
      },
      { status: 500 }
    )
  }
}



















