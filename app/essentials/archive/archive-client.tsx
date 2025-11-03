'use client'

import { useState, useEffect } from 'react'
import Link from '@/lib/link'
import AppHeader from '@/components/AppHeader'

interface ArchiveClientProps {
  firstName: string
  avatarUrl: string | null
}

interface Task {
  id: number
  title: string
  number: number
}

export default function ArchiveClient({ firstName, avatarUrl }: ArchiveClientProps) {
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<number | null>(null)

  // All tasks
  const allTasks: Task[] = [
    { id: 1, title: 'Secure residence permit / visa', number: 1 },
    { id: 2, title: 'Register at the Gemeinde (municipality)', number: 2 },
    { id: 3, title: 'Find a place that fits your needs', number: 3 },
    { id: 4, title: 'Register your kids at school / kindergarten', number: 4 },
    { id: 5, title: 'Receive residence permit card', number: 5 },
  ]

  // Load archived tasks from localStorage
  useEffect(() => {
    const loadArchivedTasks = () => {
      const archived = allTasks.filter(task => {
        const isArchived = localStorage.getItem(`task_${task.id}_done`) === 'true'
        return isArchived
      })
      setArchivedTasks(archived)
      
      // If we have archived tasks and none selected, select the first one
      if (archived.length > 0 && !selectedTask) {
        setSelectedTask(archived[0].id)
      }
    }

    loadArchivedTasks()

    // Listen for storage changes (when tasks are unarchived)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('task_') && e.key.endsWith('_done')) {
        loadArchivedTasks()
      }
    }

    // Listen for custom event (when tasks are unarchived on the same page)
    const handleTaskUpdate = () => {
      loadArchivedTasks()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('taskCompleted', handleTaskUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('taskCompleted', handleTaskUpdate)
    }
  }, [selectedTask])

  const handleUndone = async (taskId: number) => {
    try {
      // API call to unarchive the task
      const response = await fetch(`/api/tasks/${taskId}/undone`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to unarchive task')
      }

      // Update localStorage
      localStorage.setItem(`task_${taskId}_done`, 'false')
      localStorage.removeItem(`task_${taskId}_completed_date`)

      console.log(`Task ${taskId} unarchived successfully`)

      // Dispatch custom event to update progress on dashboard
      window.dispatchEvent(new Event('taskCompleted'))

      // Trigger storage event to update other tabs/windows
      window.dispatchEvent(new StorageEvent('storage', {
        key: `task_${taskId}_done`,
        newValue: 'false',
      }))

      // Remove from archived tasks list
      setArchivedTasks(prev => prev.filter(task => task.id !== taskId))
      
      // If this was the selected task, select another one
      if (selectedTask === taskId) {
        const remaining = archivedTasks.filter(task => task.id !== taskId)
        if (remaining.length > 0) {
          setSelectedTask(remaining[0].id)
        } else {
          setSelectedTask(null)
        }
      }

      // Show success message
      alert(`Task "${allTasks.find(t => t.id === taskId)?.title}" has been moved back to Essentials.`)
    } catch (error) {
      console.error('Error unarchiving task:', error)
      alert('Failed to unarchive task. Please try again.')
    }
  }

  const getCompletedDate = (taskId: number): string | null => {
    return localStorage.getItem(`task_${taskId}_completed_date`)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FEFAF6' }}>
      {/* Header */}
      <AppHeader firstName={firstName} avatarUrl={avatarUrl} showHome={true} />

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header with Archive title and Back button on same line */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#2D5016' }}>
              Archive
            </h1>
            <Link
              href="/essentials"
              className="px-6 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
            >
              Back to Essentials
            </Link>
          </div>

          {archivedTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg" style={{ color: '#6B7280' }}>
                No archived tasks yet. Tasks will appear here when marked as done.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {archivedTasks.map((task) => {
                const completedDate = getCompletedDate(task.id)
                return (
                  <div
                    key={task.id}
                    className="rounded-lg p-6 border-2"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#2D5016',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: '#2D5016' }}
                        >
                          {task.number}
                        </div>
                        <div>
                          <h3 className="font-medium text-lg" style={{ color: '#374151' }}>
                            {task.title}
                          </h3>
                          {completedDate && (
                            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                              Completed on {completedDate}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUndone(task.id)}
                        className="px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#E9A843', color: '#374151' }}
                      >
                        Undone
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

