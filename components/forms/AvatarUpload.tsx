'use client'

import { useState, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { User, Plus } from 'lucide-react'

interface AvatarUploadProps {
  fieldName: string
  label?: string
  required?: boolean
}

/**
 * Picture Upload Component
 * Displays a circular placeholder with person icon
 * Clicking anywhere on the circle opens file picker
 * Shows preview of uploaded image
 */
export default function AvatarUpload({
  fieldName,
  label = 'Add your picture!',
  required = false,
}: AvatarUploadProps) {
  const { watch, setValue, formState: { errors }, register } = useFormContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const error = errors[fieldName]

  // Register file input (React Hook Form handles files differently)
  // Don't use register for file inputs - handle manually
  const { ref } = register(fieldName, {
    required: required ? 'Please add your picture' : false,
  })

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setValue(fieldName, null, { shouldValidate: true })
        setPreview(null)
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setValue(fieldName, null, { shouldValidate: true })
        setPreview(null)
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Set form value with File object directly
      setValue(fieldName, file, { shouldValidate: true, shouldDirty: true })
    } else {
      // Clear value if no file selected
      setValue(fieldName, null, { shouldValidate: false, shouldDirty: true })
      setPreview(null)
    }
  }

  // Trigger file input click
  const handleCircleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="mb-6">
      {label && label.trim() !== '' && (
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#2D5016' }}>
          {label}
        </h2>
      )}
      
      <p className="text-sm text-gray-600 mb-6">
        Please don't add any pictures of children / minors.
      </p>

      <div className="flex justify-center">
        <div className="relative">
          {/* Circular placeholder/preview */}
          <div
            onClick={handleCircleClick}
            className="relative w-48 h-48 rounded-full cursor-pointer transition-opacity hover:opacity-90"
            style={{
              backgroundColor: '#FAF6F0',
              border: '2px dashed #2D5016',
            }}
          >
            {preview ? (
              <img
                src={preview}
                alt="Profile preview"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <User size={80} style={{ color: '#9CA3AF' }} />
              </div>
            )}

            {/* Plus button overlay */}
            <div
              className="absolute bottom-2 right-2 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#374151' }}
              onClick={(e) => {
                e.stopPropagation()
                handleCircleClick()
              }}
            >
              <Plus size={24} color="white" />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        id={fieldName}
        ref={(e) => {
          if (typeof ref === 'function') {
            ref(e)
          } else if (ref) {
            ref.current = e
          }
          fileInputRef.current = e
        }}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="mt-2 text-sm text-red-600 text-center">
          {error.message as string}
        </p>
      )}
    </div>
  )
}
