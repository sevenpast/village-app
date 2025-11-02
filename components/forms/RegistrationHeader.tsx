'use client'

/**
 * Registration Header Component
 * Shows the colorful logo on dark green background
 */
export default function RegistrationHeader() {
  return <Logo />
}

// Logo Component - Colorful V-shapes in a circle
function Logo() {
  return (
    <div className="relative w-16 h-16">
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        className="w-full h-full"
      >
        {/* Center orange circle */}
        <circle cx="32" cy="32" r="4" fill="#FF8C42" />
        
        {/* V-shaped elements arranged radially */}
        <g transform="translate(32, 32)">
          <VShape angle={0} color="#1E3A8A" />   {/* dark blue */}
          <VShape angle={30} color="#22C55E" />  {/* light green */}
          <VShape angle={60} color="#9333EA" />  {/* purple */}
          <VShape angle={90} color="#DC2626" />  {/* red */}
          <VShape angle={120} color="#3B82F6" /> {/* light blue */}
          <VShape angle={150} color="#14B8A6" /> {/* teal */}
          <VShape angle={180} color="#EAB308" /> {/* yellow */}
          <VShape angle={210} color="#EC4899" /> {/* pink */}
          <VShape angle={240} color="#1E3A8A" /> {/* dark blue */}
          <VShape angle={270} color="#22C55E" /> {/* light green */}
          <VShape angle={300} color="#9333EA" /> {/* purple */}
          <VShape angle={330} color="#DC2626" /> {/* red */}
        </g>
      </svg>
    </div>
  )
}

// Pre-calculated positions for 12 V-shapes at 30-degree intervals (radius = 20)
// This avoids floating-point precision differences between server and client
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

// V-shaped element component
function VShape({ angle, color }: { angle: number; color: string }) {
  const position = VSHAPE_POSITIONS[angle] || { x: 0, y: 0 }
  const rotation = angle + 90 // Rotate V to point outward

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

