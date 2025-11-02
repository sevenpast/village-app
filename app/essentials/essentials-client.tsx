'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'
import GemeindeRegistrationInfobox from './gemeinde-registration-infobox'
import { getMunicipalityUrl } from '@/lib/municipality-urls'

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
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  const [municipalityInfo, setMunicipalityInfo] = useState<any>(null)
  const [loadingMunicipality, setLoadingMunicipality] = useState(false)
  
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
      if (savedStatus === 'true') {
        setTaskStatus(prev => ({ ...prev, [taskId]: true }))
      }
      if (savedReminder) {
        setReminderDays(prev => ({ ...prev, [taskId]: Number(savedReminder) }))
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
  }

  const handleTaskComplete = async (checked: boolean) => {
    if (!selectedTask || isDone) return // Don't allow unchecking once done

    // Update local state immediately
    setTaskStatus(prev => ({ ...prev, [selectedTask]: checked }))
    
    // Save to localStorage for persistence
    localStorage.setItem(`task_${selectedTask}_done`, checked.toString())

    if (checked) {
      // Task marked as done - cancel reminder and update status
      try {
        // TODO: API call to mark task as completed
        // await fetch(`/api/tasks/${selectedTask}/complete`, { method: 'POST' })
        console.log(`Task ${selectedTask} marked as completed`)
        
        // Cancel reminder when task is done (as per user story)
        // The reminder input will be automatically disabled
      } catch (error) {
        console.error('Error completing task:', error)
        // Revert on error
        setTaskStatus(prev => ({ ...prev, [selectedTask]: false }))
        localStorage.setItem(`task_${selectedTask}_done`, 'false')
      }
    }
  }
  
  const handleReminderChange = (days: number) => {
    if (!selectedTask || isDone) return
    setReminderDays(prev => ({ ...prev, [selectedTask]: days }))
    localStorage.setItem(`task_${selectedTask}_reminder`, days.toString())
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
        console.error('Failed to load municipality info')
        setMunicipalityInfo(null)
      }
    } catch (error) {
      console.error('Error loading municipality info:', error)
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
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#2D5016' }}>
              Profile Incomplete
            </h3>
          </div>
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
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#DBEAFE' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#2D5016' }}>
              Visa-Exempt Country
            </h3>
          </div>
          <p className="text-sm font-medium mb-4" style={{ color: '#374151' }}>
            The following information is relevant to you since you are a citizen of{' '}
            <strong style={{ color: '#2D5016' }}>{infobox.country_name}</strong>.
          </p>
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
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#2D5016' }}>
              Visa Required
            </h3>
          </div>
          <p className="text-sm font-medium mb-4" style={{ color: '#374151' }}>
            The following information is relevant to you since you are a citizen of{' '}
            <strong style={{ color: '#2D5016' }}>{infobox.country_name}</strong>.
          </p>
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
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#D1FAE5' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#2D5016' }}>
              EU/EFTA Citizen
            </h3>
          </div>
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
      <header className="w-full" style={{ backgroundColor: '#2D5016' }}>
        <div className="flex items-center justify-between px-6 py-4">
          {/* Back to Home Button */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white hover:opacity-90 transition-opacity font-medium"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Home</span>
          </Link>
          {/* Profile Picture */}
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${firstName}'s profile`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: '#C85C1A' }}
              >
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 px-6 py-8">
        {/* Left Column - Essential Tasks */}
        <div className="w-80">
          <h1 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#2D5016' }}>
            The ESSENTIALS
          </h1>

          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-4">
                {/* Task Number + Icons (only for task 1) */}
                <div className="flex flex-col items-center gap-2">
                  {task.id === 1 && (
                    <>
                      {/* Trash Icon - placeholder for future delete functionality */}
                      <button className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity opacity-0 cursor-default">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-gray-600"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                      {/* Bell Icon */}
                      <button className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-gray-600"
                        >
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                      </button>
                    </>
                  )}
                  {/* Task Number */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: '#2D5016' }}
                  >
                    {task.number}
                  </div>
                </div>

                {/* Task Button - limited width and left-aligned, clickable */}
                <button
                  onClick={() => handleTaskClick(task.id)}
                  className={`max-w-xs flex-1 rounded-lg p-4 text-left transition-all hover:opacity-90 cursor-pointer ${
                    selectedTask === task.id ? 'ring-2 ring-offset-2 ring-2D5016 shadow-lg' : ''
                  }`}
                  style={{
                    backgroundColor: '#C85C1A',
                    border: selectedTask === task.id ? '2px solid #2D5016' : 'none',
                    transform: selectedTask === task.id ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <span className="text-white font-medium">{task.title}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column - Infobox */}
        <div className="flex-1 max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2D5016' }}></div>
            </div>
          ) : taskData ? (
            <div
              className="rounded-lg p-6 h-fit"
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #3B82F6',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Goal Section - Always on top */}
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
                  Goal
                </h2>
                <p className="text-base leading-relaxed" style={{ color: '#374151' }}>
                  {goal || taskData.goal || 'Loading...'}
                </p>
              </div>

              {/* I have done this + Reminder - Same line */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b" style={{ borderColor: '#E5E7EB' }}>
                {/* I have done this - Icon Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTaskComplete(!isDone)}
                    disabled={isDone}
                    className={`flex items-center gap-2 text-sm font-medium transition-opacity ${
                      isDone ? 'cursor-default opacity-100' : 'cursor-pointer hover:opacity-80'
                    }`}
                    style={{ color: isDone ? '#22C55E' : '#374151' }}
                  >
                    {isDone ? (
                      <>
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ backgroundColor: '#22C55E' }}
                        >
                          <svg
                            width="14"
                            height="14"
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
                        <span>I have done this</span>
                      </>
                    ) : (
                      <>
                        <div
                          className="w-5 h-5 rounded border-2 flex items-center justify-center"
                          style={{ borderColor: '#D1D5DB' }}
                        />
                        <span>I have done this</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Remind me in X days */}
                <div className="flex items-center gap-2">
                  <button
                    className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition-opacity"
                    onClick={() => {}}
                    disabled={isDone}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDone ? '#9CA3AF' : 'currentColor'}
                      strokeWidth="2"
                      className="text-gray-600"
                    >
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </button>
                  <span className="text-sm" style={{ color: isDone ? '#9CA3AF' : '#374151' }}>
                    Remind me in{' '}
                    <input
                      type="number"
                      value={currentReminderDays}
                      onChange={(e) => handleReminderChange(Number(e.target.value))}
                      min="1"
                      max="30"
                      disabled={isDone}
                      className="inline-block w-12 px-2 py-1 rounded text-center font-bold border disabled:bg-gray-100 disabled:text-gray-400"
                      style={{
                        borderColor: isDone ? '#D1D5DB' : '#C85C1A',
                        color: isDone ? '#9CA3AF' : '#C85C1A',
                      }}
                    />{' '}
                    days
                  </span>
                </div>
              </div>

              {/* Resources Section */}
              <div className="mt-6">
                <h2 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
                  Resources
                </h2>
                
                {/* FAQs / Good to Know - Collapsible */}
                {taskData.infobox && (
                  <div className="mb-2">
                    <button
                      onClick={() => toggleResource('faq')}
                      className="w-full px-4 py-3 bg-gray-200 rounded-md text-left flex items-center justify-between hover:opacity-90 transition-opacity"
                      style={{ borderColor: '#D1D5DB' }}
                    >
                      <span className="text-sm font-medium" style={{ color: '#374151' }}>
                        FAQs / Good to Know
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-600 transition-transform"
                        style={{
                          transform: expandedResources.has('faq') ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {expandedResources.has('faq') && (
                      <div
                        className="mt-2 px-4 py-4 bg-white rounded-md border"
                        style={{ borderColor: '#D1D5DB' }}
                      >
                        {renderInfobox()}
                      </div>
                    )}
                  </div>
                )}

                {/* Documents you need - Collapsible */}
                {selectedTask && taskData && (selectedTask === 1 || selectedTask === 2 || selectedTask === 4) && (
                  <div className="mb-2">
                    <button
                      onClick={() => toggleResource('documents')}
                      className="w-full px-4 py-3 bg-gray-200 rounded-md text-left flex items-center justify-between hover:opacity-90 transition-opacity"
                      style={{ borderColor: '#D1D5DB' }}
                    >
                      <span className="text-sm font-medium" style={{ color: '#374151' }}>
                        Documents you need
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-600 transition-transform"
                        style={{
                          transform: expandedResources.has('documents') ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {expandedResources.has('documents') && (
                      <div
                        className="mt-2 px-4 py-4 bg-white rounded-md border"
                        style={{ borderColor: '#D1D5DB' }}
                      >
                        {renderDocuments()}
                      </div>
                    )}
                  </div>
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

      {/* Footer */}
      <RegistrationFooter />
    </div>
  )
}

// Logo removed

