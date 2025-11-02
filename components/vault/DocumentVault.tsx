'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  file_name: string
  file_type: string
  file_size: number
  document_type: string | null
  tags: string[] | null
  confidence_score: number | null
  processing_status: string
  thumbnail_url: string | null
  uploaded_at: string
  download_url?: string
}

interface DocumentVaultProps {
  userId: string
}

export default function DocumentVault({ userId }: DocumentVaultProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/vault/list')
      const data = await response.json()

      if (data.success) {
        setDocuments(data.documents || [])
      } else {
        console.error('Failed to load documents:', data.error)
      }
    } catch (error) {
      console.error('Error loading documents:', error)
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
        alert(`Upload failed: ${data.error}`)
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
      const response = await fetch(`/api/vault/${documentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        // Reload documents list
        await loadDocuments()
      } else {
        alert(`Delete failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert(`Delete error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}
            >
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
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(doc.processing_status)}`}>
                    {doc.processing_status}
                  </span>
                </div>
                {doc.document_type && (
                  <p className="text-xs text-gray-600">
                    Type: {getDocumentTypeLabel(doc.document_type)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
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

