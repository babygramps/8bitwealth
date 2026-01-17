'use client'

import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BRICK_WIDTH, BRICK_HEIGHT, BRICK_DEPTH } from '@/lib/use-brick-layout'

interface Brick3DProps {
  position: [number, number, number]
  color: number
  isNew?: boolean
}

const Brick3D = memo(function Brick3D({ position, color, isNew = false }: Brick3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const initialY = useRef(position[1] + 5)
  const targetY = useRef(position[1])
  const currentY = useRef(isNew ? position[1] + 5 : position[1])
  const glowIntensity = useRef(isNew ? 1 : 0)

  useFrame((_, delta) => {
    if (!meshRef.current) return

    // Animate drop for new bricks
    if (currentY.current > targetY.current) {
      currentY.current = Math.max(
        targetY.current,
        currentY.current - delta * 15
      )
      meshRef.current.position.y = currentY.current
    }

    // Fade out glow effect
    if (glowIntensity.current > 0) {
      glowIntensity.current = Math.max(0, glowIntensity.current - delta * 2)
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      if (material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = glowIntensity.current
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[position[0], isNew ? position[1] + 5 : position[1], position[2]]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[BRICK_WIDTH * 0.9, BRICK_HEIGHT * 0.9, BRICK_DEPTH * 0.9]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isNew ? 1 : 0}
        roughness={0.8}
        metalness={0.1}
        flatShading
      />
    </mesh>
  )
})

export default Brick3D
