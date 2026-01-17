'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { WealthProfile, getWealthPerMs, calculateBricks } from './wealth-data'

export interface WealthState {
  // Total wealth to display (startingWealth + growth)
  displayWealth: number
  // Starting wealth (frozen at page load)
  startingWealth: number
  // Wealth gained since page load
  growthAmount: number
  // Bricks representing growth (new wealth accumulated since page load)
  growthBricks: number
  // Time elapsed since animation started
  elapsedMs: number
}

export function useWealthAnimation(profile: WealthProfile): WealthState {
  // Lazy state initialization
  const [state, setState] = useState<WealthState>(() => ({
    displayWealth: profile.startingWealth,
    startingWealth: profile.startingWealth,
    growthAmount: 0,
    growthBricks: 0,
    elapsedMs: 0,
  }))

  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const wealthPerMsRef = useRef(getWealthPerMs(profile))
  const startingWealthRef = useRef(profile.startingWealth)

  // Update refs if profile changes
  useEffect(() => {
    wealthPerMsRef.current = getWealthPerMs(profile)
    startingWealthRef.current = profile.startingWealth
    // Reset animation when profile changes
    startTimeRef.current = null
    setState({
      displayWealth: profile.startingWealth,
      startingWealth: profile.startingWealth,
      growthAmount: 0,
      growthBricks: 0,
      elapsedMs: 0,
    })
  }, [profile])

  const animate = useCallback((timestamp: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp
    }

    const elapsedMs = timestamp - startTimeRef.current
    
    // Calculate growth since page load
    const growthAmount = elapsedMs * wealthPerMsRef.current
    
    // Total display wealth = starting + growth
    const displayWealth = startingWealthRef.current + growthAmount
    
    // Growth bricks (new wealth accumulated since page load)
    const growthBricks = calculateBricks(growthAmount, profile.brickValue)

    // Use functional setState to avoid stale closures
    setState(prev => {
      // Only update if bricks changed to reduce re-renders
      if (prev.growthBricks !== growthBricks || Math.floor(prev.elapsedMs / 100) !== Math.floor(elapsedMs / 100)) {
        return {
          displayWealth,
          startingWealth: startingWealthRef.current,
          growthAmount,
          growthBricks,
          elapsedMs,
        }
      }
      return prev
    })

    animationFrameRef.current = requestAnimationFrame(animate)
  }, [profile.brickValue])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animate])

  return state
}
