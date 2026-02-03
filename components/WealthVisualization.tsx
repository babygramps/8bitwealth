'use client'

import { useState, useCallback } from 'react'
import { useBillionaireData } from '@/lib/use-billionaire-data'
import { CALIFORNIA_EDUCATION, formatCurrency } from '@/lib/wealth-data'
import WealthScene3D from './WealthScene3D'

// Loading skeleton for a single wealth scene
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center p-4 animate-pulse">
      <div className="text-center mb-4">
        <div className="w-8 h-8 bg-nes-gray/30 rounded-full mx-auto mb-2" />
        <div className="w-24 h-3 bg-nes-gray/30 rounded mx-auto" />
      </div>
      <div className="text-center mb-4 space-y-1">
        <div className="w-20 h-3 bg-nes-gold/30 rounded mx-auto" />
        <div className="w-16 h-2 bg-nes-gray/30 rounded mx-auto" />
        <div className="w-12 h-2 bg-nes-cyan/30 rounded mx-auto" />
      </div>
      <div className="w-full h-[300px] md:h-[400px] pixel-border-dark bg-nes-black/50 rounded flex items-center justify-center">
        <div className="text-nes-gray text-[8px]">Loading data...</div>
      </div>
    </div>
  )
}

// Toggle switch for showing education comparison
function EducationToggle({ 
  enabled, 
  onToggle 
}: { 
  enabled: boolean
  onToggle: () => void 
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 pixel-border-dark bg-nes-black/80 rounded">
      <button
        onClick={onToggle}
        className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-nes-purple focus:ring-offset-2 focus:ring-offset-nes-black"
        style={{ backgroundColor: enabled ? '#7e2553' : '#4a4a68' }}
        role="switch"
        aria-checked={enabled}
        aria-label="Show California Education Budget comparison"
      >
        <span
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-nes-white transition-transform duration-200"
          style={{ transform: enabled ? 'translateX(24px)' : 'translateX(0)' }}
        />
      </button>
      <div className="text-center">
        <div className="text-[8px] md:text-[10px] text-nes-purple font-pixel">
          📚 CA Education Budget
        </div>
        <div className="text-[6px] text-nes-gray">
          {formatCurrency(CALIFORNIA_EDUCATION.totalBudget)} annual
        </div>
      </div>
    </div>
  )
}

export default function WealthVisualization() {
  const { profiles, averageAmerican, isLoading, error } = useBillionaireData()
  const [showEducation, setShowEducation] = useState(false)
  
  // Use functional setState for stable callback (rerender-functional-setstate)
  const handleToggleEducation = useCallback(() => {
    setShowEducation(prev => !prev)
  }, [])
  
  // Just get Elon Musk for performance
  const elonMusk = profiles.find(p => p.id === 'musk') || profiles[0]

  return (
    <div className="px-4 pb-8">
      {/* Error indicator (subtle, doesn't block UI) */}
      {error ? (
        <div className="text-center mb-4">
          <span className="text-[6px] text-nes-orange">
            Using estimated data (API unavailable)
          </span>
        </div>
      ) : null}

      {/* Education Toggle Control */}
      <div className="flex justify-center mb-6">
        <EducationToggle 
          enabled={showEducation} 
          onToggle={handleToggleEducation} 
        />
      </div>

      {/* Elon Musk section */}
      <div className="mb-8">
        <h2 className="text-center text-[10px] md:text-xs text-nes-gold mb-4 text-glow">
          🚀 ELON MUSK 🚀
        </h2>
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <WealthScene3D profile={elonMusk} showEducation={showEducation} />
          )}
        </div>
      </div>
      
      {/* Divider */}
      <div className="flex items-center justify-center gap-4 my-8">
        <div className="h-1 w-16 bg-nes-gray" />
        <span className="text-nes-red text-lg">VS</span>
        <div className="h-1 w-16 bg-nes-gray" />
      </div>
      
      {/* Average American section */}
      <div>
        <h2 className="text-center text-[10px] md:text-xs text-nes-green mb-4 text-glow">
          🏠 AVG US HOUSEHOLD 🏠
        </h2>
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <WealthScene3D profile={averageAmerican} />
          )}
        </div>
      </div>
      
      {/* Note about scale */}
      <div className="mt-8 text-center">
        <div className="inline-block pixel-border-dark bg-nes-black/80 p-4">
          <p className="text-[6px] md:text-[8px] text-nes-cyan leading-relaxed max-w-md">
            ⚠️ SCALE: Each giant green cube = $1 BILLION in $100 bills (real volume!)
            <br /><br />
            The human figure shows scale. Small $1K stacks grow in real-time.
            <br />
            Musk earns ~$787/second. Avg household earns ~$0.0016/second.
          </p>
        </div>
      </div>
    </div>
  )
}
