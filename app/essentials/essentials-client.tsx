'use client'

import { useState, useEffect, useRef } from 'react'
import Link from '@/lib/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'
import GemeindeRegistrationInfobox from './gemeinde-registration-infobox'
import { getMunicipalityUrl } from '@/lib/municipality-urls'
import AppHeader from '@/components/AppHeader'
import { Vault } from 'lucide-react'

interface EssentialsClientProps {
  firstName: string
  avatarUrl: string | null
}

interface Task {
  id: number
  title: string
  number: number
}

interface TaskData {
  task_id: number
  goal: string
  infobox: any
  resources: Array<{ type: string; title: string; expanded?: boolean }>
  user_data: {
    country_name: string | null
    visa_status: string | null
    children_ages: number[]
    municipality_name: string | null
  }
}

export default function EssentialsClient({ firstName, avatarUrl }: EssentialsClientProps) {
  const [selectedTask, setSelectedTask] = useState<number | null>(1) // Default to Task 1
  const [taskData, setTaskData] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(false)
  const [goal, setGoal] = useState('')
  const [taskStatus, setTaskStatus] = useState<Record<number, boolean>>({}) // Track done status per task
  const [reminderDays, setReminderDays] = useState<Record<number, number>>({}) // Track reminder days per task
  const [completedDates, setCompletedDates] = useState<Record<number, string>>({}) // Track completion dates
  const [expandedResources, setExpandedResources] = useState<Record<number, Set<string>>>({})
  const [expandedFAQs, setExpandedFAQs] = useState<Record<number, Set<number>>>({}) // Task ID -> Set of FAQ indices
  const [municipalityInfo, setMunicipalityInfo] = useState<any>(null)
  const [loadingMunicipality, setLoadingMunicipality] = useState(false)
  const [reminderSaveStatus, setReminderSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [resourceSearchQuery, setResourceSearchQuery] = useState<Record<number, string>>({}) // Task-specific search queries
  const [vaultDocuments, setVaultDocuments] = useState<any[]>([]) // Documents from vault
  const [loadingVaultDocuments, setLoadingVaultDocuments] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null) // Track which document is being uploaded
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetDoc, setUploadTargetDoc] = useState<string | null>(null) // Which document type to upload
  
  // Debounce timer ref for reminder changes
  const reminderDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get current task's done status
  const isDone = selectedTask ? taskStatus[selectedTask] || false : false
  const currentReminderDays = selectedTask ? reminderDays[selectedTask] || 7 : 7

  const tasks: Task[] = [
    { id: 1, title: 'Secure residence permit / visa', number: 1 },
    { id: 2, title: 'Register at the Gemeinde (municipality)', number: 2 },
    { id: 3, title: 'Find a place that fits your needs', number: 3 },
    { id: 4, title: 'Register your kids at school / kindergarten', number: 4 },
    { id: 5, title: 'Receive residence permit card', number: 5 },
  ]

  // Load task data when task is selected
  useEffect(() => {
    if (selectedTask) {
      loadTaskData(selectedTask)
    }
  }, [selectedTask])

  // Load vault documents when component mounts
  useEffect(() => {
    loadVaultDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only load once on mount

  const loadTaskData = async (taskId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`)
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(`Failed to load task data: ${errorData.error || response.statusText}`)
      }
      const data: TaskData = await response.json()
      setTaskData(data)
      setGoal(data.goal || '')
      
      // Load municipality info for Task 2
      if (taskId === 2 && data.user_data?.municipality_name) {
        loadMunicipalityInfo(data.user_data.municipality_name)
      } else {
        setMunicipalityInfo(null)
      }
      
      // TODO: Load task status and reminder from API
      // For now, initialize from localStorage if available
      const savedStatus = localStorage.getItem(`task_${taskId}_done`)
      const savedReminder = localStorage.getItem(`task_${taskId}_reminder`)
      const savedCompletedDate = localStorage.getItem(`task_${taskId}_completed_date`)
      if (savedStatus === 'true') {
        setTaskStatus(prev => ({ ...prev, [taskId]: true }))
      }
      if (savedReminder) {
        setReminderDays(prev => ({ ...prev, [taskId]: Number(savedReminder) }))
      }
      if (savedCompletedDate) {
        setCompletedDates(prev => ({ ...prev, [taskId]: savedCompletedDate }))
      }
    } catch (error) {
      console.error('Error loading task data:', error)
      // Set empty state so UI doesn't break
      setTaskData({
        task_id: taskId,
        goal: 'Unable to load task data. Please try again.',
        infobox: null,
        resources: [],
        user_data: { country_name: null, visa_status: null, children_ages: [] }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTaskClick = (taskId: number) => {
    setSelectedTask(taskId)
    // Reset reminder save status when switching tasks
    setReminderSaveStatus('idle')
    // Search query is task-specific, no need to reset (each task has its own)
  }

  // Get search query for current task
  const getCurrentTaskSearchQuery = (): string => {
    if (!selectedTask) return ''
    return resourceSearchQuery[selectedTask] || ''
  }

  // Set search query for current task
  const setCurrentTaskSearchQuery = (query: string) => {
    if (!selectedTask) return
    setResourceSearchQuery((prev) => ({
      ...prev,
      [selectedTask]: query,
    }))

    // Auto-open resource boxes if match found (use useEffect to check after state update)
  }

  // Auto-open resource boxes when search query changes and matches are found
  useEffect(() => {
    const query = getCurrentTaskSearchQuery()
    if (!query.trim() || !selectedTask || !taskData) return

    const lowerQuery = query.toLowerCase().trim()
    let shouldOpenFAQ = false
    let shouldOpenDocuments = false

    // Check FAQ content
    if (taskData.infobox?.faqs && Array.isArray(taskData.infobox.faqs)) {
      const faqText = taskData.infobox.faqs
        .map((faq: any) => `${faq.question} ${faq.answer}`)
        .join(' ')
        .toLowerCase()
      if (faqText.includes(lowerQuery)) {
        shouldOpenFAQ = true
      }
    } else if (taskData.infobox) {
      // Check other infobox types (message, etc.)
      const infoboxText = JSON.stringify(taskData.infobox).toLowerCase()
      if (infoboxText.includes(lowerQuery)) {
        shouldOpenFAQ = true
      }
    }

    // Check documents content (for tasks that have documents)
    if (selectedTask === 1 || selectedTask === 2 || selectedTask === 4) {
      const documentsText = [
        'Passport/ID for each family member',
        'For families: family book, marriage certificate, birth certificates, divorce certificate',
        'Employment contract (with length and hours)',
        'Rental contract or landlord confirmation',
        'Passport photos (sometimes required)',
        'Proof of health insurance (or provide it within 3 months)',
        'Child\'s passport or ID',
        'Birth certificate',
        'Residence permit (if available)',
        'Proof of address (rental contract or confirmation)',
        'Vaccination record',
      ].join(' ').toLowerCase()

      if (documentsText.includes(lowerQuery)) {
        shouldOpenDocuments = true
      }
    }

    // Auto-expand resources if matches found
    if (shouldOpenFAQ || shouldOpenDocuments) {
      setExpandedResources((prev) => {
        const taskResources = prev[selectedTask] || new Set<string>()
        const newSet = new Set(taskResources)
        if (shouldOpenFAQ) newSet.add('faq')
        if (shouldOpenDocuments) newSet.add('documents')
        return {
          ...prev,
          [selectedTask]: newSet,
        }
      })
    }
  }, [resourceSearchQuery, selectedTask, taskData])

  const handleTaskComplete = async (checked: boolean) => {
    if (!selectedTask || isDone) return // Don't allow unchecking once done

    // Update local state immediately
    setTaskStatus(prev => ({ ...prev, [selectedTask]: checked }))
    
    // Save to localStorage for persistence
    localStorage.setItem(`task_${selectedTask}_done`, checked.toString())

    if (checked) {
      // Task marked as done - save completion date and cancel reminder
      const completionDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      setCompletedDates(prev => ({ ...prev, [selectedTask]: completionDate }))
      localStorage.setItem(`task_${selectedTask}_completed_date`, completionDate)
      
      try {
        // API call to mark task as completed
        const response = await fetch(`/api/tasks/${selectedTask}/complete`, { 
          method: 'POST',
        })
        
        if (!response.ok) {
          throw new Error('Failed to save task completion')
        }
        
        console.log(`Task ${selectedTask} marked as completed on ${completionDate}`)
        
        // Dispatch custom event to update progress on dashboard and essentials page
        window.dispatchEvent(new Event('taskCompleted'))
        
        // Trigger storage event to update other tabs/windows
        window.dispatchEvent(new StorageEvent('storage', {
          key: `task_${selectedTask}_done`,
          newValue: 'true',
        }))
        
        // Cancel reminder when task is done (as per user story)
        // The reminder input will be automatically disabled
      } catch (error) {
        console.error('Error completing task:', error)
        // Revert on error
        setTaskStatus(prev => ({ ...prev, [selectedTask]: false }))
        localStorage.setItem(`task_${selectedTask}_done`, 'false')
        setCompletedDates(prev => {
          const newDates = { ...prev }
          delete newDates[selectedTask]
          return newDates
        })
      }
    }
  }
  
  const handleReminderChange = (days: number) => {
    if (!selectedTask || isDone) return
    
    // Update local state immediately for UI responsiveness
    setReminderDays(prev => ({ ...prev, [selectedTask]: days }))
    localStorage.setItem(`task_${selectedTask}_reminder`, days.toString())
    
    // Show "saving" status
    setReminderSaveStatus('saving')
    
    // Clear existing debounce timer
    if (reminderDebounceRef.current) {
      clearTimeout(reminderDebounceRef.current)
    }
    
    // Debounce API call - save to database after 1 second of no changes
    reminderDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tasks/${selectedTask}/reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ days }),
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.warn('⚠️ Reminder API returned non-ok status:', response.status, errorData)
          setReminderSaveStatus('error')
          // Reset to idle after 2 seconds
          setTimeout(() => setReminderSaveStatus('idle'), 2000)
          // Don't throw - localStorage already saved, API is optional
          return
        }
        
        const data = await response.json()
        console.log(`✅ Reminder saved to database: ${days} days for task ${selectedTask}`, data)
        setReminderSaveStatus('saved')
        // Reset to idle after 2 seconds
        setTimeout(() => setReminderSaveStatus('idle'), 2000)
      } catch (error) {
        console.warn('⚠️ Error saving reminder to database (using localStorage only):', error)
        setReminderSaveStatus('error')
        // Reset to idle after 2 seconds
        setTimeout(() => setReminderSaveStatus('idle'), 2000)
        // Don't throw - localStorage already saved for offline support
      }
    }, 1000)
  }
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (reminderDebounceRef.current) {
        clearTimeout(reminderDebounceRef.current)
      }
    }
  }, [])

  // Load documents from vault
  const loadVaultDocuments = async () => {
    setLoadingVaultDocuments(true)
    try {
      const response = await fetch('/api/vault/list')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.documents) {
          setVaultDocuments(data.documents)
        } else {
          setVaultDocuments([])
        }
      } else {
        setVaultDocuments([])
      }
    } catch (error) {
      console.error('Error loading vault documents:', error)
      setVaultDocuments([])
    } finally {
      setLoadingVaultDocuments(false)
    }
  }

  // Map document requirement text to vault document types
  const mapRequirementToDocType = (requirement: string): string[] => {
    const lower = requirement.toLowerCase()
    
    // Priority-based matching (more specific first)
    if (lower.includes('passport/id') || lower.includes('passport or id') || lower.includes('passport/id')) {
      return ['passport']
    }
    if (lower.includes('passport') && (lower.includes('family') || lower.includes('child'))) {
      return ['passport']
    }
    if (lower.includes('passport')) {
      return ['passport']
    }
    if (lower.includes('child') && lower.includes('passport')) {
      return ['passport']
    }
    if (lower.includes('id') && !lower.includes('proof') && !lower.includes('insurance')) {
      return ['passport']
    }
    
    if (lower.includes('marriage certificate')) {
      return ['marriage_certificate']
    }
    if (lower.includes('birth certificate')) {
      return ['birth_certificate']
    }
    if (lower.includes('family book')) {
      // Family book is a Swiss document - could be marriage or birth certificates
      return ['marriage_certificate', 'birth_certificate']
    }
    if (lower.includes('divorce certificate')) {
      return ['marriage_certificate'] // Closest match
    }
    
    if (lower.includes('employment contract')) {
      return ['employment_contract']
    }
    if (lower.includes('rental contract') || lower.includes('landlord confirmation')) {
      return ['rental_contract']
    }
    if (lower.includes('proof of address')) {
      return ['rental_contract'] // Usually rental contract
    }
    
    if (lower.includes('vaccination record') || lower.includes('vaccination')) {
      return ['vaccination_record']
    }
    
    if (lower.includes('residence permit')) {
      return ['residence_permit']
    }
    
    if (lower.includes('health insurance') || lower.includes('proof of health insurance')) {
      return ['insurance_documents']
    }
    if (lower.includes('insurance') && !lower.includes('vaccination')) {
      return ['insurance_documents']
    }
    
    // Passport photos are not stored as documents in vault
    if (lower.includes('passport photos') || lower.includes('photos')) {
      return []
    }
    
    return []
  }

  // Check if a document requirement is fulfilled in vault
  const isDocumentUploaded = (requirement: string): boolean => {
    const docTypes = mapRequirementToDocType(requirement)
    if (docTypes.length === 0) {
      // Documents like "passport photos" are not stored in vault
      return false
    }

    // Check if any vault document matches the types
    // For family book, we need at least one matching document
    if (requirement.toLowerCase().includes('family book')) {
      // Family book typically includes multiple documents - check if we have relevant ones
      const hasMarriageCert = vaultDocuments.some((doc) => 
        doc.document_type?.toLowerCase() === 'marriage_certificate'
      )
      const hasBirthCert = vaultDocuments.some((doc) => 
        doc.document_type?.toLowerCase() === 'birth_certificate'
      )
      // Family book is considered fulfilled if we have at least one relevant certificate
      return hasMarriageCert || hasBirthCert
    }

    // For other documents, check exact type match
    return vaultDocuments.some((doc) => {
      if (!doc.document_type) return false
      const docType = doc.document_type.toLowerCase()
      return docTypes.includes(docType)
    })
  }

  // Handle document upload
  const handleDocumentUpload = async (requirement: string, file: File) => {
    if (!selectedTask) return

    // Determine document type from requirement
    const docTypes = mapRequirementToDocType(requirement)
    const docType = docTypes[0] || 'other' // Use first match or 'other'

    setUploadingDocument(requirement)
    setUploadTargetDoc(requirement)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (docType !== 'other') {
        formData.append('document_type', docType)
      }

      const response = await fetch('/api/vault/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      
      // Reload vault documents to update UI
      await loadVaultDocuments()
      
      console.log('✅ Document uploaded successfully:', data)
    } catch (error) {
      console.error('❌ Upload error:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploadingDocument(null)
      setUploadTargetDoc(null)
    }
  }

  // Trigger file input for upload
  const triggerFileUpload = (requirement: string) => {
    setUploadTargetDoc(requirement)
    fileInputRef.current?.click()
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && uploadTargetDoc) {
      handleDocumentUpload(uploadTargetDoc, file)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const loadMunicipalityInfo = async (municipalityName: string) => {
    if (!municipalityName) return
    
    setLoadingMunicipality(true)
    try {
      const response = await fetch(`/api/municipality/${encodeURIComponent(municipalityName)}`)
      if (response.ok) {
        const info = await response.json()
        setMunicipalityInfo(info)
      } else {
        // Municipality info not available - not an error, just not found
        setMunicipalityInfo(null)
      }
    } catch (error) {
      // Silently handle errors - municipality info is optional
      setMunicipalityInfo(null)
    } finally {
      setLoadingMunicipality(false)
    }
  }

  const toggleResource = (resourceType: string) => {
    if (!selectedTask) return
    
    setExpandedResources((prev) => {
      const taskResources = prev[selectedTask] || new Set<string>()
      const newSet = new Set(taskResources)
      
      if (newSet.has(resourceType)) {
        newSet.delete(resourceType)
      } else {
        newSet.add(resourceType)
      }
      
      return {
        ...prev,
        [selectedTask]: newSet,
      }
    })
  }
  
  // Get expanded resources for current task
  const getCurrentTaskExpandedResources = (): Set<string> => {
    if (!selectedTask) return new Set()
    return expandedResources[selectedTask] || new Set()
  }

  // Get expanded FAQs for current task
  const getCurrentTaskExpandedFAQs = (): Set<number> => {
    if (!selectedTask) return new Set()
    return expandedFAQs[selectedTask] || new Set()
  }

  // Toggle individual FAQ question
  const toggleFAQ = (faqIndex: number) => {
    if (!selectedTask) return

    setExpandedFAQs((prev) => {
      const taskFAQs = prev[selectedTask] || new Set<number>()
      const newSet = new Set(taskFAQs)

      if (newSet.has(faqIndex)) {
        newSet.delete(faqIndex)
      } else {
        newSet.add(faqIndex)
      }

      return {
        ...prev,
        [selectedTask]: newSet,
      }
    })
  }

  const renderFAQAsCollapsibles = (faqs: Array<{ question: string; answer: string }>, introText?: string) => {
    if (!faqs || faqs.length === 0) return null

    const expandedFAQs = getCurrentTaskExpandedFAQs()

    return (
      <div className="space-y-4">
        {/* Intro text if provided */}
        {introText && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#374151' }}>
            {introText}
          </p>
        )}

        {/* Each FAQ as collapsible */}
        {faqs.map((faq, index) => (
          <div key={index} className="border rounded-lg" style={{ borderColor: '#E5E7EB' }}>
            {/* Question - Collapsible Button */}
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
            >
              <span className="font-semibold text-base" style={{ color: '#2D5016' }}>
                {faq.question}
              </span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2D5016"
                strokeWidth="2"
                className="transition-transform flex-shrink-0 ml-2"
                style={{
                  transform: expandedFAQs.has(index) ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Answer - Collapsible Content */}
            {expandedFAQs.has(index) && (
              <div className="px-4 pb-4 pt-0">
                <div
                  className="text-sm leading-relaxed pt-2"
                  style={{ color: '#374151' }}
                >
                  {formatAnswerText(faq.answer)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderInfobox = () => {
    if (!taskData?.infobox) return null

    const { infobox } = taskData

    // Gemeinde Registration (Task 2) - Render with collapsibles and opening hours
    if (infobox.type === 'gemeinde_registration') {
      if (infobox.faqs && Array.isArray(infobox.faqs)) {
        const introText = `The following information is relevant to you since you are a citizen of ${taskData.user_data?.country_name || infobox.country_name || 'your country'}.`
        const expandedFAQs = getCurrentTaskExpandedFAQs()
        
        return (
          <div className="space-y-4">
            {introText && (
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#374151' }}>
                {introText}
              </p>
            )}
            
            {infobox.faqs.map((faq: any, index: number) => (
              <div key={index} className="border rounded-lg" style={{ borderColor: '#E5E7EB' }}>
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                >
                  <span className="font-semibold text-base" style={{ color: '#2D5016' }}>
                    {faq.question}
                  </span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2D5016"
                    strokeWidth="2"
                    className="transition-transform flex-shrink-0 ml-2"
                    style={{
                      transform: expandedFAQs.has(index) ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                
                {expandedFAQs.has(index) && (
                  <div className="px-4 pb-4 pt-0">
                    <div
                      className="text-sm leading-relaxed pt-2"
                      style={{ color: '#374151' }}
                    >
                      {formatAnswerText(faq.answer)}
                    </div>
                    
                    {/* Show opening hours after "Where do I go to register?" */}
                    {faq.show_opening_hours && taskData.user_data?.municipality_name && (
                      <div className="mt-3 p-3 rounded-md" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <h5 className="font-semibold text-sm mb-2" style={{ color: '#2D5016' }}>
                          {taskData.user_data.municipality_name} Office Hours:
                        </h5>
                        {loadingMunicipality ? (
                          <p className="text-xs text-gray-500">Loading opening hours...</p>
                        ) : municipalityInfo?.einwohnerdienste?.formatted_hours ? (
                          <>
                            <p className="text-sm whitespace-pre-line" style={{ color: '#374151' }}>
                              {municipalityInfo.einwohnerdienste.formatted_hours}
                            </p>
                            {municipalityInfo.einwohnerdienste.phone && (
                              <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                                Phone: {municipalityInfo.einwohnerdienste.phone}
                              </p>
                            )}
                            {municipalityInfo.einwohnerdienste.email && (
                              <p className="text-xs" style={{ color: '#6B7280' }}>
                                Email:{' '}
                                <a
                                  href={`mailto:${municipalityInfo.einwohnerdienste.email}`}
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {municipalityInfo.einwohnerdienste.email}
                                </a>
                              </p>
                            )}
                            <p className="text-xs mt-2 italic" style={{ color: '#9CA3AF' }}>
                              (Last checked: {new Date(municipalityInfo.last_checked).toLocaleDateString('en-GB')})
                            </p>
                          </>
                        ) : (
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            Monday - Friday: 08:00 - 12:00, 14:00 - 17:00
                            <br />
                            <span className="text-xs italic">(Please verify with your local municipality office)</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
      // Fallback to old component if no FAQs
      return (
        <GemeindeRegistrationInfobox
          infobox={infobox}
          municipalityName={taskData.user_data?.municipality_name}
        />
      )
    }

    // Housing (Task 3)
    if (infobox.type === 'housing') {
      if (infobox.faqs && Array.isArray(infobox.faqs)) {
        return renderFAQAsCollapsibles(infobox.faqs)
      }
      return null
    }

    // School Registration (Task 4)
    if (infobox.type === 'school_registration') {
      if (infobox.faqs && Array.isArray(infobox.faqs)) {
        // Process answers that contain [change profile] links
        const processedFAQs = infobox.faqs.map((faq: any) => {
          // Check if answer contains [change profile] - we'll handle this in render
          return faq
        })
        return (
          <div className="space-y-4">
            {processedFAQs.map((faq: any, index: number) => {
              const expandedFAQs = getCurrentTaskExpandedFAQs()
              return (
                <div key={index} className="border rounded-lg" style={{ borderColor: '#E5E7EB' }}>
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <span className="font-semibold text-base" style={{ color: '#2D5016' }}>
                      {faq.question}
                    </span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2D5016"
                      strokeWidth="2"
                      className="transition-transform flex-shrink-0 ml-2"
                      style={{
                        transform: expandedFAQs.has(index) ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {expandedFAQs.has(index) && (
                    <div className="px-4 pb-4 pt-0">
                      <div
                        className="text-sm leading-relaxed pt-2"
                        style={{ color: '#374151' }}
                      >
                        {formatAnswerText(faq.answer, { handleChangeProfile: true })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      }
      return null
    }

    // Permit Card (Task 5)
    if (infobox.type === 'permit_card') {
      if (infobox.faqs && Array.isArray(infobox.faqs)) {
        return (
          <div className="space-y-4">
            {infobox.faqs.map((faq: any, index: number) => {
              const expandedFAQs = getCurrentTaskExpandedFAQs()
              return (
                <div key={index} className="border rounded-lg" style={{ borderColor: '#E5E7EB' }}>
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <span className="font-semibold text-base" style={{ color: '#2D5016' }}>
                      {faq.question}
                    </span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2D5016"
                      strokeWidth="2"
                      className="transition-transform flex-shrink-0 ml-2"
                      style={{
                        transform: expandedFAQs.has(index) ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {expandedFAQs.has(index) && (
                    <div className="px-4 pb-4 pt-0">
                      <div
                        className="text-sm leading-relaxed pt-2"
                        style={{ color: '#374151' }}
                      >
                        {formatAnswerText(faq.answer, { handleSeeTask: true })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      }
      return null
    }

    // No country provided
    if (infobox.type === 'no_country') {
      return (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
            {infobox.message.split('\n').map((line: string, i: number) => (
              <span key={i}>
                {line}
                {i < infobox.message.split('\n').length - 1 && (
                  <>
                    <br />
                    <br />
                  </>
                )}
              </span>
            ))}
          </p>
          <button
            className="mt-4 px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#2D5016' }}
          >
            Complete Profile
          </button>
        </div>
      )
    }

    // Visa exempt (e.g., USA, Canada) - Task 1
    if (infobox.type === 'visa_exempt') {
      if (infobox.faqs && Array.isArray(infobox.faqs)) {
        const introText = `The following information is relevant to you since you are a citizen of ${infobox.country_name || taskData.user_data?.country_name || 'your country'}.`
        return (
          <div className="space-y-4">
            {introText && (
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#374151' }}>
                {introText}
              </p>
            )}
            {infobox.faqs.map((faq: any, index: number) => {
              const expandedFAQs = getCurrentTaskExpandedFAQs()
              return (
                <div key={index} className="border rounded-lg" style={{ borderColor: '#E5E7EB' }}>
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <span className="font-semibold text-base" style={{ color: '#2D5016' }}>
                      {faq.question}
                    </span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2D5016"
                      strokeWidth="2"
                      className="transition-transform flex-shrink-0 ml-2"
                      style={{
                        transform: expandedFAQs.has(index) ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {expandedFAQs.has(index) && (
                    <div className="px-4 pb-4 pt-0">
                      <div
                        className="text-sm leading-relaxed pt-2"
                        style={{ color: '#374151' }}
                      >
                        {formatAnswerText(faq.answer, { handleNextStep: true })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      }
      return null
    }

    // Visa required (e.g., India, China) - Task 1
    if (infobox.type === 'visa_required') {
      if (infobox.faqs && Array.isArray(infobox.faqs)) {
        const introText = `The following information is relevant to you since you are a citizen of ${infobox.country_name || taskData.user_data?.country_name || 'your country'}.`
        return (
          <div className="space-y-4">
            {introText && (
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#374151' }}>
                {introText}
              </p>
            )}
            {infobox.faqs.map((faq: any, index: number) => {
              const expandedFAQs = getCurrentTaskExpandedFAQs()
              return (
                <div key={index} className="border rounded-lg" style={{ borderColor: '#E5E7EB' }}>
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
                  >
                    <span className="font-semibold text-base" style={{ color: '#2D5016' }}>
                      {faq.question}
                    </span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2D5016"
                      strokeWidth="2"
                      className="transition-transform flex-shrink-0 ml-2"
                      style={{
                        transform: expandedFAQs.has(index) ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {expandedFAQs.has(index) && (
                    <div className="px-4 pb-4 pt-0">
                      <div
                        className="text-sm leading-relaxed pt-2"
                        style={{ color: '#374151' }}
                      >
                        {formatAnswerText(faq.answer, { handleNextStep: true })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      }
      return null
    }

    // EU/EFTA citizens
    if (infobox.type === 'eu_efta') {
      return (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
            {infobox.message || infobox.country_name ? (
              <>
                Good news! As an EU/EFTA citizen from {infobox.country_name}, you don't need a visa or residence permit to enter Switzerland. However, you must still register at your Gemeinde within 14 days.
                <br /><br />
                →{' '}
                <button
                  onClick={() => handleTaskClick(2)}
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Next Step: Task 2 - Register at Gemeinde
                </button>
              </>
            ) : (
              "Good news! As an EU/EFTA citizen, you don't need a visa or residence permit to enter Switzerland."
            )}
          </p>
        </div>
      )
    }

    // Generic message (for other task types)
    if (infobox.message) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-bold mb-2" style={{ color: '#2D5016' }}>
            Information
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
            {infobox.message}
          </p>
        </div>
      )
    }

    return null
  }

  const renderFAQContent = () => {
    // This function is kept for backward compatibility but now redirects to renderInfobox
    return renderInfobox()
  }

  // Helper function to extract text from React element recursively
  const extractTextFromElement = (element: any): string => {
    if (typeof element === 'string') return element
    if (typeof element === 'number') return String(element)
    if (!element) return ''
    
    if (Array.isArray(element)) {
      return element.map(extractTextFromElement).join(' ')
    }
    
    if (element.props && element.props.children) {
      return extractTextFromElement(element.props.children)
    }
    
    return ''
  }

  // Helper function to convert > to bulletpoints (•) in text and handle special formatting
  const formatAnswerText = (text: string, options?: { 
    handleChangeProfile?: boolean
    handleSeeTask?: boolean
    handleNextStep?: boolean
  }): JSX.Element => {
    // First, handle special link patterns if needed
    let processedText = text
    
    // Handle [change profile] links
    if (options?.handleChangeProfile) {
      processedText = processedText.replace(/\[change profile\]/g, '[change profile]')
    }
    
    // Handle (see task X) links
    if (options?.handleSeeTask) {
      processedText = processedText.replace(/\(see task (\d+)\)/g, '(see task $1)')
    }
    
    // Handle → Next Step: with task links
    if (options?.handleNextStep) {
      // This will be handled specially below
    }
    
    // Split by lines and process each line
    const lines = processedText.split('\n')
    const elements: JSX.Element[] = []
    
    lines.forEach((line, lineIndex) => {
      // Check if line starts with >
      if (line.trim().startsWith('>')) {
        // Remove > and add bulletpoint
        let bulletText = line.replace(/^>\s*/, '• ')
        
        // Process special links within bullet points
        if (options?.handleChangeProfile) {
          const parts = bulletText.split('[change profile]').map((part: string, partIndex: number) => {
            if (partIndex === 0) return part
            return (
              <span key={partIndex}>
                <button className="text-blue-600 hover:text-blue-800 underline">change profile</button>
                {part}
              </span>
            )
          })
          elements.push(
            <span key={lineIndex} className="block pl-4">
              {parts}
            </span>
          )
        } else {
          elements.push(
            <span key={lineIndex} className="block pl-4">
              {bulletText}
            </span>
          )
        }
      } else if (line.trim() === '') {
        // Empty line
        elements.push(<br key={lineIndex} />)
      } else {
        // Regular line - check for special formatting
        let processedLine: JSX.Element | string = line
        
        // Handle → Next Step: with task links
        if (options?.handleNextStep && line.includes('→ Next Step:')) {
          const parts = line.split('→ Next Step:').map((part: string, partIndex: number) => {
            if (partIndex === 0) return part
            const taskMatch = part.match(/Task (\d+)/)
            const taskNumber = taskMatch ? parseInt(taskMatch[1]) : null
            return (
              <span key={partIndex}>
                →{' '}
                {taskNumber ? (
                  <button
                    onClick={() => handleTaskClick(taskNumber)}
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Next Step: {part.trim()}
                  </button>
                ) : (
                  `Next Step: ${part.trim()}`
                )}
              </span>
            )
          })
          processedLine = <>{parts}</>
        } else if (line.includes('(see task')) {
          // Handle (see task X) links
          const parts = line.split('(see task 2)').map((part: string, partIndex: number) => {
            if (partIndex === 0) return part
            return (
              <span key={partIndex}>
                (
                <button
                  onClick={() => handleTaskClick(2)}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  see task 2
                </button>
                )
                {part}
              </span>
            )
          })
          processedLine = <>{parts}</>
        } else if (line.includes('[change profile]')) {
          // Handle [change profile] links
          const parts = line.split('[change profile]').map((part: string, partIndex: number) => {
            if (partIndex === 0) return part
            return (
              <span key={partIndex}>
                <button className="text-blue-600 hover:text-blue-800 underline">change profile</button>
                {part}
              </span>
            )
          })
          processedLine = <>{parts}</>
        } else {
          // Handle → arrows (regular, not "Next Step")
          const parts = line.split('→').map((part: string, partIndex: number) => {
            if (partIndex === 0) return part
            return (
              <span key={partIndex}>
                →{part}
              </span>
            )
          })
          processedLine = <>{parts}</>
        }
        
        elements.push(
          <span key={lineIndex} className="block">
            {processedLine}
          </span>
        )
      }
    })
    
    return <>{elements}</>
  }

  // Filter FAQ content based on search query (current task only)
  const filterFAQContent = (content: JSX.Element | null): JSX.Element | null => {
    const query = getCurrentTaskSearchQuery()
    if (!query.trim() || !content) return content

    const lowerQuery = query.toLowerCase().trim()
    const contentText = extractTextFromElement(content).toLowerCase()

    // Simple text matching - if query found in content, return it
    if (contentText.includes(lowerQuery)) {
      return content
    }

    // If not found, return null (no match)
    return null
  }

  // Filter documents content based on search query (current task only)
  const filterDocumentsContent = (content: JSX.Element | null): JSX.Element | null => {
    const query = getCurrentTaskSearchQuery()
    if (!query.trim() || !content) return content

    const lowerQuery = query.toLowerCase().trim()
    const contentText = extractTextFromElement(content).toLowerCase()

    // Simple text matching - if query found in content, return it
    if (contentText.includes(lowerQuery)) {
      return content
    }

    // If not found, return null (no match)
    return null
  }

  // Render document items in a table format
  const renderDocumentsTable = (requirements: string[]) => {
    return (
      <table className="w-full border-collapse">
        <tbody>
          {requirements.map((requirement, index) => {
            const isUploaded = isDocumentUploaded(requirement)
            const isUploading = uploadingDocument === requirement

            return (
              <tr key={requirement} className="border-b border-transparent hover:bg-gray-50 transition-colors">
                <td className="py-3 align-top" style={{ width: '24px', paddingRight: '8px' }}>
                  <span style={{ color: '#2D5016', fontSize: '18px', lineHeight: '1.2' }}>•</span>
                </td>
                <td className="py-3 align-middle" style={{ paddingRight: '16px' }}>
                  <span className="text-sm" style={{ color: '#374151' }}>{requirement}</span>
                </td>
                <td className="py-3 align-middle text-right" style={{ width: '120px', whiteSpace: 'nowrap' }}>
                  {isUploaded ? (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all hover:scale-110"
                      style={{ backgroundColor: '#22C55E' }}
                      title="Document uploaded to vault"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerFileUpload(requirement)}
                      disabled={isUploading}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all hover:opacity-90 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: isUploading ? '#9CA3AF' : '#2D5016',
                        color: '#FFFFFF',
                        minWidth: '80px',
                      }}
                    >
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const renderDocuments = () => {
    if (!selectedTask || !taskData) return null

    // Task 1 & 2: Gemeinde documents
    if (selectedTask === 1 || selectedTask === 2) {
      const documentRequirements = [
        'Passport/ID for each family member',
        'For families: family book, marriage certificate, birth certificates, divorce certificate',
        'Employment contract (with length and hours)',
        'Rental contract or landlord confirmation',
        'Passport photos (sometimes required)',
        'Proof of health insurance (or provide it within 3 months)',
      ]

      return (
        <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
          <p className="leading-relaxed">
            Generally, the following documents are required to be brought to the Gemeinde (municipality office) in person.
          </p>
          <p className="leading-relaxed">
            Upload them to the Document Vault for safe keeping and easy access in later tasks.
          </p>
          <div className="mt-4">
            {renderDocumentsTable(documentRequirements)}
          </div>
          <p className="leading-relaxed mt-4">
            To check for specific requirements for{' '}
            <strong style={{ color: '#2D5016' }}>
              {taskData.user_data?.municipality_name || 'your municipality'}
            </strong>
            , visit the official{' '}
            <a
              href={
                taskData.user_data?.municipality_name
                  ? municipalityInfo?.einwohnerdienste?.registration_url || 
                    getMunicipalityUrl(taskData.user_data.municipality_name)
                  : '#'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              website
            </a>
            .
          </p>
        </div>
      )
    }

    // Task 4: School documents
    if (selectedTask === 4) {
      const documentRequirements = [
        'Child\'s passport or ID',
        'Birth certificate',
        'Residence permit (if available)',
        'Proof of address (rental contract or confirmation)',
        'Vaccination record',
      ]

      return (
        <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
          <p className="leading-relaxed">
            Generally, the following documents are required to be brought to the Gemeinde (municipality office) in person.
          </p>
          <p className="leading-relaxed">
            Upload them to the Document Vault for safe keeping and easy access in later tasks.
          </p>
          <div className="mt-4">
            {renderDocumentsTable(documentRequirements)}
          </div>
          <p className="leading-relaxed mt-4">
            To check for specific requirements for{' '}
            <strong style={{ color: '#2D5016' }}>
              {taskData.user_data?.municipality_name || 'your municipality'}
            </strong>
            , visit the official{' '}
            <a
              href={
                taskData.user_data?.municipality_name
                  ? municipalityInfo?.schulverwaltung?.website || 
                    `${getMunicipalityUrl(taskData.user_data.municipality_name, false)}/schulen`
                  : '#'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              website
            </a>
            {' '}of the school administration.
          </p>
          <p className="leading-relaxed mt-4">
            Use our{' '}
            <a
              href="#"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
              onClick={(e) => {
                e.preventDefault()
                // TODO: Link to Pre-Fill & Translate School Form tool
              }}
            >
              Pre-Fill & Translate School Form
            </a>{' '}
            tool to automatically complete the school registration form for your municipality.
          </p>
        </div>
      )
    }

    return null
  }


  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      {/* Header */}
      <AppHeader firstName={firstName} avatarUrl={avatarUrl} showHome={true} />

      {/* Main Content */}
      <div className="flex-1 flex gap-8 px-6 py-8">
        {/* Left Column - Vault + Essential Tasks */}
        <div className="w-96">
          <h1 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#2D5016' }}>
            The ESSENTIALS
          </h1>
          
          <div className="flex gap-6 items-start">
            {/* Vault Icon + Bell - Aligned with first task */}
            <div className="flex-shrink-0 flex flex-col gap-3">
              <Link
                href="/vault"
                className="w-20 h-20 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-all hover:scale-105 shadow-md"
                style={{ backgroundColor: '#294F3F', borderRadius: '10px' }}
              >
                <Vault className="text-white" size={48} strokeWidth={2.5} />
              </Link>
              {/* Bell Icon - Same style as Vault */}
              <button className="w-20 h-20 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-all hover:scale-105 shadow-md"
                style={{ backgroundColor: '#294F3F', borderRadius: '10px' }}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            </div>

            {/* Task List */}
            <div className="flex-1">
              <div className="space-y-4">
                {tasks.map((task) => {
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task.id)}
                      className={`rounded-lg p-4 cursor-pointer transition-all hover:opacity-90 ${
                        selectedTask === task.id ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{
                        backgroundColor: '#E9A843',
                        border: selectedTask === task.id ? '2px solid #2D5016' : '1px solid rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {/* Task Number and Title - Centered */}
                      <div className="flex items-center justify-center gap-3">
                        {/* Task Number */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: '#2D5016' }}
                        >
                          {task.number}
                        </div>

                        {/* Task Title - Centered */}
                        <div className="flex-1 text-center">
                          <h3 className="font-medium text-base" style={{ color: '#374151' }}>
                            {task.title}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column - Infobox - Aligned with Vault and first task */}
        <div className="flex-1">
          {/* Spacer to align with "The ESSENTIALS" title */}
          <div className="mb-8">
            <div className="text-3xl md:text-4xl font-bold" style={{ color: 'transparent' }}>
              The ESSENTIALS
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2D5016' }}></div>
            </div>
          ) : taskData ? (
            <div className="flex-1">
              {/* Main White Panel with Dark Green Border */}
              <div
                className="rounded-lg p-6"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #2D5016',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
              >
                {/* 1. Zeile: Titel "Goal" */}
                <h2 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
                  Goal
                </h2>

                {/* 2. Zeile: Box mit Goal */}
                <div
                  className="rounded-lg p-4 min-h-[120px] mb-6"
                  style={{
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  <p className="text-base leading-relaxed" style={{ color: '#374151' }}>
                    {goal || taskData.goal || 'Loading...'}
                  </p>
                </div>

                {/* 3. Zeile: Checkbox "I have done this" + "Remind me in X days" */}
                <div className="flex items-center gap-6 mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                  {/* I have done this - Checkbox */}
                  <button
                    onClick={() => handleTaskComplete(!isDone)}
                    disabled={isDone}
                    className={`flex items-center gap-2 text-base font-medium transition-opacity ${
                      isDone ? 'cursor-default opacity-100' : 'cursor-pointer hover:opacity-80'
                    }`}
                    style={{ color: isDone ? '#22C55E' : '#374151' }}
                  >
                    {isDone ? (
                      <>
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: '#22C55E' }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <span>I have done this.</span>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-6 h-6 rounded border-2 flex items-center justify-center"
                          style={{ borderColor: '#D1D5DB' }}
                        />
                        <span>I have done this.</span>
                      </>
                    )}
                  </button>

                  {/* Remind me in X days */}
                  <div className="flex items-center gap-2">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDone ? '#9CA3AF' : '#374151'}
                      strokeWidth="2"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className="text-base" style={{ color: isDone ? '#9CA3AF' : '#374151' }}>
                      Remind me in{' '}
                      <input
                        type="number"
                        value={currentReminderDays}
                        onChange={(e) => handleReminderChange(Number(e.target.value))}
                        min="1"
                        max="30"
                        disabled={isDone}
                        className="inline-block w-12 px-2 py-1 rounded text-center font-bold border bg-transparent"
                        style={{
                          borderColor: isDone ? '#D1D5DB' : '#374151',
                          color: isDone ? '#9CA3AF' : '#374151',
                          textDecoration: 'underline',
                        }}
                      />{' '}
                      days.
                      {reminderSaveStatus === 'saving' && (
                        <span className="ml-2 text-sm" style={{ color: '#6B7280' }}>
                          (saving...)
                        </span>
                      )}
                      {reminderSaveStatus === 'saved' && (
                        <span className="ml-2 text-sm flex items-center gap-1" style={{ color: '#22C55E' }}>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          saved
                        </span>
                      )}
                      {reminderSaveStatus === 'error' && (
                        <span className="ml-2 text-sm" style={{ color: '#EF4444' }}>
                          (saved locally)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* 4. Zeile: Titel "Resources" + Search Box */}
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-xl font-bold" style={{ color: '#2D5016' }}>
                    Resources
                  </h2>
                  <div className="flex-1 max-w-xs">
                    <input
                      type="text"
                      placeholder="Search Keywords"
                      value={getCurrentTaskSearchQuery()}
                      onChange={(e) => setCurrentTaskSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
                      style={{
                        borderColor: '#D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        focusRingColor: '#2D5016',
                      }}
                    />
                  </div>
                </div>

                {/* 5. Zeile: Box "FAQ / Good to Know" (collapsible) */}
                <div>
                  {/* FAQs / Good to Know - Collapsible Button */}
                  <button
                    onClick={() => toggleResource('faq')}
                    className="w-full px-4 py-3 bg-gray-200 rounded-lg text-left flex items-center justify-between hover:opacity-90 transition-opacity mb-2"
                  >
                    <span className="text-sm font-medium" style={{ color: '#374151' }}>
                      FAQs / Good to Know
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#374151"
                      strokeWidth="2"
                      className="transition-transform"
                      style={{
                        transform: getCurrentTaskExpandedResources().has('faq') ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  
                  {/* FAQ Content */}
                  {getCurrentTaskExpandedResources().has('faq') && taskData.infobox && (
                    <div
                      className="mt-2 px-4 py-4 bg-white rounded-lg border"
                      style={{ borderColor: '#D1D5DB' }}
                    >
                      {filterFAQContent(renderInfobox()) || (
                        <p className="text-sm" style={{ color: '#9CA3AF' }}>
                          No results found for &quot;{getCurrentTaskSearchQuery()}&quot;
                        </p>
                      )}
                    </div>
                  )}
                  
                  {getCurrentTaskExpandedResources().has('faq') && !taskData.infobox && (
                    <div
                      className="mt-2 px-4 py-4 bg-white rounded-lg border"
                      style={{ borderColor: '#D1D5DB' }}
                    >
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        No additional information available for this task.
                      </p>
                    </div>
                  )}

                  {/* Documents you need - Collapsible Button */}
                  {selectedTask && taskData && (selectedTask === 1 || selectedTask === 2 || selectedTask === 4) && (
                    <>
                      <button
                        onClick={() => toggleResource('documents')}
                        className="w-full px-4 py-3 bg-gray-200 rounded-lg text-left flex items-center justify-between hover:opacity-90 transition-opacity mb-2"
                      >
                        <span className="text-sm font-medium" style={{ color: '#374151' }}>
                          Documents you need
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="2"
                          className="transition-transform"
                          style={{
                            transform: getCurrentTaskExpandedResources().has('documents') ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      
                      {/* Documents Content */}
                      {getCurrentTaskExpandedResources().has('documents') && (
                        <div
                          className="mt-2 px-4 py-4 bg-white rounded-lg border"
                          style={{ borderColor: '#D1D5DB' }}
                        >
                          {filterDocumentsContent(renderDocuments()) || (
                            <p className="text-sm" style={{ color: '#9CA3AF' }}>
                              No results found for &quot;{getCurrentTaskSearchQuery()}&quot;
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg p-6"
              style={{
                backgroundColor: '#FAF6F0',
                border: '1px solid #D1D5DB',
              }}
            >
              <p className="text-gray-500 text-center">Select a task to view information</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for document uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Footer */}
      <RegistrationFooter />
    </div>
  )
}

// Logo removed

