'use client'

import { useState, useEffect } from 'react'

interface Star {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

// Generate stars with a seeded random to ensure consistency
function generateStars(): Star[] {
  const starArray: Star[] = []
  for (let i = 0; i < 100; i++) {
    // Use a simple seeded pseudo-random based on index for deterministic results
    const seed1 = Math.sin(i * 12.9898) * 43758.5453
    const seed2 = Math.sin(i * 78.233) * 43758.5453
    const seed3 = Math.sin(i * 43.758) * 43758.5453
    const seed4 = Math.sin(i * 93.989) * 43758.5453
    const seed5 = Math.sin(i * 27.695) * 43758.5453
    
    starArray.push({
      id: i,
      x: (seed1 - Math.floor(seed1)) * 100,
      y: (seed2 - Math.floor(seed2)) * 100,
      size: (seed3 - Math.floor(seed3)) * 2 + 1,
      delay: (seed4 - Math.floor(seed4)) * 4,
      duration: (seed5 - Math.floor(seed5)) * 2 + 3,
    })
  }
  return starArray
}

export default function Starfield() {
  // Only generate stars on client to avoid hydration mismatch
  const [stars, setStars] = useState<Star[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setStars(generateStars())
    setMounted(true)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-nes-black via-nes-darkgray to-nes-black" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Stars - only render on client to avoid hydration mismatch */}
      {mounted && stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-nes-white animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
      
      {/* Occasional larger "planet" stars */}
      <div 
        className="absolute w-3 h-3 rounded-full bg-nes-cyan animate-pulse-glow"
        style={{ left: '15%', top: '20%' }}
      />
      <div 
        className="absolute w-2 h-2 rounded-full bg-nes-pink animate-pulse-glow"
        style={{ left: '80%', top: '35%', animationDelay: '1s' }}
      />
      <div 
        className="absolute w-2 h-2 rounded-full bg-nes-gold animate-pulse-glow"
        style={{ left: '60%', top: '15%', animationDelay: '2s' }}
      />
    </div>
  )
}
