'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppHeader from '@/components/AppHeader'
import DocumentChat from '@/components/vault/DocumentChat'

export default function TestDocumentChatPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [firstName, setFirstName] = useState('User')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        
        const { data: { user: currentUser }, error } = await supabase.auth.getUser()
        
        if (error || !currentUser) {
          router.push('/login')
          return
        }

        setUser(currentUser)
        
        const name = currentUser.user_metadata?.first_name || currentUser.email?.split('@')[0] || 'User'
        setFirstName(name)

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('user_id', currentUser.id)
            .single()
          
          if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url)
          }
        } catch (err) {
          // Continue without avatar
        }

        // Load documents
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('id, file_name, document_type, mime_type, processing_status')
          .eq('user_id', currentUser.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (!docsError && docs) {
          setDocuments(docs)
          // Auto-select first PDF if available
          const firstPdf = docs.find(d => d.mime_type === 'application/pdf')
          if (firstPdf) {
            setSelectedDocId(firstPdf.id)
            setSelectedDoc(firstPdf)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FEFAF6' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#294F3F' }}></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FEFAF6' }}>
      <AppHeader firstName={firstName} avatarUrl={avatarUrl} showHome={true} />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#2D5016' }}>
              🧪 Document Chat Test Page
            </h1>
            <p className="text-gray-600">
              Test the document chat feature. Select a document below to start chatting.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              💡 <strong>Tip:</strong> The chat is also available in the{' '}
              <a href="/vault" className="underline" style={{ color: '#2D5016' }}>
                Vault
              </a>{' '}
              by clicking the "💬 Chat" button on any document.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4" style={{ border: '1px solid #E5E7EB' }}>
                <h2 className="font-semibold mb-3" style={{ color: '#2D5016' }}>
                  Your Documents ({documents.length})
                </h2>
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No documents found</p>
                    <a
                      href="/vault"
                      className="inline-block px-4 py-2 rounded text-white text-sm"
                      style={{ backgroundColor: '#2D5016' }}
                    >
                      Upload Document
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocId(doc.id)
                          setSelectedDoc(doc)
                        }}
                        className={`w-full text-left p-3 rounded border transition-colors ${
                          selectedDocId === doc.id
                            ? 'border-2'
                            : 'border'
                        }`}
                        style={{
                          borderColor: selectedDocId === doc.id ? '#2D5016' : '#E5E7EB',
                          backgroundColor: selectedDocId === doc.id ? '#FAF6F0' : '#FFFFFF',
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: '#374151' }}>
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {doc.document_type || 'Unknown type'}
                            </p>
                            {doc.mime_type !== 'application/pdf' && (
                              <p className="text-xs text-red-600 mt-1">
                                ⚠️ Not a PDF
                              </p>
                            )}
                            {doc.processing_status === 'failed' && (
                              <p className="text-xs text-red-600 mt-1">
                                ⚠️ Processing failed
                              </p>
                            )}
                          </div>
                          {selectedDocId === doc.id && (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{ color: '#2D5016', flexShrink: 0 }}
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2">
              {selectedDocId && selectedDoc ? (
                <>
                  <div className="bg-white rounded-lg shadow p-4 mb-4" style={{ border: '1px solid #E5E7EB' }}>
                    <p className="text-sm text-gray-600">
                      <strong>Selected:</strong> {selectedDoc.file_name}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedDocId(null)
                        setSelectedDoc(null)
                      }}
                      className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear selection
                    </button>
                  </div>
                  <div className="bg-white rounded-lg shadow" style={{ border: '1px solid #E5E7EB', minHeight: '600px', position: 'relative' }}>
                    <DocumentChat
                      documentId={selectedDocId}
                      documentName={selectedDoc.file_name}
                      documentType={selectedDoc.document_type}
                      isOpen={true}
                      onClose={() => {
                        setSelectedDocId(null)
                        setSelectedDoc(null)
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center" style={{ border: '1px solid #E5E7EB', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mb-4 text-gray-400"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p className="text-gray-600 mb-2">No document selected</p>
                  <p className="text-sm text-gray-500">
                    Select a document from the list to start chatting
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

