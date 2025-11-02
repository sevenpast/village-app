'use client'

import { useState, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { Plus, X } from 'lucide-react'

interface DynamicChildrenFieldsProps {
  fieldName: string
  label: string
  fieldType?: 'text' | 'number'
  maxFields?: number
  fieldLabelTemplate?: string
  defaultFields?: number
}

/**
 * Dynamic Fields Component for Children Ages
 * Allows adding/removing multiple child age fields
 * These fields are NOT counted in progress calculation
 */
export default function DynamicChildrenFields({
  fieldName,
  label,
  fieldType = 'text',
  maxFields = 10,
  fieldLabelTemplate = 'Child {index}',
  defaultFields = 3,
  conditionalOn,
  conditionalValue,
}: DynamicChildrenFieldsProps & { 
  defaultFields?: number
  conditionalOn?: string
  conditionalValue?: string
}) {
  const { register, watch, setValue } = useFormContext()
  const watchedValue = watch(fieldName) || []
  
  // Check if conditional field is set to show this field
  const conditionalFieldValue = conditionalOn ? watch(conditionalOn) : null
  const shouldShow = !conditionalOn || conditionalFieldValue === conditionalValue
  
  // Initialize with default fields (3) or existing values
  const initialCount = watchedValue.length > 0 
    ? Math.max(watchedValue.length, defaultFields)
    : defaultFields
  
  const [fieldCount, setFieldCount] = useState(initialCount)
  
  // Initialize default fields on mount if empty AND visible
  // Clear fields when condition changes to false
  useEffect(() => {
    if (!shouldShow) {
      // Clear fields if condition not met
      setValue(fieldName, [], { shouldDirty: false })
      setFieldCount(0)
      return
    }
    
    // When becoming visible, initialize fields
    const currentValues = watch(fieldName) || []
    if (currentValues.length === 0) {
      const emptyArray = Array(defaultFields).fill('')
      setValue(fieldName, emptyArray, { shouldDirty: false })
      setFieldCount(defaultFields)
    } else if (currentValues.length < defaultFields) {
      // Pad array to defaultFields if shorter
      const paddedArray = [...currentValues]
      while (paddedArray.length < defaultFields) {
        paddedArray.push('')
      }
      setValue(fieldName, paddedArray, { shouldDirty: false })
      setFieldCount(defaultFields)
    } else {
      setFieldCount(currentValues.length)
    }
  }, [shouldShow, conditionalFieldValue]) // Re-run when visibility or conditional value changes

  const addField = () => {
    if (fieldCount < maxFields) {
      const newCount = fieldCount + 1
      setFieldCount(newCount)
      const currentValues = watch(fieldName) || []
      setValue(fieldName, [...currentValues, ''], { shouldDirty: true })
    }
  }

  const removeField = (index: number) => {
    const currentValues = watch(fieldName) || []
    const newValues = currentValues.filter((_: any, i: number) => i !== index)
    setValue(fieldName, newValues, { shouldDirty: true })
    setFieldCount(newCount => newCount - 1)
  }

  const handleFieldChange = (index: number, value: string) => {
    const currentValues = watch(fieldName) || []
    const newValues = [...currentValues]
    newValues[index] = value
    setValue(fieldName, newValues, { shouldDirty: true })
  }

  // Only show if condition is met
  if (!shouldShow) {
    return null
  }
  
  // Always show fields (default 3 fields) when visible
  return (
    <div className="mb-4">
      <label
        className="block text-sm font-medium mb-2"
        style={{ color: '#2D5016' }}
      >
        {label}
      </label>

      <div className="space-y-3">
        {Array.from({ length: fieldCount }).map((_, index) => {
          const fieldLabel = fieldLabelTemplate.replace(
            '{index}',
            (index + 1).toString()
          )
          const fieldValue = watchedValue[index] || ''

          return (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <label
                  htmlFor={`${fieldName}_${index}`}
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#2D5016' }}
                >
                  {fieldLabel}
                </label>
                <input
                  type="number"
                  id={`${fieldName}_${index}`}
                  {...register(`${fieldName}.${index}`, {
                    valueAsNumber: true,
                  })}
                  value={fieldValue}
                  onChange={(e) => handleFieldChange(index, e.target.value)}
                  className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
                  style={{
                    borderColor: '#2D5016',
                    borderWidth: '1px',
                  }}
                  placeholder="Age"
                  min="0"
                  max="99"
                />
              </div>
              {/* Only show remove button if more than default fields or if not default fields */}
              {fieldCount > defaultFields && (
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="mt-6 p-2 text-gray-500 hover:text-red-600 transition-colors"
                  aria-label={`Remove ${fieldLabel}`}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )
        })}

        {fieldCount < maxFields && (
          <button
            type="button"
            onClick={addField}
            className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors mt-2"
            style={{
              borderColor: '#2D5016',
              borderWidth: '1px',
              color: '#2D5016',
            }}
          >
            <Plus size={18} />
            <span>Add another child</span>
          </button>
        )}
      </div>
    </div>
  )
}

