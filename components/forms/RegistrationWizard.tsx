'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { useFormSchema } from '@/hooks/useFormSchema'
import ConfigFormStep from './ConfigFormStep'

interface RegistrationWizardProps {
  onComplete?: (data: any) => void
}

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

/**
 * Multi-Step Registration Wizard
 * Config-driven, loads form schema from Supabase
 */
export default function RegistrationWizard({ onComplete }: RegistrationWizardProps) {
  const { data: formConfig, isLoading, error } = useFormSchema('registration')
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [formData, setFormData] = useState<Record<string, any>>({})

  // Build Zod schema from form config
  const buildZodSchema = () => {
    if (!formConfig) return z.object({})

    const schemaFields: Record<string, z.ZodTypeAny> = {}

    formConfig.steps.forEach((step) => {
      // Skip steps without fields or null steps
      if (!step || !step.fields || !Array.isArray(step.fields)) {
        return
      }
      
      step.fields.forEach((field) => {
        let fieldSchema: z.ZodTypeAny = z.any()

        // Handle different field types
        if (field.type === 'email') {
          fieldSchema = z.string().email('Invalid email address')
        } else if (field.type === 'password') {
          fieldSchema = z.string()
          if (field.validation?.minLength) {
            fieldSchema = fieldSchema.min(
              field.validation.minLength,
              `Password must be at least ${field.validation.minLength} characters`
            )
          }
          if (field.validation?.pattern) {
            fieldSchema = fieldSchema.regex(
              new RegExp(field.validation.pattern),
              field.validation.patternMessage || 'Password does not meet requirements'
            )
          }
        } else if (field.type === 'text') {
          fieldSchema = z.string()
          if (field.validation?.pattern) {
            fieldSchema = fieldSchema.regex(
              new RegExp(field.validation.pattern),
              field.validation.patternMessage || 'Invalid format'
            )
          }
        } else if (field.type === 'file') {
          // File upload fields: accept File object, FileList, null, or undefined
          // Use z.any() to accept any type (we handle validation in the component)
          fieldSchema = z.any().optional().nullable()
        } else {
          fieldSchema = z.string()
        }

        // Handle required fields
        if (!field.required && field.type !== 'password') {
          fieldSchema = fieldSchema.optional().nullable()
        }

        // Handle password confirmation (will be validated on submit)
        if (field.name === 'password_confirm') {
          fieldSchema = z.string().optional() // Make optional since we validate manually
        }
        
        // Make select fields optional if not required (to avoid validation errors)
        if (field.type === 'select' && !field.required) {
          fieldSchema = z.string().optional().nullable()
        }

        schemaFields[field.name] = fieldSchema
      })
    })

    return z.object(schemaFields)
  }

  const zodSchema = useMemo(() => buildZodSchema(), [formConfig])

  const methods = useForm({
    resolver: zodResolver(zodSchema),
    mode: 'onChange',
    defaultValues: formData,
  })

  // Debug: Log form state
  useEffect(() => {
    console.log('Form state:', {
      isValid: methods.formState.isValid,
      errors: methods.formState.errors,
      isSubmitting: methods.formState.isSubmitting,
    })
  }, [methods.formState.isValid, methods.formState.errors, methods.formState.isSubmitting])

  const { handleSubmit, trigger, watch, setValue, getValues } = methods
  const watchedValues = watch()

  // Define REQUIRED fields (obligatorisch) - must be filled for registration
  const REQUIRED_FIELDS = ['first_name', 'last_name', 'email', 'password', 'password_confirm', 'date_of_birth']

  // Check if a field is required (obligatorisch)
  const isRequiredField = (fieldName: string): boolean => {
    return REQUIRED_FIELDS.includes(fieldName)
  }

  // Get all fields from all steps (for progress calculation)
  const getAllFields = useMemo(() => {
    if (!formConfig || !formConfig.steps) return []
    
    const allFields: string[] = []
    formConfig.steps.forEach((step) => {
      if (step && step.fields && Array.isArray(step.fields)) {
        step.fields.forEach((field) => {
          // Skip dynamic and address sub-fields
          if (!isDynamicField(field.name) && !isAddressSubField(field.name)) {
            allFields.push(field.name)
          }
        })
      }
    })
    
    return allFields
  }, [formConfig])

  // Calculate progress based on ALL fields (to reach 100%)
  const progress = useMemo(() => {
    if (!formConfig || getAllFields.length === 0) return 0
    
    let filledCount = 0
    
    // Check each field from all steps
    getAllFields.forEach((fieldName) => {
      const value = watchedValues[fieldName]
          
          // Check if field is filled
          if (value !== undefined && value !== null && value !== '') {
        // For strings, check if not empty
        if (typeof value === 'string' && value.trim() !== '') {
          filledCount++
        } 
        // For date fields (date_of_birth)
        else if (value instanceof Date) {
          filledCount++
        }
            // For File objects (avatar)
        else if (value instanceof File) {
              filledCount++
            }
        // For arrays (interests)
            else if (Array.isArray(value) && value.length > 0) {
              filledCount++
            } 
        // For objects, check if has keys (but not empty object)
            else if (typeof value === 'object' && Object.keys(value).length > 0) {
              filledCount++
            }
          }
        })
    
    const percentage = Math.round((filledCount / getAllFields.length) * 100)
    console.log('📊 Progress calculation:', {
      filledCount,
      totalFields: getAllFields.length,
      percentage,
      requiredFieldsFilled: REQUIRED_FIELDS.filter(f => {
        const val = watchedValues[f]
        return val !== undefined && val !== null && val !== '' && 
               (typeof val !== 'string' || val.trim() !== '')
      }).length,
      totalRequiredFields: REQUIRED_FIELDS.length,
    })
    
    return percentage
  }, [watchedValues, getAllFields, formConfig])

  // Autosave on step completion (debounced to avoid infinite loops)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const subscription = watch((value) => {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Set new timeout for debouncing
      timeoutId = setTimeout(() => {
        const currentValues = value
        if (Object.keys(currentValues).length > 0) {
          // Save to localStorage only (don't update state to avoid loops)
          localStorage.setItem('registration_draft', JSON.stringify(currentValues))
        }
      }, 500) // Debounce: wait 500ms after last change
    })
    
    return () => {
      subscription.unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only setup once

  // Load draft from localStorage on mount (only once)
  useEffect(() => {
    const draft = localStorage.getItem('registration_draft')
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        setFormData(parsed)
        // Set default values in form
        Object.entries(parsed).forEach(([key, value]) => {
          setValue(key, value, { shouldValidate: false })
        })
      } catch (e) {
        console.error('Failed to load draft:', e)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading registration form...</p>
        </div>
      </div>
    )
  }

  if (error || !formConfig) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-semibold mb-2">Error loading form</p>
        <p className="text-red-600 text-sm">{error?.message || 'Form schema not found'}</p>
      </div>
    )
  }

  const steps = formConfig.steps
  const totalSteps = steps.length

  const canGoNext = currentStep < totalSteps - 1
  const canGoPrev = currentStep > 0

  const handleNext = async () => {
    // Safety check for current step
    if (!steps[currentStep] || !steps[currentStep].fields || !Array.isArray(steps[currentStep].fields)) {
      console.error('Invalid step configuration:', currentStep)
      return
    }

    const currentStepFields = steps[currentStep].fields
    // Only validate fields that are explicitly marked as required
    // All fields in "Living Situation" step are optional (required: false)
    const fieldsToValidate = currentStepFields
      .filter((f) => f.required === true) // Only validate explicitly required fields
      .map((f) => f.name)

    // If no required fields, allow moving forward
    if (fieldsToValidate.length === 0) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]))
      if (canGoNext) {
        setCurrentStep(currentStep + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    // Validate current step
    try {
      const isValid = await trigger(fieldsToValidate as any)

      if (isValid) {
        setCompletedSteps((prev) => new Set([...prev, currentStep]))
        if (canGoNext) {
          setCurrentStep(currentStep + 1)
          // Scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      } else {
        // Validation failed - errors should be displayed by react-hook-form
        console.log('Validation failed for step:', currentStep)
      }
    } catch (error) {
      console.error('Error during validation:', error)
    }
  }

  const handlePrevious = () => {
    if (canGoPrev) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const onSubmit = async (data: any) => {
    console.log('Form submitted with data:', data)
    
    // Validate password confirmation
    if (data.password && data.password_confirm && data.password !== data.password_confirm) {
      methods.setError('password_confirm', {
        type: 'manual',
        message: 'Passwords must match',
      })
      return
    }
    
    console.log('Starting registration API call...')

    // Collect interests from interest_1, interest_2, etc. into an array
    const interests: string[] = []
    for (let i = 1; i <= 5; i++) {
      const interestValue = data[`interest_${i}`]
      if (interestValue && interestValue.trim() !== '') {
        interests.push(interestValue)
      }
    }

    // Handle avatar file upload - convert File to base64 for API
    let avatarBase64: string | undefined = undefined
    if (data.avatar && data.avatar instanceof File) {
      try {
        const reader = new FileReader()
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            if (reader.result && typeof reader.result === 'string') {
              resolve(reader.result)
            } else {
              reject(new Error('Failed to read file'))
            }
          }
          reader.onerror = reject
          reader.readAsDataURL(data.avatar)
        })
        avatarBase64 = fileData
      } catch (error) {
        console.error('Error converting avatar to base64:', error)
      }
    }

    // Prepare data for API (merge interests array and remove individual interest_* fields)
    // CRITICAL FOR DSGVO: Ensure ALL form data is included, nothing is lost
    const apiData: any = {
      ...data,
      interests: interests.length > 0 ? interests : undefined,
      avatar_base64: avatarBase64, // Send as base64 string
      avatar: undefined, // Remove File object (not serializable)
      // Remove individual interest fields (they're now in interests array)
      interest_1: undefined,
      interest_2: undefined,
      interest_3: undefined,
      interest_4: undefined,
      interest_5: undefined,
    }
    
    // CRITICAL FOR DSGVO: Log all data being sent to ensure nothing is lost
    console.log('📤 DSGVO Compliance: Sending ALL registration data to API:', {
      email: apiData.email,
      first_name: apiData.first_name,
      last_name: apiData.last_name,
      gender: apiData.gender,
      date_of_birth: apiData.date_of_birth,
      country_of_origin: apiData.country_of_origin,
      primary_language: apiData.primary_language,
      arrival_date: apiData.arrival_date,
      living_duration: apiData.living_duration,
      has_children: apiData.has_children,
      municipality_name: apiData.municipality_name,
      living_situation: apiData.living_situation,
      current_situation: apiData.current_situation,
      swiss_address_street: apiData.swiss_address_street,
      swiss_address_number: apiData.swiss_address_number,
      swiss_address_plz: apiData.swiss_address_plz,
      swiss_address_city: apiData.swiss_address_city,
      interests: apiData.interests,
      interestsCount: apiData.interests?.length || 0,
      hasAvatar: !!apiData.avatar_base64,
    })

    try {
      console.log('Calling registration API with data:', {
        ...apiData,
        avatar_base64: apiData.avatar_base64 ? `[Base64 ${apiData.avatar_base64.length} chars]` : undefined,
      })
      
      // Submit to API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      })

      console.log('API response status:', response.status, response.statusText)
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Non-JSON response:', text)
        methods.setError('root', {
          type: 'manual',
          message: `Server error: ${response.statusText}. Please try again.`,
        })
        return
      }
      
      const result = await response.json()
      console.log('API response result:', result)

      if (!response.ok) {
        console.error('❌ Registration failed:', {
          status: response.status,
          error: result.error,
          details: result.details,
        })
        
        // Handle errors
        if (result.error === 'Passwords do not match') {
          methods.setError('password_confirm', {
            type: 'manual',
            message: 'Passwords must match',
          })
        } else if (result.error?.includes('already exists') || result.error?.includes('already been registered')) {
          methods.setError('email', {
            type: 'manual',
            message: 'An account with this email already exists',
          })
        } else if (result.details && Array.isArray(result.details)) {
          // Zod validation errors
          const firstError = result.details[0]
          methods.setError(firstError.path?.[0] || 'root', {
            type: 'manual',
            message: firstError.message || 'Validation error',
          })
        } else {
          methods.setError('root', {
            type: 'manual',
            message: result.error || `Registration failed (${response.status}). Please try again.`,
          })
        }
        return
      }

      // Success - clear localStorage and call onComplete
      localStorage.removeItem('registration_draft')
      
      console.log('✅ Registration successful:', result)
      console.log('📧 Email sent:', result.email || formData.email)
      console.log('👤 First name:', result.firstName || formData.first_name || formData.firstName)
      
      if (onComplete) {
        // Call onComplete which will redirect to success page
        // API returns { success: true, email, firstName }
        const completeData = {
          success: true,
          email: result.email || result.data?.user?.email || formData.email,
          firstName: result.firstName || formData.first_name || formData.firstName,
        }
        console.log('🚀 Calling onComplete with:', completeData)
        onComplete(completeData)
      } else {
        console.warn('⚠️ onComplete callback not provided')
      }
    } catch (error) {
      console.error('❌ Registration error:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      })
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        methods.setError('root', {
          type: 'manual',
          message: 'Network error. Please check your internet connection and try again.',
        })
      } else {
      methods.setError('root', {
        type: 'manual',
          message: error instanceof Error ? error.message : 'Registration failed. Please try again.',
      })
      }
    }
  }

  const currentStepConfig = steps[currentStep]
  const isLastStep = currentStep === totalSteps - 1

  // Get title for current step
  const getStepTitle = () => {
    // Steps 0-1 (Personal Information, Credentials) - "Create your account" (obligatorisch)
    // Steps 2+ (Arrival, Country, Living, Current, Interests, Avatar) - "Tailor your experience" (freiwillig)
    if (currentStep === 0 || currentStep === 1) {
      return 'Create your account'
    }
    return 'Tailor your experience'
  }
  
  // Show "on Village" subtitle only for optional steps (steps 2+)
  // Avatar Upload is now the last step (after Interests)
  const showVillageSubtitle = currentStep > 1

  return (
    <FormProvider {...methods}>
      <div className="max-w-6xl mx-auto px-4 py-8" style={{ backgroundColor: '#FAF6F0' }}>
        {/* Title and Progress Row */}
        <div className="flex items-start justify-between mb-8">
          {/* Left: Title */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#2D5016' }}>
              {getStepTitle()}
            </h1>
            {showVillageSubtitle && (
              <p className="text-2xl font-bold" style={{ color: '#C85C1A' }}>
                on Village
              </p>
            )}
          </div>

          {/* Right: Progress */}
          <div className="flex flex-col items-end ml-8">
            <p className="text-sm font-medium mb-2" style={{ color: '#374151' }}>
              Registration Progress: {Math.round(progress)}%
            </p>
            {/* Progress Bar */}
            <div
              className="w-64 rounded-full"
              style={{
                height: '8px',
                backgroundColor: '#FAF6F0',
                border: '1px solid #C85C1A',
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: '#C85C1A',
                }}
              />
            </div>
          </div>
        </div>

        {/* Form Step */}
        <form 
          onSubmit={async (e) => {
            e.preventDefault()
            console.log('Form submit event triggered')
            
            // For last step (Avatar Upload - step 7), validate only required fields from steps 0-1
            // All other steps (2-6) are optional
            if (isLastStep) {
              console.log('🎯 Last step (Avatar Upload) - validating required fields from steps 0-1...')
              const allFields: string[] = []
              
              // Only validate required fields from steps 0-1 (Personal Info and Credentials)
              if (formConfig?.steps && formConfig.steps.length >= 2) {
                // Step 0: Personal Information
                const step0 = formConfig.steps[0]
                if (step0 && step0.fields && Array.isArray(step0.fields)) {
                  step0.fields.forEach((field) => {
                    if (field.required === true) {
                      allFields.push(field.name)
                    }
                  })
                }
                
                // Step 1: Credentials
                const step1 = formConfig.steps[1]
                if (step1 && step1.fields && Array.isArray(step1.fields)) {
                  step1.fields.forEach((field) => {
                    if (field.required === true) {
                      allFields.push(field.name)
                    }
                  })
                }
              }
              
              console.log('📋 Required fields to validate:', allFields)
              
              if (allFields.length === 0) {
                // No required fields, just submit
                console.log('✅ No required fields to validate, submitting...')
                const formData = getValues()
                await onSubmit(formData)
              } else {
                console.log('🔍 Triggering validation for required fields...')
                const isValid = await trigger(allFields as any)
                
                console.log('✅ Validation result:', isValid)
                console.log('📊 Current form errors:', methods.formState.errors)
                
                if (isValid) {
                  console.log('✅ All required fields valid, calling onSubmit')
                  const formData = getValues()
                  await onSubmit(formData)
                } else {
                  console.error('❌ Validation failed for required fields')
                  const errors = methods.formState.errors
                  console.error('Form errors:', errors)
                  
                  // Show user-friendly error message
                  const errorMessages = Object.keys(errors).map(key => {
                    const error = errors[key]
                    return error?.message || `${key} is invalid`
                  }).join(', ')
                  
                  methods.setError('root', {
                    type: 'manual',
                    message: `Please fix the following errors: ${errorMessages}`,
                  })
                }
              }
            } else {
              // For non-last steps, use normal handleNext
              handleNext()
            }
          }} 
          className="space-y-6"
        >
          <div className="max-w-2xl">
            <ConfigFormStep step={currentStepConfig} />
          </div>

          {/* Navigation Button - Centered */}
          <div className="flex justify-center pt-8">
            {isLastStep ? (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('🎯🎯🎯 COMPLETE BUTTON CLICKED! 🎯🎯🎯')
                  console.log('Current step:', currentStep, 'isLastStep:', isLastStep)
                  
                  try {
                  // Get all form data
                  const formData = methods.getValues()
                  console.log('📊 Form data keys:', Object.keys(formData))
                  console.log('📧 Email:', formData.email)
                  console.log('👤 First name:', formData.first_name)
                  console.log('🔐 Password:', formData.password ? '***' : 'MISSING')
                  
                    // Validate all REQUIRED fields (obligatorisch): first_name, last_name, email, password, password_confirm, date_of_birth
                    const requiredFields = ['first_name', 'last_name', 'email', 'password', 'password_confirm', 'date_of_birth']
                    console.log('🔍 Validating required fields:', requiredFields)
                    console.log('📋 Current form values:', {
                      first_name: formData.first_name ? '✓' : '✗',
                      last_name: formData.last_name ? '✓' : '✗',
                      email: formData.email ? '✓' : '✗',
                      password: formData.password ? '✓' : '✗',
                      password_confirm: formData.password_confirm ? '✓' : '✗',
                      date_of_birth: formData.date_of_birth ? '✓' : '✗',
                    })
                    
                    const isValid = await methods.trigger(requiredFields as any)
                    console.log('✅ Validation result:', isValid)
                    
                    if (!isValid) {
                      console.error('❌ Required fields validation failed')
                      const errors = methods.formState.errors
                      console.error('Validation errors:', errors)
                      
                      const missingFields: string[] = []
                      requiredFields.forEach(field => {
                        const value = formData[field]
                        const fieldError = errors[field as keyof typeof errors]
                        
                        if (!value || (typeof value === 'string' && value.trim() === '') || fieldError) {
                          const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          missingFields.push(fieldName)
                        }
                      })
                      
                      if (missingFields.length > 0) {
                        alert(`Please fill in all required fields: ${missingFields.join(', ')}`)
                        return
                      }
                      
                      // If no missing fields but validation failed, show generic error
                      const errorMessages = Object.keys(errors)
                        .filter(key => requiredFields.includes(key))
                        .map(key => {
                          const error = errors[key as keyof typeof errors]
                          return error?.message || `${key} is invalid`
                        })
                        .filter(msg => msg)
                      
                      if (errorMessages.length > 0) {
                        alert(`Please fix the following errors:\n${errorMessages.join('\n')}`)
                        return
                      }
                    }
                    
                    // Check password match
                    if (formData.password !== formData.password_confirm) {
                      console.error('❌ Passwords do not match')
                      alert('Passwords do not match')
                      return
                    }
                    
                    // Call onSubmit
                    console.log('🚀 Calling onSubmit...')
                    await onSubmit(formData)
                    console.log('✅ onSubmit completed successfully')
                  } catch (error) {
                      console.error('❌ onSubmit error:', error)
                      alert('Registration error: ' + (error instanceof Error ? error.message : String(error)))
                }
                }}
                disabled={methods.formState.isSubmitting}
                className="px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: '#2D5016',
                  cursor: methods.formState.isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {methods.formState.isSubmitting ? 'Submitting...' : 'Complete!'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2D5016' }}
              >
                Next
              </button>
            )}
          </div>
        </form>
      </div>
    </FormProvider>
  )
}

