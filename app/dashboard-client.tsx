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
  const pointsTotal = 357
  const streakDays = 15
  const currentLevel = 'Villager'
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
              <Link href="/essentials" className="block relative">
                <JourneyCard
                  title="The ESSENTIALS"
                  subtitle="Getting set up in Switzerland"
                  progress={essentialsProgress}
                  isCompleted={essentialsProgress === 100}
                />
              </Link>

              {/* CONNECT Card */}
              <div className="relative">
                <JourneyCard
                  title="CONNECT"
                  subtitle="Find your people"
                  progress={connectProgress || 15}
                  isCompleted={connectProgress === 100 && totalConnectTasks > 0}
                />
              </div>

              {/* EXPLORE Card */}
              <div className="relative">
                <JourneyCard
                  title="EXPLORE"
                  subtitle="Nature, culture & other gems"
                  progress={exploreProgress || 47}
                  isCompleted={exploreProgress === 100 && totalExploreTasks > 0}
                />
              </div>
            </div>
          </div>

          {/* The Vault Section */}
          <div className="mt-auto">
            <h3 className="text-xl font-bold mb-4" style={{ color: '#2D5016' }}>
              The Vault
            </h3>
            <div className="flex items-center gap-4">
              {/* Vault Icon with key */}
              <div
                className="w-20 h-20 rounded-lg flex items-center justify-center relative"
                style={{ backgroundColor: '#2D5016' }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white"
                >
                  {/* Safe/Vault */}
                  <rect x="4" y="10" width="16" height="12" rx="2" ry="2" />
                  <path d="M8 10V6a4 4 0 0 1 8 0v4" />
                  {/* Dial/Lock mechanism */}
                  <circle cx="12" cy="16" r="2" />
                  <circle cx="12" cy="16" r="0.5" fill="currentColor" />
                  {/* Key */}
                  <path d="M3 14l2-2m0 0l1-1m-1 1l-1 1m1-1l1 1" strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <aside
          className="w-80 rounded-lg p-6 flex flex-col shadow-lg"
          style={{ backgroundColor: '#F2B75B', minHeight: '500px' }}
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
              {/* Golden Badge with green leaf */}
              <svg
                width="80"
                height="80"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Golden badge star shape */}
                <path
                  d="M50 10 L58 38 L88 38 L65 55 L73 85 L50 68 L27 85 L35 55 L12 38 L42 38 Z"
                  fill="#F59E0B"
                  stroke="#D97706"
                  strokeWidth="2"
                />
                {/* Red ribbons */}
                <path
                  d="M30 20 L35 45 M70 20 L65 45"
                  stroke="#DC2626"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Green leaf in center */}
                <path
                  d="M50 45 Q45 40 48 50 Q50 55 52 50 Q55 40 50 45"
                  fill="#22C55E"
                />
                <path
                  d="M48 48 Q50 52 52 48"
                  fill="#16A34A"
                />
              </svg>
            </div>
            <div className="text-sm mb-1" style={{ color: '#FFFFFF' }}>
              Level:
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
              {currentLevel}
            </div>
            <div className="text-sm text-center" style={{ color: '#FAF6F0', opacity: 0.9 }}>
              next badge at {nextLevelPoints} pts
            </div>
          </div>

          {/* Streak Days */}
          <div className="mt-auto flex flex-col items-center">
            {/* Flame Icon - colorful */}
            <div className="mb-2">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Outer flame - red/orange */}
                <path
                  d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
                  fill="#EF4444"
                />
                {/* Inner flame - yellow */}
                <path
                  d="M10 13a2 2 0 0 0 1.5-.5c-.3-1-.7-2-1-3-.3-1.5 0-3 1-4.5.5 2 1.5 3.5 2.5 4.5 1 1 1.5 2.5 1.5 4a5 5 0 1 1-10 0c0-.8.3-1.6.8-2.2a2 2 0 0 0 1.7 1.7z"
                  fill="#F59E0B"
                />
                {/* Core - yellow/white */}
                <path
                  d="M11 12.5c-.2-.8-.5-1.5-1-2-.5-1 0-2 .5-3 .3 1 .7 1.8 1 2.5.3.7.5 1.5.5 2.5z"
                  fill="#FDE047"
                />
              </svg>
            </div>
            <div className="text-sm mb-1" style={{ color: '#FFFFFF' }}>
              Streak days:
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
              {streakDays}
            </div>
            <div className="text-xs text-center mt-2" style={{ color: '#FAF6F0', opacity: 0.9 }}>
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
    <div className="relative">
      <div
        className="relative rounded-lg p-6 cursor-pointer hover:opacity-90 transition-opacity shadow-md"
        style={{ backgroundColor: '#F2B75B' }}
      >
        {/* Progress Badge (Top Right - small circle) */}
        <div
          className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: '#2D5016', color: '#F2B75B' }}
        >
          {progress}%
        </div>

        {/* Content */}
        <div className="pr-16">
          <h3 className="text-xl font-bold mb-1 text-white">{title}</h3>
          <p className="text-sm" style={{ color: '#FFFFFF' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Completed Badge (Outside right of card) */}
      {isCompleted && (
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#22C55E' }}>
          <svg
            width="24"
            height="24"
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
    </div>
  )
}

