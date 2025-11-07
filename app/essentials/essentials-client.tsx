'use client'

import { useState, useEffect, useRef } from 'react'
import Link from '@/lib/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'
import GemeindeRegistrationInfobox from './gemeinde-registration-infobox'
import { getMunicipalityUrl } from '@/lib/municipality-urls'
import AppHeader from '@/components/AppHeader'
import { Vault, Archive, Mail } from 'lucide-react'
import { getDocumentTypeById, getDocumentIdByRequirement } from '@/lib/utils/document-id-mapping'
import { documentFulfillsRequirement } from '@/lib/utils/requirement-mapping' // Requirement-based matching
import { createEMLWithMultipleDocuments } from '@/lib/utils/eml-generator'
import HousingVault from '@/components/vault/HousingVault'
import DistanceMap from '@/components/maps/DistanceMap'
import { createClient } from '@/lib/supabase/client'

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
  const [reminderActive, setReminderActive] = useState<Record<number, boolean>>({}) // Track if reminder is active per task
  const [completedDates, setCompletedDates] = useState<Record<number, string>>({}) // Track completion dates
  const [expandedResources, setExpandedResources] = useState<Record<number, Set<string>>>({})
  const [expandedFAQs, setExpandedFAQs] = useState<Record<number, Set<number>>>({}) // Task ID -> Set of FAQ indices
  const [municipalityInfo, setMunicipalityInfo] = useState<any>(null)
  const [loadingMunicipality, setLoadingMunicipality] = useState(false)
  const [schoolInfo, setSchoolInfo] = useState<any>(null)
  const [loadingSchool, setLoadingSchool] = useState(false)
  const [reminderSaveStatus, setReminderSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [resourceSearchQuery, setResourceSearchQuery] = useState<Record<number, string>>({}) // Task-specific search queries
  const [vaultDocuments, setVaultDocuments] = useState<any[]>([]) // Documents from vault
  const [loadingVaultDocuments, setLoadingVaultDocuments] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null) // Track which document is being uploaded
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetDoc, setUploadTargetDoc] = useState<string | null>(null) // Which document type to upload
  const [showAlertsModal, setShowAlertsModal] = useState(false) // Show alerts modal
  const [allReminders, setAllReminders] = useState<Array<{taskId: number, taskTitle: string, scheduledAt: Date, days: number}>>([]) // All active reminders
  const [userId, setUserId] = useState<string | null>(null) // User ID for HousingVault
  const [housingExpanded, setHousingExpanded] = useState<boolean>(false) // Toggle for Housing section
  const [mapsExpanded, setMapsExpanded] = useState<boolean>(false) // Toggle for Maps section
  
  // Debounce timer ref for reminder changes
  const reminderDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get user ID on mount
  useEffect(() => {
    const getUserId = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
        }
      } catch (error) {
        console.error('Error getting user ID:', error)
      }
    }
    getUserId()
  }, [])
  
  // Get current task's done status
  const isDone = selectedTask ? taskStatus[selectedTask] || false : false
  const currentReminderDays = selectedTask ? reminderDays[selectedTask] || 7 : 7
  const isReminderActive = selectedTask ? reminderActive[selectedTask] || false : false

  const tasks: Task[] = [
    { id: 1, title: 'Secure residence permit / visa', number: 1 },
    { id: 2, title: 'Register at the Gemeinde (municipality)', number: 2 },
    { id: 3, title: 'Find a place that fits your needs', number: 3 },
    { id: 4, title: 'Register your kids at school / kindergarten', number: 4 },
    { id: 5, title: 'Receive residence permit card', number: 5 },
  ]
  
  // Count active reminders - use state to avoid hydration mismatch
  const [activeRemindersCount, setActiveRemindersCount] = useState(0)
  
  // Update active reminders count after mount (client-side only)
  useEffect(() => {
    // First, try to count from state (most accurate)
    const stateCount = Object.values(reminderActive).filter(Boolean).length
    
    // If state is empty, fallback to localStorage (for initial render)
    if (stateCount === 0 && typeof window !== 'undefined') {
      let count = 0
      tasks.forEach((task) => {
        const isActive = localStorage.getItem(`task_${task.id}_reminder_active`) === 'true'
        if (isActive) count++
      })
      setActiveRemindersCount(count)
    } else {
      setActiveRemindersCount(stateCount)
    }
  }, [reminderActive])

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

  // Listen for task completion/undone events to update UI immediately
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateTaskStatus = () => {
      // Reload task status from localStorage to update UI
      const updatedStatus: Record<number, boolean> = {}
      tasks.forEach((task) => {
        const isDone = localStorage.getItem(`task_${task.id}_done`) === 'true'
        updatedStatus[task.id] = isDone
      })
      setTaskStatus(updatedStatus)
      
      // If currently selected task was completed, select first available task
      if (selectedTask && updatedStatus[selectedTask]) {
        const firstAvailableTask = tasks.find(task => !updatedStatus[task.id])
        if (firstAvailableTask) {
          setSelectedTask(firstAvailableTask.id)
        }
      }
    }

    const handleTaskCompleted = () => updateTaskStatus()
    
    const handleTaskUndone = (event: any) => {
      const taskId = event.detail?.taskId
      if (taskId) {
        localStorage.removeItem(`task_${taskId}_done`)
        localStorage.removeItem(`task_${taskId}_completed_date`)
        updateTaskStatus()
      }
    }

    window.addEventListener('taskCompleted', handleTaskCompleted)
    window.addEventListener('taskUndone', handleTaskUndone as any)
    window.addEventListener('storage', handleTaskCompleted)

    return () => {
      window.removeEventListener('taskCompleted', handleTaskCompleted)
      window.removeEventListener('taskUndone', handleTaskUndone as any)
      window.removeEventListener('storage', handleTaskCompleted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask])

  // Load task status from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialStatus: Record<number, boolean> = {}
      tasks.forEach((task) => {
        const isDone = localStorage.getItem(`task_${task.id}_done`) === 'true'
        initialStatus[task.id] = isDone
      })
      setTaskStatus(initialStatus)
      
      // If default selected task is archived, select first available task
      if (selectedTask === 1 && initialStatus[1]) {
        const firstAvailableTask = tasks.find(task => !initialStatus[task.id])
        if (firstAvailableTask) {
          setSelectedTask(firstAvailableTask.id)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Initialize reminderActive state from localStorage on mount
  // This ensures the badge count is accurate from the start
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeStates: Record<number, boolean> = {}
      tasks.forEach((task) => {
        activeStates[task.id] = localStorage.getItem(`task_${task.id}_reminder_active`) === 'true'
      })
      setReminderActive(activeStates)
      // Also load reminders for the alert list
      loadAllReminders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Load reminders when modal opens
  // NOTE: We do NOT include reminderActive in dependencies to avoid infinite loop
  // The reminderActive state is updated by loadAllReminders, which would cause a loop
  useEffect(() => {
    if (showAlertsModal) {
      loadAllReminders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAlertsModal])

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
      
      // Load reminder status from localStorage
      if (typeof window !== 'undefined') {
        const reminderActiveKey = `task_${taskId}_reminder_active`
        const isActive = localStorage.getItem(reminderActiveKey) === 'true'
        setReminderActive(prev => ({ ...prev, [taskId]: isActive }))
      }
      
      // Load municipality info for Task 1 and Task 2
      if ((taskId === 1 || taskId === 2) && data.user_data?.municipality_name) {
        loadMunicipalityInfo(data.user_data.municipality_name)
      } else {
        setMunicipalityInfo(null)
      }
      
      // Load school info for Task 4
      if (taskId === 4 && data.user_data?.municipality_name) {
        loadSchoolInfo(
          data.user_data.municipality_name,
          data.user_data?.address_street || '',
          data.user_data?.plz || ''
        )
      } else {
        setSchoolInfo(null)
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

  const handleToggleReminder = async () => {
    if (!selectedTask || isDone) return

    const newActiveState = !isReminderActive
    
    // Update local state immediately (this will trigger badge update)
    setReminderActive(prev => ({ ...prev, [selectedTask]: newActiveState }))
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`task_${selectedTask}_reminder_active`, newActiveState.toString())
    }

    try {
      if (newActiveState) {
        // Activate reminder - save to database
        const response = await fetch(`/api/tasks/${selectedTask}/reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ days: currentReminderDays }),
        })
        
        if (!response.ok) {
          console.warn('⚠️ Could not activate reminder in database')
          // Continue anyway - localStorage already saved
        } else {
          console.log(`✅ Reminder activated for task ${selectedTask}`)
        }
      } else {
        // Deactivate reminder - delete from database
        const response = await fetch(`/api/tasks/${selectedTask}/reminder`, {
          method: 'DELETE',
        })
        
        if (!response.ok) {
          console.warn('⚠️ Could not deactivate reminder in database')
          // Continue anyway - localStorage already saved
        } else {
          console.log(`✅ Reminder deactivated for task ${selectedTask}`)
        }
      }
      
      // CRITICAL: Always reload reminders to sync Alert List with Badge Count
      // This ensures the Alert Modal shows the updated list immediately
      loadAllReminders()
    } catch (error) {
      console.warn('⚠️ Error toggling reminder:', error)
      // Continue - localStorage already saved
      // Still reload to ensure sync
      loadAllReminders()
    }
  }

  const loadAllReminders = async () => {
    try {
      // Load reminders from localStorage for all tasks
      const reminders: Array<{taskId: number, taskTitle: string, scheduledAt: Date, days: number}> = []
      
      if (typeof window === 'undefined') {
        setAllReminders([])
        return
      }
      
      const activeStates: Record<number, boolean> = {}
      
      tasks.forEach((task) => {
        const isActive = localStorage.getItem(`task_${task.id}_reminder_active`) === 'true'
        const days = Number(localStorage.getItem(`task_${task.id}_reminder`) || 7)
        
        activeStates[task.id] = isActive
        
        if (isActive) {
          // Calculate scheduled date
          const scheduledAt = new Date()
          scheduledAt.setDate(scheduledAt.getDate() + days)
          scheduledAt.setHours(10, 0, 0, 0) // 10:00 AM
          
          reminders.push({
            taskId: task.id,
            taskTitle: task.title,
            scheduledAt,
            days,
          })
        }
      })
      
      // Sort by scheduled date (earliest first)
      reminders.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      
      // Update states - but only if they actually changed to prevent infinite loops
      setAllReminders(reminders)
      
      // Only update reminderActive if it's actually different (prevents infinite loop)
      setReminderActive(prev => {
        const hasChanged = Object.keys(activeStates).some(
          taskId => prev[Number(taskId)] !== activeStates[Number(taskId)]
        ) || Object.keys(prev).length !== Object.keys(activeStates).length
        
        return hasChanged ? activeStates : prev
      })
    } catch (error) {
      console.error('Error loading reminders:', error)
      setAllReminders([])
    }
  }

  const handleAlertIconClick = () => {
    loadAllReminders()
    setShowAlertsModal(true)
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
    // 1. Passport Photos - MUST be checked BEFORE generic passport (priority order)
    if (lower.includes('passport photos') || lower.includes('passport photo')) {
      return ['passport_photos']
    }
    
    // 2. Passport/ID (but NOT photos)
    if (lower.includes('passport/id') || lower.includes('passport or id') || lower.includes('passport/id')) {
      return ['passport']
    }
    if (lower.includes('passport') && (lower.includes('family') || lower.includes('child'))) {
      return ['passport']
    }
    // Only match generic 'passport' if it's NOT 'passport photos'
    if (lower.includes('passport') && !lower.includes('photo')) {
      return ['passport']
    }
    if (lower.includes('child') && lower.includes('passport') && !lower.includes('photo')) {
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
    if (lower.includes('proof of address')) {
      return ['proof_of_address'] // Separate from rental contract
    }
    if (lower.includes('rental contract') || lower.includes('landlord confirmation')) {
      return ['rental_contract']
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
    
    // Generic "photos" without passport context are not stored
    if (lower.includes('photos') && !lower.includes('passport')) {
      return []
    }
    
    return []
  }

  // Check if a document requirement is fulfilled in vault
  // NEW: Uses requirement-based matching for precision
  const isDocumentUploaded = (requirement: string): boolean => {
    
    // Normalize requirement text for comparison
    const normalizedRequirement = requirement.trim().toLowerCase()
    
    // Priority 1: Exact requirement match (most precise)
    // Check if any document has this exact requirement stored
    const exactMatch = vaultDocuments.some((doc: any) => {
      if (!doc.fulfilled_requirement) return false
      
      // Use similarity matching for slight text variations
      return documentFulfillsRequirement(doc, requirement)
    })
    
    if (exactMatch) {
      return true
    }
    
    // Priority 2: Type-based fallback (for documents uploaded before this system)
    // Only if no documents have fulfilled_requirement set
    const hasFulfilledRequirementDocs = vaultDocuments.some((doc: any) => 
      doc.fulfilled_requirement && doc.fulfilled_requirement.trim() !== ''
    )
    
    // If we have documents with fulfilled_requirement, only use exact matching
    // (prevents false positives from type-only matching)
    if (hasFulfilledRequirementDocs) {
      return false // Don't match by type alone if system has requirement data
    }
    
    // Fallback: Type-based matching for backward compatibility
    const docTypes = mapRequirementToDocType(requirement)
    if (docTypes.length === 0) {
      return false
    }

    // Special case: Family book (can be multiple documents)
    if (requirement.toLowerCase().includes('family book')) {
      const hasMarriageCert = vaultDocuments.some((doc: any) => 
        doc.document_type?.toLowerCase() === 'marriage_certificate'
      )
      const hasBirthCert = vaultDocuments.some((doc: any) => 
        doc.document_type?.toLowerCase() === 'birth_certificate'
      )
      return hasMarriageCert || hasBirthCert
    }

    // Type-based matching (backward compatibility only)
    return vaultDocuments.some((doc: any) => {
      if (!doc.document_type) return false
      const docType = doc.document_type.toLowerCase()
      return docTypes.includes(docType)
    })
  }

  // Get all required documents for current task (must match renderDocuments requirements exactly)
  const getTaskDocumentRequirements = (): string[] => {
    if (!selectedTask) return []
    
    // Task 1 & 2: Gemeinde documents (same requirements)
    if (selectedTask === 1 || selectedTask === 2) {
      return [
        'Passport/ID for each family member',
        'For families: family book, marriage certificate, birth certificates, divorce certificate',
        'Employment contract (with length and hours)',
        'Rental contract or landlord confirmation',
        'Passport photos (sometimes required)',
        'Proof of health insurance (or provide it within 3 months)',
      ]
    }
    
    // Task 3: Housing documents
    if (selectedTask === 3) {
      return [
        'Rental contract or lease agreement',
        'Landlord confirmation letter',
        'Proof of address (utility bill, bank statement)',
        'Employment contract (for rental application)',
        'Reference letters from previous landlords',
      ]
    }
    
    // Task 4: School documents
    if (selectedTask === 4) {
      return [
        'Child\'s passport or ID',
        'Birth certificate',
        'Residence permit (if available)',
        'Proof of address (rental contract or confirmation)',
        'Vaccination record',
      ]
    }
    
    // Task 5: Permit Card documents
    if (selectedTask === 5) {
      return [
        'Passport (valid)',
        'Residence permit application confirmation',
        'Proof of health insurance',
        'Employment contract or proof of financial means',
        'Proof of address',
        'Passport photos',
      ]
    }
    
    return []
  }

  // Find documents that fulfill a requirement (using same logic as isDocumentUploaded)
  const findDocumentsForRequirement = (requirement: string): Array<{ id: string; doc: any }> => {
    const found: Array<{ id: string; doc: any }> = []
    
    // Priority 1: Exact requirement match (most precise)
    vaultDocuments.forEach((doc: any) => {
      if (!doc.id) return
      
      if (doc.fulfilled_requirement && documentFulfillsRequirement(doc, requirement)) {
        // Check if we already added this document
        if (!found.find(f => f.id === doc.id)) {
          found.push({ id: doc.id, doc })
        }
      }
    })
    
    // Priority 2: Type-based fallback (for documents uploaded before this system or directly in vault)
    const hasFulfilledRequirementDocs = vaultDocuments.some((doc: any) => 
      doc.fulfilled_requirement && doc.fulfilled_requirement.trim() !== ''
    )
    
    // Only use type-based matching if no documents have fulfilled_requirement
    // OR if we haven't found any documents yet
    if (found.length === 0 || !hasFulfilledRequirementDocs) {
      const docTypes = mapRequirementToDocType(requirement)
      
      if (docTypes.length > 0) {
        // Special case: Family book (can be multiple documents)
        if (requirement.toLowerCase().includes('family book')) {
          vaultDocuments.forEach((doc: any) => {
            if (!doc.id) return
            if (doc.document_type?.toLowerCase() === 'marriage_certificate' || 
                doc.document_type?.toLowerCase() === 'birth_certificate') {
              if (!found.find(f => f.id === doc.id)) {
                found.push({ id: doc.id, doc })
              }
            }
          })
        } else {
          // Type-based matching
          vaultDocuments.forEach((doc: any) => {
            if (!doc.id || !doc.document_type) return
            const docType = doc.document_type.toLowerCase()
            if (docTypes.includes(docType)) {
              if (!found.find(f => f.id === doc.id)) {
                found.push({ id: doc.id, doc })
              }
            }
          })
        }
      }
    }
    
    return found
  }

  // Handle downloading all uploaded documents for current task as ZIP
  const handleDownloadDocumentsAsZip = async () => {
    if (!selectedTask) {
      alert('Please select a task first.')
      return
    }

    try {
      const requirements = getTaskDocumentRequirements()
      
      // Find all uploaded documents for these requirements (using improved matching)
      const documentIds: string[] = []
      const foundDocuments = new Set<string>() // Track to avoid duplicates
      
      for (const requirement of requirements) {
        const matchingDocs = findDocumentsForRequirement(requirement)
        
        matchingDocs.forEach(({ id }) => {
          if (!foundDocuments.has(id)) {
            documentIds.push(id)
            foundDocuments.add(id)
          }
        })
      }

      if (documentIds.length === 0) {
        alert('No documents have been uploaded for this task yet. Please upload documents first.')
        return
      }

      // Show loading state
      const loadingMessage = document.createElement('div')
      loadingMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #2D5016; color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'
      loadingMessage.textContent = `📦 Creating ZIP with ${documentIds.length} document(s)...`
      document.body.appendChild(loadingMessage)

      try {
        // Call bulk download API
        const response = await fetch('/api/vault/bulk-download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentIds }),
        })

        if (!response.ok) {
          throw new Error('Failed to download documents')
        }

        // Get the ZIP file as blob
        const blob = await response.blob()
        
        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `documents-task-${selectedTask}-${new Date().toISOString().split('T')[0]}.zip`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        // Update loading message
        loadingMessage.textContent = `✅ ZIP file downloaded with ${documentIds.length} document(s)!`
        loadingMessage.style.background = '#22C55E'
        
        setTimeout(() => {
          document.body.removeChild(loadingMessage)
        }, 4000)
      } catch (error) {
        console.error('Error downloading ZIP:', error)
        document.body.removeChild(loadingMessage)
        alert('Failed to download documents. Please try again.')
      }
    } catch (error) {
      console.error('Error downloading documents:', error)
      alert('An error occurred. Please try again.')
    }
  }

  // Handle sending all uploaded documents for current task as email bundle
  const handleSendAllDocumentsAsEmail = async () => {
    if (!selectedTask) {
      alert('Please select a task first.')
      return
    }

    try {
      const requirements = getTaskDocumentRequirements()
      
      // Find all uploaded documents for these requirements (using improved matching)
      const documentsToSend: Array<{ url: string; name: string }> = []
      const foundDocuments = new Set<string>() // Track to avoid duplicates
      
      for (const requirement of requirements) {
        const matchingDocs = findDocumentsForRequirement(requirement)
        
        matchingDocs.forEach(({ id, doc }) => {
          if (!foundDocuments.has(id) && doc.download_url) {
            documentsToSend.push({
              url: doc.download_url,
              name: doc.file_name || `${requirement.replace(/\s+/g, '_')}.pdf`,
            })
            foundDocuments.add(id)
          }
        })
      }

      if (documentsToSend.length === 0) {
        alert('No documents have been uploaded for this task yet. Please upload documents first.')
        return
      }

      // Get task title
      const taskTitle = tasks.find(t => t.id === selectedTask)?.title || `Task ${selectedTask}`
      
      // Get recipient email based on task
      let recipientEmail = ''
      if (selectedTask === 2 && municipalityInfo?.email) {
        recipientEmail = municipalityInfo.email
      } else if (selectedTask === 4 && schoolInfo?.authority?.email) {
        recipientEmail = schoolInfo.authority.email
      }
      
      // Show loading state
      const loadingMessage = document.createElement('div')
      loadingMessage.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #2D5016; color: white; padding: 12px 24px; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'
      loadingMessage.textContent = `📧 Creating email with ${documentsToSend.length} document(s)...`
      document.body.appendChild(loadingMessage)

      try {
        // Create EML file with all documents
        // Pre-fill recipient email if available (Task 2 - municipality email)
        await createEMLWithMultipleDocuments(
          documentsToSend,
          {
            to: recipientEmail,
            subject: `${taskTitle}: Required Documents (${documentsToSend.length} files)`,
            body: `Please find the attached documents for: ${taskTitle}\n\nDocuments included:\n${documentsToSend.map((d, i) => `${i + 1}. ${d.name}`).join('\n')}${recipientEmail ? `\n\nThis email is addressed to: ${taskData.user_data?.municipality_name || 'your municipality'}` : ''}`,
          }
        )

        // Update loading message
        loadingMessage.textContent = `✅ Email file created with ${documentsToSend.length} document(s)! Check your downloads.`
        loadingMessage.style.background = '#22C55E'
        
        setTimeout(() => {
          document.body.removeChild(loadingMessage)
        }, 4000)
      } catch (error) {
        console.error('Error creating EML:', error)
        document.body.removeChild(loadingMessage)
        alert('Failed to create email file. Please try again.')
      }
    } catch (error) {
      console.error('Error sending documents as email:', error)
      alert('An error occurred. Please try again.')
    }
  }

  // Handle document upload with ID-based typing
  const handleDocumentUpload = async (requirement: string, documentId: number, file: File) => {
    if (!selectedTask) return

    // Get document type from global ID mapping (highest priority)
    let docType = getDocumentTypeById(documentId)

    // Fallback to requirement-based mapping if ID mapping doesn't exist
    if (!docType) {
      const docTypes = mapRequirementToDocType(requirement)
      docType = docTypes[0] || 'other'
    }

    setUploadingDocument(requirement)
    setUploadTargetDoc(requirement)

    try {
      const formData = new FormData()
      formData.append('file', file)
      // Send both document_id and document_type for maximum compatibility
      formData.append('document_id', documentId.toString())
      if (docType && docType !== 'other') {
        formData.append('document_type', docType)
      }
      // CRITICAL: Send the exact requirement text for precise matching
      formData.append('fulfilled_requirement', requirement)

      console.log(`📤 Uploading document with ID ${documentId} → Type: ${docType} → Requirement: "${requirement}"`)

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
  const triggerFileUpload = (requirement: string, documentId: number) => {
    setUploadTargetDoc(requirement)
    // Store documentId temporarily so we can use it in handleFileInputChange
    ;(fileInputRef.current as any).dataset.documentId = documentId.toString()
    fileInputRef.current?.click()
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && uploadTargetDoc) {
      // Get documentId from the input's data attribute
      const documentId = fileInputRef.current?.dataset.documentId 
        ? parseInt(fileInputRef.current.dataset.documentId, 10) 
        : null
      
      if (documentId) {
        handleDocumentUpload(uploadTargetDoc, documentId, file)
      } else {
        // Fallback: try to get ID from mapping (global)
        const fallbackId = getDocumentIdByRequirement(uploadTargetDoc) || 0
        handleDocumentUpload(uploadTargetDoc, fallbackId, file)
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
        delete (fileInputRef.current as any).dataset.documentId
      }
    }
  }

  const loadMunicipalityInfo = async (municipalityName: string) => {
    if (!municipalityName) {
      console.log('No municipality name provided')
      return
    }
    
    console.log('Loading municipality info for:', municipalityName)
    setLoadingMunicipality(true)
    try {
      // Use new municipality info API
      const response = await fetch(`/api/municipality/info?query=${encodeURIComponent(municipalityName)}`)
      if (response.ok) {
        const info = await response.json()
        console.log('Municipality info loaded:', info)
        console.log('Opening hours:', info.opening_hours)
        console.log('Opening hours keys:', info.opening_hours ? Object.keys(info.opening_hours) : 'null')
        console.log('Opening hours entries:', info.opening_hours ? Object.entries(info.opening_hours) : 'null')
        setMunicipalityInfo(info)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.warn('Municipality info not available:', errorData)
        // Municipality info not available - not an error, just not found
        setMunicipalityInfo(null)
      }
    } catch (error) {
      // Silently handle errors - municipality info is optional
      console.error('Error loading municipality info:', error)
      setMunicipalityInfo(null)
    } finally {
      setLoadingMunicipality(false)
    }
  }

  const loadSchoolInfo = async (municipalityName: string, address: string, plz: string) => {
    if (!municipalityName) {
      console.log('No municipality name provided for school info')
      return
    }
    
    console.log('Loading school info for:', municipalityName, address, plz)
    setLoadingSchool(true)
    try {
      // Get child age from current taskData (if available) or default to 5
      const childAge = taskData?.user_data?.children_ages?.[0] || 5
      
      const params = new URLSearchParams({
        municipality: municipalityName,
        address: address || '',
        plz: plz || '',
        childAge: childAge.toString(),
      })
      
      const response = await fetch(`/api/school/registration-info?${params}`)
      if (response.ok) {
        const info = await response.json()
        console.log('School info loaded:', info)
        setSchoolInfo(info)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.warn('School info not available:', errorData)
        setSchoolInfo(null)
      }
    } catch (error) {
      console.error('Error loading school info:', error)
      setSchoolInfo(null)
    } finally {
      setLoadingSchool(false)
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
                  {formatAnswerText(faq.answer, { handleNextStep: true, handleSeeTask: true })}
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
                      {formatAnswerText(faq.answer, { handleNextStep: true, handleSeeTask: true })}
                    </div>
                    
                    {/* Show opening hours after "Where do I go to register?" */}
                    {faq.show_opening_hours && taskData.user_data?.municipality_name && (
                      <div className="mt-3 p-3 rounded-md" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                        <h5 className="font-semibold text-sm mb-2" style={{ color: '#2D5016' }}>
                          {taskData.user_data.municipality_name} Office Hours:
                        </h5>
                        {loadingMunicipality ? (
                          <p className="text-xs text-gray-500">Loading opening hours...</p>
                        ) : municipalityInfo?.opening_hours && Object.keys(municipalityInfo.opening_hours).length > 0 ? (
                          <>
                            <div className="space-y-1 text-sm">
                              {Object.entries(municipalityInfo.opening_hours).map(([day, hours]) => (
                                <div key={day} className="flex justify-between">
                                  <span className="text-gray-600">{day}</span>
                                  <span className="font-mono font-medium">{hours as string}</span>
                                </div>
                              ))}
                            </div>
                            {municipalityInfo.phone && (
                              <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                                Phone:{' '}
                                <a
                                  href={`tel:${municipalityInfo.phone}`}
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {municipalityInfo.phone}
                                </a>
                              </p>
                            )}
                            {municipalityInfo.email && (
                              <p className="text-xs" style={{ color: '#6B7280' }}>
                                Email:{' '}
                                <a
                                  href={`mailto:${municipalityInfo.email}`}
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {municipalityInfo.email}
                                </a>
                              </p>
                            )}
                            {municipalityInfo.cached && (
                              <p className="text-xs mt-2 italic" style={{ color: '#9CA3AF' }}>
                                (Information cached • Last updated: {new Date(municipalityInfo.cached_at).toLocaleDateString('de-CH')})
                              </p>
                            )}
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
          // Handle (see task X) links - dynamically extract task number
          const taskMatch = line.match(/\(see task (\d+)\)/)
          if (taskMatch) {
            const taskNumber = parseInt(taskMatch[1])
            const parts = line.split(`(see task ${taskNumber})`).map((part: string, partIndex: number) => {
              if (partIndex === 0) return part
              return (
                <span key={partIndex}>
                  (
                  <button
                    onClick={() => handleTaskClick(taskNumber)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    see task {taskNumber}
                  </button>
                  )
                  {part}
                </span>
              )
            })
            processedLine = <>{parts}</>
          } else {
            processedLine = line
          }
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
          {requirements.map((requirement) => {
            const isUploaded = isDocumentUploaded(requirement)
            const isUploading = uploadingDocument === requirement
            // Get global document ID based on document TYPE (consistent across all tasks)
            // ID is used internally for backend processing, but not displayed to user
            const documentId = getDocumentIdByRequirement(requirement)

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
                      onClick={() => triggerFileUpload(requirement, documentId)}
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
            {taskData.user_data?.municipality_name && municipalityInfo?.website_url ? (
              <a
                href={municipalityInfo.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                website
              </a>
            ) : taskData.user_data?.municipality_name ? (
              <a
                href={getMunicipalityUrl(taskData.user_data.municipality_name)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                website
              </a>
            ) : (
              <span className="text-blue-600 underline">website</span>
            )}
            .
          </p>
          {/* Municipality Opening Hours and Contact Info - For Task 1 and Task 2 */}
          {(selectedTask === 1 || selectedTask === 2) && taskData.user_data?.municipality_name && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
              <h4 className="font-semibold text-sm mb-3" style={{ color: '#2D5016' }}>
                {taskData.user_data.municipality_name} - Office Information
              </h4>
              
              {loadingMunicipality ? (
                <p className="text-xs text-gray-500">Loading municipality information...</p>
              ) : municipalityInfo ? (
                <>
                  {/* Opening Hours */}
                  {municipalityInfo.opening_hours && Object.keys(municipalityInfo.opening_hours).length > 0 ? (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-2" style={{ color: '#374151' }}>Opening Hours:</p>
                      <div className="space-y-1 text-xs">
                        {Object.entries(municipalityInfo.opening_hours).map(([day, hours]) => (
                          <div key={day} className="flex justify-between">
                            <span className="text-gray-600">{day}</span>
                            <span className="font-mono font-medium">{hours as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mb-3">Opening hours not available. Please check the official website.</p>
                  )}
                  
                  {/* Contact Info */}
                  {(municipalityInfo.phone || municipalityInfo.email || municipalityInfo.address) && (
                    <div className="mb-3 text-xs">
                      {municipalityInfo.address && (
                        <p className="text-gray-700 mb-1">
                          <strong>Address:</strong> {municipalityInfo.address}
                        </p>
                      )}
                      {municipalityInfo.phone && (
                        <p className="text-gray-700 mb-1">
                          <strong>Phone:</strong>{' '}
                          <a href={`tel:${municipalityInfo.phone}`} className="text-blue-600 hover:text-blue-800 underline">
                            {municipalityInfo.phone}
                          </a>
                        </p>
                      )}
                      {municipalityInfo.email && (
                        <p className="text-gray-700 mb-1">
                          <strong>Email:</strong>{' '}
                          <a href={`mailto:${municipalityInfo.email}`} className="text-blue-600 hover:text-blue-800 underline">
                            {municipalityInfo.email}
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Official Website Link */}
                  {municipalityInfo.website_url && (
                    <p className="text-xs mt-2">
                      <a
                        href={municipalityInfo.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Visit official website →
                      </a>
                    </p>
                  )}
                  
                  {/* Special Notices */}
                  {municipalityInfo.special_notices && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-900">
                      ⚠️ {municipalityInfo.special_notices}
                    </div>
                  )}
                  
                  {municipalityInfo.cached && (
                    <p className="text-xs mt-2 italic" style={{ color: '#9CA3AF' }}>
                      (Information cached • Last updated: {new Date(municipalityInfo.cached_at).toLocaleDateString('de-CH')})
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500">
                  Municipality information not available. Please check the official website.
                </p>
              )}
            </div>
          )}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadDocumentsAsZip}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                title="Download all required documents as ZIP"
                style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
              >
                Download Documents
              </button>
              <button
                onClick={handleSendAllDocumentsAsEmail}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                title="Create email with all documents attached"
                style={{ backgroundColor: '#F2B75B', color: '#FFFFFF' }}
              >
                Create Email
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Task 3: Housing documents
    if (selectedTask === 3) {
      const documentRequirements = [
        'Rental contract or lease agreement',
        'Landlord confirmation letter',
        'Proof of address (utility bill, bank statement)',
        'Employment contract (for rental application)',
        'Reference letters from previous landlords',
      ]

      return (
        <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
          <p className="leading-relaxed">
            The following documents may be required when searching for housing or signing a rental contract.
          </p>
          <p className="leading-relaxed">
            Upload them to the Document Vault for safe keeping and easy access.
          </p>
          <div className="mt-4">
            {renderDocumentsTable(documentRequirements)}
          </div>
          <p className="leading-relaxed mt-4">
            Use the <strong style={{ color: '#2D5016' }}>Housing</strong> section in the Vault to track apartment viewings and review rental contracts.
          </p>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadDocumentsAsZip}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                title="Download all required documents as ZIP"
                style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
              >
                Download Documents
              </button>
              <button
                onClick={handleSendAllDocumentsAsEmail}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                title="Create email with all documents attached"
                style={{ backgroundColor: '#F2B75B', color: '#FFFFFF' }}
              >
                Create Email
              </button>
            </div>
          </div>
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
                schoolInfo?.authority?.website_url ||
                (taskData.user_data?.municipality_name
                  ? `${getMunicipalityUrl(taskData.user_data.municipality_name, false)}/schulen`
                  : '#')
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
          <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadDocumentsAsZip}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                title="Download all required documents as ZIP"
                style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
              >
                Download Documents
              </button>
              <button
                onClick={handleSendAllDocumentsAsEmail}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                title="Create email with all documents attached"
                style={{ backgroundColor: '#F2B75B', color: '#FFFFFF' }}
              >
                Create Email
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Task 5: Permit Card documents
    if (selectedTask === 5) {
      const documentRequirements = [
        'Passport (valid)',
        'Residence permit application confirmation',
        'Proof of health insurance',
        'Employment contract or proof of financial means',
        'Proof of address',
        'Passport photos',
      ]

      return (
        <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
          <p className="leading-relaxed">
            The following documents are typically required when applying for or collecting your residence permit card.
          </p>
          <p className="leading-relaxed">
            Upload them to the Document Vault for safe keeping and easy access.
          </p>
          <div className="mt-4">
            {renderDocumentsTable(documentRequirements)}
          </div>
          <p className="leading-relaxed mt-4">
            Make sure all documents are valid and up-to-date before your appointment.
          </p>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex gap-3">
              <button
                onClick={handleDownloadDocumentsAsZip}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                title="Download all required documents as ZIP"
                style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
              >
                Download Documents
              </button>
              <button
                onClick={handleSendAllDocumentsAsEmail}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                title="Create email with all documents attached"
                style={{ backgroundColor: '#F2B75B', color: '#FFFFFF' }}
              >
                Create Email
              </button>
            </div>
          </div>
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
            {/* Vault Icon + Bell + Archive - Aligned with first task */}
            <div className="flex-shrink-0 flex flex-col gap-3">
              <Link
                href="/vault"
                className="w-20 h-20 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-all hover:scale-105 shadow-md"
                style={{ backgroundColor: '#294F3F', borderRadius: '10px' }}
              >
                <Vault className="text-white" size={48} strokeWidth={2.5} />
              </Link>
              {/* Bell Icon - Same style as Vault - Click to see all alerts */}
              <button 
                onClick={handleAlertIconClick}
                className="w-20 h-20 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-all hover:scale-105 shadow-md relative"
                style={{ backgroundColor: '#294F3F', borderRadius: '10px' }}
                title="View all alerts"
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
                {activeRemindersCount > 0 && (
                  <span
                    className="absolute top-2 right-2 flex items-center justify-center text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5"
                    style={{ backgroundColor: '#EF4444' }}
                  >
                    {activeRemindersCount > 99 ? '99+' : activeRemindersCount}
                  </span>
                )}
              </button>
              {/* Archive Icon - Same style as Vault and Bell */}
              <Link
                href="/essentials/archive"
                className="w-20 h-20 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-all hover:scale-105 shadow-md"
                style={{ backgroundColor: '#294F3F', borderRadius: '10px' }}
              >
                <Archive className="text-white" size={48} strokeWidth={2.5} />
              </Link>
            </div>

            {/* Task List */}
            <div className="flex-1">
              <div className="space-y-4">
                {tasks
                  .filter((task) => {
                    // Filter out archived (completed) tasks - they should only appear in archive
                    if (typeof window === 'undefined') return true
                    const isArchived = localStorage.getItem(`task_${task.id}_done`) === 'true'
                    return !isArchived
                  })
                  .map((task) => {
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
                {/* Task 3: Three titles in a row, full-width content below */}
                {selectedTask === 3 ? (
                  <div className="mb-6">
                    {/* Titles row - 3 columns */}
                    <div className="grid grid-cols-3 gap-6 mb-4">
                      {/* Title 1: Goal */}
                      <div>
                        <h2 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
                          Goal
                        </h2>
                      </div>

                      {/* Title 2: Housing - Collapsible */}
                      <div>
                        <button
                          onClick={() => {
                            setHousingExpanded(!housingExpanded)
                            if (!housingExpanded) {
                              setMapsExpanded(false) // Close Maps if Housing opens
                            }
                          }}
                          className="w-full flex items-center mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <h2 className="text-xl font-bold" style={{ color: '#2D5016' }}>
                            Housing
                          </h2>
                        </button>
                      </div>

                      {/* Title 3: Maps - Collapsible */}
                      <div>
                        <button
                          onClick={() => {
                            setMapsExpanded(!mapsExpanded)
                            if (!mapsExpanded) {
                              setHousingExpanded(false) // Close Housing if Maps opens
                            }
                          }}
                          className="w-full flex items-center mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <h2 className="text-xl font-bold" style={{ color: '#2D5016' }}>
                            Maps
                          </h2>
                        </button>
                      </div>
                    </div>

                    {/* Full-width content sections - Only show if nothing is expanded */}
                    {!housingExpanded && !mapsExpanded && (
                      <>
                        {/* Goal Content - Full width */}
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
                      </>
                    )}

                    {/* Housing Content - Full width - Only Housing */}
                    {housingExpanded && userId && (
                      <div className="mb-6">
                        <HousingVault userId={userId} />
                      </div>
                    )}

                    {/* Maps Content - Full width - Only Maps */}
                    {mapsExpanded && (
                      <div className="mb-6">
                        <DistanceMap />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
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
                  </>
                )}

                {/* 3. Zeile: Checkbox "I have done this" + "Remind me in X days" - Hide if Housing or Maps is expanded in Task 3 */}
                {!(selectedTask === 3 && (housingExpanded || mapsExpanded)) && (
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
                        <div className="flex flex-col">
                          <span>I have done this.</span>
                          {selectedTask && completedDates[selectedTask] && (
                            <span className="text-xs mt-1" style={{ color: '#6B7280' }}>
                              ✓ Completed on {new Date(completedDates[selectedTask]).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          )}
                        </div>
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
                    <button
                      onClick={() => !isDone && handleToggleReminder()}
                      disabled={isDone}
                      className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isReminderActive ? 'Reminder active - click to deactivate' : 'Click to activate reminder'}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isDone ? '#9CA3AF' : (isReminderActive ? '#EF4444' : '#374151')}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path 
                          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" 
                          fill={isReminderActive && !isDone ? '#EF4444' : 'none'}
                        />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </button>
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
                    </span>
                  </div>
                </div>
                )}

                {/* 4. Zeile: Titel "Resources" + Search Box - Hide if Housing or Maps is expanded in Task 3 */}
                {!(selectedTask === 3 && (housingExpanded || mapsExpanded)) && (
                <>
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
                  {selectedTask && taskData && (selectedTask === 1 || selectedTask === 2 || selectedTask === 3 || selectedTask === 4 || selectedTask === 5) && (
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
                </>
                )}
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

      {/* Alerts Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="text-2xl font-bold" style={{ color: '#2D5016' }}>
                Active Alerts
              </h3>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {allReminders.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                    className="mx-auto mb-4"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <p className="text-gray-600">No active alerts</p>
                  <p className="text-sm text-gray-500 mt-2">Click on the bell icon next to a task to activate a reminder</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allReminders.map((reminder) => {
                    const now = new Date()
                    const isPast = reminder.scheduledAt < now
                    const timeUntil = reminder.scheduledAt.getTime() - now.getTime()
                    const daysUntil = Math.ceil(timeUntil / (1000 * 60 * 60 * 24))
                    
                    return (
                      <div
                        key={reminder.taskId}
                        className="border rounded-lg p-4"
                        style={{
                          borderColor: isPast ? '#EF4444' : '#E5E7EB',
                          backgroundColor: isPast ? '#FEF2F2' : '#FFFFFF',
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg" style={{ color: '#2D5016' }}>
                                {reminder.taskTitle}
                              </h4>
                              {isPast && (
                                <span className="px-2 py-1 text-xs font-medium rounded" style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}>
                                  Overdue
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Task {tasks.find(t => t.id === reminder.taskId)?.number || reminder.taskId}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={isPast ? '#EF4444' : '#6B7280'}
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              <span style={{ color: isPast ? '#EF4444' : '#6B7280', fontWeight: '500' }}>
                                {isPast
                                  ? `Alert was due ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
                                  : daysUntil === 0
                                  ? 'Alert is due today'
                                  : daysUntil === 1
                                  ? 'Alert is due tomorrow'
                                  : `Alert in ${daysUntil} days`
                                }
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Scheduled for: {reminder.scheduledAt.toLocaleDateString('en-GB', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedTask(reminder.taskId)
                              setShowAlertsModal(false)
                            }}
                            className="ml-4 px-3 py-1.5 text-sm font-medium rounded transition-colors"
                            style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
                          >
                            View Task
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: '#E5E7EB', color: '#374151' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

// Logo removed

