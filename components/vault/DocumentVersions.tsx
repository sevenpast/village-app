'use client'

import { useState, useEffect } from 'react'
import { Clock, RotateCcw, GitBranch, X } from 'lucide-react'

interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  parent_version_id: string | null
  is_current: boolean
  is_viewing?: boolean
  uploaded_by: string
  uploaded_by_name: string | null
  uploaded_at: string
  change_summary: string | null
  metadata: {
    file_name?: string
    mime_type?: string
    file_size?: number
    extracted_fields?: Record<string, any>
    new_document_id?: string
    parent_document_id?: string
  } | null
}

interface DocumentVersionsProps {
  documentId: string
  documentName: string
  isOpen: boolean
  onClose: () => void
  onVersionRestore?: () => void
}

export default function DocumentVersions({
  documentId,
  documentName,
  isOpen,
  onClose,
  onVersionRestore,
}: DocumentVersionsProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [comparingVersions, setComparingVersions] = useState<[string, string] | null>(null)

  useEffect(() => {
    if (isOpen && documentId) {
      loadVersions()
    }
  }, [isOpen, documentId])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/vault/documents/${documentId}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions || [])
      } else {
        const errorData = await response.json()
        if (errorData.message?.includes('not yet initialized')) {
          // Migration not run yet - show empty state
          setVersions([])
        } else {
          console.error('Failed to load versions:', errorData)
          alert(`Failed to load versions: ${errorData.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error loading versions:', error)
      alert(`Failed to load versions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Restore this version? This will make it the current version.')) {
      return
    }

    setRestoring(versionId)
    try {
      const response = await fetch(
        `/api/vault/documents/${documentId}/versions/${versionId}/restore`,
        { method: 'POST' }
      )

      if (response.ok) {
        await loadVersions() // Reload versions
        if (onVersionRestore) {
          onVersionRestore()
        }
        alert('Version restored successfully!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to restore version')
      }
    } catch (error) {
      console.error('Error restoring version:', error)
      alert(`Failed to restore version: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setRestoring(null)
    }
  }

  const handleCompareVersions = (versionId1: string, versionId2: string) => {
    setComparingVersions([versionId1, versionId2])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#2D5016' }}>
              Document Versions
            </h2>
            <p className="text-sm text-gray-600 mt-1">{documentName}</p>
          </div>
          <div className="flex items-center gap-3">
            {versions.length > 1 && (
              <button
                onClick={() => {
                  // Compare oldest (first) with newest (last)
                  handleCompareVersions(versions[0].id, versions[versions.length - 1].id)
                }}
                className="px-4 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#2D5016', color: '#2D5016' }}
                title="Compare oldest with newest version"
              >
                Compare Versions
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading versions...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No versions found</p>
              <p className="text-sm text-gray-500">
                Upload a new version of this document to start tracking changes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => {
                // Use is_viewing flag from API
                const isViewing = version.is_viewing === true
                
                return (
                <div
                  key={version.id}
                  className={`p-4 border rounded-lg ${
                    isViewing
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-lg" style={{ color: '#2D5016' }}>
                          Version {version.version_number}
                        </span>
                        {isViewing && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500 text-white">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(version.uploaded_at)}</span>
                        </div>
                        {version.uploaded_by_name && (
                          <div>Uploaded by: {version.uploaded_by_name}</div>
                        )}
                        {version.metadata?.file_size && (
                          <div>Size: {formatFileSize(version.metadata.file_size)}</div>
                        )}
                        {version.change_summary && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-gray-700">
                            <strong>Changes:</strong> {version.change_summary}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {!version.is_current && (
                        <button
                          onClick={() => handleRestoreVersion(version.id)}
                          disabled={restoring === version.id}
                          className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ borderColor: '#2D5016', color: '#2D5016' }}
                          title="Restore this version"
                        >
                          <RotateCcw className="w-4 h-4 inline mr-1" />
                          {restoring === version.id ? 'Restoring...' : 'Restore'}
                        </button>
                      )}
                      {versions.length > 1 && (
                        <>
                          {index > 0 && (
                            <button
                              onClick={() => handleCompareVersions(versions[index - 1].id, version.id)}
                              className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                              style={{ borderColor: '#2D5016', color: '#2D5016' }}
                              title={`Compare Version ${versions[index - 1].version_number} with Version ${version.version_number}`}
                            >
                              Compare with Previous
                            </button>
                          )}
                          {index < versions.length - 1 && (
                            <button
                              onClick={() => handleCompareVersions(version.id, versions[index + 1].id)}
                              className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                              style={{ borderColor: '#2D5016', color: '#2D5016' }}
                              title={`Compare Version ${version.version_number} with Version ${versions[index + 1].version_number}`}
                            >
                              Compare with Next
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Version Comparison Modal */}
      {comparingVersions && (
        <VersionComparison
          documentId={documentId}
          versionId1={comparingVersions[0]}
          versionId2={comparingVersions[1]}
          isOpen={!!comparingVersions}
          onClose={() => setComparingVersions(null)}
        />
      )}
    </div>
  )
}

// Version Comparison Component
interface VersionComparisonProps {
  documentId: string
  versionId1: string
  versionId2: string
  isOpen: boolean
  onClose: () => void
}

function VersionComparison({
  documentId,
  versionId1,
  versionId2,
  isOpen,
  onClose,
}: VersionComparisonProps) {
  const [version1, setVersion1] = useState<any>(null)
  const [version2, setVersion2] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'preview' | 'fields'>('preview')

  useEffect(() => {
    if (isOpen) {
      loadVersions()
    }
  }, [isOpen, versionId1, versionId2])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/vault/documents/${documentId}/versions/${versionId1}`),
        fetch(`/api/vault/documents/${documentId}/versions/${versionId2}`),
      ])

      if (res1.ok && res2.ok) {
        const data1 = await res1.json()
        const data2 = await res2.json()
        setVersion1(data1.version)
        setVersion2(data2.version)
      } else {
        const error1 = await res1.json().catch(() => ({}))
        const error2 = await res2.json().catch(() => ({}))
        throw new Error(error1.error || error2.error || 'Failed to load versions for comparison')
      }
    } catch (error) {
      console.error('Error loading versions for comparison:', error)
      alert(`Failed to load versions for comparison: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const compareFields = (fields1: Record<string, any>, fields2: Record<string, any>) => {
    const allKeys = new Set([...Object.keys(fields1 || {}), ...Object.keys(fields2 || {})])
    const changes: Array<{ field: string; old: any; new: any; type: 'added' | 'removed' | 'changed' }> = []

    for (const key of allKeys) {
      const val1 = fields1?.[key]
      const val2 = fields2?.[key]
      const hasVal1 = val1 !== null && val1 !== undefined && val1 !== ''
      const hasVal2 = val2 !== null && val2 !== undefined && val2 !== ''

      if (!hasVal1 && hasVal2) {
        changes.push({ field: key, old: null, new: val2, type: 'added' })
      } else if (hasVal1 && !hasVal2) {
        changes.push({ field: key, old: val1, new: null, type: 'removed' })
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({ field: key, old: val1, new: val2, type: 'changed' })
      }
    }

    return changes.sort((a, b) => a.field.localeCompare(b.field))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!isOpen) return null

  const changes = version1 && version2
    ? compareFields(
        version1.metadata?.extracted_fields || {},
        version2.metadata?.extracted_fields || {}
      )
    : []

  const doc1 = version1?.document
  const doc2 = version2?.document
  const isPDF1 = doc1?.mime_type === 'application/pdf'
  const isPDF2 = doc2?.mime_type === 'application/pdf'
  const isImage1 = doc1?.mime_type?.startsWith('image/')
  const isImage2 = doc2?.mime_type?.startsWith('image/')

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#2D5016' }}>
              Version Comparison
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Comparing Version {version1?.version_number || '?'} vs Version {version2?.version_number || '?'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#E5E7EB' }}>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'preview'
                ? 'border-b-2 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'preview' ? { borderBottomColor: '#2D5016', color: '#2D5016' } : {}}
          >
            Document Preview
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'fields'
                ? 'border-b-2 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={activeTab === 'fields' ? { borderBottomColor: '#2D5016', color: '#2D5016' } : {}}
          >
            Extracted Fields {changes.length > 0 && `(${changes.length})`}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading versions...</p>
            </div>
          ) : version1 && version2 ? (
            <>
              {activeTab === 'preview' ? (
                <div className="grid grid-cols-2 gap-6 h-full">
                  {/* Version 1 */}
                  <div className="flex flex-col">
                    <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg" style={{ color: '#2D5016' }}>
                            Version {version1.version_number}
                          </h4>
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <div>Uploaded: {formatDate(version1.uploaded_at)}</div>
                            {doc1?.file_size && <div>Size: {formatFileSize(doc1.file_size)}</div>}
                            {version1.change_summary && (
                              <div className="mt-2 text-xs italic">{version1.change_summary}</div>
                            )}
                          </div>
                        </div>
                        {doc1?.download_url && (
                          <a
                            href={doc1.download_url}
                            download={doc1.file_name}
                            className="px-3 py-1 text-xs rounded border transition-colors hover:bg-gray-50"
                            style={{ borderColor: '#2D5016', color: '#2D5016' }}
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50" style={{ borderColor: '#E5E7EB', minHeight: '500px' }}>
                      {doc1?.download_url ? (
                        isPDF1 ? (
                          <iframe
                            src={`/api/vault/preview?url=${encodeURIComponent(doc1.download_url)}`}
                            className="w-full h-full border-0"
                            title={`Version ${version1.version_number}`}
                          />
                        ) : isImage1 ? (
                          <div className="flex items-center justify-center h-full p-4">
                            <img
                              src={doc1.download_url}
                              alt={doc1.file_name}
                              className="max-w-full max-h-full object-contain rounded shadow-lg"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <p className="text-gray-600 mb-4">Preview not available</p>
                            <a
                              href={doc1.download_url}
                              download={doc1.file_name}
                              className="px-4 py-2 rounded text-white transition-colors hover:opacity-90"
                              style={{ backgroundColor: '#2D5016' }}
                            >
                              Download to view
                            </a>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Document not available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Version 2 */}
                  <div className="flex flex-col">
                    <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-lg" style={{ color: '#2D5016' }}>
                            Version {version2.version_number}
                          </h4>
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <div>Uploaded: {formatDate(version2.uploaded_at)}</div>
                            {doc2?.file_size && <div>Size: {formatFileSize(doc2.file_size)}</div>}
                            {version2.change_summary && (
                              <div className="mt-2 text-xs italic">{version2.change_summary}</div>
                            )}
                          </div>
                        </div>
                        {doc2?.download_url && (
                          <a
                            href={doc2.download_url}
                            download={doc2.file_name}
                            className="px-3 py-1 text-xs rounded border transition-colors hover:bg-gray-50"
                            style={{ borderColor: '#2D5016', color: '#2D5016' }}
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50" style={{ borderColor: '#E5E7EB', minHeight: '500px' }}>
                      {doc2?.download_url ? (
                        isPDF2 ? (
                          <iframe
                            src={`/api/vault/preview?url=${encodeURIComponent(doc2.download_url)}`}
                            className="w-full h-full border-0"
                            title={`Version ${version2.version_number}`}
                          />
                        ) : isImage2 ? (
                          <div className="flex items-center justify-center h-full p-4">
                            <img
                              src={doc2.download_url}
                              alt={doc2.file_name}
                              className="max-w-full max-h-full object-contain rounded shadow-lg"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <p className="text-gray-600 mb-4">Preview not available</p>
                            <a
                              href={doc2.download_url}
                              download={doc2.file_name}
                              className="px-4 py-2 rounded text-white transition-colors hover:opacity-90"
                              style={{ backgroundColor: '#2D5016' }}
                            >
                              Download to view
                            </a>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          Document not available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {changes.length > 0 ? (
                    <>
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-gray-700">
                          Found <strong>{changes.length}</strong> field change{changes.length !== 1 ? 's' : ''} between these versions.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {changes.map((change, idx) => (
                          <div
                            key={idx}
                            className={`p-4 border rounded-lg ${
                              change.type === 'added'
                                ? 'bg-green-50 border-green-200'
                                : change.type === 'removed'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold text-gray-900">
                                {change.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  change.type === 'added'
                                    ? 'bg-green-200 text-green-800'
                                    : change.type === 'removed'
                                    ? 'bg-red-200 text-red-800'
                                    : 'bg-yellow-200 text-yellow-800'
                                }`}
                              >
                                {change.type === 'added' ? 'Added' : change.type === 'removed' ? 'Removed' : 'Changed'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">Version {version1.version_number}</div>
                                <div className={`p-2 rounded bg-white ${
                                  change.type === 'removed' ? 'line-through text-red-600' : 'text-gray-700'
                                }`}>
                                  {change.old !== null && change.old !== undefined && change.old !== ''
                                    ? String(change.old)
                                    : <span className="text-gray-400 italic">Empty</span>}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-600 mb-1">Version {version2.version_number}</div>
                                <div className={`p-2 rounded bg-white ${
                                  change.type === 'added' ? 'text-green-600 font-medium' : 'text-gray-700'
                                }`}>
                                  {change.new !== null && change.new !== undefined && change.new !== ''
                                    ? String(change.new)
                                    : <span className="text-gray-400 italic">Empty</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg mb-2">No field changes detected</p>
                      <p className="text-sm text-gray-400">
                        The extracted fields are identical between Version {version1.version_number} and Version {version2.version_number}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Failed to load versions for comparison
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

