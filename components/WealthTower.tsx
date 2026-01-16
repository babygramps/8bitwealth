'use client'

import { memo, useMemo } from 'react'
import Brick from './Brick'
import { WealthProfile, MAX_BRICKS_PER_PILE, formatCurrency, formatPerSecond } from '@/lib/wealth-data'
import { useWealthAnimation } from '@/lib/use-wealth-animation'

interface WealthTowerProps {
  profile: WealthProfile
}

// Memoized tower component
const WealthTower = memo(function WealthTower({ profile }: WealthTowerProps) {
  const { currentWealth, totalBricks, elapsedMs } = useWealthAnimation(profile)

  // Calculate pile structure
  const pileData = useMemo(() => {
    const piles: number[] = []
    let remaining = totalBricks
    
    while (remaining > 0) {
      const bricksInPile = Math.min(remaining, MAX_BRICKS_PER_PILE)
      piles.push(bricksInPile)
      remaining -= bricksInPile
    }
    
    // Ensure at least one pile exists (empty)
    if (piles.length === 0) {
      piles.push(0)
    }
    
    return piles
  }, [totalBricks])

  // Determine which brick is newest for animation
  const newestBrickIndex = totalBricks > 0 ? totalBricks - 1 : -1
  
  // Calculate bricks per second for display
  const bricksPerSecond = (profile.dailyIncrease / profile.brickValue) / 86400

  return (
    <div className="flex flex-col items-center p-4">
      {/* Name and emoji */}
      <div className="text-center mb-4">
        <span className="text-2xl md:text-3xl mb-2 block">{profile.emoji}</span>
        <h3 
          className="text-[8px] md:text-[10px] font-pixel text-glow"
          style={{ color: profile.accentColor }}
        >
          {profile.name}
        </h3>
      </div>

      {/* Wealth stats */}
      <div className="text-center mb-4 space-y-1">
        <div className="text-[8px] md:text-[10px] text-nes-gold">
          {formatCurrency(currentWealth)}
        </div>
        <div className="text-[6px] md:text-[8px] text-nes-gray">
          {formatPerSecond(profile.dailyIncrease)}
        </div>
        <div className="text-[6px] md:text-[8px] text-nes-cyan">
          🧱 {totalBricks.toLocaleString()}
        </div>
      </div>

      {/* Brick piles container */}
      <div className="relative flex items-end gap-1 min-h-[260px] p-2 pixel-border-dark bg-nes-black/50">
        {pileData.map((brickCount, pileIndex) => {
          const pileStartIndex = pileIndex * MAX_BRICKS_PER_PILE
          
          return (
            <div 
              key={pileIndex}
              className="brick-pile flex flex-col-reverse items-center"
            >
              {Array.from({ length: brickCount }).map((_, brickIndex) => {
                const globalBrickIndex = pileStartIndex + brickIndex
                const isNew = globalBrickIndex === newestBrickIndex
                
                return (
                  <Brick
                    key={brickIndex}
                    color={profile.color}
                    isNew={isNew}
                  />
                )
              })}
            </div>
          )
        })}
        
        {/* Empty state */}
        {totalBricks === 0 && (
          <div className="text-[6px] text-nes-gray text-center w-full py-8">
            LOADING...
          </div>
        )}
      </div>

      {/* Brick value label */}
      <div className="mt-2 text-[6px] text-nes-gray text-center">
        1 🧱 = {formatCurrency(profile.brickValue)}
      </div>
    </div>
  )
})

export default WealthTower
