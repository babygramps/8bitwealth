'use client'

import { memo, useMemo } from 'react'
import { BRICK_HEIGHT } from '@/lib/use-brick-layout'
import { MAX_BRICKS_PER_PILE } from '@/lib/wealth-data'
import * as THREE from 'three'

interface BrickPile3DProps {
  position: [number, number, number]
  brickCount: number
  color: number
  newestBrickIndex: number
  pileStartIndex: number
}

// Use instanced mesh for performance when pile is static
const BrickPile3D = memo(function BrickPile3D({
  position,
  brickCount,
  color,
  newestBrickIndex,
  pileStartIndex,
}: BrickPile3DProps) {
  // Create geometry and material once
  const geometry = useMemo(() => new THREE.BoxGeometry(0.9, 0.45, 0.45), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true,
      }),
    [color]
  )

  // Glowing material for newest brick
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
        roughness: 0.6,
        metalness: 0.2,
        flatShading: true,
      }),
    [color]
  )

  const bricks = useMemo(() => {
    const result: { y: number; isNew: boolean }[] = []
    for (let i = 0; i < brickCount; i++) {
      const globalIndex = pileStartIndex + i
      result.push({
        y: i * BRICK_HEIGHT,
        isNew: globalIndex === newestBrickIndex,
      })
    }
    return result
  }, [brickCount, pileStartIndex, newestBrickIndex])

  return (
    <group position={position}>
      {bricks.map((brick, index) => (
        <mesh
          key={index}
          position={[0, brick.y + BRICK_HEIGHT / 2, 0]}
          geometry={geometry}
          material={brick.isNew ? glowMaterial : material}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
})

export default BrickPile3D
