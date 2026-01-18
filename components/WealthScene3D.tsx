'use client'

import { memo, Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Billboard, Instances, Instance, Cylinder } from '@react-three/drei'
import { WealthProfile, formatCurrency, formatPerSecond, MAX_BRICKS_PER_PILE } from '@/lib/wealth-data'
import { useWealthAnimation } from '@/lib/use-wealth-animation'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

interface WealthScene3DProps {
  profile: WealthProfile
}

// REAL SCALE CALCULATIONS
// $100 bill: 6.14" x 2.61" x 0.0043"
// Converting to units where 1 unit = 1 foot for easier human scale
// Bill in feet: 0.512' x 0.218' x 0.000358'
// 
// $1,000 = 10 bills stacked = 0.512' x 0.218' x 0.00358' (very thin!)
// $1,000,000 = 10,000 bills = 0.512' x 0.218' x 3.58' (about 3.5 feet tall)
// $1,000,000,000 = 10,000,000 bills = would be 3,583 feet tall if stacked!
//
// Better approach: Cube of bills
// A pallet of cash is typically 4' x 4' x 4' and holds about $100M
// So $1B = 10 pallets worth
// We'll represent $1B as a large cube approximately 8.5' x 8.5' x 8.5' (about 2.5x human height)

const UNIT_SCALE = 1 // 1 unit = 1 foot
const HUMAN_HEIGHT = 5.67 * UNIT_SCALE // 5'8" in units
const BILL_LENGTH = 0.512 * UNIT_SCALE
const BILL_WIDTH = 0.218 * UNIT_SCALE
const BILL_THICKNESS = 0.000358 * UNIT_SCALE

// $1,000 brick dimensions (10 $100 bills stacked)
const THOUSAND_BRICK = {
  width: BILL_LENGTH,
  depth: BILL_WIDTH,
  height: BILL_THICKNESS * 10,
}

// $1B cube - a cube of bills (approximately 10 pallets worth)
// Real: about 8.5' x 8.5' x 8.5' for $1B in $100 bills bundled
const BILLION_CUBE_SIZE = 8.5 * UNIT_SCALE

// Ground plane component
function Ground({ size }: { size: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={0x1a1a2e} roughness={1} metalness={0} />
    </mesh>
  )
}

// Heights in feet
const AVERAGE_HUMAN_HEIGHT = 5.67 * UNIT_SCALE // 5'8" average
const ELON_MUSK_HEIGHT = 6.17 * UNIT_SCALE // 6'2"

// Human figure for scale - can be customized with name and height
function HumanFigure({ 
  position, 
  name = "HUMAN",
  heightFeet = 5.67,
  heightLabel = "5'8\""
}: { 
  position: [number, number, number]
  name?: string
  heightFeet?: number
  heightLabel?: string
}) {
  const height = heightFeet * UNIT_SCALE
  const headRadius = height * 0.07
  const bodyHeight = height * 0.35
  const legHeight = height * 0.45
  const armLength = height * 0.30
  const bodyWidth = height * 0.15

  return (
    <group position={position}>
      {/* Head */}
      <mesh position={[0, height - headRadius, 0]} castShadow>
        <sphereGeometry args={[headRadius, 8, 8]} />
        <meshStandardMaterial color={0xffcc99} flatShading />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, height - headRadius * 2 - bodyHeight / 2, 0]} castShadow>
        <boxGeometry args={[bodyWidth, bodyHeight, bodyWidth * 0.5]} />
        <meshStandardMaterial color={0x4488ff} flatShading />
      </mesh>
      
      {/* Left Leg */}
      <mesh position={[-bodyWidth * 0.25, legHeight / 2, 0]} castShadow>
        <boxGeometry args={[bodyWidth * 0.35, legHeight, bodyWidth * 0.35]} />
        <meshStandardMaterial color={0x333366} flatShading />
      </mesh>
      
      {/* Right Leg */}
      <mesh position={[bodyWidth * 0.25, legHeight / 2, 0]} castShadow>
        <boxGeometry args={[bodyWidth * 0.35, legHeight, bodyWidth * 0.35]} />
        <meshStandardMaterial color={0x333366} flatShading />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-bodyWidth * 0.7, height - headRadius * 2 - bodyHeight / 2, 0]} castShadow>
        <boxGeometry args={[bodyWidth * 0.25, armLength, bodyWidth * 0.25]} />
        <meshStandardMaterial color={0xffcc99} flatShading />
      </mesh>
      <mesh position={[bodyWidth * 0.7, height - headRadius * 2 - bodyHeight / 2, 0]} castShadow>
        <boxGeometry args={[bodyWidth * 0.25, armLength, bodyWidth * 0.25]} />
        <meshStandardMaterial color={0xffcc99} flatShading />
      </mesh>
      
      {/* Label */}
      <Billboard position={[0, height + 0.8, 0]}>
        <Text
          fontSize={0.4}
          color="#fcfcfc"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {name} ({heightLabel})
        </Text>
      </Billboard>
    </group>
  )
}

// $1,000 brick (10 x $100 bills stacked) - properly scaled
function ThousandDollarBrick({ position, isGlowing = false }: { position: [number, number, number]; isGlowing?: boolean }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[THOUSAND_BRICK.width, THOUSAND_BRICK.height, THOUSAND_BRICK.depth]} />
      <meshStandardMaterial 
        color={0x00aa00} 
        flatShading 
        emissive={isGlowing ? 0x00ff00 : 0x000000}
        emissiveIntensity={isGlowing ? 0.5 : 0}
      />
    </mesh>
  )
}

// Stack of $1,000 bricks (for the growth visualization near the human)
function ThousandDollarPile({ 
  position, 
  count, 
  newestIndex,
  label,
  labelColor = "#00e436"
}: { 
  position: [number, number, number]
  count: number
  newestIndex: number
  label?: string
  labelColor?: string
}) {
  // Stack bricks vertically, then expand outward
  const maxPerStack = 20
  const bricks = useMemo(() => {
    const result = []
    for (let i = 0; i < count; i++) {
      const stackIndex = Math.floor(i / maxPerStack)
      const heightIndex = i % maxPerStack
      
      // Spiral pattern for stacks
      const angle = stackIndex * (Math.PI / 4)
      const radius = stackIndex === 0 ? 0 : THOUSAND_BRICK.width * 1.5
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = THOUSAND_BRICK.height * (heightIndex + 0.5)
      
      result.push({ x, y, z, index: i })
    }
    return result
  }, [count])

  const pileHeight = Math.min(count, maxPerStack) * THOUSAND_BRICK.height

  return (
    <group position={position}>
      {bricks.map((brick) => (
        <ThousandDollarBrick
          key={brick.index}
          position={[brick.x, brick.y, brick.z]}
          isGlowing={brick.index === newestIndex}
        />
      ))}
      
      {/* Label */}
      {count > 0 && (
        <Billboard position={[0, pileHeight + 0.5, 0]}>
          <Text
            fontSize={0.3}
            color={labelColor}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {label || `$${(count * 1000).toLocaleString()}`}
          </Text>
          <Text
            fontSize={0.15}
            color="#888888"
            anchorX="center"
            anchorY="top"
            position={[0, -0.05, 0]}
          >
            {count.toLocaleString()} x $1K bricks
          </Text>
        </Billboard>
      )}
    </group>
  )
}

// Penny dimensions (real scale: 0.75" diameter, 0.0598" thick)
const PENNY_RADIUS = (0.75 / 12 / 2) * UNIT_SCALE // ~0.03125 feet radius
const PENNY_THICKNESS = (0.0598 / 12) * UNIT_SCALE // ~0.005 feet

// Single animated penny that falls flat (horizontally) and lands on the pile
// Only animates when triggered by a new penny being earned
function FallingPenny({ 
  startY = 3,
  endY = 0,
  duration = 1.5,
  trigger = 0, // Changes when a new penny should fall
}: { 
  startY?: number
  endY?: number
  duration?: number
  trigger?: number // Penny count - animation triggers when this increases
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [visible, setVisible] = useState(false)
  const startTime = useRef(0)
  const lastTrigger = useRef(trigger)
  
  
  // Trigger animation when penny count increases
  useEffect(() => {
    if (trigger > lastTrigger.current) {
      lastTrigger.current = trigger
      setVisible(true)
      setIsAnimating(true)
      startTime.current = 0
    }
  }, [trigger])
  
  useFrame((state) => {
    if (!meshRef.current || !isAnimating) return
    
    if (startTime.current === 0) {
      startTime.current = state.clock.elapsedTime
    }
    
    const elapsed = state.clock.elapsedTime - startTime.current
    const progress = Math.min(elapsed / duration, 1)
    
    // Eased fall with bounce effect
    let easeProgress: number
    if (progress < 0.7) {
      // Accelerating fall
      easeProgress = (progress / 0.7) * (progress / 0.7)
    } else {
      // Slight bounce at the end
      const bounceProgress = (progress - 0.7) / 0.3
      const bounce = Math.sin(bounceProgress * Math.PI) * 0.02 // Small bounce
      easeProgress = 1 - bounce
    }
    
    const y = startY - (startY - endY) * Math.min(easeProgress, 1)
    
    // Penny spins around Y axis while falling flat (stays horizontal)
    const spinRotation = progress * Math.PI * 4 // 2 full spins
    
    meshRef.current.position.y = y
    meshRef.current.rotation.y = spinRotation
    
    // Animation complete - hide penny until next trigger
    if (progress >= 1) {
      setIsAnimating(false)
      setVisible(false)
    }
  })
  
  // Penny lies flat (cylinder axis is vertical, so no rotation needed for flat orientation)
  // Only visible during animation
  if (!visible) return null
  
  return (
    <mesh ref={meshRef} position={[0, startY, 0]}>
      <cylinderGeometry args={[PENNY_RADIUS, PENNY_RADIUS, PENNY_THICKNESS, 16]} />
      <meshStandardMaterial 
        color={0xb87333} // Copper color
        metalness={0.7}
        roughness={0.2}
        emissive={0xffaa44} // Warm orange glow
        emissiveIntensity={0.8} // Strong glow for visibility
      />
    </mesh>
  )
}

// Penny pile that grows over time - neat vertical stack
function PennyPile({ 
  position,
  count
}: { 
  position: [number, number, number]
  count: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  // Stack pennies neatly in vertical columns
  // When one column gets too tall, start a new one next to it
  const maxPenniesPerStack = 100 // About 0.5 feet tall
  
  // Calculate penny positions - neat stacks
  const pennyPositions = useMemo(() => {
    const result = []
    
    for (let i = 0; i < count; i++) {
      const stackIndex = Math.floor(i / maxPenniesPerStack)
      const pennyInStack = i % maxPenniesPerStack
      
      // Arrange stacks in a row
      const x = stackIndex * (PENNY_RADIUS * 2.2)
      const y = pennyInStack * PENNY_THICKNESS + PENNY_THICKNESS / 2
      const z = 0
      
      result.push({ x, y, z })
    }
    return result
  }, [count])
  
  // Update instance matrices
  useEffect(() => {
    if (!meshRef.current || pennyPositions.length === 0) return
    
    const tempMatrix = new THREE.Matrix4()
    // No rotation needed - cylinder already stands upright (flat penny)
    const quaternion = new THREE.Quaternion()
    
    pennyPositions.forEach((pos, i) => {
      tempMatrix.compose(
        new THREE.Vector3(pos.x, pos.y, pos.z),
        quaternion,
        new THREE.Vector3(1, 1, 1)
      )
      meshRef.current!.setMatrixAt(i, tempMatrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [pennyPositions])
  
  // Calculate pile height (height of tallest stack)
  const currentStackPennies = count % maxPenniesPerStack || (count > 0 ? maxPenniesPerStack : 0)
  const pileHeight = currentStackPennies * PENNY_THICKNESS
  
  // X position for falling penny (lands on current stack)
  const currentStackIndex = count > 0 ? Math.floor((count - 1) / maxPenniesPerStack) : 0
  const fallingPennyX = currentStackIndex * (PENNY_RADIUS * 2.2)
  
  return (
    <group position={position}>
      {/* Pile of pennies - neat stacks */}
      {count > 0 && (
        <instancedMesh 
          ref={meshRef} 
          args={[undefined, undefined, count]}
          castShadow
        >
          <cylinderGeometry args={[PENNY_RADIUS, PENNY_RADIUS, PENNY_THICKNESS, 16]} />
          <meshStandardMaterial 
            color={0xb87333} // Copper color
            metalness={0.7}
            roughness={0.2}
            emissive={0xdd8833} // Warm copper glow
            emissiveIntensity={0.5} // Visible glow on pile
          />
        </instancedMesh>
      )}
      
      {/* Falling penny animation - only triggers when count increases */}
      <group position={[fallingPennyX, 0, 0]}>
        <FallingPenny 
          startY={2}
          endY={pileHeight + PENNY_THICKNESS / 2}
          duration={1.2}
          trigger={count}
        />
      </group>
      
      {/* Subtle point light to make penny pile glow */}
      <pointLight
        position={[0, pileHeight + 0.5, 0.5]}
        color={0xffaa44}
        intensity={0.8}
        distance={3}
        decay={2}
      />
      
      {/* Label */}
      <Billboard position={[0, pileHeight + 1, 0]}>
        <Text
          fontSize={0.3}
          color="#b87333"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {count} pennies
        </Text>
        <Text
          fontSize={0.15}
          color="#888888"
          anchorX="center"
          anchorY="top"
          position={[0, -0.05, 0]}
        >
          ${(count * 0.01).toFixed(2)}
        </Text>
      </Billboard>
    </group>
  )
}

// INSTANCED grid of $1K bricks for starting wealth (non-billionaires)
function StartingWealthBrickGrid({ 
  position,
  wealthAmount,
  color
}: { 
  position: [number, number, number]
  wealthAmount: number
  color: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const brickCount = Math.floor(wealthAmount / 1000)
  
  // Arrange in stacked columns - more compact visualization
  const bricksPerColumn = 50
  const columnsPerRow = 10
  const columnSpacing = THOUSAND_BRICK.width * 1.2
  const rowSpacing = THOUSAND_BRICK.depth * 1.5
  
  const brickPositions = useMemo(() => {
    const result = []
    for (let i = 0; i < brickCount; i++) {
      const columnIndex = Math.floor(i / bricksPerColumn)
      const heightIndex = i % bricksPerColumn
      
      const row = Math.floor(columnIndex / columnsPerRow)
      const col = columnIndex % columnsPerRow
      
      const totalCols = Math.min(Math.ceil(brickCount / bricksPerColumn), columnsPerRow)
      const offsetX = (totalCols - 1) * columnSpacing / 2
      
      const x = col * columnSpacing - offsetX
      const z = row * rowSpacing
      const y = THOUSAND_BRICK.height * (heightIndex + 0.5)
      
      result.push({ x, y, z })
    }
    return result
  }, [brickCount])

  // Set up instance matrices
  useEffect(() => {
    if (!meshRef.current || brickPositions.length === 0) return
    
    const tempMatrix = new THREE.Matrix4()
    brickPositions.forEach((pos, i) => {
      tempMatrix.setPosition(pos.x, pos.y, pos.z)
      meshRef.current!.setMatrixAt(i, tempMatrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [brickPositions])

  const maxHeight = Math.min(brickCount, bricksPerColumn) * THOUSAND_BRICK.height

  if (brickCount === 0) return null

  return (
    <group position={position}>
      {/* Single instanced mesh for ALL bricks - huge performance boost */}
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, brickCount]}
        castShadow
      >
        <boxGeometry args={[THOUSAND_BRICK.width, THOUSAND_BRICK.height, THOUSAND_BRICK.depth]} />
        <meshStandardMaterial color={color} flatShading />
      </instancedMesh>
      
      {/* Label */}
      <Billboard position={[0, maxHeight + 0.8, 0]}>
        <Text
          fontSize={0.5}
          color="#ffd700"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          ${wealthAmount.toLocaleString()}
        </Text>
        <Text
          fontSize={0.2}
          color="#888888"
          anchorX="center"
          anchorY="top"
          position={[0, -0.05, 0]}
        >
          ({brickCount.toLocaleString()} x $1K bricks)
        </Text>
      </Billboard>
    </group>
  )
}

// $1 Billion cube - massive stack of $100 bills
function BillionDollarCube({ 
  position, 
  color,
  billionNumber
}: { 
  position: [number, number, number]
  color: number
  billionNumber: number
}) {
  const size = BILLION_CUBE_SIZE
  
  return (
    <group position={position}>
      {/* Main cube */}
      <mesh position={[0, size / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial 
          color={0x00aa00} 
          flatShading 
        />
      </mesh>
      
      {/* Colored band to identify owner */}
      <mesh position={[0, size / 2, size / 2 + 0.05]} castShadow>
        <boxGeometry args={[size, size * 0.2, 0.1]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      
      {/* "$1B" label on front */}
      <Billboard position={[0, size / 2, size / 2 + 0.2]}>
        <Text
          fontSize={size * 0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          $1B
        </Text>
      </Billboard>
      
      {/* Number label on top */}
      <Billboard position={[0, size + 0.3, 0]}>
        <Text
          fontSize={0.5}
          color="#ffd700"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          #{billionNumber}
        </Text>
      </Billboard>
    </group>
  )
}

// INSTANCED Grid of billion dollar cubes - much more performant!
// Uses a single draw call for all cubes instead of one per cube
function BillionCubeGridInstanced({ 
  billionCount, 
  color 
}: { 
  billionCount: number
  color: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const size = BILLION_CUBE_SIZE
  const spacing = size * 1.3
  const maxPerRow = 5
  
  // Calculate positions for all cubes
  const positions = useMemo(() => {
    const result = []
    for (let i = 0; i < billionCount; i++) {
      const row = Math.floor(i / maxPerRow)
      const col = i % maxPerRow
      const offsetX = ((billionCount > maxPerRow ? maxPerRow : billionCount) - 1) * spacing / 2
      const x = col * spacing - offsetX
      const z = row * spacing
      result.push({ x, y: size / 2, z, index: i + 1 })
    }
    return result
  }, [billionCount, spacing])

  // Set up instance matrices
  useEffect(() => {
    if (!meshRef.current) return
    
    const tempMatrix = new THREE.Matrix4()
    positions.forEach((pos, i) => {
      tempMatrix.setPosition(pos.x, pos.y, pos.z)
      meshRef.current!.setMatrixAt(i, tempMatrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions])

  return (
    <group>
      {/* Instanced cubes - single draw call for ALL cubes */}
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, billionCount]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial color={0x00aa00} flatShading />
      </instancedMesh>
      
      {/* Colored bands on front - also instanced */}
      <BillionCubeBands positions={positions} color={color} />
      
      {/* Only show labels for first few and last cube to reduce text rendering */}
      <BillionCubeLabels positions={positions} billionCount={billionCount} />
    </group>
  )
}

// Instanced colored bands for billion cubes
function BillionCubeBands({ 
  positions, 
  color 
}: { 
  positions: { x: number; y: number; z: number; index: number }[]
  color: number
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const size = BILLION_CUBE_SIZE

  useEffect(() => {
    if (!meshRef.current) return
    
    const tempMatrix = new THREE.Matrix4()
    positions.forEach((pos, i) => {
      tempMatrix.setPosition(pos.x, pos.y, pos.z + size / 2 + 0.05)
      meshRef.current!.setMatrixAt(i, tempMatrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions])

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, positions.length]}
      castShadow
    >
      <boxGeometry args={[size, size * 0.2, 0.1]} />
      <meshStandardMaterial color={color} flatShading />
    </instancedMesh>
  )
}

// Labels for billion cubes - only show a few to reduce rendering cost
function BillionCubeLabels({ 
  positions, 
  billionCount 
}: { 
  positions: { x: number; y: number; z: number; index: number }[]
  billionCount: number
}) {
  const size = BILLION_CUBE_SIZE
  
  // Only show labels for: first 3, every 50th, and last cube
  const labeledPositions = useMemo(() => {
    return positions.filter((pos) => {
      if (pos.index <= 3) return true // First 3
      if (pos.index === billionCount) return true // Last
      if (pos.index % 50 === 0) return true // Every 50th
      return false
    })
  }, [positions, billionCount])

  return (
    <>
      {labeledPositions.map((pos) => (
        <Billboard key={pos.index} position={[pos.x, size + 0.3, pos.z]}>
          <Text
            fontSize={0.5}
            color="#ffd700"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            #{pos.index}
          </Text>
        </Billboard>
      ))}
      
      {/* Single "$1B" label in the center */}
      {positions.length > 0 && (
        <Billboard position={[0, size / 2, positions[0].z + size / 2 + 0.5]}>
          <Text
            fontSize={size * 0.2}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            $1B each
          </Text>
        </Billboard>
      )}
    </>
  )
}

// Camera controller component with reset functionality
function CameraController({ 
  controlsRef, 
  cameraDistance,
  resetTrigger,
  cameraTargetX = 0,
  cameraTargetY = HUMAN_HEIGHT / 2,
  isBillionaire = true
}: { 
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  cameraDistance: number
  resetTrigger: number
  cameraTargetX?: number
  cameraTargetY?: number
  isBillionaire?: boolean
}) {
  const { camera } = useThree()
  
  // Set initial camera position AND target on mount
  useEffect(() => {
    // Set camera POSITION on mount (not just target)
    if (isBillionaire) {
      camera.position.set(
        cameraDistance * 0.7,
        cameraDistance * 0.4,
        cameraDistance * 0.7
      )
    } else {
      // Average household: show full person with penny pile
      camera.position.set(
        cameraDistance * 0.6,
        cameraDistance * 0.35,
        cameraDistance * 0.6
      )
    }
    
    if (controlsRef.current) {
      controlsRef.current.target.set(cameraTargetX, cameraTargetY, 0)
      controlsRef.current.update()
    }
  }, [controlsRef, cameraTargetX, cameraTargetY, camera, cameraDistance, isBillionaire])
  
  // Reset camera when trigger changes
  useEffect(() => {
    if (resetTrigger > 0 && controlsRef.current) {
      // Reset camera position based on view type
      if (isBillionaire) {
        camera.position.set(
          cameraDistance * 0.7,
          cameraDistance * 0.4,
          cameraDistance * 0.7
        )
      } else {
        // Average household: show full person with penny pile
        camera.position.set(
          cameraDistance * 0.6,
          cameraDistance * 0.35,
          cameraDistance * 0.6
        )
      }
      // Reset target
      controlsRef.current.target.set(cameraTargetX, cameraTargetY, 0)
      controlsRef.current.update()
    }
  }, [resetTrigger, camera, cameraDistance, controlsRef, cameraTargetX, cameraTargetY, isBillionaire])
  
  return null
}

// 3D Scene contents
function Scene({ 
  profile, 
  growthBricks, 
  growthPennies,
  startingWealth,
  controlsRef,
  resetTrigger
}: { 
  profile: WealthProfile
  growthBricks: number
  growthPennies: number
  startingWealth: number
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  resetTrigger: number
}) {
  // Calculate number of billion dollar cubes (for billionaires)
  const billionCount = Math.floor(startingWealth / 1_000_000_000)
  const isBillionaire = billionCount > 0
  
  // For non-billionaires, show $1K bricks for starting wealth
  const startingBrickCount = isBillionaire ? 0 : Math.floor(startingWealth / 1000)
  
  // Calculate grid dimensions
  const gridWidth = isBillionaire 
    ? Math.min(billionCount, 5) * BILLION_CUBE_SIZE * 1.3
    : Math.min(Math.ceil(startingBrickCount / 50), 10) * THOUSAND_BRICK.width * 1.2
  
  // Camera distance - different for billionaire vs average household
  // Billionaire: focused on human, user can zoom out to see wealth cubes
  // Average household: zoomed in showing full person with penny pile visible
  const cameraDistance = isBillionaire ? 15 : 12 // Show full person for average household
  const groundSize = isBillionaire 
    ? Math.max(100, gridWidth * 2, billionCount * 15)
    : Math.max(30, gridWidth * 4)
  
  // Camera target position - where the camera looks at
  // For average household, look at about waist height to show both person and penny pile
  const cameraTargetY = isBillionaire ? HUMAN_HEIGHT * 0.5 : HUMAN_HEIGHT * 0.4
  const cameraTargetX = isBillionaire ? 0 : HUMAN_HEIGHT * 0.3 // Slight offset toward penny pile

  // Wealth display position (to the LEFT of the human, who is at center)
  const wealthX = isBillionaire ? -(gridWidth / 2 + 15) : -(gridWidth / 2 + 3)
  
  return (
    <>
      {/* Camera controller for reset functionality */}
      <CameraController 
        controlsRef={controlsRef} 
        cameraDistance={cameraDistance}
        resetTrigger={resetTrigger}
        cameraTargetX={cameraTargetX}
        cameraTargetY={cameraTargetY}
        isBillionaire={isBillionaire}
      />
      
      {/* Camera - positioned based on view type */}
      <PerspectiveCamera
        makeDefault
        position={
          isBillionaire 
            ? [cameraDistance * 0.7, cameraDistance * 0.4, cameraDistance * 0.7]
            : [cameraDistance * 0.6, cameraDistance * 0.35, cameraDistance * 0.6]
        }
        fov={50}
      />
      
      {/* Controls - full 3D navigation, mobile-friendly */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        // Allow full rotation (no polar angle limit so user can look from below)
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        // Zoom limits
        minDistance={1}
        maxDistance={1000}
        // Pan settings - screen space panning is more intuitive
        screenSpacePanning={true}
        panSpeed={1.5}
        // Rotation speed
        rotateSpeed={0.8}
        // Zoom speed
        zoomSpeed={1.2}
        // Touch settings for mobile
        touches={{
          ONE: THREE.TOUCH.ROTATE,   // One finger = rotate
          TWO: THREE.TOUCH.DOLLY_PAN // Two fingers = zoom + pan
        }}
        // Mouse buttons
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
        // Smooth damping for better feel
        enableDamping={true}
        dampingFactor={0.1}
        // Initial target (human center)
        target={[0, HUMAN_HEIGHT / 2, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      <pointLight position={[-50, 50, -50]} intensity={0.3} color={profile.hexColor} />

      {/* Ground */}
      <Ground size={groundSize} />

      {/* Human figure at CENTER (origin) */}
      <HumanFigure 
        position={[0, 0, 0]} 
        name={isBillionaire ? profile.name.split(' ')[0].toUpperCase() + ' ' + profile.name.split(' ').slice(1).join(' ').toUpperCase() : "AVG AMERICAN"}
        heightFeet={isBillionaire ? 6.17 : 5.67}
        heightLabel={isBillionaire ? "6'2\"" : "5'8\""}
      />
      
      {/* Growth visualization - different for billionaires vs average household */}
      {isBillionaire ? (
        // Billionaires: Show $1K brick pile (grows fast)
        growthBricks > 0 && (
          <ThousandDollarPile
            position={[HUMAN_HEIGHT * 0.8, 0, 0]}
            count={growthBricks}
            newestIndex={growthBricks - 1}
            label={`+$${(growthBricks * 1000).toLocaleString()}`}
            labelColor="#00ff00"
          />
        )
      ) : (
        // Average household: Show penny pile with falling animation (grows slow)
        <PennyPile
          position={[HUMAN_HEIGHT * 0.8, 0, 0]}
          count={growthPennies}
        />
      )}
      
      {/* Reference $1K brick with label (behind the human) - only for billionaires */}
      {isBillionaire && (
        <group position={[0, 0, -HUMAN_HEIGHT * 0.5]}>
          <ThousandDollarBrick position={[0, THOUSAND_BRICK.height / 2, 0]} />
          <Billboard position={[0, THOUSAND_BRICK.height + 0.4, 0]}>
            <Text
              fontSize={0.25}
              color="#00e436"
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.01}
              outlineColor="#000000"
            >
              $1,000
            </Text>
            <Text
              fontSize={0.12}
              color="#666666"
              anchorX="center"
              anchorY="top"
              position={[0, -0.03, 0]}
            >
              (10 x $100 bills)
            </Text>
          </Billboard>
        </group>
      )}

      {/* Billion dollar cubes showing net worth (for billionaires) - to the LEFT */}
      {/* Uses INSTANCED rendering for massive performance boost */}
      {isBillionaire && (
        <group position={[wealthX, 0, 0]}>
          <BillionCubeGridInstanced billionCount={billionCount} color={profile.hexColor} />
          
          {/* Total label */}
          <Billboard position={[0, BILLION_CUBE_SIZE + 3, -BILLION_CUBE_SIZE]}>
            <Text
              fontSize={1.5}
              color={profile.accentColor}
              anchorX="center"
              anchorY="bottom"
              outlineWidth={0.05}
              outlineColor="#000000"
            >
              {formatCurrency(startingWealth)}
            </Text>
            <Text
              fontSize={0.6}
              color="#888888"
              anchorX="center"
              anchorY="top"
              position={[0, -0.1, 0]}
            >
              ({billionCount} billion dollar cubes)
            </Text>
          </Billboard>
        </group>
      )}

      {/* $1K brick grid for starting wealth (for non-billionaires) - to the LEFT */}
      {!isBillionaire && startingBrickCount > 0 && (
        <StartingWealthBrickGrid
          position={[wealthX, 0, 0]}
          wealthAmount={startingWealth}
          color={profile.hexColor}
        />
      )}

      {/* Grid helper */}
      <gridHelper args={[groundSize, Math.floor(groundSize / 10)]} position={[0, 0.01, 0]} />
    </>
  )
}

// Main component with Canvas wrapper
const WealthScene3D = memo(function WealthScene3D({ profile }: WealthScene3DProps) {
  const { displayWealth, startingWealth, growthAmount, growthBricks, growthPennies } = useWealthAnimation(profile)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const [resetTrigger, setResetTrigger] = useState(0)
  
  const handleResetView = useCallback(() => {
    setResetTrigger(prev => prev + 1)
  }, [])
  
  // Check if billionaire based on starting wealth
  const isBillionaire = startingWealth >= 1_000_000_000

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
        {profile.isLiveData && (
          <span className="text-[5px] text-nes-green ml-1">● LIVE</span>
        )}
      </div>

      {/* Wealth stats */}
      <div className="text-center mb-4 space-y-1">
        <div className="text-[8px] md:text-[10px] text-nes-gold">
          {formatCurrency(displayWealth)}
        </div>
        <div className="text-[6px] md:text-[8px] text-nes-gray">
          {formatPerSecond(profile.dailyIncrease)}
        </div>
        <div className="text-[6px] md:text-[8px] text-nes-cyan">
          {isBillionaire ? (
            <>+{formatCurrency(growthAmount)} (+{growthBricks.toLocaleString()} x $1K)</>
          ) : (
            <>+{formatCurrency(growthAmount)} (+{growthPennies.toLocaleString()} pennies)</>
          )}
        </div>
      </div>

      {/* 3D Canvas with reset button */}
      <div className="relative w-full h-[400px] md:h-[500px] pixel-border-dark bg-nes-black/50 rounded overflow-hidden">
        {/* Reset View Button */}
        <button
          onClick={handleResetView}
          className="absolute top-2 right-2 z-10 px-2 py-1 bg-nes-darkgray/90 hover:bg-nes-gray/90 border border-nes-gray rounded text-[8px] text-nes-cyan transition-colors active:scale-95"
          title="Reset camera to center on human"
        >
          🏠 Reset View
        </button>
        
        <Canvas shadows>
          <Suspense fallback={null}>
            <Scene 
              profile={profile} 
              growthBricks={growthBricks}
              growthPennies={growthPennies}
              startingWealth={startingWealth}
              controlsRef={controlsRef}
              resetTrigger={resetTrigger}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Legend and controls hint */}
      <div className="mt-2 text-[6px] text-nes-gray text-center space-y-1">
        <div>Giant cubes = $1B each | Brick stacks = $1K each (10 x $100 bills) | All real scale!</div>
        <div className="text-[5px] text-nes-cyan">
          🖱️ Drag to rotate | Right-click drag to pan | Scroll to zoom | 📱 1 finger rotate, 2 fingers pan/zoom
        </div>
      </div>
    </div>
  )
})

export default WealthScene3D
