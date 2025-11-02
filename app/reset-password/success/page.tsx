'use client'

import Link from 'next/link'
import RegistrationFooter from '@/components/forms/RegistrationFooter'

export default function ResetPasswordSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#374151' }}>
            Your new password is set!
          </h1>

          {/* Continue Button */}
          <Link
            href="/login"
            className="inline-block px-8 py-4 text-white font-bold rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2D5016' }}
          >
            Continue to Login
          </Link>
        </div>
      </div>
      <RegistrationFooter />
    </div>
  )
}

// Logo Component
function Logo() {
  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 64 64" className="w-full h-full">
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

