'use client'

import { useState, useEffect } from 'react'
import Link from '@/lib/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'
import AppHeader from '@/components/AppHeader'
import { Vault } from 'lucide-react'

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FEFAF6' }}>
      {/* Header */}
      <AppHeader firstName={firstName} avatarUrl={avatarUrl} showHome={false} />

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 px-6 py-8">
        {/* Left: Main Content */}
        <div className="flex-1 flex flex-col relative">
          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="font-bold mb-2" style={{ fontSize: '64px', lineHeight: '100%', color: '#294F3F' }}>
              Welcome, {firstName}!
            </h1>
            <p className="font-bold" style={{ fontSize: '36px', lineHeight: '100%', color: '#294F3F' }}>
              Start building your Village in Switzerland today.
            </p>
          </div>

          {/* Journey Selection - Moved to bottom */}
          <div className="mt-auto flex flex-col items-center w-full pb-8">
            <h2 className="font-bold mb-6 text-center" style={{ fontSize: '32px', lineHeight: '100%', color: '#294F3F' }}>
              Choose your journey
            </h2>
            <div className="flex flex-col gap-10 w-full max-w-md mx-auto">
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
                progress={connectProgress}
                  isCompleted={connectProgress === 100 && totalConnectTasks > 0}
              />
              </div>

              {/* EXPLORE Card */}
              <div className="relative">
              <JourneyCard
                title="EXPLORE"
                subtitle="Nature, culture & other gems"
                progress={exploreProgress}
                  isCompleted={exploreProgress === 100 && totalExploreTasks > 0}
              />
              </div>
            </div>
          </div>

          {/* The Vault Icon - Bottom Left Corner */}
          <div className="absolute bottom-0 left-0 flex flex-col gap-3">
            <h3 className="font-bold" style={{ fontSize: '36px', lineHeight: '100%', color: '#294F3F' }}>
              The Vault
            </h3>
            <Link
              href="/vault"
              className="w-64 h-64 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-all hover:scale-105 shadow-lg"
              style={{ backgroundColor: '#294F3F', borderRadius: '10px' }}
            >
              <Vault className="text-white" size={144} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* Right: Sidebar */}
        <aside
          className="w-80 p-6 flex flex-col shadow-lg"
          style={{ backgroundColor: 'rgba(233, 168, 67, 0.7)', borderRadius: '50px', minHeight: '600px' }}
        >
          {/* Points Total */}
          <div className="mb-8 text-center">
            <div className="font-bold mb-1" style={{ fontSize: '20px', lineHeight: '100%', color: '#FFFFFF' }}>
              Points Total
            </div>
            <div className="font-bold" style={{ fontSize: '64px', lineHeight: '100%', color: '#FFFFFF' }}>
              {pointsTotal}
            </div>
          </div>

          {/* Level Badge */}
          <div className="mb-8 flex flex-col items-center">
            <div className="w-24 h-24 mb-3 flex items-center justify-center">
              {/* Badge icon - using placeholder image area */}
              <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                <svg width="76" height="76" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="38" fill="#FFFFFF" opacity="0.3" />
                  <circle cx="50" cy="50" r="30" fill="#FFFFFF" opacity="0.5" />
              </svg>
              </div>
            </div>
            <div className="font-bold mb-1" style={{ fontSize: '20px', lineHeight: '100%', color: '#FFFFFF' }}>
              Level: {currentLevel}
            </div>
            <div className="font-bold text-center" style={{ fontSize: '10px', lineHeight: '100%', color: '#FFFFFF' }}>
              next badge at {nextLevelPoints} pts
            </div>
          </div>

          {/* Streak Days */}
          <div className="mt-auto flex flex-col items-center">
            {/* Flame Icon */}
            <div className="mb-2 w-20 h-20 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                <svg width="76" height="76" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="38" fill="#FFFFFF" opacity="0.3" />
              </svg>
              </div>
            </div>
            <div className="font-bold mb-1" style={{ fontSize: '20px', lineHeight: '100%', color: '#FFFFFF' }}>
              Streak days: {streakDays}
            </div>
            <div className="font-bold text-center px-4 mt-2" style={{ fontSize: '16px', lineHeight: '100%', color: '#FFFFFF' }}>
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
        className="relative cursor-pointer hover:opacity-90 transition-opacity"
        style={{ 
          backgroundColor: isCompleted ? 'rgba(233, 168, 67, 0.7)' : '#E9A843',
          border: isCompleted ? '5px solid #F8EDE0' : '5px solid #E9A843',
          borderRadius: '8px',
          minHeight: '140px',
          padding: '24px',
          filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))'
        }}
    >
        {/* Progress Badge (Top Right - small circle) */}
      <div
          className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center font-bold"
          style={{ 
            backgroundColor: '#F8EDE0',
            color: '#DA5B37',
            fontSize: '12px',
            lineHeight: '100%'
          }}
      >
        {progress}%
      </div>

      {/* Content */}
        <div className="pr-16 h-full flex flex-col justify-center">
          <h3 className="font-bold mb-4 text-center" style={{ fontSize: '24px', lineHeight: '100%', color: '#FFFFFF' }}>
            {title}
          </h3>
          <p className="font-bold text-center" style={{ fontSize: '12px', lineHeight: '100%', color: '#FFFFFF' }}>
          {subtitle}
        </p>
        </div>
      </div>
    </div>
  )
}

