'use client'

import { useState, useEffect, useCallback } from 'react'
import { BILLIONAIRES, AVERAGE_AMERICAN, formatCurrency, getWealthPerMs } from '@/lib/wealth-data'

export default function StatsPanel() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      // Use functional setState to avoid stale closures
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Calculate totals
  const elapsedMs = elapsedSeconds * 1000
  
  const billionaireTotal = BILLIONAIRES.reduce((sum, b) => {
    return sum + (elapsedMs * getWealthPerMs(b))
  }, 0)
  
  const averageTotal = elapsedMs * getWealthPerMs(AVERAGE_AMERICAN)
  
  const ratio = averageTotal > 0 ? Math.round(billionaireTotal / averageTotal) : 0

  // Format time
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-nes-darkgray/95 border-t-4 border-nes-gray p-4 z-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {/* Time elapsed */}
          <div className="space-y-1">
            <div className="text-[6px] md:text-[8px] text-nes-gray uppercase">
              Time Elapsed
            </div>
            <div className="text-sm md:text-lg text-nes-cyan text-glow font-pixel">
              ⏱️ {formatTime(elapsedSeconds)}
            </div>
          </div>

          {/* Billionaire combined earnings */}
          <div className="space-y-1">
            <div className="text-[6px] md:text-[8px] text-nes-gray uppercase">
              3 Billionaires Made
            </div>
            <div className="text-sm md:text-lg text-nes-gold text-glow font-pixel">
              💎 {formatCurrency(billionaireTotal)}
            </div>
          </div>

          {/* Average American earnings */}
          <div className="space-y-1">
            <div className="text-[6px] md:text-[8px] text-nes-gray uppercase">
              Avg American Made
            </div>
            <div className="text-sm md:text-lg text-nes-green text-glow font-pixel">
              🏠 {formatCurrency(averageTotal)}
            </div>
          </div>

          {/* Wealth ratio */}
          <div className="space-y-1">
            <div className="text-[6px] md:text-[8px] text-nes-gray uppercase">
              Wealth Ratio
            </div>
            <div className="text-sm md:text-lg text-nes-red text-glow font-pixel">
              ⚡ {ratio.toLocaleString()}x
            </div>
          </div>
        </div>

        {/* Fun fact */}
        <div className="mt-3 text-center text-[6px] md:text-[8px] text-nes-pink">
          💡 In the time you&apos;ve watched, billionaires earned {ratio.toLocaleString()}x more than the average American
        </div>
      </div>
    </div>
  )
}
