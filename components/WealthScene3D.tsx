'use client'

import { memo, Suspense, useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Billboard, Instances, Instance } from '@react-three/drei'
import { WealthProfile, formatCurrency, formatPerSecond, MAX_BRICKS_PER_PILE } from '@/lib/wealth-data'
import { useWealthAnimation } from '@/lib/use-wealth-animation'
import * as THREE from 'three'

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

// Human figure for scale (5'8" = 5.67 feet)
function HumanFigure({ position }: { position: [number, number, number] }) {
  const height = HUMAN_HEIGHT
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
          HUMAN (5'8")
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

// 3D Scene contents
function Scene({ profile, growthBricks, startingWealth }: { profile: WealthProfile; growthBricks: number; startingWealth: number }) {
  // Calculate number of billion dollar cubes (for billionaires)
  const billionCount = Math.floor(startingWealth / 1_000_000_000)
  const isBillionaire = billionCount > 0
  
  // For non-billionaires, show $1K bricks for starting wealth
  const startingBrickCount = isBillionaire ? 0 : Math.floor(startingWealth / 1000)
  
  // Calculate grid dimensions
  const gridWidth = isBillionaire 
    ? Math.min(billionCount, 5) * BILLION_CUBE_SIZE * 1.3
    : Math.min(Math.ceil(startingBrickCount / 50), 10) * THOUSAND_BRICK.width * 1.2
  
  // Camera distance based on content - human is at center (0,0,0)
  const cameraDistance = isBillionaire 
    ? Math.max(30, billionCount * 5, gridWidth * 1.5)
    : Math.max(15, gridWidth * 3)
  const groundSize = isBillionaire 
    ? Math.max(100, gridWidth * 2, billionCount * 15)
    : Math.max(30, gridWidth * 4)

  // Wealth display position (to the LEFT of the human, who is at center)
  const wealthX = isBillionaire ? -(gridWidth / 2 + 15) : -(gridWidth / 2 + 3)
  
  return (
    <>
      {/* Camera - looking at human at origin */}
      <PerspectiveCamera
        makeDefault
        position={[cameraDistance * 0.7, cameraDistance * 0.4, cameraDistance * 0.7]}
        fov={50}
      />
      
      {/* Controls - orbit around origin (human) */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        minDistance={2}
        maxDistance={500}
        maxPolarAngle={Math.PI / 2.1}
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
      <HumanFigure position={[0, 0, 0]} />
      
      {/* Growth pile next to human (to the right) */}
      {growthBricks > 0 && (
        <ThousandDollarPile
          position={[HUMAN_HEIGHT * 0.8, 0, 0]}
          count={growthBricks}
          newestIndex={growthBricks - 1}
          label={`+$${(growthBricks * 1000).toLocaleString()}`}
          labelColor="#00ff00"
        />
      )}
      
      {/* Reference $1K brick with label (behind the human) */}
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
  const { displayWealth, startingWealth, growthAmount, growthBricks } = useWealthAnimation(profile)

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
          +{formatCurrency(growthAmount)} (+{growthBricks.toLocaleString()} x $1K)
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="w-full h-[400px] md:h-[500px] pixel-border-dark bg-nes-black/50 rounded overflow-hidden">
        <Canvas shadows>
          <Suspense fallback={null}>
            <Scene profile={profile} growthBricks={growthBricks} startingWealth={startingWealth} />
          </Suspense>
        </Canvas>
      </div>

      {/* Legend */}
      <div className="mt-2 text-[6px] text-nes-gray text-center">
        Giant cubes = $1B each | Brick stacks = $1K each (10 x $100 bills) | All real scale!
      </div>
    </div>
  )
})

export default WealthScene3D
