'use client'

// Static JSX hoisted outside component for performance
const titleElement = (
  <h1 className="text-xl md:text-3xl text-nes-gold text-glow tracking-wider">
    💰 8-BIT WEALTH 💰
  </h1>
)

const subtitleElement = (
  <p className="text-[8px] md:text-xs text-nes-gray mt-2">
    BILLIONAIRES VS AVERAGE AMERICANS
  </p>
)

interface HeaderProps {
  onOpenDataSources?: () => void
}

export default function Header({ onOpenDataSources }: HeaderProps) {
  return (
    <header className="relative py-6 md:py-8 text-center border-b-4 border-nes-gray">
      <div className="relative z-10">
        {titleElement}
        {subtitleElement}

        {onOpenDataSources && (
          <div className="mt-4">
            <button
              onClick={onOpenDataSources}
              className="text-[8px] text-nes-cyan hover:text-nes-white border-2 border-nes-cyan px-2 py-1 hover:bg-nes-cyan/20 transition-colors font-pixel"
            >
              💾 DATA SOURCES
            </button>
          </div>
        )}
      </div>
      
      {/* Decorative pixel corners */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 border-nes-cyan" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-4 border-r-4 border-nes-cyan" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-4 border-l-4 border-nes-cyan" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 border-nes-cyan" />
    </header>
  )
}
