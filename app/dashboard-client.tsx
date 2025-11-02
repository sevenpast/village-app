'use client'

import { useState, useEffect } from 'react'
import Link from '@/lib/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'
import AppHeader from '@/components/AppHeader'

interface DashboardClientProps {
  firstName: string
  avatarUrl: string | null
}

export default function DashboardClient({ firstName, avatarUrl }: DashboardClientProps) {
  // Calculate progress from completed tasks for each journey
  const [essentialsProgress, setEssentialsProgress] = useState(0)
  const [connectProgress, setConnectProgress] = useState(0)
  const [exploreProgress, setExploreProgress] = useState(0)
  
  const totalEssentialsTasks = 5 // Tasks 1-5
  const totalConnectTasks = 0 // Tasks will be implemented later
  const totalExploreTasks = 0 // Tasks will be implemented later

  useEffect(() => {
    // Load task completion status from localStorage
    const calculateEssentialsProgress = () => {
      let completedTasks = 0
      for (let taskId = 1; taskId <= totalEssentialsTasks; taskId++) {
        const savedStatus = localStorage.getItem(`task_${taskId}_done`)
        if (savedStatus === 'true') {
          completedTasks++
        }
      }
      const progress = totalEssentialsTasks > 0 
        ? Math.round((completedTasks / totalEssentialsTasks) * 100)
        : 0
      setEssentialsProgress(progress)
    }

    const calculateConnectProgress = () => {
      // TODO: Implement when Connect tasks are defined
      // For now, return 0 as tasks are not yet implemented
      setConnectProgress(0)
    }

    const calculateExploreProgress = () => {
      // TODO: Implement when Explore tasks are defined
      // For now, return 0 as tasks are not yet implemented
      setExploreProgress(0)
    }

    // Calculate all progresses on mount
    calculateEssentialsProgress()
    calculateConnectProgress()
    calculateExploreProgress()

    // Listen for storage events (when tasks are marked as done)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('task_') && e.key.endsWith('_done')) {
        calculateEssentialsProgress()
        calculateConnectProgress()
        calculateExploreProgress()
      }
    }

    // Listen for custom event (when tasks are marked as done on the same page)
    const handleTaskUpdate = () => {
      calculateEssentialsProgress()
      calculateConnectProgress()
      calculateExploreProgress()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('taskCompleted', handleTaskUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('taskCompleted', handleTaskUpdate)
    }
  }, [totalEssentialsTasks, totalConnectTasks, totalExploreTasks])
  const pointsTotal = 0
  const streakDays = 0
  const currentLevel = 'Newcomer'
  const nextLevelPoints = 500

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      {/* Header */}
      <AppHeader firstName={firstName} avatarUrl={avatarUrl} showHome={false} />

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 px-6 py-8">
        {/* Left: Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: '#2D5016' }}>
              Welcome, {firstName}!
            </h1>
            <p className="text-lg" style={{ color: '#374151' }}>
              Start building your Village in Switzerland today.
            </p>
          </div>

          {/* Journey Selection */}
          <div className="mb-8 flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4 text-center" style={{ color: '#2D5016' }}>
              Choose your journey
            </h2>
            <div className="flex flex-col gap-4 w-full max-w-md">
              {/* ESSENTIALS Card */}
              <Link href="/essentials" className="block">
                <JourneyCard
                  title="The ESSENTIALS"
                  subtitle="Getting set up in Switzerland"
                  progress={essentialsProgress}
                  isCompleted={essentialsProgress === 100}
                />
              </Link>

              {/* CONNECT Card */}
              <JourneyCard
                title="CONNECT"
                subtitle="Find your people"
                progress={connectProgress}
                isCompleted={connectProgress === 100 && totalConnectTasks > 0}
              />

              {/* EXPLORE Card */}
              <JourneyCard
                title="EXPLORE"
                subtitle="Nature, culture & other gems"
                progress={exploreProgress}
                isCompleted={exploreProgress === 100 && totalExploreTasks > 0}
              />
            </div>
          </div>

          {/* The Vault Section */}
          <div className="mt-auto">
            <h3 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
              The Vault
            </h3>
            <div className="flex items-center gap-4">
              {/* Vault Icon */}
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#2D5016' }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <aside
          className="w-80 rounded-lg p-6 flex flex-col"
          style={{ backgroundColor: '#C85C1A', minHeight: '500px' }}
        >
          {/* Points Total */}
          <div className="mb-6">
            <div className="text-5xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
              {pointsTotal}
            </div>
            <div className="text-sm" style={{ color: '#FAF6F0' }}>
              Points Total
            </div>
          </div>

          {/* Level Badge */}
          <div className="mb-6 flex flex-col items-center">
            <div className="w-20 h-20 mb-3 flex items-center justify-center">
              {/* Badge Icon */}
              <svg
                width="80"
                height="80"
                viewBox="0 0 100 100"
                className="text-white"
              >
                {/* Badge shape */}
                <path
                  d="M50 10 L60 40 L90 40 L68 58 L75 88 L50 70 L25 88 L32 58 L10 40 L40 40 Z"
                  fill="currentColor"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                {/* Leaf in center */}
                <circle cx="50" cy="50" r="8" fill="#22C55E" />
              </svg>
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
              Level: {currentLevel}
            </div>
            <div className="text-sm text-center" style={{ color: '#FAF6F0' }}>
              next badge at {nextLevelPoints} pts
            </div>
          </div>

          {/* Streak Days */}
          <div className="mt-auto flex flex-col items-center">
            {/* Flame Icon */}
            <div className="mb-2">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white"
              >
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
              Streak days: {streakDays}
            </div>
            <div className="text-xs text-center mt-2" style={{ color: '#FAF6F0' }}>
              Advance your journeys to get badges for rewards & perks!
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <RegistrationFooter />
    </div>
  )
}

// Logo removed

interface JourneyCardProps {
  title: string
  subtitle: string
  progress: number
  isCompleted: boolean
}

function JourneyCard({ title, subtitle, progress, isCompleted }: JourneyCardProps) {
  return (
    <div
      className="relative rounded-lg p-6 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ backgroundColor: '#C85C1A' }}
    >
      {/* Progress Badge (Top Right) */}
      <div
        className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: '#2D5016' }}
      >
        {progress}%
      </div>

      {/* Completed Badge (Bottom Right) */}
      {isCompleted && (
        <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#22C55E' }}>
          <svg
            width="20"
            height="20"
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
      )}

      {/* Content */}
      <div className="pr-20">
        <h3 className="text-xl font-bold mb-1 text-white">{title}</h3>
        <p className="text-sm" style={{ color: '#FAF6F0' }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}

