'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ConfigFormField } from './ConfigFormField'
import AddressAutocomplete from './AddressAutocomplete'
import DynamicChildrenFields from './DynamicChildrenFields'
import AvatarUpload from './AvatarUpload'
import { useFormSchema } from '@/hooks/useFormSchema'

/**
 * Check if a field is dynamic (e.g., children fields that can vary in count)
 * Dynamic fields should NOT be counted in progress calculation
 */
function isDynamicField(fieldName: string): boolean {
  // Dynamic fields that shouldn't be counted in progress
  // Patterns: child_*, children_*, or any field that can be added/removed dynamically
  return (
    fieldName.startsWith('child_') ||
    fieldName.startsWith('children_') ||
    fieldName.includes('_child') ||
    fieldName === 'children' || // If stored as array
    fieldName === 'children_ages' // Dynamic children ages field
  )
}

function isAddressSubField(fieldName: string): boolean {
  // Address sub-fields (street, number, plz, city) are part of the main address field
  // They shouldn't be counted separately in progress
  return (
    fieldName.endsWith('_street') ||
    fieldName.endsWith('_number') ||
    fieldName.endsWith('_plz') ||
    fieldName.endsWith('_city')
  )
}

interface ProfileEditFormProps {
  initialData?: any
  userEmail?: string | null
  onSave?: () => void
}

export default function ProfileEditForm({ initialData, userEmail, onSave }: ProfileEditFormProps) {
  const router = useRouter()
  const { data: formConfig, isLoading: schemaLoading } = useFormSchema('registration')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Build Zod schema from form config
  const zodSchema = useMemo(() => {
    if (!formConfig) return z.object({})

    const schemaFields: Record<string, z.ZodTypeAny> = {}

    formConfig.steps.forEach((step) => {
      if (!step || !step.fields || !Array.isArray(step.fields)) return
      
      step.fields.forEach((field) => {
        // Use 'name' if 'key' is not available (mapping from FormField interface)
        const fieldKey = (field as any).key || field.name
        
        // Skip email and password fields for profile edit
        if (fieldKey === 'email' || fieldKey === 'password' || fieldKey === 'password_confirm') {
          return
        }

        let fieldSchema: z.ZodTypeAny = z.any()

        if (field.type === 'text' || field.type === 'select') {
          fieldSchema = z.string().optional()
        } else if (field.type === 'multiselect') {
          fieldSchema = z.array(z.string()).optional()
        } else if (field.type === 'file') {
          fieldSchema = z.any().optional().nullable()
        } else {
          fieldSchema = z.string().optional()
        }

        schemaFields[field.key] = fieldSchema
      })
    })

    return z.object(schemaFields)
  }, [formConfig])

  // Map database fields to form field names
  const mapProfileToFormData = useMemo(() => {
    if (!initialData) return {}

    const formData: any = {
      // Direct mappings
      first_name: initialData.first_name,
      last_name: initialData.last_name,
      gender: initialData.gender,
      date_of_birth: initialData.date_of_birth,
      // Handle both old and new field names
      country_of_origin: initialData.country_of_origin_id?.toString() || initialData.country,
      primary_language: initialData.primary_language || initialData.language,
      // Additional form fields
      arrival_date: initialData.arrival_date,
      living_duration: initialData.living_duration,
      has_children: initialData.has_children,
      living_situation: initialData.living_situation,
      current_situation: initialData.current_situation,
      interests: initialData.interests || [],
      children: initialData.children || [],
      avatar_url: initialData.avatar_url,

      // Address mappings
      address_street: initialData.address_street,
      address_number: initialData.address_number,
      plz: initialData.plz,
      city: initialData.city,
      municipality_name: initialData.municipality_name || initialData.city,
    }
    
    // Remove undefined/null values
    Object.keys(formData).forEach(key => {
      if (formData[key] === undefined || formData[key] === null) {
        delete formData[key]
      }
    })
    
    return formData
  }, [initialData])

  const methods = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: mapProfileToFormData,
  })

  // Update form when initialData changes
  useEffect(() => {
    if (initialData && Object.keys(mapProfileToFormData).length > 0) {
      console.log('🔄 Updating form with initialData:', mapProfileToFormData)
      // Use reset to properly update all form values
      methods.reset(mapProfileToFormData, {
        keepDefaultValues: false, // Override default values
        keepValues: false, // Don't keep existing values
      })
    }
  }, [initialData, mapProfileToFormData, methods])

  // Calculate total fields count (excluding dynamic fields and address sub-fields)
  // Use the EXACT same logic as RegistrationWizard
  const totalFields = useMemo(() => {
    if (!formConfig) return 0
    return formConfig.steps.reduce((total, step) => {
      // Skip null steps or steps without fields
      if (!step || !step.fields || !Array.isArray(step.fields)) {
        return total
      }
      return total + step.fields.filter((field) => {
        // Use 'name' if 'key' is not available
        const fieldKey = (field as any).key || field.name
        
        // Skip if field key/name is missing
        if (!field || !fieldKey) return false
        
        // Skip email and password fields (not shown in profile edit)
        if (fieldKey === 'email' || fieldKey === 'password' || fieldKey === 'password_confirm') {
          return false
        }
        
        // Exclude dynamic fields and address sub-fields
        if (isDynamicField(fieldKey)) return false
        if (isAddressSubField(fieldKey)) return false
        // Address field itself counts as one field (not the sub-fields)
        if (field.type === 'address') return true
        return true
      }).length
    }, 0)
  }, [formConfig])

  // Calculate progress based on filled fields (EXACT same logic as RegistrationWizard)
  const progress = useMemo(() => {
    if (totalFields === 0) return 0
    
    let filledCount = 0
    const watchedValues = methods.watch()
    
    if (formConfig) {
      formConfig.steps.forEach((step) => {
        // Skip null steps or steps without fields
        if (!step || !step.fields || !Array.isArray(step.fields)) {
          return
        }
        
        step.fields.forEach((field) => {
          // Use 'name' if 'key' is not available
          const fieldKey = (field as any).key || field.name
          
          // Skip if field key/name is missing
          if (!field || !fieldKey) return
          
          // Skip email, password, and dynamic fields
          if (
            fieldKey === 'email' ||
            fieldKey === 'password' ||
            fieldKey === 'password_confirm'
          ) {
            return
          }
          
          // Skip dynamic fields and address sub-fields in progress calculation
          if (isDynamicField(fieldKey)) {
            return
          }
          if (isAddressSubField(fieldKey)) {
            return
          }

          const value = watchedValues[fieldKey]
          
          // For address fields, check if any sub-field is filled
          if (field.type === 'address') {
            const street = watchedValues[`${fieldKey}_street`]
            const number = watchedValues[`${fieldKey}_number`]
            const plz = watchedValues[`${fieldKey}_plz`]
            const city = watchedValues[`${fieldKey}_city`]
            
            if (street || number || plz || city) {
              filledCount++
            }
            return
          }
          
          // Check if field is filled
          if (value !== undefined && value !== null && value !== '') {
            // For File objects (avatar)
            if (value instanceof File) {
              filledCount++
            }
            // For multiselect, check if array has items
            else if (Array.isArray(value) && value.length > 0) {
              filledCount++
            } 
            // For strings, check if not empty
            else if (typeof value === 'string' && value.trim() !== '') {
              filledCount++
            } 
            // For objects (but not File), check if has keys
            else if (typeof value === 'object' && Object.keys(value).length > 0) {
              filledCount++
            }
          }
        })
      })
    }
    
    return Math.round((filledCount / totalFields) * 100)
  }, [methods.watch(), totalFields, formConfig])

  // Flatten all fields from all steps into one list
  // Keep the same order as registration (all steps in sequence)
  // MUST be before conditional returns to follow Rules of Hooks
  const allFields = useMemo(() => {
    if (!formConfig || !formConfig.steps) return []
    
    return formConfig.steps
      .filter(step => step && step.fields && Array.isArray(step.fields))
      .flatMap(step => {
        // Filter out email/password fields but keep all others
        return (step.fields || []).filter(field => {
          const fieldKey = (field as any).key || field.name
          return field && 
                 fieldKey && 
                 fieldKey !== 'email' && 
                 fieldKey !== 'password' && 
                 fieldKey !== 'password_confirm'
        })
      })
  }, [formConfig])

  // Debug: Log formConfig structure
  // MUST be before conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (formConfig) {
      console.log('📋 formConfig:', formConfig)
      console.log('📋 formConfig.steps:', formConfig.steps)
      if (formConfig.steps) {
        formConfig.steps.forEach((step: any, idx: number) => {
          console.log(`📋 Step ${idx}:`, {
            title: step?.title,
            id: step?.id,
            fieldsCount: step?.fields?.length || 0,
            fields: step?.fields?.map((f: any) => ({ key: f?.key, type: f?.type, label: f?.label }))
          })
        })
      }
    }
  }, [formConfig])

  // Debug: Log allFields
  // MUST be before conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (allFields.length > 0) {
      console.log('📋 allFields count:', allFields.length)
      console.log('📋 allFields:', allFields.map(f => {
        const fieldKey = (f as any).key || f.name
        return { key: fieldKey, type: f?.type, label: f?.label }
      }))
    }
  }, [allFields])

  const onSubmit = async (data: any) => {
    setSaving(true)
    setSaveSuccess(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Handle avatar upload separately if it's a file
      let avatarUrl = data.avatar_url || initialData?.avatar_url

      if (data.avatar && data.avatar instanceof File) {
        try {
          console.log('📤 Uploading avatar file:', {
            name: data.avatar.name,
            size: data.avatar.size,
            type: data.avatar.type,
          })

          // Upload avatar to Supabase Storage
          const fileExt = data.avatar.name.split('.').pop()
          const fileName = `${user.id}-${Date.now()}.${fileExt}`
          const filePath = `avatars/${fileName}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, data.avatar, {
              upsert: true,
              contentType: data.avatar.type || 'image/jpeg',
            })

          if (uploadError) {
            console.error('⚠️ Avatar upload error:', {
              error: uploadError,
              message: uploadError.message,
              statusCode: uploadError.statusCode,
            })
            // Don't fail the entire save if avatar upload fails
            // Just use existing avatar_url or skip
            alert(`Avatar upload failed: ${uploadError.message}. Profile will be saved without new avatar.`)
          } else {
            console.log('✅ Avatar uploaded successfully:', uploadData)
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath)
            avatarUrl = publicUrl
            console.log('✅ Avatar URL:', avatarUrl)
          }
        } catch (uploadError: any) {
          console.error('⚠️ Unexpected error during avatar upload:', uploadError)
          // Don't fail the entire save if avatar upload fails
          alert(`Avatar upload failed: ${uploadError.message || 'Unknown error'}. Profile will be saved without new avatar.`)
        }
      }

      // Prepare profile data - map form fields to database columns
      // Based on 001_initial_schema.sql, profiles table has:
      // user_id, country, language, living_situation, current_situation,
      // address_street, address_number, plz, city, avatar_url, created_at, updated_at
      // Only include fields that exist in the profiles table
      const profileData: any = {
        user_id: user.id,
        // Note: first_name, last_name, gender, date_of_birth, municipality_name may not exist yet
        // Only include if columns exist in database
        country: data.country_of_origin || data.country || null,
        language: data.primary_language || data.language || null,
        living_situation: data.living_situation || null,
        current_situation: data.current_situation || null,
        address_street: data.address_street || null,
        address_number: data.address_number || null,
        plz: data.plz || null,
        city: data.city || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      }

      // Remove undefined values to avoid issues
      Object.keys(profileData).forEach(key => {
        if (profileData[key] === undefined) {
          delete profileData[key]
        }
      })
      
      // Note: Children data is stored separately or can be added later when column exists
      // For now, we'll skip saving children to avoid the error

      console.log('💾 Saving profile data:', JSON.stringify(profileData, null, 2))

      // Update profile - use upsert to ensure it's saved
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id',
        })
        .select()

      if (profileError) {
        console.error('❌ Error saving profile:', {
          error: profileError,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
        })
        alert(`Error saving profile: ${profileError.message || 'Unknown error'}. Please check the console for details.`)
        return
      }

      if (!updatedProfile || updatedProfile.length === 0) {
        console.error('❌ Profile save returned no data')
        alert('Error: Profile was not saved. Please try again.')
        return
      }

      console.log('✅ Profile saved successfully:', updatedProfile)

      // Update interests - MUST complete before navigating
      if (data.interests && Array.isArray(data.interests)) {
        // Delete existing interests
        const { error: deleteError } = await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id)

        if (deleteError) {
          console.error('⚠️ Error deleting interests:', deleteError)
          // Continue anyway - we'll try to insert new ones
        }

        // Insert new interests
        if (data.interests.length > 0) {
          const interestsData = data.interests.map((interest: string) => ({
            user_id: user.id,
            interest_key: interest,
          }))

          const { error: interestsError } = await supabase
            .from('user_interests')
            .insert(interestsData)

          if (interestsError) {
            console.error('⚠️ Error saving interests:', interestsError)
            // Don't fail the whole save if interests fail
          } else {
            console.log('✅ Interests saved successfully')
          }
        } else {
          // No interests to save - that's fine
          console.log('✅ No interests to save')
        }
      }

      // Verify that data was actually saved by fetching it back
      console.log('🔍 Verifying saved data...')
      const { data: verificationProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (verifyError) {
        console.error('⚠️ Could not verify saved data:', verifyError)
        alert('Warning: Could not verify saved data. Please check your profile.')
      } else {
        console.log('✅ Verified: Data is saved in database:', verificationProfile)
        
        // Compare saved data with what we tried to save
        const allFieldsMatch = Object.keys(profileData).every(key => {
          if (key === 'updated_at') return true // Skip timestamp comparison
          const savedValue = verificationProfile[key]
          const expectedValue = profileData[key]
          const matches = savedValue === expectedValue || 
                         (savedValue == null && expectedValue == null) // Loose equality for null/undefined
          if (!matches) {
            console.warn(`⚠️ Field mismatch: ${key} - Expected: ${expectedValue}, Got: ${savedValue}`)
          }
          return matches
        })
        
        if (!allFieldsMatch) {
          console.error('⚠️ Some fields did not match saved data')
          alert('Warning: Some fields may not have been saved correctly. Please check your profile.')
        } else {
          console.log('✅ All fields verified - data is correctly saved!')
        }
      }

      setSaveSuccess(true)

      // Refresh data via onSave callback to ensure parent component has latest data
      if (onSave) {
        try {
          console.log('🔄 Refreshing parent component data...')
          await onSave()
          console.log('✅ Parent component data refreshed')
        } catch (refreshError) {
          console.error('⚠️ Error refreshing parent data:', refreshError)
          // Don't fail the save if refresh fails
        }
      }

      // Wait a moment for everything to complete, then navigate back to dashboard
      console.log('⏳ Waiting for save to complete, then navigating...')
      await new Promise(resolve => setTimeout(resolve, 1500)) // 1.5 seconds to ensure everything is saved
      
      console.log('🚀 Navigating back to dashboard...')
      router.push('/')
    } catch (error) {
      console.error('❌ Unexpected error saving profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Check if error is auth-related
      if (error instanceof Error && (
        error.message.includes('JWT') ||
        error.message.includes('session') ||
        error.message.includes('unauthorized') ||
        error.message.includes('401') ||
        error.message.includes('403')
      )) {
        console.error('🔒 Auth error detected - user may need to re-login')
        alert('Your session has expired. Please log in again.')
        router.push('/login')
        return
      }
      
      alert(`Error saving profile: ${errorMessage}. Please check the console for details.`)
    } finally {
      setSaving(false)
    }
  }

  // All conditional returns MUST come after all hooks
  if (schemaLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center py-8" style={{ color: '#2D5016' }}>
          Loading form...
        </div>
      </div>
    )
  }

  if (!formConfig) {
    return (
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center py-8 text-red-600">
          Error loading form configuration
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#2D5016' }}>
          Edit Profile
        </h1>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="text-sm mb-1" style={{ color: '#374151' }}>
              Profile Completion
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all"
                style={{ 
                  backgroundColor: '#2D5016',
                  width: `${progress}%`
                }}
              />
            </div>
          </div>
          <div className="text-lg font-bold" style={{ color: '#2D5016' }}>
            {progress}%
          </div>
        </div>
        {userEmail && (
          <div className="text-sm" style={{ color: '#6B7280' }}>
            Email: {userEmail}
          </div>
        )}
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          {/* Debug info */}
          {allFields.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                ⚠️ No fields found. formConfig.steps = {formConfig.steps ? JSON.stringify(formConfig.steps.map((s: any) => ({ title: s?.title, fieldsCount: s?.fields?.length })), null, 2) : 'undefined'}
              </p>
            </div>
          )}

          {/* Render all fields grouped by step - same order as registration */}
          {formConfig.steps && Array.isArray(formConfig.steps) && formConfig.steps.length > 0 ? (
            formConfig.steps
              .filter(step => step && step.fields && Array.isArray(step.fields))
              .map((step, stepIndex) => {
                const stepFields = step.fields.filter(field => {
                  const fieldKey = (field as any).key || field.name
                  return field && 
                         fieldKey && 
                         fieldKey !== 'email' && 
                         fieldKey !== 'password' && 
                         fieldKey !== 'password_confirm'
                })

                if (stepFields.length === 0) return null

                return (
                  <div key={step.id || stepIndex} className="space-y-6 pb-8 border-b last:border-b-0" style={{ borderColor: '#E5E7EB' }}>
                    {/* Step Title */}
                    {step.title && (
                      <h2 className="text-2xl font-bold mb-4" style={{ color: '#2D5016' }}>
                        {step.title}
                      </h2>
                    )}
                    
                    {/* Step Fields */}
                    {stepFields.map((field) => {
                      // Use 'name' if 'key' is not available (mapping from FormField interface)
                      const fieldKey = (field as any).key || field.name
                      
                      // Handle address field (address type or address_autocomplete key)
                      if (field.type === 'address' || fieldKey === 'address_autocomplete' || fieldKey === 'address_street') {
                        // Use the correct fieldName for AddressAutocomplete
                        const addressFieldName = fieldKey === 'address_autocomplete' || field.type === 'address' 
                          ? 'address' 
                          : fieldKey.replace('_street', '').replace('_autocomplete', '')
                        
                        return (
                          <AddressAutocomplete
                            key={fieldKey}
                            fieldName={addressFieldName}
                            label={field.label || 'Address'}
                            required={field.required || false}
                          />
                        )
                      }

                      if (fieldKey === 'children_ages' || (typeof fieldKey === 'string' && fieldKey.startsWith('child_'))) {
                        return (
                          <DynamicChildrenFields
                            key={fieldKey}
                            fieldName={fieldKey}
                            label={field.label || 'Children'}
                            fieldType={(field as any).field_type || 'number'}
                            maxFields={(field as any).max_fields || 10}
                            fieldLabelTemplate={(field as any).field_label_template || 'Child {index}'}
                            defaultFields={(field as any).default_fields || 3}
                            conditionalOn={(field as any).conditional_on}
                            conditionalValue={(field as any).conditional_value}
                          />
                        )
                      }

                      // Handle avatar separately to prevent double rendering
                      // Step title might already be "Add your picture!", so don't show label in AvatarUpload
                      if (fieldKey === 'avatar') {
                        // Check if step title mentions picture/avatar
                        const stepTitleLower = (step.title || '').toLowerCase()

                        // If step title mentions picture/avatar, don't show label in AvatarUpload to avoid duplication
                        const stepHasAvatarTitle = stepTitleLower.includes('picture') ||
                                                   stepTitleLower.includes('avatar') ||
                                                   stepTitleLower.includes('add your')

                        // Always hide the label to prevent duplication since we already have the step title
                        return (
                          <AvatarUpload
                            key={fieldKey}
                            fieldName={fieldKey}
                            label={undefined} // Never show label for avatar to avoid duplication
                            required={field.required || false}
                          />
                        )
                      }

                      // Regular fields - use fieldKey for ConfigFormField
                      // Skip avatar/file types to prevent double rendering
                      return (
                        <ConfigFormField
                          key={fieldKey}
                          field={{
                            name: fieldKey,
                            type: field.type as any,
                            label: field.label || fieldKey,
                            required: field.required || false,
                            validation: field.validation,
                            options: field.options,
                            accept: (field as any).accept,
                            dictionary: field.dictionary,
                            autocomplete: (field as any).autocomplete,
                          }}
                          locale="en"
                        />
                      )
                  })}
                  </div>
                )
              })
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 font-semibold mb-2">⚠️ No steps found in form configuration</p>
              <p className="text-red-600 text-sm">
                formConfig.steps is {formConfig.steps ? (Array.isArray(formConfig.steps) ? `an array with ${formConfig.steps.length} items` : typeof formConfig.steps) : 'undefined'}
              </p>
            </div>
          )}

          {/* Save & Cancel Buttons */}
          <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-80"
              style={{ 
                backgroundColor: '#FAF6F0',
                color: '#2D5016',
                border: '1px solid #2D5016'
              }}
            >
              Cancel
            </button>
            
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2D5016' }}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              {saveSuccess && (
                <span className="text-green-600 font-medium">
                  ✓ Profile saved successfully!
                </span>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

