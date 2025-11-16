'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import GlobalDocumentChat from './GlobalDocumentChat'
import DocumentReminders from './DocumentReminders'
import DocumentPreview from './DocumentPreview'
import DocumentVersions from './DocumentVersions'

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
  version_count?: number // Number of versions for this document
}

interface DocumentVaultProps {
  userId: string
}

// Helper function to convert number to ordinal (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) {
    return num + 'st'
  }
  if (j === 2 && k !== 12) {
    return num + 'nd'
  }
  if (j === 3 && k !== 13) {
    return num + 'rd'
  }
  return num + 'th'
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
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const [versionsDocumentId, setVersionsDocumentId] = useState<string | null>(null)
  const [globalChatOpen, setGlobalChatOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Bundle Management State
  const [bundles, setBundles] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'documents' | 'bundles' | 'reminders'>('documents')
  const [showCreateBundleModal, setShowCreateBundleModal] = useState(false)
  const [newBundleName, setNewBundleName] = useState('')
  const [newBundleDescription, setNewBundleDescription] = useState('')
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null)
  const [bundleDocuments, setBundleDocuments] = useState<Document[]>([])
  const [showBundleViewModal, setShowBundleViewModal] = useState(false)
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null)
  const [editingBundleName, setEditingBundleName] = useState('')
  const [editingBundleDescription, setEditingBundleDescription] = useState('')

  // Available document types (as specified by user)
  const documentTypes = [
    { value: 'passport', label: 'Passport/ID' },
    { value: 'birth_certificate', label: 'Birth Certificate' },
    { value: 'marriage_certificate', label: 'Marriage Certificate' },
    { value: 'employment_contract', label: 'Employment Contract' },
    { value: 'rental_contract', label: 'Rental Contract' },
    { value: 'proof_of_address', label: 'Proof of Address' },
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
    if (viewMode === 'bundles') {
      loadBundles()
    }
  }, [viewMode])

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
        
        // Show success message with version info if applicable
        if (data.version_linked) {
          alert(`✅ File uploaded successfully!\n\nThis file has been automatically linked as a new version of an existing document with the same name.`)
        }
      } else {
        // Handle duplicate file error (409 Conflict) with user-friendly message
        if (response.status === 409 && data.duplicate) {
          const duplicateFileName = data.duplicate.file_name || file.name
          console.warn('Duplicate file detected:', duplicateFileName)
          alert(`This file has already been uploaded: "${duplicateFileName}"`)
        } else {
          // Handle other errors
          const errorMsg = data.message || data.details || data.error || 'Unknown error'
          console.error('Upload failed:', errorMsg)
          alert(`Upload failed: ${errorMsg}`)
        }
        setUploadProgress(0)
      }
    } catch (error) {
      console.error('Upload error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      alert(`Upload error: ${errorMsg}`)
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

  // Bundle Management Functions
  const loadBundles = async () => {
    try {
      const response = await fetch('/api/vault/bundles')
      if (!response.ok) {
        throw new Error('Failed to load bundles')
      }
      const data = await response.json()
      setBundles(data.bundles || [])
    } catch (error) {
      console.error('❌ Error loading bundles:', error)
      alert(`Failed to load bundles: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCreateBundle = async () => {
    if (!newBundleName.trim()) {
      alert('Please enter a bundle name')
      return
    }

    if (selectedDocuments.size === 0) {
      alert('Please select documents to add to the bundle')
      return
    }

    try {
      const response = await fetch('/api/vault/bundles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bundle_name: newBundleName.trim(),
          description: newBundleDescription.trim() || null,
          document_ids: Array.from(selectedDocuments),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create bundle')
      }

      const data = await response.json()
      console.log('✅ Bundle created:', data.bundle.id)

      // Reset form and reload
      setNewBundleName('')
      setNewBundleDescription('')
      setShowCreateBundleModal(false)
      setSelectedDocuments(new Set())
      await loadBundles()
      alert(`Bundle "${data.bundle.bundle_name}" created successfully!`)
    } catch (error) {
      console.error('❌ Error creating bundle:', error)
      alert(`Failed to create bundle: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleViewBundle = async (bundleId: string) => {
    try {
      const response = await fetch(`/api/vault/bundles/${bundleId}`)
      if (!response.ok) {
        throw new Error('Failed to load bundle')
      }
      const data = await response.json()
      setBundleDocuments(data.documents || [])
      setSelectedBundleId(bundleId)
      setShowBundleViewModal(true)
    } catch (error) {
      console.error('❌ Error loading bundle:', error)
      alert(`Failed to load bundle: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDownloadBundle = async (bundleId: string) => {
    try {
      const bundle = bundles.find(b => b.id === bundleId)
      if (!bundle) return

      // Get bundle details to get document IDs
      const response = await fetch(`/api/vault/bundles/${bundleId}`)
      if (!response.ok) {
        throw new Error('Failed to load bundle')
      }
      const data = await response.json()
      const documentIds = (data.documents || []).map((doc: Document) => doc.id)

      if (documentIds.length === 0) {
        alert('Bundle is empty')
        return
      }

      // Use bulk download endpoint
      const downloadResponse = await fetch('/api/vault/bulk-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds,
        }),
      })

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json()
        throw new Error(errorData.error || 'Download failed')
      }

      const blob = await downloadResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bundle.bundle_name}-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('❌ Error downloading bundle:', error)
      alert(`Failed to download bundle: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleEditBundle = (bundle: any) => {
    setEditingBundleId(bundle.id)
    setEditingBundleName(bundle.bundle_name)
    setEditingBundleDescription(bundle.description || '')
  }

  const handleSaveBundleEdit = async () => {
    if (!editingBundleId || !editingBundleName.trim()) {
      alert('Please enter a bundle name')
      return
    }

    try {
      const response = await fetch(`/api/vault/bundles/${editingBundleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bundle_name: editingBundleName.trim(),
          description: editingBundleDescription.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update bundle')
      }

      setEditingBundleId(null)
      setEditingBundleName('')
      setEditingBundleDescription('')
      await loadBundles()
      alert('Bundle updated successfully!')
    } catch (error) {
      console.error('❌ Error updating bundle:', error)
      alert(`Failed to update bundle: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDeleteBundle = async (bundleId: string, bundleName: string) => {
    if (!confirm(`Are you sure you want to delete bundle "${bundleName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/vault/bundles/${bundleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete bundle')
      }

      await loadBundles()
      alert('Bundle deleted successfully!')
    } catch (error) {
      console.error('❌ Error deleting bundle:', error)
      alert(`Failed to delete bundle: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#2D5016' }}>
              Document Vault
            </h2>
            <p className="text-gray-600">
              Upload and manage your important documents securely
            </p>
          </div>
          <button
            onClick={() => setGlobalChatOpen(true)}
            className="px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
          >
            Chat with All Documents
          </button>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('documents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'documents'
                ? 'text-white'
                : 'bg-white text-gray-700 border'
            }`}
            style={viewMode === 'documents' ? { backgroundColor: '#2D5016' } : { borderColor: '#2D5016' }}
          >
            Documents
          </button>
          <button
            onClick={() => setViewMode('bundles')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'bundles'
                ? 'text-white'
                : 'bg-white text-gray-700 border'
            }`}
            style={viewMode === 'bundles' ? { backgroundColor: '#2D5016' } : { borderColor: '#2D5016' }}
          >
            Bundles
          </button>
          <button
            onClick={() => setViewMode('reminders')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'reminders'
                ? 'text-white'
                : 'bg-white text-gray-700 border'
            }`}
            style={viewMode === 'reminders' ? { backgroundColor: '#2D5016' } : { borderColor: '#2D5016' }}
          >
            Reminders
          </button>
        </div>
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
              <div className="flex gap-2">
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
                <button
                  onClick={() => setShowCreateBundleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Create Bundle
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents List - Only show when viewMode is 'documents' */}
      {viewMode === 'documents' && (
        <>
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
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate flex-1">
                    {doc.file_name}
                  </h3>
                  {typeof doc.version_count === 'number' && doc.version_count > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                      {getOrdinalSuffix(doc.version_count)} version
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-gray-700">
                    {formatFileSize(doc.file_size)}
                  </span>
                </div>
                {doc.created_at && (
                  <p className="text-xs text-gray-500 mb-2">
                    Uploaded: {new Date(doc.created_at).toLocaleDateString('en-GB', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
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
              <div className="flex gap-2 flex-wrap">
                {doc.download_url && (
                  <button
                    onClick={() => setPreviewDocumentId(doc.id)}
                    className="px-3 py-2 text-sm rounded transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                    title="Preview this document"
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={() => setVersionsDocumentId(doc.id)}
                  className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                  style={{ borderColor: '#2D5016', color: '#2D5016' }}
                  title="View document versions"
                >
                  Versions
                </button>
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
        </>
      )}

      {/* Document Preview Modal */}
      {previewDocumentId && (
        <DocumentPreview
          document={documents.find(d => d.id === previewDocumentId)}
          isOpen={!!previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}

      {/* Document Versions Modal */}
      {versionsDocumentId && (
        <DocumentVersions
          documentId={versionsDocumentId}
          documentName={documents.find(d => d.id === versionsDocumentId)?.file_name || 'Document'}
          isOpen={!!versionsDocumentId}
          onClose={() => setVersionsDocumentId(null)}
          onVersionRestore={() => {
            // Reload documents after version restore
            loadDocuments()
          }}
        />
      )}

      {/* Reminders View */}
      {viewMode === 'reminders' && (
        <DocumentReminders userId={userId} />
      )}

      {/* Bundles List View */}
      {viewMode === 'bundles' && (
        <div>
          {bundles.length === 0 ? (
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
              <p className="text-gray-600 mb-4">No bundles yet</p>
              <p className="text-sm text-gray-500">
                Select documents and create your first bundle
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}
                >
                  <h3 className="font-semibold text-lg mb-2" style={{ color: '#2D5016' }}>
                    {bundle.bundle_name}
                  </h3>
                  {bundle.description && (
                    <p className="text-sm text-gray-600 mb-2">{bundle.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {bundle.document_count || 0} document{bundle.document_count !== 1 ? 's' : ''}
                  </div>
                  <p className="text-xs text-gray-400 mb-4">
                    Created: {new Date(bundle.created_at).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleViewBundle(bundle.id)}
                      className="px-3 py-2 text-sm rounded transition-colors hover:opacity-90"
                      style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadBundle(bundle.id)}
                      className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#2D5016', color: '#2D5016' }}
                    >
                      Download ZIP
                    </button>
                    <button
                      onClick={() => handleEditBundle(bundle)}
                      className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#2D5016', color: '#2D5016' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBundle(bundle.id, bundle.bundle_name)}
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
      )}

      {/* Create Bundle Modal */}
      {showCreateBundleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowCreateBundleModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
              Create Bundle
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bundle Name *
              </label>
              <input
                type="text"
                value={newBundleName}
                onChange={(e) => setNewBundleName(e.target.value)}
                placeholder="e.g., Municipality Registration Documents"
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: '#2D5016' }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={newBundleDescription}
                onChange={(e) => setNewBundleDescription(e.target.value)}
                placeholder="Add a description for this bundle..."
                rows={3}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: '#2D5016' }}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {selectedDocuments.size} document{selectedDocuments.size !== 1 ? 's' : ''} will be added to this bundle
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateBundleModal(false)
                  setNewBundleName('')
                  setNewBundleDescription('')
                }}
                className="px-4 py-2 rounded border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#2D5016', color: '#2D5016' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBundle}
                className="px-4 py-2 rounded text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2D5016' }}
              >
                Create Bundle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bundle Modal */}
      {editingBundleId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => {
            setEditingBundleId(null)
            setEditingBundleName('')
            setEditingBundleDescription('')
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
              Edit Bundle
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bundle Name *
              </label>
              <input
                type="text"
                value={editingBundleName}
                onChange={(e) => setEditingBundleName(e.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: '#2D5016' }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={editingBundleDescription}
                onChange={(e) => setEditingBundleDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded border"
                style={{ borderColor: '#2D5016' }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditingBundleId(null)
                  setEditingBundleName('')
                  setEditingBundleDescription('')
                }}
                className="px-4 py-2 rounded border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#2D5016', color: '#2D5016' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBundleEdit}
                className="px-4 py-2 rounded text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2D5016' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bundle View Modal */}
      {showBundleViewModal && selectedBundleId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => {
            setShowBundleViewModal(false)
            setSelectedBundleId(null)
            setBundleDocuments([])
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#2D5016' }}>
                Bundle Documents
              </h3>
              <button
                onClick={() => {
                  setShowBundleViewModal(false)
                  setSelectedBundleId(null)
                  setBundleDocuments([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {bundleDocuments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">This bundle is empty</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bundleDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="border rounded-lg p-4"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <h4 className="font-semibold mb-2">{doc.file_name}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {formatFileSize(doc.file_size)}
                    </p>
                    {doc.document_type && (
                      <p className="text-xs text-gray-500 mb-2">
                        Type: {getDocumentTypeLabel(doc.document_type)}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {doc.download_url && (
                        <a
                          href={doc.download_url}
                          download={doc.file_name}
                          className="px-3 py-1 text-sm rounded border transition-colors hover:bg-gray-50"
                          style={{ borderColor: '#2D5016', color: '#2D5016' }}
                        >
                          Download
                        </a>
                      )}
                      <button
                        onClick={() => setPreviewDocumentId(doc.id)}
                        className="px-3 py-1 text-sm rounded transition-colors hover:opacity-90"
                        style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Document Chat Modal */}
      <GlobalDocumentChat
        isOpen={globalChatOpen}
        onClose={() => setGlobalChatOpen(false)}
        totalDocuments={documents.filter(d => d.mime_type === 'application/pdf' && d.processing_status === 'completed').length}
      />
    </div>
  )
}

