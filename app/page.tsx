import Header from '@/components/Header'
import Starfield from '@/components/Starfield'
import WealthTower from '@/components/WealthTower'
import StatsPanel from '@/components/StatsPanel'
import { BILLIONAIRES, AVERAGE_AMERICAN } from '@/lib/wealth-data'

export default function Home() {
  return (
    <main className="relative min-h-screen pb-32">
      {/* Animated background */}
      <Starfield />
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 scanlines pointer-events-none z-10" />
      
      {/* Main content */}
      <div className="relative z-20">
        <Header />
        
        {/* Intro text */}
        <div className="text-center py-6 px-4 max-w-3xl mx-auto">
          <p className="text-[8px] md:text-[10px] text-nes-gray leading-relaxed">
            Watch in real-time as billionaires stack bricks of wealth. 
            Each brick = $1K for everyone.
          </p>
        </div>
        
        {/* Wealth towers grid */}
        <div className="px-4 pb-8">
          {/* Billionaires section */}
          <div className="mb-8">
            <h2 className="text-center text-[10px] md:text-xs text-nes-gold mb-4 text-glow">
              🏆 TOP 3 BILLIONAIRES 🏆
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {BILLIONAIRES.map((billionaire) => (
                <WealthTower key={billionaire.id} profile={billionaire} />
              ))}
            </div>
          </div>
          
          {/* Divider */}
          <div className="flex items-center justify-center gap-4 my-8">
            <div className="h-1 w-16 bg-nes-gray" />
            <span className="text-nes-red text-lg">VS</span>
            <div className="h-1 w-16 bg-nes-gray" />
          </div>
          
          {/* Average American section */}
          <div>
            <h2 className="text-center text-[10px] md:text-xs text-nes-green mb-4 text-glow">
              🏠 AVERAGE AMERICAN 🏠
            </h2>
            <div className="max-w-md mx-auto">
              <WealthTower profile={AVERAGE_AMERICAN} />
            </div>
          </div>
          
          {/* Note about scale */}
          <div className="mt-8 text-center">
            <div className="inline-block pixel-border-dark bg-nes-black/80 p-4">
              <p className="text-[6px] md:text-[8px] text-nes-cyan leading-relaxed max-w-md">
                ⚠️ NOTICE: All bricks are worth the same ($1K each).
                <br /><br />
                Watch how fast billionaires stack compared to the average American!
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fixed stats panel at bottom */}
      <StatsPanel />
    </main>
  )
}
