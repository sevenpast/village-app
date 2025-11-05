'use client'

import { useState, useEffect } from 'react'
import Link from '@/lib/link'
import AppHeader from '@/components/AppHeader'
import RegistrationFooter from '@/components/forms/RegistrationFooter'

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
  const [loading, setLoading] = useState(true)

  const allTasks: Task[] = [
    { id: 1, title: 'Secure residence permit / visa', number: 1 },
    { id: 2, title: 'Register at the Gemeinde (municipality)', number: 2 },
    { id: 3, title: 'Find a place that fits your needs', number: 3 },
    { id: 4, title: 'Register your kids at school / kindergarten', number: 4 },
    { id: 5, title: 'Receive residence permit card', number: 5 },
  ]

  useEffect(() => {
    loadArchivedTasks()
  }, [])

  const loadArchivedTasks = () => {
    try {
      // Load archived tasks from localStorage
      const archived: Task[] = []
      allTasks.forEach(task => {
        const isArchived = typeof window !== 'undefined' && localStorage.getItem(`task_${task.id}_done`) === 'true'
        if (isArchived) {
          archived.push(task)
        }
      })
      setArchivedTasks(archived)
    } catch (error) {
      console.error('Error loading archived tasks:', error)
      setArchivedTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleUndone = async (taskId: number) => {
    try {
      // Remove from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`task_${taskId}_done`)
      }

      // Call API to mark as undone
      const response = await fetch(`/api/tasks/${taskId}/undone`, {
        method: 'POST',
      })

      if (!response.ok) {
        console.error('Failed to mark task as undone')
      }

      // Reload archived tasks
      loadArchivedTasks()

      // Dispatch event to update Essentials page
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('taskUndone', { detail: { taskId } }))
      }
    } catch (error) {
      console.error('Error marking task as undone:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F9FAFB' }}>
      <AppHeader firstName={firstName} avatarUrl={avatarUrl} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#2D5016' }}>
            Archive
          </h1>
          <Link
            href="/essentials"
            className="inline-block px-6 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
          >
            Back to Essentials
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#2D5016' }}></div>
          </div>
        ) : archivedTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
            <p className="text-gray-600 mb-4">No archived tasks yet</p>
            <Link
              href="/essentials"
              className="inline-block px-6 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#2D5016', color: '#FFFFFF' }}
            >
              Back to Essentials
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {archivedTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg p-4 bg-white border"
                style={{ borderColor: '#E5E7EB' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: '#2D5016' }}
                    >
                      {task.number}
                    </div>
                    <h3 className="font-medium text-base" style={{ color: '#374151' }}>
                      {task.title}
                    </h3>
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
            ))}
          </div>
        )}
      </main>

      <RegistrationFooter />
    </div>
  )
}

