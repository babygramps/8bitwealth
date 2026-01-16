'use client'

import { memo } from 'react'

interface BrickProps {
  color: string
  isNew?: boolean
  style?: React.CSSProperties
}

// Memoized brick component to prevent unnecessary re-renders
const Brick = memo(function Brick({ color, isNew = false, style }: BrickProps) {
  return (
    <div
      className={`
        brick
        ${color}
        ${isNew ? 'animate-brick-drop brick-new' : ''}
      `}
      style={style}
    />
  )
})

export default Brick
