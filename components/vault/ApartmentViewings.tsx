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

  // Form state
  const [formData, setFormData] = useState({
    address: '',
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

  const handleCreate = () => {
    setEditingViewing(null)
    setFormData({
      address: '',
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
      viewing_date: new Date().toISOString().split('T')[0], // Today's date as default
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

          const photoResponse = await fetch(`/api/housing/viewings/${viewingId}/photos`, {
            method: 'POST',
            body: photoFormData,
          })

          if (!photoResponse.ok) {
            console.error('Failed to upload photos, but viewing was created')
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
        loadViewings()
        if (selectedViewing?.id === viewingId) {
          const updated = await fetch(`/api/housing/viewings/${viewingId}`)
          if (updated.ok) {
            const data = await updated.json()
            setSelectedViewing(data.viewing)
          }
        }
      } else {
        alert('Failed to upload photos')
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
              onClick={() => setSelectedViewing(viewing)}
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
                <p>Date: {new Date(viewing.viewing_date).toLocaleDateString()}</p>
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
                    {selectedViewing.photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.thumbnail_url || photo.storage_path}
                          alt={photo.file_name}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleDeletePhoto(selectedViewing.id, photo.id)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No photos uploaded yet</p>
                )}
              </div>

              {/* Notes */}
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
    </div>
  )
}

