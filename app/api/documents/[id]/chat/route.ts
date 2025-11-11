import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { checkUsageLimits, trackApiUsage, estimateGeminiCost, estimateTokens } from '@/lib/usage-tracking'

/**
 * POST /api/documents/[id]/chat
 * 
 * Chat with a document using Gemini AI.
 * Sends user question + document text to Gemini and returns AI response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { question, language = 'en' } = body

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // Check usage limits before proceeding
    const estimatedPromptTokens = estimateTokens(question)
    const estimatedCostCents = estimateGeminiCost('gemini-1.5-flash-001', estimatedPromptTokens, estimatedPromptTokens * 0.5)

    const usageLimits = await checkUsageLimits({
      userId: user.id,
      apiProvider: 'gemini',
      apiModel: 'gemini-1.5-flash-001',
      operationType: 'document_chat',
      estimatedTokens: estimatedPromptTokens * 1.5, // Rough estimate including response
      estimatedCostCents,
      documentId,
    })

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

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if text is extracted
    if (!document.extracted_text || document.extracted_text.length < 50) {
      return NextResponse.json(
        { 
          error: 'Document text not available. Please extract text first.',
          needs_extraction: true 
        },
        { status: 400 }
      )
    }

    // Check if document is scanned
    if (document.processing_status === 'failed') {
      return NextResponse.json(
        { 
          error: 'This document appears to be scanned. Chat is not available for scanned documents.',
          is_scanned: true 
        },
        { status: 400 }
      )
    }

    // Get or create chat session
    let { data: chat, error: chatError } = await supabase
      .from('document_chats')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .single()

    if (chatError && chatError.code === 'PGRST116') {
      // Chat doesn't exist, create it
      const { data: newChat, error: createError } = await supabase
        .from('document_chats')
        .insert({
          document_id: documentId,
          user_id: user.id,
          language: language,
        })
        .select()
        .single()

      if (createError || !newChat) {
        return NextResponse.json(
          { error: 'Failed to create chat session' },
          { status: 500 }
        )
      }
      chat = newChat
    } else if (chatError) {
      return NextResponse.json(
        { error: 'Failed to get chat session' },
        { status: 500 }
      )
    }

    // Get chat history (last 10 messages for context)
    const { data: history, error: historyError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })
      .limit(10)

    if (historyError) {
      console.error('Error fetching chat history:', historyError)
      // Continue without history
    }

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chat.id,
        role: 'user',
        content: question,
      })
      .select()
      .single()

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError)
      // Continue anyway
    }

    // Initialize Gemini
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' })

    // Build context from document text and chat history
    let context = `Document: ${document.file_name}\n\nContent:\n${document.extracted_text}`

    // Add chat history if available
    if (history && history.length > 0) {
      const historyText = history
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n')
      context = `${context}\n\n\nPrevious conversation:\n${historyText}`
    }

    // Build prompt with strict RAG instructions
    const prompt = `You are a Retrieval-Augmented Generation (RAG) assistant. Your role is to answer questions based EXCLUSIVELY on the information provided in the document below.

CRITICAL RULES (RAG System):
1. You can ONLY use information that is explicitly stated in the document provided below
2. You MUST NOT use any general knowledge, training data, or information from outside the document
3. If the information is not in the document, you MUST respond with: "I cannot find this information in the document."
4. You MUST NOT guess, infer, or make assumptions beyond what is explicitly written
5. You MUST NOT provide general advice or information that is not in the document
6. Always cite the source when possible (e.g., "According to Section X" or "On page Y")

This is a RAG (Retrieval-Augmented Generation) system - you retrieve information from the provided document and generate answers based ONLY on that retrieved information.

IMPORTANT:
- Answer in ${language === 'en' ? 'English' : language === 'de' ? 'German' : language === 'fr' ? 'French' : 'Italian'}
- Be concise and accurate
- If you mention a page number or section, make sure it's accurate
- Do not make up information that is not in the document
- Do not use any knowledge from your training - only use what is in the document

Document content:
${context}

User question: ${question}

Answer (based ONLY on the document above):`

    console.log(`🤖 Sending question to Gemini (${question.length} chars, context: ${context.length} chars)`)

    // Call Gemini API
    const startTime = Date.now()
    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()
    const elapsedTime = Date.now() - startTime

    // Extract usage metadata
    const usageMetadata = response.usageMetadata()
    const tokensUsed = usageMetadata?.totalTokenCount || 0

    console.log(`✅ Gemini response received (${responseText.length} chars, ${tokensUsed} tokens, ${elapsedTime}ms)`)

    // Track API usage
    const actualPromptTokens = usageMetadata?.promptTokenCount || estimatedPromptTokens
    const actualCompletionTokens = usageMetadata?.candidatesTokenCount || 0
    const actualTotalTokens = usageMetadata?.totalTokenCount || tokensUsed
    const actualCostCents = estimateGeminiCost('gemini-1.5-flash-001', actualPromptTokens, actualCompletionTokens)

    // Track usage in background (don't await to avoid blocking response)
    trackApiUsage(
      {
        userId: user.id,
        apiProvider: 'gemini',
        apiModel: 'gemini-1.5-flash-001',
        operationType: 'document_chat',
        documentId,
        chatId: chat?.id,
      },
      {
        promptTokens: actualPromptTokens,
        completionTokens: actualCompletionTokens,
        totalTokens: actualTotalTokens,
        estimatedCostCents: actualCostCents,
        responseTimeMs: elapsedTime,
        requestSizeBytes: prompt.length,
        responseSizeBytes: responseText.length,
        success: true,
      }
    ).catch(error => console.warn('Failed to track usage:', error))

    // Try to extract page number from response (simple regex)
    let sourcePage: number | null = null
    let sourceSection: string | null = null

    // Look for patterns like "page 3", "page 3-4", "Section 7.2", "Clause 3.1"
    const pageMatch = responseText.match(/page\s+(\d+)/i)
    if (pageMatch) {
      sourcePage = parseInt(pageMatch[1])
    }

    const sectionMatch = responseText.match(/(?:section|clause|article|paragraph)\s+([\d.]+)/i)
    if (sectionMatch) {
      sourceSection = sectionMatch[0]
    }

    // Save assistant message
    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chat.id,
        role: 'assistant',
        content: responseText,
        source_page: sourcePage,
        source_section: sourceSection,
        tokens_used: tokensUsed,
      })
      .select()
      .single()

    if (assistantMsgError) {
      console.error('Error saving assistant message:', assistantMsgError)
      // Continue anyway
    }

    // Update chat updated_at
    await supabase
      .from('document_chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chat.id)

    return NextResponse.json({
      success: true,
      response: responseText,
      source_page: sourcePage,
      source_section: sourceSection,
      tokens_used: tokensUsed,
      response_time_ms: elapsedTime,
    })
  } catch (error) {
    console.error('❌ Chat error:', error)

    // Track failed API usage if we have user context
    const { data: { user: errorUser } } = await supabase.auth.getUser()
    if (errorUser) {
      trackApiUsage(
        {
          userId: errorUser.id,
          apiProvider: 'gemini',
          apiModel: 'gemini-1.5-flash-001',
          operationType: 'document_chat',
          documentId: documentId || undefined,
        },
        {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCostCents: 0,
          responseTimeMs: 0,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        }
      ).catch(trackError => console.warn('Failed to track error usage:', trackError))
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/documents/[id]/chat
 * 
 * Get chat history for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: documentId } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get chat session
    const { data: chat, error: chatError } = await supabase
      .from('document_chats')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .single()

    if (chatError && chatError.code === 'PGRST116') {
      // No chat exists yet
      return NextResponse.json({
        success: true,
        messages: [],
        chat_id: null,
      })
    }

    if (chatError) {
      return NextResponse.json(
        { error: 'Failed to get chat session' },
        { status: 500 }
      )
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true })
      .limit(50) // Last 50 messages

    if (messagesError) {
      return NextResponse.json(
        { error: 'Failed to get messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
      chat_id: chat.id,
      language: chat.language,
    })
  } catch (error) {
    console.error('❌ Get chat history error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}



















