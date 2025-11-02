'use client'

import { FormField } from '@/lib/config/form-reader'
import { useFormContext } from 'react-hook-form'
import DynamicChildrenFields from './DynamicChildrenFields'
import AddressAutocomplete from './AddressAutocomplete'
import AvatarUpload from './AvatarUpload'

interface ConfigFormFieldProps {
  field: FormField
  locale?: string
  dictionaryItems?: Array<{ value: string; label: string }>
}

export function ConfigFormField({
  field,
  locale = 'en',
  dictionaryItems,
}: ConfigFormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext()

  const error = errors[field.name]

  switch (field.type) {
    case 'select':
      return (
        <div className="mb-4">
          <label
            htmlFor={field.name}
            className="block text-sm font-medium mb-2"
            style={{ color: '#2D5016' }}
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            id={field.name}
            {...register(field.name, {
              required: field.required
                ? `${field.label} is required`
                : false,
            })}
            className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{ 
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
            disabled={field.dictionary && !dictionaryItems}
          >
            <option value="">
              {field.dictionary && !dictionaryItems
                ? 'Loading...'
                : `Select ${field.label}`}
            </option>
            {dictionaryItems && dictionaryItems.length > 0 ? (
              dictionaryItems.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))
            ) : field.dictionary ? (
              // Fallback if dictionary is missing
              <>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Other">Other</option>
              </>
            ) : null}
          </select>
          {error && (
            <p className="mt-1 text-sm text-red-600">{error.message as string}</p>
          )}
        </div>
      )

    case 'multiselect':
      return (
        <div className="mb-4">
          <label
            htmlFor={field.name}
            className="block text-sm font-medium mb-2"
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {dictionaryItems?.map((item) => (
              <label
                key={item.value}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  value={item.value}
                  {...register(field.name)}
                  className="mr-2"
                />
                {item.label}
              </label>
            ))}
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-600">{error.message as string}</p>
          )}
        </div>
      )

    case 'email':
      return (
        <div className="mb-4">
          <label
            htmlFor={field.name}
            className="block text-sm font-medium mb-2"
            style={{ color: '#2D5016' }}
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="email"
            id={field.name}
            {...register(field.name, {
              required: field.required
                ? `${field.label} is required`
                : false,
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{ 
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error.message as string}</p>
          )}
        </div>
      )

    case 'password':
      return (
        <div className="mb-4">
          <label
            htmlFor={field.name}
            className="block text-sm font-medium mb-2"
            style={{ color: '#2D5016' }}
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="password"
            id={field.name}
            {...register(field.name, {
              required: field.required
                ? `${field.label} is required`
                : false,
              minLength: field.validation?.minLength
                ? {
                    value: field.validation.minLength,
                    message: `Password must be at least ${field.validation.minLength} characters`,
                  }
                : undefined,
              pattern: field.validation?.pattern
                ? {
                    value: new RegExp(field.validation.pattern),
                    message: field.validation.patternMessage || 'Invalid format',
                  }
                : undefined,
            })}
            className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{ 
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error.message as string}</p>
          )}
        </div>
      )

    case 'file':
      // Special handling for avatar upload
      if (field.name === 'avatar') {
        // Use AvatarUpload component for avatar fields
        return (
          <AvatarUpload
            fieldName={field.name}
            label={field.label}
            required={field.required || false}
          />
        )
      }
      // Default file input for other file types
      return (
        <div className="mb-4">
          <label
            htmlFor={field.name}
            className="block text-sm font-medium mb-2"
            style={{ color: '#2D5016' }}
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="file"
            id={field.name}
            accept={field.accept}
            {...register(field.name, {
              required: field.required
                ? `${field.label} is required`
                : false,
            })}
            className="w-full px-4 py-2 border rounded-md focus:ring-2"
            style={{
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error.message as string}</p>
          )}
        </div>
      )

    case 'dynamic':
      return (
        <DynamicChildrenFields
          fieldName={field.name}
          label={field.label}
          fieldType={(field as any).field_type || 'number'}
          maxFields={(field as any).max_fields || 10}
          fieldLabelTemplate={(field as any).field_label_template || 'Child {index}'}
          defaultFields={(field as any).default_fields || 3}
          conditionalOn={(field as any).conditional_on}
          conditionalValue={(field as any).conditional_value}
        />
      )

    case 'address':
      return (
        <AddressAutocomplete
          fieldName={field.name}
          label={field.label}
          required={field.required}
        />
      )

    default:
      // text
      return (
        <div className="mb-4">
          <label
            htmlFor={field.name}
            className="block text-sm font-medium mb-2"
            style={{ color: '#2D5016' }}
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            id={field.name}
            {...register(field.name, {
              required: field.required
                ? `${field.label} is required`
                : false,
              pattern: field.validation?.pattern
                ? {
                    value: new RegExp(field.validation.pattern),
                    message: field.validation.patternMessage || 'Invalid format',
                  }
                : undefined,
            })}
            className="w-full px-4 py-3 bg-white border rounded-md focus:outline-none focus:ring-2"
            style={{ 
              borderColor: '#2D5016',
              borderWidth: '1px',
            }}
                    placeholder={
                      field.name === 'date_of_birth' || field.name === 'arrival_date' 
                        ? 'DD.MM.YYYY' 
                        : field.label
                    }
          />
          {error && (
            <p className="mt-1 text-sm text-red-600">{error.message as string}</p>
          )}
        </div>
      )
  }
}




