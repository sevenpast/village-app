'use client'

import { useEffect, useRef } from 'react'

interface Document {
  id: string
  file_name: string
  mime_type: string
  download_url?: string
  document_type: string | null
}

interface DocumentPreviewProps {
  document: Document | undefined
  isOpen: boolean
  onClose: () => void
}

export default function DocumentPreview({
  document,
  isOpen,
  onClose,
}: DocumentPreviewProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      if (document.body) {
        document.body.style.overflow = 'hidden'
      }
    }

    return () => {
      window.removeEventListener('keydown', handleEscape)
      if (document.body) {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen, onClose])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !document || !document.download_url) {
    return null
  }

  const isPDF = document.mime_type === 'application/pdf'
  const isImage = document.mime_type?.startsWith('image/')

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: '#FAF6F0' }}>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" style={{ color: '#2D5016' }}>
              {document.file_name}
            </h2>
            {document.document_type && (
              <p className="text-sm text-gray-600 mt-1">
                {document.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {document.download_url && (
              <a
                href={document.download_url}
                download={document.file_name}
                className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#2D5016', color: '#2D5016' }}
                title="Download document"
              >
                ⬇️ Download
              </a>
            )}
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded text-gray-600 hover:bg-gray-100 transition-colors"
              title="Close preview"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {isPDF ? (
            <iframe
              src={`/api/vault/preview?url=${encodeURIComponent(document.download_url || '')}`}
              className="w-full h-full min-h-[600px] border-0 rounded"
              title={document.file_name}
            />
          ) : isImage ? (
            <div className="flex items-center justify-center h-full">
              <img
                src={document.download_url}
                alt={document.file_name}
                className="max-w-full max-h-full object-contain rounded shadow-lg"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-400 mb-4"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-gray-600 mb-4">
                Preview not available for this file type
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {document.mime_type || 'Unknown file type'}
              </p>
              {document.download_url && (
                <a
                  href={document.download_url}
                  download={document.file_name}
                  className="px-4 py-2 rounded text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#2D5016' }}
                >
                  Download to view
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

