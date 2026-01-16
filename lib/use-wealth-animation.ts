'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { WealthProfile, getWealthPerMs, calculateBricks } from './wealth-data'

export interface WealthState {
  currentWealth: number
  totalBricks: number
  elapsedMs: number
}

export function useWealthAnimation(profile: WealthProfile): WealthState {
  // Lazy state initialization for expensive calculations
  const [state, setState] = useState<WealthState>(() => ({
    currentWealth: 0,
    totalBricks: 0,
    elapsedMs: 0,
  }))

  const startTimeRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const wealthPerMsRef = useRef(getWealthPerMs(profile))

  // Update wealth per ms if profile changes
  useEffect(() => {
    wealthPerMsRef.current = getWealthPerMs(profile)
  }, [profile])

  const animate = useCallback((timestamp: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp
    }

    const elapsedMs = timestamp - startTimeRef.current
    const currentWealth = elapsedMs * wealthPerMsRef.current
    const totalBricks = calculateBricks(currentWealth, profile.brickValue)

    // Use functional setState to avoid stale closures
    setState(prev => {
      // Only update if bricks changed to reduce re-renders
      if (prev.totalBricks !== totalBricks || Math.floor(prev.elapsedMs / 100) !== Math.floor(elapsedMs / 100)) {
        return {
          currentWealth,
          totalBricks,
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
