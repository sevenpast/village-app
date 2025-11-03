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
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  const [municipalityInfo, setMunicipalityInfo] = useState<any>(null)
  const [loadingMunicipality, setLoadingMunicipality] = useState(false)
  const [reminderSaveStatus, setReminderSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
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
  }

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
    setExpandedResources((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(resourceType)) {
        newSet.delete(resourceType)
      } else {
        newSet.add(resourceType)
      }
      return newSet
    })
  }

  const renderInfobox = () => {
    if (!taskData?.infobox) return null

    const { infobox } = taskData

    // Gemeinde Registration (Task 2)
    if (infobox.type === 'gemeinde_registration') {
      return (
        <GemeindeRegistrationInfobox
          infobox={infobox}
          municipalityName={taskData.user_data?.municipality_name}
        />
      )
    }

    // Housing (Task 3)
    if (infobox.type === 'housing') {
      return (
        <div className="space-y-4">
          {infobox.faqs?.map((faq: any, index: number) => (
            <div key={index} className="space-y-2">
              <h4 className="font-semibold text-base mt-4" style={{ color: '#2D5016' }}>
                {faq.question}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                {faq.answer.split('→').map((part: string, partIndex: number) => {
                  if (partIndex === 0) return part
                  return (
                    <span key={partIndex}>
                      →{part}
                    </span>
                  )
                })}
              </p>
              {index < infobox.faqs.length - 1 && (
                <div className="border-t my-4" style={{ borderColor: '#E5E7EB' }} />
              )}
            </div>
          ))}
        </div>
      )
    }

    // School Registration (Task 4)
    if (infobox.type === 'school_registration') {
      return (
        <div className="space-y-4">
          {infobox.faqs?.map((faq: any, index: number) => (
            <div key={index} className="space-y-2">
              <h4 className="font-semibold text-base mt-4" style={{ color: '#2D5016' }}>
                {faq.question}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                {faq.answer.split('[change profile]').map((part: string, partIndex: number) => {
                  if (partIndex === 0) return part
                  return (
                    <span key={partIndex}>
                      <button className="text-blue-600 hover:text-blue-800 underline">change profile</button>
                    </span>
                  )
                })}
              </p>
              {index < infobox.faqs.length - 1 && (
                <div className="border-t my-4" style={{ borderColor: '#E5E7EB' }} />
              )}
            </div>
          ))}
        </div>
      )
    }

    // Permit Card (Task 5)
    if (infobox.type === 'permit_card') {
      return (
        <div className="space-y-4">
          {infobox.faqs?.map((faq: any, index: number) => (
            <div key={index} className="space-y-2">
              <h4 className="font-semibold text-base mt-4" style={{ color: '#2D5016' }}>
                {faq.question}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                {faq.answer.split('(see task 2)').map((part: string, partIndex: number) => {
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
                    </span>
                  )
                })}
              </p>
              {index < infobox.faqs.length - 1 && (
                <div className="border-t my-4" style={{ borderColor: '#E5E7EB' }} />
              )}
            </div>
          ))}
        </div>
      )
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

    // Visa exempt (e.g., USA, Canada)
    if (infobox.type === 'visa_exempt') {
      return (
        <div className="space-y-4">
          {infobox.faqs?.map((faq: any, index: number) => (
            <div key={index} className="space-y-2">
              <h4 className="font-semibold text-base mt-4" style={{ color: '#2D5016' }}>
                {faq.question}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                {faq.answer.split('→ Next Step:').map((part: string, partIndex: number) => {
                  if (partIndex === 0) return part
                  // Extract task number from "Task 2 - Register at Gemeinde"
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
                })}
              </p>
              {index < infobox.faqs.length - 1 && (
                <div className="border-t my-4" style={{ borderColor: '#E5E7EB' }} />
              )}
            </div>
          ))}
        </div>
      )
    }

    // Visa required (e.g., India, China)
    if (infobox.type === 'visa_required') {
      return (
        <div className="space-y-4">
          {infobox.faqs?.map((faq: any, index: number) => (
            <div key={index} className="space-y-2">
              <h4 className="font-semibold text-base mt-4" style={{ color: '#2D5016' }}>
                {faq.question}
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#374151' }}>
                {faq.answer.split('→ Next Step:').map((part: string, partIndex: number) => {
                  if (partIndex === 0) return part
                  // Extract task number from "Task 2 - Register at Gemeinde"
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
                })}
              </p>
              {index < infobox.faqs.length - 1 && (
                <div className="border-t my-4" style={{ borderColor: '#E5E7EB' }} />
              )}
            </div>
          ))}
        </div>
      )
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

  const renderDocuments = () => {
    if (!selectedTask || !taskData) return null

    // Task 1 & 2: Gemeinde documents
    if (selectedTask === 1 || selectedTask === 2) {
      return (
        <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
          <p className="leading-relaxed">
            Generally, the following documents are required to be brought to the Gemeinde (municipality office) in person.
          </p>
          <p className="leading-relaxed">
            Upload them to the Document Vault for safe keeping and easy access in later tasks.
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Passport/ID for each family member</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>For families: family book, marriage certificate, birth certificates, divorce certificate</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Employment contract (with length and hours)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Rental contract or landlord confirmation</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Passport photos (sometimes required)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Proof of health insurance (or provide it within 3 months)</span>
            </li>
          </ul>
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
      return (
        <div className="space-y-3 text-sm" style={{ color: '#374151' }}>
          <p className="leading-relaxed">
            Generally, the following documents are required to be brought to the Gemeinde (municipality office) in person.
          </p>
          <p className="leading-relaxed">
            Upload them to the Document Vault for safe keeping and easy access in later tasks.
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Child&apos;s passport or ID</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Birth certificate</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Residence permit (if available)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Proof of address (rental contract or confirmation)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2" style={{ color: '#2D5016' }}>&gt;</span>
              <span>Vaccination record</span>
            </li>
          </ul>
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

                {/* 4. Zeile: Titel "Resources" */}
                <h2 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
                  Resources
                </h2>

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
                        transform: expandedResources.has('faq') ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  
                  {/* FAQ Content */}
                  {expandedResources.has('faq') && taskData.infobox && (
                    <div
                      className="mt-2 px-4 py-4 bg-white rounded-lg border"
                      style={{ borderColor: '#D1D5DB' }}
                    >
                      {renderInfobox()}
                    </div>
                  )}
                  
                  {expandedResources.has('faq') && !taskData.infobox && (
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
                            transform: expandedResources.has('documents') ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      
                      {/* Documents Content */}
                      {expandedResources.has('documents') && (
                        <div
                          className="mt-2 px-4 py-4 bg-white rounded-lg border"
                          style={{ borderColor: '#D1D5DB' }}
                        >
                          {renderDocuments()}
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

      {/* Footer */}
      <RegistrationFooter />
    </div>
  )
}

// Logo removed

