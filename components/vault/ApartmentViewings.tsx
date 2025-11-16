'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Star, X, Upload, Image as ImageIcon } from 'lucide-react'

interface ApartmentViewing {
  id: string
  address: string
  viewing_date: string
  rent_chf?: number
  room_count?: number
  contact_person?: string
  contact_email?: string
  contact_phone?: string
  rating_condition?: number
  rating_neighborhood?: number
  rating_commute?: number
  rating_amenities?: number
  rating_value?: number
  rating_overall?: number
  notes?: string
  is_favorite: boolean
  created_at: string
  photos?: ViewingPhoto[]
  documents?: ViewingDocument[]
  document_count?: number
}

interface ViewingDocument {
  id: string
  file_name: string
  mime_type: string
  file_size: number
  document_type: string | null
  tags: string[] | null
  created_at: string
  download_url: string
}

interface ViewingPhoto {
  id: string
  file_name: string
  storage_path: string
  thumbnail_url?: string
  display_order: number
}

interface ApartmentViewingsProps {
  userId: string
}

export default function ApartmentViewings({ userId }: ApartmentViewingsProps) {
  const [viewings, setViewings] = useState<ApartmentViewing[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingViewing, setEditingViewing] = useState<ApartmentViewing | null>(null)
  const [selectedViewing, setSelectedViewing] = useState<ApartmentViewing | null>(null)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [showAttachDocumentsModal, setShowAttachDocumentsModal] = useState(false)
  const [availableDocuments, setAvailableDocuments] = useState<ViewingDocument[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set())
  const [attachingDocuments, setAttachingDocuments] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    address: '',
    viewing_date: new Date().toISOString().split('T')[0], // Today's date as default
    rent_chf: '',
    contact_email: '',
    rating_condition: 0,
    rating_neighborhood: 0,
    rating_commute: 0,
    rating_amenities: 0,
    rating_value: 0,
    notes: '',
  })
  
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([])

  useEffect(() => {
    loadViewings()
  }, [userId])

  const loadViewings = async () => {
    try {
      const response = await fetch('/api/housing/viewings')
      if (response.ok) {
        const data = await response.json()
        setViewings(data.viewings || [])
      }
    } catch (error) {
      console.error('Failed to load viewings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadViewingDetails = async (viewingId: string) => {
    try {
      const response = await fetch(`/api/housing/viewings/${viewingId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded viewing details:', data.viewing)
        console.log('Documents in viewing:', data.viewing.documents)
        // Update the viewing in the list with documents
        setViewings(prev => prev.map(v => v.id === viewingId ? { ...v, ...data.viewing } : v))
        if (selectedViewing?.id === viewingId) {
          setSelectedViewing(data.viewing)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to load viewing details:', errorData)
      }
    } catch (error) {
      console.error('Failed to load viewing details:', error)
    }
  }

  const loadAvailableDocuments = async () => {
    try {
      const response = await fetch('/api/vault/list')
      if (response.ok) {
        const data = await response.json()
        setAvailableDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
      alert(`Failed to load documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleAttachDocuments = async () => {
    if (!selectedViewing || selectedDocumentIds.size === 0) {
      alert('Please select documents to attach')
      return
    }

    setAttachingDocuments(true)
    try {
      const documentIdsArray = Array.from(selectedDocumentIds)
      console.log('Attaching documents:', documentIdsArray)
      
      const response = await fetch(`/api/housing/viewings/${selectedViewing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_ids: documentIdsArray,
        }),
      })

      const responseData = await response.json().catch(() => ({ error: 'Failed to parse response' }))
      console.log('Attach documents response:', { status: response.status, data: responseData })

      if (!response.ok) {
        const errorMsg = responseData.error || responseData.details || `HTTP ${response.status}: ${response.statusText}`
        console.error('Failed to attach documents:', responseData)
        throw new Error(errorMsg)
      }

      // Reload viewing details immediately
      console.log('Reloading viewing details after attaching documents...')
      await loadViewingDetails(selectedViewing.id)
      
      // Also reload the full viewing list to ensure consistency
      await loadViewings()
      
      setShowAttachDocumentsModal(false)
      setSelectedDocumentIds(new Set())
      
      // Show success message
      alert('Documents attached successfully!')
      
      // Force update selected viewing if it's still open
      if (selectedViewing?.id) {
        const updated = await fetch(`/api/housing/viewings/${selectedViewing.id}`)
        if (updated.ok) {
          const data = await updated.json()
          console.log('Force reload viewing after attach:', data.viewing)
          setSelectedViewing(data.viewing)
        }
      }
    } catch (error) {
      console.error('Error attaching documents:', error)
      alert(`Failed to attach documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setAttachingDocuments(false)
    }
  }

  const handleRemoveDocument = async (documentId: string) => {
    if (!selectedViewing) return

    if (!confirm('Remove this document from the viewing?')) {
      return
    }

    try {
      // Get current document IDs and remove the one to delete
      const currentDocIds = (selectedViewing.documents || [])
        .map(doc => doc.id)
        .filter(id => id !== documentId)

      const response = await fetch(`/api/housing/viewings/${selectedViewing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_ids: currentDocIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove document')
      }

      // Reload viewing details
      await loadViewingDetails(selectedViewing.id)
      alert('Document removed successfully!')
    } catch (error) {
      console.error('Error removing document:', error)
      alert(`Failed to remove document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleOpenAttachDocuments = async () => {
    await loadAvailableDocuments()
    // Pre-select documents that are already attached
    if (selectedViewing?.documents) {
      setSelectedDocumentIds(new Set(selectedViewing.documents.map(doc => doc.id)))
    } else {
      setSelectedDocumentIds(new Set())
    }
    setShowAttachDocumentsModal(true)
  }

  const handleCreate = () => {
    setEditingViewing(null)
    setFormData({
      address: '',
      viewing_date: new Date().toISOString().split('T')[0], // Today's date as default
      rent_chf: '',
      contact_email: '',
      rating_condition: 0,
      rating_neighborhood: 0,
      rating_commute: 0,
      rating_amenities: 0,
      rating_value: 0,
      notes: '',
    })
    setUploadedPhotos([])
    setShowModal(true)
  }

  const handleEdit = (viewing: ApartmentViewing) => {
    setEditingViewing(viewing)
    setFormData({
      address: viewing.address,
      viewing_date: viewing.viewing_date || new Date().toISOString().split('T')[0],
      rent_chf: viewing.rent_chf?.toString() || '',
      contact_email: viewing.contact_email || '',
      rating_condition: viewing.rating_condition || 0,
      rating_neighborhood: viewing.rating_neighborhood || 0,
      rating_commute: viewing.rating_commute || 0,
      rating_amenities: viewing.rating_amenities || 0,
      rating_value: viewing.rating_value || 0,
      notes: viewing.notes || '',
    })
    setUploadedPhotos([])
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this viewing?')) return

    try {
      const response = await fetch(`/api/housing/viewings/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        loadViewings()
      } else {
        alert('Failed to delete viewing')
      }
    } catch (error) {
      console.error('Failed to delete viewing:', error)
      alert('Failed to delete viewing')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      address: formData.address,
      viewing_date: formData.viewing_date || new Date().toISOString().split('T')[0],
      rent_chf: formData.rent_chf ? parseInt(formData.rent_chf) : undefined,
      contact_email: formData.contact_email || undefined,
      rating_condition: formData.rating_condition > 0 ? formData.rating_condition : undefined,
      rating_neighborhood: formData.rating_neighborhood > 0 ? formData.rating_neighborhood : undefined,
      rating_commute: formData.rating_commute > 0 ? formData.rating_commute : undefined,
      rating_amenities: formData.rating_amenities > 0 ? formData.rating_amenities : undefined,
      rating_value: formData.rating_value > 0 ? formData.rating_value : undefined,
      notes: formData.notes || undefined,
    }

    try {
      const url = editingViewing ? `/api/housing/viewings/${editingViewing.id}` : '/api/housing/viewings'
      const method = editingViewing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        const viewingId = editingViewing ? editingViewing.id : result.viewing?.id

        // Upload photos if any
        if (uploadedPhotos.length > 0 && viewingId) {
          const photoFormData = new FormData()
          uploadedPhotos.forEach((photo) => {
            photoFormData.append('photos', photo)
          })

          try {
            const photoResponse = await fetch(`/api/housing/viewings/${viewingId}/photos`, {
              method: 'POST',
              body: photoFormData,
            })

            let photoData: any = {}
            try {
              const text = await photoResponse.text()
              if (text) {
                photoData = JSON.parse(text)
              }
            } catch (parseError) {
              console.error('Failed to parse photo response:', parseError)
              photoData = { error: 'Invalid response from server' }
            }

            if (!photoResponse.ok) {
              const errorMsg = photoData.details || photoData.error || `HTTP ${photoResponse.status}: ${photoResponse.statusText}`
              console.error('Failed to upload photos:', {
                status: photoResponse.status,
                statusText: photoResponse.statusText,
                data: photoData
              })
              alert(`Viewing ${editingViewing ? 'updated' : 'created'} successfully, but failed to upload photos: ${errorMsg}`)
            } else if (photoData.errors && photoData.errors.length > 0) {
              // Partial success - some photos uploaded, some failed
              const errorMsg = photoData.errors.join('\n')
              console.warn('Some photos failed to upload:', photoData.errors)
              alert(`Viewing ${editingViewing ? 'updated' : 'created'} successfully.\n\n${photoData.message}\n\nErrors:\n${errorMsg}`)
            } else if (photoData.success) {
              // Success - optionally show success message
              console.log('Photos uploaded successfully:', photoData.message)
            }
          } catch (photoError) {
            console.error('Error uploading photos:', photoError)
            const errorMessage = photoError instanceof Error ? photoError.message : 'Unknown error'
            alert(`Viewing ${editingViewing ? 'updated' : 'created'} successfully, but failed to upload photos: ${errorMessage}\n\nPlease try uploading them manually.`)
          }
        }

        setShowModal(false)
        loadViewings()
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        const errorMsg = error.details || error.message || error.error || 'Unknown error'
        alert(`Failed to ${editingViewing ? 'update' : 'create'} viewing: ${errorMsg}`)
      }
    } catch (error) {
      console.error(`Failed to ${editingViewing ? 'update' : 'create'} viewing:`, error)
      alert(`Failed to ${editingViewing ? 'update' : 'create'} viewing`)
    }
  }

  const handleStarClick = (category: 'condition' | 'neighborhood' | 'commute' | 'amenities' | 'value', rating: number) => {
    setFormData({
      ...formData,
      [`rating_${category}`]: rating,
    })
  }

  const renderStarRating = (
    category: 'condition' | 'neighborhood' | 'commute' | 'amenities' | 'value',
    label: string,
    currentRating: number
  ) => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(category, star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-6 h-6 ${
                  star <= currentRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-200'
                }`}
              />
            </button>
          ))}
          {currentRating > 0 && (
            <span className="ml-2 text-sm text-gray-600">{currentRating}/5</span>
          )}
        </div>
      </div>
    )
  }

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newPhotos = Array.from(files).filter((file) => file.type.startsWith('image/'))
      setUploadedPhotos((prev) => [...prev, ...newPhotos])
    }
  }

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index))
  }


  const handlePhotoUpload = async (viewingId: string, files: FileList) => {
    setUploadingPhotos(true)
    const formData = new FormData()
    Array.from(files).forEach((file) => {
      formData.append('photos', file)
    })

    try {
      const response = await fetch(`/api/housing/viewings/${viewingId}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const uploadData = await response.json()
        console.log('Photo upload response:', uploadData)
        
        loadViewings()
        if (selectedViewing?.id === viewingId) {
          const updated = await fetch(`/api/housing/viewings/${viewingId}`)
          if (updated.ok) {
            const data = await updated.json()
            console.log('Updated viewing data:', data.viewing)
            console.log('Photos in viewing:', data.viewing.photos)
            setSelectedViewing(data.viewing)
          } else {
            console.error('Failed to reload viewing details after upload')
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Photo upload failed:', errorData)
        alert(`Failed to upload photos: ${errorData.error || errorData.details || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to upload photos:', error)
      alert('Failed to upload photos')
    } finally {
      setUploadingPhotos(false)
    }
  }

  const handleDeletePhoto = async (viewingId: string, photoId: string) => {
    try {
      const response = await fetch(`/api/housing/viewings/${viewingId}/photos/${photoId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        loadViewings()
        if (selectedViewing?.id === viewingId) {
          const updated = await fetch(`/api/housing/viewings/${viewingId}`)
          if (updated.ok) {
            const data = await updated.json()
            setSelectedViewing(data.viewing)
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete photo:', error)
    }
  }

  const renderStars = (rating?: number, maxRating: number = 5) => {
    return Array.from({ length: maxRating }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          rating && i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ))
  }

  if (loading) {
    return <div className="text-center py-8">Loading viewings...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold" style={{ color: '#2D5016' }}>
          My Apartment Viewings
        </h3>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
        >
          <Plus className="w-5 h-5" />
          Log New Viewing
        </button>
      </div>

      {viewings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No apartment viewings yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {viewings.map((viewing) => (
            <div
              key={viewing.id}
              className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
              style={{ borderColor: '#E5E7EB' }}
              onClick={async () => {
                setSelectedViewing(viewing)
                await loadViewingDetails(viewing.id)
              }}
            >
              <div className="mb-2">
                <h4 className="font-semibold text-lg" style={{ color: '#2D5016' }}>
                  {viewing.address}
                </h4>
              </div>

              {viewing.rating_overall && (
                <div className="flex items-center gap-1 mb-2">
                  {renderStars(Math.round(viewing.rating_overall))}
                  <span className="text-sm text-gray-600 ml-1">
                    {viewing.rating_overall.toFixed(1)}
                  </span>
                </div>
              )}

              <div className="text-sm text-gray-600 space-y-1 mb-3">
                <p>Viewing Date: {new Date(viewing.viewing_date).toLocaleDateString()}</p>
                {viewing.created_at && (
                  <p className="text-xs text-gray-500">
                    Created: {new Date(viewing.created_at).toLocaleDateString()}
                  </p>
                )}
                {viewing.rent_chf && <p>Rent: CHF {viewing.rent_chf.toLocaleString()}</p>}
                {viewing.room_count && <p>Rooms: {viewing.room_count}</p>}
                {viewing.photos && viewing.photos.length > 0 && (
                  <p className="flex items-center gap-1">
                    <ImageIcon className="w-4 h-4" />
                    {viewing.photos.length} photo{viewing.photos.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEdit(viewing)
                  }}
                  className="flex-1 px-3 py-1.5 text-sm rounded font-medium transition-colors"
                  style={{ backgroundColor: '#F2B75B', color: '#FFFFFF' }}
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(viewing.id)
                  }}
                  className="px-3 py-1.5 text-sm rounded font-medium transition-colors text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-bold" style={{ color: '#2D5016' }}>
                {editingViewing ? 'Edit Viewing' : 'Create New Viewing'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="e.g., Hauptstrasse 123, 8001 Zürich"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Viewing Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.viewing_date}
                  onChange={(e) => setFormData({ ...formData, viewing_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rent (CHF)
                </label>
                <input
                  type="number"
                  value={formData.rent_chf}
                  onChange={(e) => setFormData({ ...formData, rent_chf: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="e.g., 1800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="landlord@example.com"
                />
              </div>

              <div className="border-t pt-4" style={{ borderColor: '#E5E7EB' }}>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Ratings (Click stars to rate 1-5)</h4>
                {renderStarRating('condition', 'Overall condition & charm', formData.rating_condition)}
                {renderStarRating('neighborhood', 'Neighborhood', formData.rating_neighborhood)}
                {renderStarRating('commute', 'Commute', formData.rating_commute)}
                {renderStarRating('amenities', 'Amenities (laundry, parking, elevator, balcony, etc.)', formData.rating_amenities)}
                {renderStarRating('value', 'Value for money', formData.rating_value)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{ borderColor: '#E5E7EB' }}
                  placeholder="Add your notes about this viewing..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
                <div className="space-y-3">
                  <label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoFileSelect}
                      className="hidden"
                    />
                    <span
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photos
                    </span>
                  </label>

                  {uploadedPhotos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                >
                  {editingViewing ? 'Update' : 'Create'} Viewing
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors border"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Details Modal */}
      {selectedViewing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-bold" style={{ color: '#2D5016' }}>
                {selectedViewing.address}
              </h3>
              <button
                onClick={() => setSelectedViewing(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Viewing Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Viewing Date</p>
                  <p className="font-medium">{new Date(selectedViewing.viewing_date).toLocaleDateString()}</p>
                </div>
                {selectedViewing.created_at && (
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium text-sm">{new Date(selectedViewing.created_at).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedViewing.rent_chf && (
                  <div>
                    <p className="text-sm text-gray-600">Rent</p>
                    <p className="font-medium">CHF {selectedViewing.rent_chf.toLocaleString()}</p>
                  </div>
                )}
                {selectedViewing.room_count && (
                  <div>
                    <p className="text-sm text-gray-600">Rooms</p>
                    <p className="font-medium">{selectedViewing.room_count}</p>
                  </div>
                )}
                {selectedViewing.rating_overall && (
                  <div>
                    <p className="text-sm text-gray-600">Overall Rating</p>
                    <div className="flex items-center gap-1">
                      {renderStars(Math.round(selectedViewing.rating_overall))}
                      <span className="text-sm text-gray-600 ml-1">
                        {selectedViewing.rating_overall.toFixed(1)}/5
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Ratings */}
              {(selectedViewing.rating_condition || 
                selectedViewing.rating_neighborhood || 
                selectedViewing.rating_commute || 
                selectedViewing.rating_amenities || 
                selectedViewing.rating_value) && (
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: '#2D5016' }}>Detailed Ratings</h4>
                  <div className="space-y-3">
                    {selectedViewing.rating_condition && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Overall condition & charm</span>
                        <div className="flex items-center gap-2">
                          {renderStars(selectedViewing.rating_condition)}
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {selectedViewing.rating_condition}/5
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedViewing.rating_neighborhood && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Neighborhood</span>
                        <div className="flex items-center gap-2">
                          {renderStars(selectedViewing.rating_neighborhood)}
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {selectedViewing.rating_neighborhood}/5
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedViewing.rating_commute && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Commute</span>
                        <div className="flex items-center gap-2">
                          {renderStars(selectedViewing.rating_commute)}
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {selectedViewing.rating_commute}/5
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedViewing.rating_amenities && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Amenities</span>
                        <div className="flex items-center gap-2">
                          {renderStars(selectedViewing.rating_amenities)}
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {selectedViewing.rating_amenities}/5
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedViewing.rating_value && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Value for money</span>
                        <div className="flex items-center gap-2">
                          {renderStars(selectedViewing.rating_value)}
                          <span className="text-sm text-gray-600 w-8 text-right">
                            {selectedViewing.rating_value}/5
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              {(selectedViewing.contact_person || selectedViewing.contact_email || selectedViewing.contact_phone) && (
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: '#2D5016' }}>Contact Information</h4>
                  <div className="space-y-1 text-sm">
                    {selectedViewing.contact_person && <p><strong>Name:</strong> {selectedViewing.contact_person}</p>}
                    {selectedViewing.contact_email && <p><strong>Email:</strong> {selectedViewing.contact_email}</p>}
                    {selectedViewing.contact_phone && <p><strong>Phone:</strong> {selectedViewing.contact_phone}</p>}
                  </div>
                </div>
              )}

              {/* Photos Section */}
              <div>
                <h4 className="font-semibold mb-3" style={{ color: '#2D5016' }}>
                  Photos ({selectedViewing.photos?.length || 0})
                </h4>

                <div className="mb-4">
                  <label className="block mb-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handlePhotoUpload(selectedViewing.id, e.target.files)
                        }
                      }}
                      className="hidden"
                      id="photo-upload"
                      disabled={uploadingPhotos}
                    />
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                        uploadingPhotos ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingPhotos ? 'Uploading...' : 'Upload Photos'}
                    </span>
                  </label>
                </div>

                {selectedViewing.photos && selectedViewing.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {selectedViewing.photos.map((photo) => {
                      const imageUrl = photo.thumbnail_url || photo.storage_path
                      console.log('Rendering photo:', { id: photo.id, url: imageUrl, fileName: photo.file_name })
                      return (
                        <div key={photo.id} className="relative group">
                          <img
                            src={imageUrl}
                            alt={photo.file_name}
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => {
                              console.error('Image load error:', { photo, url: imageUrl })
                              e.currentTarget.style.display = 'none'
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', imageUrl)
                            }}
                          />
                          <button
                            onClick={() => handleDeletePhoto(selectedViewing.id, photo.id)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No photos uploaded yet</p>
                )}
              </div>

              {/* Notes */}
              {/* Documents Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold" style={{ color: '#2D5016' }}>
                    Documents ({selectedViewing.documents?.length || 0})
                  </h4>
                  <button
                    onClick={handleOpenAttachDocuments}
                    className="px-3 py-1.5 text-sm rounded transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                  >
                    + Attach Documents
                  </button>
                </div>

                {selectedViewing.documents && selectedViewing.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedViewing.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        style={{ borderColor: '#E5E7EB' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.file_name}</p>
                          {doc.document_type && (
                            <p className="text-xs text-gray-500 mt-1">
                              {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {doc.download_url && (
                            <a
                              href={doc.download_url}
                              download={doc.file_name}
                              className="px-3 py-1 text-xs rounded border transition-colors hover:bg-gray-50"
                              style={{ borderColor: '#2D5016', color: '#2D5016' }}
                            >
                              Download
                            </a>
                          )}
                          <button
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="px-3 py-1 text-xs rounded text-red-600 border border-red-600 transition-colors hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No documents attached yet</p>
                )}
              </div>

              {selectedViewing.notes && (
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: '#2D5016' }}>Notes</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedViewing.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleEdit(selectedViewing)
                    setSelectedViewing(null)
                    setShowModal(true)
                  }}
                  className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: '#F2B75B', color: '#FFFFFF' }}
                >
                  Edit Viewing
                </button>
                <button
                  onClick={() => setSelectedViewing(null)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors border"
                  style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attach Documents Modal */}
      {showAttachDocumentsModal && selectedViewing && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAttachDocumentsModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-xl font-bold" style={{ color: '#2D5016' }}>
                Attach Documents from Vault
              </h3>
              <button
                onClick={() => setShowAttachDocumentsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {availableDocuments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No documents available in vault</p>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.size === availableDocuments.length && availableDocuments.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocumentIds(new Set(availableDocuments.map(doc => doc.id)))
                          } else {
                            setSelectedDocumentIds(new Set())
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">
                        {selectedDocumentIds.size === 0
                          ? 'Select All'
                          : `${selectedDocumentIds.size} of ${availableDocuments.length} selected`}
                      </span>
                    </label>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                    {availableDocuments.map((doc) => (
                      <label
                        key={doc.id}
                        className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        style={{ borderColor: '#E5E7EB' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocumentIds.has(doc.id)}
                          onChange={(e) => {
                            const newSelection = new Set(selectedDocumentIds)
                            if (e.target.checked) {
                              newSelection.add(doc.id)
                            } else {
                              newSelection.delete(doc.id)
                            }
                            setSelectedDocumentIds(newSelection)
                          }}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.file_name}</p>
                          {doc.document_type && (
                            <p className="text-xs text-gray-500 mt-1">
                              {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAttachDocumentsModal(false)}
                      className="px-4 py-2 rounded border transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#2D5016', color: '#2D5016' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAttachDocuments}
                      disabled={attachingDocuments || selectedDocumentIds.size === 0}
                      className="px-4 py-2 rounded text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#2D5016' }}
                    >
                      {attachingDocuments ? 'Attaching...' : `Attach ${selectedDocumentIds.size} Document${selectedDocumentIds.size !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

