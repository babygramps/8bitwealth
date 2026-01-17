'use client'

import { useMemo } from 'react'
import { MAX_BRICKS_PER_PILE } from './wealth-data'

export interface BrickPosition {
  id: number
  pileX: number
  pileZ: number
  brickY: number
  isNew: boolean
}

export interface PileInfo {
  pileIndex: number
  gridX: number
  gridZ: number
  brickCount: number
}

// Brick dimensions in 3D units
export const BRICK_WIDTH = 1
export const BRICK_HEIGHT = 0.5
export const BRICK_DEPTH = 0.5
export const PILE_SPACING = 1.5

/**
 * Calculate grid position for a pile index using a stable spiral pattern
 * Expands outward from center: 0,0 -> 1,0 -> 1,1 -> 0,1 -> -1,1 -> -1,0 -> -1,-1 -> 0,-1 -> 1,-1 -> 2,-1 -> etc.
 * Positions are stable - existing piles never move when new ones are added
 */
function getPileGridPosition(pileIndex: number): { x: number; z: number } {
  if (pileIndex === 0) return { x: 0, z: 0 }
  
  // Use spiral pattern for stable positioning
  // Direction order: right, up, left, down (counterclockwise)
  let x = 0
  let z = 0
  let dx = 1
  let dz = 0
  let segmentLength = 1
  let segmentPassed = 0
  let turnsMade = 0
  
  for (let i = 0; i < pileIndex; i++) {
    x += dx
    z += dz
    segmentPassed++
    
    if (segmentPassed === segmentLength) {
      segmentPassed = 0
      // Turn counterclockwise: right -> up -> left -> down
      const temp = dx
      dx = -dz
      dz = temp
      turnsMade++
      
      // Increase segment length every 2 turns
      if (turnsMade % 2 === 0) {
        segmentLength++
      }
    }
  }
  
  return {
    x: x * PILE_SPACING,
    z: z * PILE_SPACING,
  }
}

/**
 * Hook to calculate 3D positions for all bricks
 */
export function useBrickLayout(totalBricks: number): {
  brickPositions: BrickPosition[]
  piles: PileInfo[]
  gridSize: number
} {
  return useMemo(() => {
    const brickPositions: BrickPosition[] = []
    const piles: PileInfo[] = []
    
    if (totalBricks === 0) {
      return { brickPositions, piles, gridSize: 1 }
    }
    
    // Calculate number of piles needed
    const numPiles = Math.ceil(totalBricks / MAX_BRICKS_PER_PILE)
    // For spiral pattern, grid size is based on the outermost ring
    // Ring n contains up to 8n positions, total positions = 1 + 8*(1+2+...+n) = 1 + 4n(n+1)
    // Approximate: gridSize = ceil(sqrt(numPiles)) * 2 for the spiral extent
    const gridSize = Math.ceil(Math.sqrt(numPiles))
    
    let brickId = 0
    let remainingBricks = totalBricks
    
    for (let pileIndex = 0; pileIndex < numPiles; pileIndex++) {
      const { x: gridX, z: gridZ } = getPileGridPosition(pileIndex)
      const bricksInPile = Math.min(remainingBricks, MAX_BRICKS_PER_PILE)
      
      piles.push({
        pileIndex,
        gridX,
        gridZ,
        brickCount: bricksInPile,
      })
      
      for (let brickIndex = 0; brickIndex < bricksInPile; brickIndex++) {
        const isNew = brickId === totalBricks - 1
        
        brickPositions.push({
          id: brickId,
          pileX: gridX,
          pileZ: gridZ,
          brickY: brickIndex * BRICK_HEIGHT,
          isNew,
        })
        
        brickId++
      }
      
      remainingBricks -= bricksInPile
    }
    
    return { brickPositions, piles, gridSize }
  }, [totalBricks])
}

/**
 * Get camera distance based on grid size
 * Base distance is set to capture a full 20-brick pile (10 units tall) + human figure
 */
export function getCameraDistance(gridSize: number): number {
  const baseDistance = 18 // Start far enough to see 20 bricks stacked + reference objects
  const distancePerGrid = 3
  return baseDistance + (gridSize - 1) * distancePerGrid
}
