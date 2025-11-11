import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { checkUsageLimits, trackApiUsage, estimateGeminiCost, estimateTokens } from '@/lib/usage-tracking'

// Initialize Gemini AI (server-side only)
// Note: Initialize on each request to ensure env vars are loaded
function getGenAI(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY
  
  // Debug logging
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY not found in environment variables')
    console.warn('Available env vars with GEMINI/API:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API')).join(', '))
    console.warn('NODE_ENV:', process.env.NODE_ENV)
    return null
  }
  
  if (apiKey.length < 10) {
    console.warn('⚠️ GEMINI_API_KEY seems invalid (too short)')
    return null
  }
  
  return new GoogleGenerativeAI(apiKey)
}

/**
 * GET /api/documents/global-chat
 * Retrieves chat history for the global chat (all documents).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create global chat session (using a special document_id: null or a global chat table)
    // For now, we'll use a special approach: store in a global_chats table or use a special identifier
    // Let's create a simple approach: use a special chat_id stored in a global_chats table
    
    // Check if we have a global_chats table, if not, we'll use a workaround
    // For MVP, we'll store the chat in a special way or create a new table
    // Actually, let's use a simpler approach: store chat_id in localStorage on frontend
    // and pass it to the API, or create a global_chats table
    
    // For now, let's use a workaround: create a special document_chat with document_id = null
    // But that won't work with foreign keys. Let's create a new table structure.
    
    // Actually, for MVP, let's just use the existing structure but allow multiple documents
    // We'll store the chat_id in the response and the frontend will manage it
    
    // For now, return empty history - we'll implement proper storage later
    return NextResponse.json({
      success: true,
      chat_id: null,
      messages: [],
      document_ids: [],
    })
  } catch (error: any) {
    console.error('Error in GET global-chat API:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve chat history',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents/global-chat
 * Sends a new message to the global chat and gets an AI response based on all user documents.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { question, language = 'en', chat_id } = await request.json()

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user documents with extracted text
    console.log(`🔍 Fetching documents for user: ${user.id}`)
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, extracted_text, processing_status, document_type, language')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .eq('processing_status', 'completed')
      .not('extracted_text', 'is', null)

    if (docError) {
      console.error('❌ Error fetching documents:', docError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch documents',
        details: docError.message 
      }, { status: 500 })
    }

    console.log(`📄 Found ${documents?.length || 0} documents with extracted text`)

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No documents with extracted text found. Please upload and process documents first.'
        },
        { status: 400 }
      )
    }

    // Initialize Gemini AI FIRST (before usage limits check)
    console.log('🔍 Checking GEMINI_API_KEY...')
    console.log('🔍 GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY)
    console.log('🔍 GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0)
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
    
    const genAI = getGenAI()
    if (!genAI) {
      console.error('❌ Gemini AI not initialized - GEMINI_API_KEY missing')
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API')))
      console.error('GEMINI_API_KEY value:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'NOT SET')
      return NextResponse.json({ 
        success: false,
        error: 'AI service is not configured. Please check API key.' 
      }, { status: 500 })
    }
    
    console.log('✅ Gemini AI initialized successfully')

     // Check usage limits before proceeding (with error handling)
     let usageLimits
     try {
       const estimatedPromptTokens = estimateTokens(question)
       const contextEstimate = documents.reduce((total, doc) => total + estimateTokens(doc.extracted_text || ''), 0)
       const totalEstimatedTokens = estimatedPromptTokens + contextEstimate
       // Use 'gemini-2.5-flash' as default model name for cost estimation (will be adjusted based on actual model used)
       const modelNameForCost = 'gemini-2.5-flash'
       const estimatedCostCents = estimateGeminiCost(modelNameForCost, totalEstimatedTokens, totalEstimatedTokens * 0.3)
 
       usageLimits = await checkUsageLimits({
         userId: user.id,
         apiProvider: 'gemini',
         apiModel: modelNameForCost,
         operationType: 'global_chat',
         estimatedTokens: totalEstimatedTokens * 1.3, // Include response estimate
         estimatedCostCents,
       })
     } catch (usageError: any) {
       console.warn('⚠️ Usage limits check failed, allowing request:', usageError)
       // Fail open - allow request if usage tracking fails
       usageLimits = {
         canProceed: true,
         reason: 'Usage tracking unavailable',
         dailyRequestsRemaining: 100,
         dailyTokensRemaining: 1000000,
         dailyCostRemainingCents: 1000,
       }
     }

    if (!usageLimits.canProceed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded: ${usageLimits.reason}`,
          limits: {
            dailyRequestsRemaining: usageLimits.dailyRequestsRemaining,
            dailyTokensRemaining: usageLimits.dailyTokensRemaining,
            dailyCostRemainingCents: usageLimits.dailyCostRemainingCents,
          }
        },
        { status: 429 }
      )
    }

    // Combine all document texts with metadata
    const documentContexts = documents.map(doc => ({
      name: doc.file_name,
      type: doc.document_type || 'unknown',
      text: doc.extracted_text,
      id: doc.id,
    }))

    // Prepare context for Gemini
    let contextText = documentContexts
      .map(doc => `=== Document: ${doc.name} (Type: ${doc.type}) ===\n${doc.text}\n`)
      .join('\n\n')

    // Check if context is too large (Gemini 1.5 Flash has ~1M token limit, but we should be conservative)
    const estimatedTokens = Math.ceil((contextText.length) / 4) // Rough estimate: 1 token ≈ 4 chars
    if (estimatedTokens > 800000) {
      console.warn(`⚠️ Context is very large: ~${estimatedTokens} tokens. Truncating...`)
      // Truncate context if too large
      const maxContextLength = 3000000 // ~750k tokens
      if (contextText.length > maxContextLength) {
        contextText = contextText.substring(0, maxContextLength) + '\n\n[... content truncated due to size ...]'
      }
    }

    // Build prompt with strict RAG instructions
    const prompt = `You are a Retrieval-Augmented Generation (RAG) assistant. Your role is to answer questions based EXCLUSIVELY on the information provided in the documents below.

CRITICAL RULES (RAG System):
1. You can ONLY use information that is explicitly stated in the documents provided below
2. You MUST NOT use any general knowledge, training data, or information from outside these documents
3. If the information is not in any of the documents, you MUST respond with: "I cannot find this information in the provided documents."
4. You MUST NOT guess, infer, or make assumptions beyond what is explicitly written in the documents
5. You MUST NOT provide general advice or information that is not in the documents
6. Always cite the source document when providing information (e.g., "According to [Document Name]")

This is a RAG (Retrieval-Augmented Generation) system - you retrieve information from the provided documents and generate answers based ONLY on that retrieved information.

Available Documents:
${documentContexts.map(doc => `- ${doc.name} (${doc.type})`).join('\n')}

Document Contents:
---
${contextText}
---

User Question (Language: ${language}): ${question}

Instructions:
- Carefully search through ALL the document contents above for relevant information
- If you find relevant information, provide it with source references (document name)
- Answer in the same language as the question (German/English)
- Be thorough - even partial matches or related information can be helpful
- If you truly cannot find ANY relevant information after careful review, only then state that the information is not available
- Provide specific quotes or details when possible
- Keep answers helpful and complete
- REMEMBER: Only use information from the documents above - do not use any general knowledge or training data

Answer (based ONLY on the documents above):`

    console.log(`📤 Sending global chat request: ${documents.length} documents, ~${estimatedTokens} tokens, prompt: ${prompt.length} chars`)

    // Use generateContent instead of startChat for single requests
    // Use gemini-pro as it's more stable and widely available
    const startTime = Date.now()
    
    let result: any
    let response: any
    let aiResponseContent: string
    
    // Use gemini-2.5-flash as the primary model
    // If it fails, we'll try other available models
    let model
    let actualModelName = 'gemini-2.5-flash'
    
    try {
      model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      actualModelName = 'gemini-2.5-flash'
      result = await model.generateContent(prompt)
      response = await result.response
      aiResponseContent = response.text()
      const elapsedTime = Date.now() - startTime
      console.log(`✅ Gemini response received (${aiResponseContent.length} chars, ${elapsedTime}ms)`)
    } catch (geminiError: any) {
      // If gemini-2.5-flash fails, try other available models
      if (geminiError.message?.includes('404') || geminiError.message?.includes('not found')) {
        console.warn('⚠️ gemini-2.5-flash not available, trying gemini-flash-latest')
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
          actualModelName = 'gemini-flash-latest'
          result = await model.generateContent(prompt)
          response = await result.response
          aiResponseContent = response.text()
          const elapsedTime = Date.now() - startTime
          console.log(`✅ Gemini response received with gemini-flash-latest (${aiResponseContent.length} chars, ${elapsedTime}ms)`)
        } catch (fallbackError: any) {
          console.warn('⚠️ gemini-flash-latest failed, trying gemini-2.0-flash')
          try {
            model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
            actualModelName = 'gemini-2.0-flash'
            result = await model.generateContent(prompt)
            response = await result.response
            aiResponseContent = response.text()
            const elapsedTime = Date.now() - startTime
            console.log(`✅ Gemini response received with gemini-2.0-flash (${aiResponseContent.length} chars, ${elapsedTime}ms)`)
          } catch (finalError: any) {
            console.error('❌ All Gemini models failed:', finalError)
            throw new Error(`Gemini API error: No available model found. Tried gemini-2.5-flash, gemini-flash-latest, and gemini-2.0-flash. Please check your API key and model availability.`)
          }
        }
      } else {
        console.error('❌ Gemini API error:', geminiError)
        throw new Error(`Gemini API error: ${geminiError.message || 'Unknown error'}`)
      }
    }
    
    // Get usage metadata safely
    let usageMetadata: any = null
    try {
      // Try different ways to get usage metadata
      if (typeof response.usageMetadata === 'function') {
        usageMetadata = response.usageMetadata()
      } else if (response.usageMetadata) {
        usageMetadata = response.usageMetadata
      } else if (result?.usageMetadata) {
        usageMetadata = result.usageMetadata
      }
    } catch (err) {
      console.warn('Could not get usage metadata:', err)
    }

     // Track API usage
     const elapsedTime = Date.now() - startTime
     const actualPromptTokens = usageMetadata?.promptTokenCount || estimatedPromptTokens
     const actualCompletionTokens = usageMetadata?.candidatesTokenCount || 0
     const actualTotalTokens = usageMetadata?.totalTokenCount || totalEstimatedTokens
     // Use the actual model name that was successfully used
     const actualCostCents = estimateGeminiCost(actualModelName, actualPromptTokens, actualCompletionTokens)
 
     // Track usage in background
     trackApiUsage(
       {
         userId: user.id,
         apiProvider: 'gemini',
         apiModel: actualModelName,
         operationType: 'global_chat',
       },
      {
        promptTokens: actualPromptTokens,
        completionTokens: actualCompletionTokens,
        totalTokens: actualTotalTokens,
        estimatedCostCents: actualCostCents,
        responseTimeMs: elapsedTime,
        requestSizeBytes: prompt.length,
        responseSizeBytes: aiResponseContent.length,
        success: true,
      }
    ).catch(error => console.warn('Failed to track usage:', error))

    // Extract source references (document names, page numbers if available)
    const sourceDocuments: string[] = []
    documentContexts.forEach(doc => {
      const docNameLower = doc.name.toLowerCase()
      const responseLower = aiResponseContent.toLowerCase()
      if (responseLower.includes(docNameLower) ||
          responseLower.includes(doc.type?.toLowerCase() || '')) {
        sourceDocuments.push(doc.name)
      }
    })

    // For MVP, we'll return the response without storing in database
    // Later we can implement a global_chats table
    return NextResponse.json({
      success: true,
      message: 'AI response generated.',
      response: aiResponseContent,
      source_documents: sourceDocuments.length > 0 ? sourceDocuments : null,
      tokens_used: usageMetadata ? (usageMetadata.promptTokenCount || 0) + (usageMetadata.candidatesTokenCount || 0) : null,
      total_documents: documents.length,
    })
  } catch (error: any) {
    console.error('❌ Error in POST global-chat API:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    })

     // Track failed API usage if we have user context
     const supabase = await createClient()
     const { data: { user: errorUser } } = await supabase.auth.getUser()
     if (errorUser) {
       trackApiUsage(
         {
           userId: errorUser.id,
           apiProvider: 'gemini',
           apiModel: 'gemini-2.5-flash', // Default model name for error tracking
           operationType: 'global_chat',
         },
        {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostCents: 0,
          responseTimeMs: 0,
          success: false,
          errorMessage: error.message || 'Unknown error',
        }
      ).catch(trackError => console.warn('Failed to track error usage:', trackError))
    }
    
    // Provide more specific error messages
    let errorMessage = 'Failed to get AI response'
    let statusCode = 500
    
    // Log detailed error info for debugging
    console.error('❌ Error in global chat:', error)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ GEMINI_API_KEY available:', !!process.env.GEMINI_API_KEY)
    console.error('❌ GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0)
    
    // Check if it's an API key issue
    const errorMsgLower = (error.message || '').toLowerCase()
    if (errorMsgLower.includes('api key') || errorMsgLower.includes('gemini_api_key') || errorMsgLower.includes('not configured')) {
      errorMessage = 'AI service is not configured. Please check API key.'
      statusCode = 500
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      errorMessage = 'AI service quota exceeded. Please try again later.'
      statusCode = 429
    } else if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT')) {
      errorMessage = 'Request timed out. The documents might be too large. Please try a more specific question.'
      statusCode = 504
    } else if (error.message?.includes('Gemini API error')) {
      errorMessage = error.message
      statusCode = 500
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: statusCode }
    )
  }
}

