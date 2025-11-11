'use client'

import { useState, useEffect, useRef } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source_page?: number | null
  source_section?: string | null
  created_at: string
}

interface DocumentChatProps {
  documentId: string
  documentName: string
  documentType: string | null
  isOpen: boolean
  onClose: () => void
}

// Pre-defined questions based on document type
const getPredefinedQuestions = (documentType: string | null): string[] => {
  const commonQuestions = [
    'What is this document about?',
    'Can you summarize the key points?',
    'What are the important dates?',
  ]

  switch (documentType) {
    case 'rental_contract':
      return [
        ...commonQuestions,
        'What is the cancellation period?',
        'When does the contract start and end?',
        'What is the monthly rent?',
        'What are my responsibilities as a tenant?',
      ]
    case 'employment_contract':
      return [
        ...commonQuestions,
        'What is my salary?',
        'What are my working hours?',
        'What is the notice period?',
        'What are my vacation days?',
      ]
    case 'residence_permit':
      return [
        ...commonQuestions,
        'When does this permit expire?',
        'What are the conditions of this permit?',
        'Can I work with this permit?',
        'What documents are required for renewal?',
      ]
    case 'insurance_documents':
      return [
        ...commonQuestions,
        'What is covered by this insurance?',
        'What is the deductible?',
        'How do I file a claim?',
        'What is the coverage period?',
      ]
    case 'school_documents':
      return [
        ...commonQuestions,
        'What are the school hours?',
        'What documents are required?',
        'What is the enrollment process?',
        'What are the fees?',
      ]
    default:
      return commonQuestions
  }
}

export default function DocumentChat({
  documentId,
  documentName,
  documentType,
  isOpen,
  onClose,
}: DocumentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const predefinedQuestions = getPredefinedQuestions(documentType)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Load chat history when component opens
  useEffect(() => {
    if (isOpen && documentId) {
      loadChatHistory()
      // Check if text is extracted, if not, extract it
      checkAndExtractText()
    }
  }, [isOpen, documentId])

  const checkAndExtractText = async () => {
    try {
      setExtracting(true)
      const response = await fetch(`/api/documents/${documentId}/extract-text`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.is_scanned) {
          setError('This document appears to be scanned. Chat is not available for scanned documents.')
        } else if (data.needs_extraction) {
          setError('Text extraction failed. Please try again.')
        } else {
          setError(data.error || 'Failed to extract text')
        }
        setExtracting(false)
        return
      }

      // Text extracted successfully
      setExtracting(false)
      setError(null)
    } catch (err) {
      console.error('Error extracting text:', err)
      setExtracting(false)
      setError('Failed to extract text from document')
    }
  }

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/chat`)
      if (!response.ok) {
        throw new Error('Failed to load chat history')
      }

      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
        setChatId(data.chat_id)
      }
    } catch (err) {
      console.error('Error loading chat history:', err)
      // Don't show error, just start with empty chat
    }
  }

  const sendMessage = async (question?: string) => {
    const questionText = question || input.trim()
    if (!questionText) return

    setError(null)
    setLoading(true)
    setInput('') // Clear input if using input field

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: questionText,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await fetch(`/api/documents/${documentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionText,
          language: 'en', // TODO: Get from user settings
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (data.success) {
        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          source_page: data.source_page,
          source_section: data.source_section,
          created_at: new Date().toISOString(),
        }

        // Replace temp user message with real one, add assistant message
        setMessages((prev) => {
          const withoutTemp = prev.filter((msg) => msg.id !== userMessage.id)
          return [...withoutTemp, userMessage, assistantMessage]
        })

        // Update chat ID if we got one
        if (data.chat_id) {
          setChatId(data.chat_id)
        }

        // Reload full history to get proper IDs
        await loadChatHistory()
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove temp user message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleQuestionClick = (question: string) => {
    sendMessage(question)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl flex flex-col"
        style={{
          width: '90%',
          maxWidth: '800px',
          height: '90%',
          maxHeight: '700px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: '#E5E7EB' }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#2D5016' }}>
              Chat with Document
            </h2>
            <p className="text-sm text-gray-600 mt-1">{documentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close chat"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Chat Container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ backgroundColor: '#F9FAFB' }}
        >
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}>
              <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
            </div>
          )}

          {/* Extracting Text Message */}
          {extracting && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
              <p className="text-sm" style={{ color: '#92400E' }}>
                Extracting text from document... Please wait.
              </p>
            </div>
          )}

          {/* Pre-defined Questions (only show if no messages yet) */}
          {messages.length === 0 && !extracting && !error && (
            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: '#374151' }}>
                Ask a question about this document:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {predefinedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuestionClick(question)}
                    className="text-left p-3 rounded-lg border transition-colors hover:bg-gray-50"
                    style={{
                      borderColor: '#E5E7EB',
                      backgroundColor: '#FFFFFF',
                      color: '#374151',
                    }}
                  >
                    <span className="text-sm">{question}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'rounded-br-none'
                    : 'rounded-bl-none'
                }`}
                style={{
                  backgroundColor: message.role === 'user' ? '#2D5016' : '#FFFFFF',
                  color: message.role === 'user' ? '#FFFFFF' : '#374151',
                  border: message.role === 'assistant' ? '1px solid #E5E7EB' : 'none',
                }}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Source Reference */}
                {message.role === 'assistant' && (message.source_page || message.source_section) && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: message.role === 'user' ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}>
                    <p className="text-xs opacity-75">
                      {message.source_section && `Source: ${message.source_section}`}
                      {message.source_section && message.source_page && ' • '}
                      {message.source_page && `Page ${message.source_page}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded-lg rounded-bl-none p-3"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}
              >
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#2D5016' }}></div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t" style={{ borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' }}>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this document..."
              disabled={loading || extracting || !!error}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderColor: '#D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
              }}
            />
            <button
              type="submit"
              disabled={loading || extracting || !!error || !input.trim()}
              className="px-6 py-2 rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: loading || extracting || !!error || !input.trim() ? '#9CA3AF' : '#2D5016',
                color: '#FFFFFF',
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}



















