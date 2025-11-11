'use client'

import { useState, useEffect } from 'react'

interface Reminder {
  id: string
  document_id: string
  reminder_type: '30_days' | '14_days' | '7_days' | '1_day'
  reminder_date: string
  deadline_date: string
  status: 'pending' | 'sent' | 'snoozed' | 'completed' | 'cancelled'
  snoozed_until: string | null
  days_remaining: number
  is_overdue: boolean
  documents: {
    id: string
    file_name: string
    document_type: string | null
    tags: string[] | null
  } | null
}

interface DocumentRemindersProps {
  userId: string
}

export default function DocumentReminders({ userId }: DocumentRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('pending')

  useEffect(() => {
    loadReminders()
  }, [filterStatus])

  const loadReminders = async () => {
    try {
      setLoading(true)
      const url = filterStatus === 'all' 
        ? '/api/vault/reminders'
        : `/api/vault/reminders?status=${filterStatus}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok && data.success) {
        setReminders(data.reminders || [])
      } else {
        console.error('Failed to load reminders:', data.error)
        // If migration not run or table doesn't exist, show empty state
        if (data.message?.includes('not yet initialized')) {
          setReminders([])
        } else {
          // For other errors, still show empty state (user-friendly)
          setReminders([])
        }
      }
    } catch (error) {
      console.error('Error loading reminders:', error)
      // On error, show empty state
      setReminders([])
    } finally {
      setLoading(false)
    }
  }

  const handleSnooze = async (reminderId: string, days: number) => {
    try {
      const response = await fetch(`/api/vault/reminders/${reminderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'snooze',
          days,
        }),
      })

      if (response.ok) {
        await loadReminders()
        alert('Reminder snoozed successfully')
      } else {
        const errorData = await response.json()
        alert(`Failed to snooze reminder: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error snoozing reminder:', error)
      alert('Failed to snooze reminder')
    }
  }

  const handleComplete = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/vault/reminders/${reminderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
        }),
      })

      if (response.ok) {
        await loadReminders()
        alert('Reminder marked as complete')
      } else {
        const errorData = await response.json()
        alert(`Failed to complete reminder: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error completing reminder:', error)
      alert('Failed to complete reminder')
    }
  }

  const handleCancel = async (reminderId: string) => {
    if (!confirm('Are you sure you want to cancel this reminder?')) {
      return
    }

    try {
      const response = await fetch(`/api/vault/reminders/${reminderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadReminders()
        alert('Reminder cancelled')
      } else {
        const errorData = await response.json()
        alert(`Failed to cancel reminder: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error cancelling reminder:', error)
      alert('Failed to cancel reminder')
    }
  }

  const getDocumentTypeLabel = (type: string | null) => {
    if (!type) return 'Other'
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      '30_days': '30 days before',
      '14_days': '14 days before',
      '7_days': '7 days before',
      '1_day': '1 day before',
    }
    return labels[type] || type
  }

  const filteredReminders = reminders.filter(reminder => {
    if (filterType === 'all') return true
    return reminder.documents?.document_type === filterType
  })

  const documentTypes = Array.from(new Set(reminders.map(r => r.documents?.document_type).filter(Boolean)))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading reminders...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#2D5016' }}>
          Document Reminders
        </h2>
        <p className="text-gray-600">
          Track important deadlines from your documents
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded border"
              style={{ borderColor: '#2D5016' }}
              title="Filter reminders by status"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="snoozed">Snoozed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 rounded border"
              style={{ borderColor: '#2D5016' }}
              title="Filter reminders by document type"
            >
              <option value="all">All Types</option>
              {documentTypes.map(type => (
                <option key={type || 'unknown'} value={type ?? ''}>
                  {getDocumentTypeLabel(type ?? null)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      {!loading && filteredReminders.length === 0 ? (
        <div className="text-center py-12">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mx-auto mb-4 text-gray-400"
          >
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <p className="text-gray-600 mb-2 text-lg font-medium">Keine Reminders gefunden</p>
          <p className="text-sm text-gray-500 mb-4">
            Reminders werden automatisch erstellt, wenn Fristen oder Ablaufdaten in Ihren Dokumenten gefunden werden
          </p>
          <p className="text-xs text-gray-400">
            Unterstützte Dokumenttypen: Passport, Residence Permit, Rental Contract, Insurance Documents
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReminders.map((reminder) => {
            const document = reminder.documents
            if (!document) return null

            const deadlineDate = new Date(reminder.deadline_date)
            const isUrgent = reminder.days_remaining <= 7 && reminder.days_remaining >= 0
            const isOverdue = reminder.is_overdue

            return (
              <div
                key={reminder.id}
                className={`border rounded-lg p-4 ${
                  isOverdue ? 'border-red-500 bg-red-50' : isUrgent ? 'border-orange-500 bg-orange-50' : ''
                }`}
                style={!isOverdue && !isUrgent ? { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' } : {}}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{document.file_name}</h3>
                      {isOverdue && (
                        <span className="px-2 py-1 text-xs rounded bg-red-600 text-white">
                          OVERDUE
                        </span>
                      )}
                      {isUrgent && !isOverdue && (
                        <span className="px-2 py-1 text-xs rounded bg-orange-600 text-white">
                          URGENT
                        </span>
                      )}
                    </div>
                    {document.document_type && (
                      <p className="text-sm text-gray-600 mb-2">
                        Type: {getDocumentTypeLabel(document.document_type)}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>
                        Deadline: {deadlineDate.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className={isOverdue ? 'text-red-600 font-semibold' : isUrgent ? 'text-orange-600 font-semibold' : ''}>
                        {reminder.is_overdue 
                          ? `${Math.abs(reminder.days_remaining)} days overdue`
                          : `${reminder.days_remaining} days remaining`}
                      </span>
                      <span>Reminder: {getReminderTypeLabel(reminder.reminder_type)}</span>
                    </div>
                    {reminder.status === 'snoozed' && reminder.snoozed_until && (
                      <p className="text-xs text-gray-500">
                        Snoozed until: {new Date(reminder.snoozed_until).toLocaleDateString('en-GB')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <a
                      href="/vault"
                      className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#2D5016', color: '#2D5016' }}
                    >
                      View Document
                    </a>
                    {reminder.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            const days = prompt('Snooze for how many days? (1-30)', '7')
                            if (days) {
                              const daysNum = parseInt(days)
                              if (daysNum >= 1 && daysNum <= 30) {
                                handleSnooze(reminder.id, daysNum)
                              }
                            }
                          }}
                          className="px-3 py-2 text-sm rounded border transition-colors hover:bg-gray-50"
                          style={{ borderColor: '#2D5016', color: '#2D5016' }}
                        >
                          Snooze
                        </button>
                        <button
                          onClick={() => handleComplete(reminder.id)}
                          className="px-3 py-2 text-sm rounded text-white transition-opacity hover:opacity-90"
                          style={{ backgroundColor: '#2D5016' }}
                        >
                          Mark Complete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleCancel(reminder.id)}
                      className="px-3 py-2 text-sm rounded text-red-600 border border-red-600 transition-colors hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

