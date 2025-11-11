'use client'

import { useState, useEffect } from 'react'
import { Clock, RotateCcw, GitBranch, X } from 'lucide-react'

interface DocumentVersion {
  id: string
  version_number: number
  parent_version_id: string | null
  is_current: boolean
  uploaded_by: string
  uploaded_by_name: string | null
  uploaded_at: string
  change_summary: string | null
  metadata: {
    file_name?: string
    mime_type?: string
    file_size?: number
    extracted_fields?: Record<string, any>
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
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
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
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-4 border rounded-lg ${
                    version.is_current
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
                        {version.is_current && (
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
                        <>
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
                          {index < versions.length - 1 && (
                            <button
                              onClick={() => handleCompareVersions(version.id, versions[index + 1].id)}
                              className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                              style={{ borderColor: '#2D5016', color: '#2D5016' }}
                              title="Compare with previous version"
                            >
                              Compare
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
        throw new Error('Failed to load versions for comparison')
      }
    } catch (error) {
      console.error('Error loading versions for comparison:', error)
      alert('Failed to load versions for comparison')
    } finally {
      setLoading(false)
    }
  }

  const compareFields = (fields1: Record<string, any>, fields2: Record<string, any>) => {
    const allKeys = new Set([...Object.keys(fields1 || {}), ...Object.keys(fields2 || {})])
    const changes: Array<{ field: string; old: any; new: any }> = []

    for (const key of allKeys) {
      const val1 = fields1?.[key]
      const val2 = fields2?.[key]
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({ field: key, old: val1, new: val2 })
      }
    }

    return changes
  }

  if (!isOpen) return null

  const changes = version1 && version2
    ? compareFields(
        version1.metadata?.extracted_fields || {},
        version2.metadata?.extracted_fields || {}
      )
    : []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-xl font-bold" style={{ color: '#2D5016' }}>
            Version Comparison
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : version1 && version2 ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Version {version1.version_number}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Uploaded: {new Date(version1.uploaded_at).toLocaleString()}</div>
                  {version1.change_summary && <div>Changes: {version1.change_summary}</div>}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Version {version2.version_number}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Uploaded: {new Date(version2.uploaded_at).toLocaleString()}</div>
                  {version2.change_summary && <div>Changes: {version2.change_summary}</div>}
                </div>
              </div>

              {changes.length > 0 && (
                <div className="col-span-2 mt-6">
                  <h4 className="font-semibold mb-3">Field Changes:</h4>
                  <div className="space-y-2">
                    {changes.map((change, idx) => (
                      <div key={idx} className="p-3 border rounded bg-yellow-50">
                        <div className="font-medium">{change.field.replace(/_/g, ' ')}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          <div className="line-through text-red-600">
                            Old: {change.old !== null && change.old !== undefined ? String(change.old) : 'N/A'}
                          </div>
                          <div className="text-green-600">
                            New: {change.new !== null && change.new !== undefined ? String(change.new) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {changes.length === 0 && (
                <div className="col-span-2 text-center py-4 text-gray-500">
                  No field changes detected between these versions.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Failed to load versions</div>
          )}
        </div>
      </div>
    </div>
  )
}

