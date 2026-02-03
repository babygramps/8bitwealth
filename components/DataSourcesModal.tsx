'use client'

interface DataSourcesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DataSourcesModal({ isOpen, onClose }: DataSourcesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nes-black/80 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md bg-nes-darkgray pixel-border-light p-6 text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b-4 border-nes-gray pb-4">
          <h2 id="modal-title" className="text-sm md:text-base text-nes-gold text-glow font-pixel">
            💾 DATA SOURCES
          </h2>
          <button 
            onClick={onClose}
            className="text-nes-red hover:text-nes-white transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 text-[8px] md:text-[10px] text-nes-white leading-relaxed font-pixel">
          
          {/* Billionaires */}
          <div>
            <div className="text-nes-cyan mb-2">🚀 BILLIONAIRE WEALTH</div>
            <p className="mb-2 text-nes-gray">
              Real-time net worth data fetched from the Forbes Billionaires List API.
            </p>
            <a 
              href="https://www.forbes.com/real-time-billionaires/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-nes-blue hover:text-nes-white hover:underline"
            >
              🔗 Forbes Real-Time Billionaires &rarr;
            </a>
          </div>

          {/* Average American */}
          <div>
            <div className="text-nes-green mb-2">🏠 AVG US HOUSEHOLD</div>
            <p className="mb-2 text-nes-gray">
              Based on median household net worth (~$192,700) from the Federal Reserve Survey of Consumer Finances (2022).
            </p>
            <a 
              href="https://www.federalreserve.gov/econres/scfindex.htm" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-nes-blue hover:text-nes-white hover:underline"
            >
              🔗 Federal Reserve SCF &rarr;
            </a>
          </div>

          {/* CA Education */}
          <div>
            <div className="text-nes-purple mb-2">📚 CA EDUCATION BUDGET</div>
            <p className="mb-2 text-nes-gray">
              California Governor's Budget 2025-26. Includes K-12 (Prop 98) and Higher Education allocations.
            </p>
            <a 
              href="https://ebudget.ca.gov/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-nes-blue hover:text-nes-white hover:underline"
            >
              🔗 CA Governor's Budget &rarr;
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-nes-red text-white text-[10px] hover:bg-red-600 transition-colors pixel-border"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
