'use client'

import { useState, useEffect, useRef } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source_documents?: string[] | null
  created_at: string
}

interface GlobalDocumentChatProps {
  isOpen: boolean
  onClose: () => void
  totalDocuments: number
}

// Pre-defined questions for global chat
const getGlobalQuestions = (): string[] => {
  return [
    'What documents do I have?',
    'What are the key dates across all my documents?',
    'Do I have all required documents for residence permit?',
    'What are my important deadlines?',
    'Compare information across my documents',
    'What information is missing from my documents?',
  ]
}

export default function GlobalDocumentChat({
  isOpen,
  onClose,
  totalDocuments,
}: GlobalDocumentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const predefinedQuestions = getGlobalQuestions()

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Load chat history when component opens
  useEffect(() => {
    if (isOpen) {
      loadChatHistory()
    }
  }, [isOpen])

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/documents/global-chat')
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
      const response = await fetch('/api/documents/global-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionText,
          language: 'en', // TODO: Get from user settings
          chat_id: chatId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Provide more detailed error message
        const errorMsg = data.error || data.details || 'Failed to send message'
        console.error('❌ Chat API error:', {
          status: response.status,
          error: errorMsg,
          details: data.details,
        })
        throw new Error(errorMsg)
      }

      if (data.success) {
        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          source_documents: data.source_documents,
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
      }
    } catch (err) {
      console.error('❌ Error sending message:', err)
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'string' 
          ? err 
          : 'Failed to send message. Please try again.'
      
      setError(errorMessage)
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
          maxWidth: '900px',
          height: '90%',
          maxHeight: '800px',
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
              💬 Chat with All Documents
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ask questions across all {totalDocuments} document{totalDocuments !== 1 ? 's' : ''}
            </p>
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

          {/* Pre-defined Questions (only show if no messages yet) */}
          {messages.length === 0 && !error && (
            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: '#374151' }}>
                Ask a question about all your documents:
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
                
                {/* Source Documents Reference */}
                {message.role === 'assistant' && message.source_documents && message.source_documents.length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: message.role === 'user' ? 'rgba(255,255,255,0.2)' : '#E5E7EB' }}>
                    <p className="text-xs opacity-75">
                      📄 Sources: {message.source_documents.join(', ')}
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
                  <span className="text-sm text-gray-600">Analyzing all documents...</span>
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
              placeholder="Ask a question about all your documents..."
              disabled={loading || !!error}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{
                borderColor: '#D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
              }}
            />
            <button
              type="submit"
              disabled={loading || !!error || !input.trim()}
              className="px-6 py-2 rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: loading || !!error || !input.trim() ? '#9CA3AF' : '#2D5016',
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

