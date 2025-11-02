'use client'

import Link from 'next/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'

interface DashboardClientProps {
  firstName: string
  avatarUrl: string | null
}

export default function DashboardClient({ firstName, avatarUrl }: DashboardClientProps) {
  // Initial values (all start at 0)
  const essentialsProgress = 0
  const connectProgress = 0
  const exploreProgress = 0
  const pointsTotal = 0
  const streakDays = 0
  const currentLevel = 'Newcomer'
  const nextLevelPoints = 500

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      {/* Header */}
      <header className="w-full" style={{ backgroundColor: '#2D5016' }}>
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center">
            <Logo />
          </div>
          {/* Profile Picture & Settings */}
          <div className="flex flex-col items-end gap-2">
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
            <Link
              href="/settings"
              className="text-sm font-medium text-white hover:text-gray-200 underline decoration-white/80 hover:decoration-white transition-colors"
              style={{ textUnderlineOffset: '2px' }}
            >
              settings
            </Link>
          </div>
        </div>
      </header>

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
                isCompleted={connectProgress === 100}
              />

              {/* EXPLORE Card */}
              <JourneyCard
                title="EXPLORE"
                subtitle="Nature, culture & other gems"
                progress={exploreProgress}
                isCompleted={exploreProgress === 100}
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

// Logo Component - same as RegistrationHeader
function Logo() {
  return (
    <div className="relative w-16 h-16">
      <svg width="64" height="64" viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="4" fill="#FF8C42" />
        <g transform="translate(32, 32)">
          <VShape angle={0} color="#1E3A8A" />
          <VShape angle={30} color="#22C55E" />
          <VShape angle={60} color="#9333EA" />
          <VShape angle={90} color="#DC2626" />
          <VShape angle={120} color="#3B82F6" />
          <VShape angle={150} color="#14B8A6" />
          <VShape angle={180} color="#EAB308" />
          <VShape angle={210} color="#EC4899" />
          <VShape angle={240} color="#1E3A8A" />
          <VShape angle={270} color="#22C55E" />
          <VShape angle={300} color="#9333EA" />
          <VShape angle={330} color="#DC2626" />
        </g>
      </svg>
    </div>
  )
}

const VSHAPE_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 20, y: 0 },
  30: { x: 17.320508, y: 10 },
  60: { x: 10, y: 17.320508 },
  90: { x: 0, y: 20 },
  120: { x: -10, y: 17.320508 },
  150: { x: -17.320508, y: 10 },
  180: { x: -20, y: 0 },
  210: { x: -17.320508, y: -10 },
  240: { x: -10, y: -17.320508 },
  270: { x: 0, y: -20 },
  300: { x: 10, y: -17.320508 },
  330: { x: 17.320508, y: -10 },
}

function VShape({ angle, color }: { angle: number; color: string }) {
  const position = VSHAPE_POSITIONS[angle] || { x: 0, y: 0 }
  const rotation = angle + 90

  return (
    <g transform={`translate(${position.x}, ${position.y}) rotate(${rotation})`}>
      <path
        d="M -3 -6 L 0 0 L 3 -6"
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

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

