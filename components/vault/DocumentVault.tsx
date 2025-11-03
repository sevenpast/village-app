'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  file_name: string
  mime_type: string
  file_size: number
  document_type: string | null
  tags: string[] | null
  confidence: number | null
  processing_status: string
  thumbnail_url: string | null
  created_at: string
  download_url?: string
}

interface DocumentVaultProps {
  userId: string
}

export default function DocumentVault({ userId }: DocumentVaultProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editingTags, setEditingTags] = useState<string[]>([])
  const [editingType, setEditingType] = useState<string>('')
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Available document types (as specified by user)
  const documentTypes = [
    { value: 'passport', label: 'Passport/ID' },
    { value: 'birth_certificate', label: 'Birth Certificate' },
    { value: 'marriage_certificate', label: 'Marriage Certificate' },
    { value: 'employment_contract', label: 'Employment Contract' },
    { value: 'rental_contract', label: 'Rental Contract' },
    { value: 'vaccination_record', label: 'Vaccination Record' },
    { value: 'residence_permit', label: 'Residence Permit' },
    { value: 'bank_documents', label: 'Bank Documents' },
    { value: 'insurance_documents', label: 'Insurance Documents' },
    { value: 'school_documents', label: 'School Documents' },
    { value: 'other', label: 'Other' },
  ]

  // Available tags - used for additional metadata/searchability
  // Tags can help with categorization and searching beyond document_type
  const availableTags = [
    'identity', 'travel', 'family', 'work', 'contract', 'housing',
    'health', 'legal', 'residence', 'financial', 'education',
    'bank', 'insurance', 'school', 'personal', 'official', 'other'
  ]

  useEffect(() => {
    loadDocuments()
  }, [])

  // Filter documents based on search and type
  useEffect(() => {
    let filtered = documents

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(doc => 
        doc.file_name.toLowerCase().includes(query) ||
        doc.document_type?.toLowerCase().includes(query) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filter by document type
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === filterType)
    }

    setFilteredDocuments(filtered)
  }, [documents, searchQuery, filterType])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/vault/list')

      // Check if response is OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ Failed to load documents:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          details: errorData.details,
          hint: errorData.hint,
        })
        
        // Show user-friendly error message
        if (response.status === 401) {
          console.error('Unauthorized - user not authenticated')
          // Could redirect to login here if needed
        } else {
          console.error(`Server error: ${errorData.details || errorData.error || 'Unknown error'}`)
        }
        
        // Set empty array to prevent UI errors
        setDocuments([])
        setFilteredDocuments([])
        return
      }

      const data = await response.json()

      if (data.success !== false && data.documents) {
        const docs = data.documents || []
        setDocuments(docs)
        setFilteredDocuments(docs)
        console.log(`✅ Loaded ${docs.length} documents`)
      } else {
        console.error('Failed to load documents:', {
          success: data.success,
          error: data.error,
          details: data.details,
        })
        // Set empty array to prevent UI errors
        setDocuments([])
        setFilteredDocuments([])
      }
    } catch (error) {
      console.error('❌ Error loading documents:', error)
      // Set empty array to prevent UI errors
      setDocuments([])
      setFilteredDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      await uploadFile(file)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const data = await response.json()

      if (data.success) {
        // Reload documents list
        await loadDocuments()
        setUploadProgress(0)
      } else {
        const errorMsg = data.details || data.error || 'Unknown error'
        console.error('Upload failed:', errorMsg)
        alert(`Upload failed: ${errorMsg}`)
        setUploadProgress(0)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(`Upload error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }

    try {
      console.log('🗑️ Deleting document:', documentId)
      const response = await fetch(`/api/vault/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 Response status:', response.status, response.statusText)

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Response is not JSON:', await response.text())
        alert('Delete failed: Invalid response from server')
        return
      }

      const data = await response.json()
      console.log('📦 Response data:', data)

      // Check for successful response (200-299 status codes)
      if (response.ok && data.success) {
        // Reload documents list
        await loadDocuments()
        console.log('✅ Document deleted successfully')
      } else {
        // Handle error responses (4xx, 5xx status codes or success: false)
        console.error('❌ Delete failed:', data)
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to delete document'
        alert(`Delete failed: ${errorMsg}`)
      }
    } catch (error) {
      console.error('❌ Delete error:', error)
      alert(`Delete error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Bulk selection functions
  const handleSelectDocument = (documentId: string, checked: boolean) => {
    const newSelection = new Set(selectedDocuments)
    if (checked) {
      newSelection.add(documentId)
    } else {
      newSelection.delete(documentId)
    }
    setSelectedDocuments(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredDocuments.map(doc => doc.id))
      setSelectedDocuments(allIds)
    } else {
      setSelectedDocuments(new Set())
    }
  }

  const handleBulkDownload = async () => {
    if (selectedDocuments.size === 0) {
      alert('Please select documents to download')
      return
    }

    setBulkDownloading(true)
    try {
      console.log('📦 Starting bulk download for documents:', Array.from(selectedDocuments))

      const response = await fetch('/api/vault/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocuments)
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download failed')
      }

      // Create download link for ZIP file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `documents-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log('✅ Bulk download completed successfully')
      setSelectedDocuments(new Set()) // Clear selection after download
    } catch (error) {
      console.error('❌ Bulk download error:', error)
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setBulkDownloading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getDocumentTypeLabel = (type: string | null): string => {
    if (!type || type === 'other') return 'Other'
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEditTags = (doc: Document) => {
    setEditingDocId(doc.id)
    setEditingTags(doc.tags || [])
    setEditingType(doc.document_type || 'other')
  }

  const handleSaveTags = async (docId: string) => {
    try {
      const response = await fetch(`/api/vault/${docId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_type: editingType,
          tags: editingTags,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await loadDocuments()
        setEditingDocId(null)
        setEditingTags([])
        setEditingType('')
      } else {
        alert(`Failed to update: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating tags:', error)
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const toggleTag = (tag: string) => {
    if (editingTags.includes(tag)) {
      setEditingTags(editingTags.filter(t => t !== tag))
    } else {
      setEditingTags([...editingTags, tag])
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#2D5016' }}>
          Document Vault
        </h2>
        <p className="text-gray-600">
          Upload and manage your important documents securely
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search documents by name, type, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border"
            style={{ borderColor: '#2D5016' }}
          />
        </div>
        {/* Filter by Type */}
        <div className="md:w-64">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border"
            style={{ borderColor: '#2D5016' }}
          >
            <option value="all">All Types</option>
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Section */}
      <div
        className="mb-8 p-6 rounded-lg border-2 border-dashed"
        style={{ borderColor: '#2D5016', backgroundColor: '#FAF6F0' }}
      >
        <div className="text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.heic"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2D5016' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? 'Uploading...' : 'Upload Documents'}
          </label>
          <p className="mt-2 text-sm text-gray-500">
            PDF, JPEG, PNG, HEIC (max 10MB per file)
          </p>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${uploadProgress}%`,
                    backgroundColor: '#2D5016',
                  }}
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">{uploadProgress}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Selection Controls */}
      {!loading && documents.length > 0 && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">
                  {selectedDocuments.size === 0
                    ? 'Select All'
                    : `${selectedDocuments.size} of ${filteredDocuments.length} selected`}
                </span>
              </label>
            </div>

            {selectedDocuments.size > 0 && (
              <button
                onClick={handleBulkDownload}
                disabled={bulkDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {bulkDownloading ? 'Creating ZIP...' : `Download ${selectedDocuments.size} files`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-lg text-gray-600">Loading documents...</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mx-auto mb-4 text-gray-400"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-gray-600 mb-4">No documents yet</p>
          <p className="text-sm text-gray-500">
            Upload your first document to get started
          </p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No documents found</p>
          <p className="text-sm text-gray-500">
            {searchQuery || filterType !== 'all' 
              ? 'Try adjusting your search or filter' 
              : 'Upload your first document to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow relative"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}
            >
              {/* Selection Checkbox */}
              <div className="absolute top-2 right-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedDocuments.has(doc.id)}
                  onChange={(e) => handleSelectDocument(doc.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Thumbnail */}
              <div className="mb-3 aspect-video bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                {doc.thumbnail_url ? (
                  <img
                    src={doc.thumbnail_url}
                    alt={doc.file_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-gray-400"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
              </div>

              {/* Document Info */}
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">
                  {doc.file_name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">
                    {formatFileSize(doc.file_size)}
                  </span>
                  {doc.processing_status !== 'completed' && (
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(doc.processing_status)}`}>
                      {doc.processing_status}
                    </span>
                  )}
                </div>
                {doc.document_type && (
                  <p className="text-xs text-gray-600 mb-1">
                    Type: {getDocumentTypeLabel(doc.document_type)}
                  </p>
                )}
                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {doc.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#E5E7EB', color: '#374151' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {doc.processing_status === 'failed' && (
                  <p className="text-xs text-red-600 mt-1">
                    Processing failed. You can still use this document.
                  </p>
                )}
              </div>

              {/* Edit Tags Modal/Form */}
              {editingDocId === doc.id ? (
                <div className="mb-3 p-3 rounded border" style={{ borderColor: '#2D5016', backgroundColor: '#FAF6F0' }}>
                  <div className="mb-2">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Document Type:</label>
                    <select
                      value={editingType}
                      onChange={(e) => setEditingType(e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded border"
                      style={{ borderColor: '#2D5016' }}
                    >
                      {documentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Tags:</label>
                    <div className="flex flex-wrap gap-1">
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            editingTags.includes(tag)
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSaveTags(doc.id)}
                      className="flex-1 px-3 py-1 text-sm rounded text-white"
                      style={{ backgroundColor: '#2D5016' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDocId(null)
                        setEditingTags([])
                        setEditingType('')
                      }}
                      className="flex-1 px-3 py-1 text-sm rounded border"
                      style={{ borderColor: '#2D5016', color: '#2D5016' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditTags(doc)}
                  className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                  style={{ borderColor: '#2D5016', color: '#2D5016' }}
                >
                  Edit
                </button>
                {doc.download_url && (
                  <a
                    href={doc.download_url}
                    download={doc.file_name}
                    className="flex-1 px-3 py-2 text-sm text-center rounded border transition-colors hover:bg-gray-50"
                    style={{ borderColor: '#2D5016', color: '#2D5016' }}
                  >
                    Download
                  </a>
                )}
                <button
                  onClick={() => handleDelete(doc.id, doc.file_name)}
                  className="px-3 py-2 text-sm rounded text-red-600 border border-red-600 transition-colors hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

