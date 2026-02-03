'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Starfield from '@/components/Starfield'
import WealthVisualization from '@/components/WealthVisualization'
import StatsPanel from '@/components/StatsPanel'
import DataSourcesModal from '@/components/DataSourcesModal'

export default function Home() {
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false)

  return (
    <main className="relative min-h-screen pb-32">
      {/* Animated background */}
      <Starfield />
      
      {/* Scanlines overlay */}
      <div className="fixed inset-0 scanlines pointer-events-none z-10" />
      
      {/* Main content */}
      <div className="relative z-20">
        <Header onOpenDataSources={() => setIsDataSourcesOpen(true)} />
        
        {/* Intro text */}
        <div className="text-center py-6 px-4 max-w-3xl mx-auto">
          <p className="text-[8px] md:text-[10px] text-nes-gray leading-relaxed">
            See the REAL scale of billionaire wealth. Each cube = $1 BILLION in $100 bills.
            <br />
            Watch wealth grow in real-time. Elon Musk vs Average US Household.
          </p>
        </div>
        
        {/* Wealth visualization with live data */}
        <WealthVisualization />
      </div>
      
      {/* Fixed stats panel at bottom */}
      <StatsPanel />

      {/* Data Sources Modal */}
      <DataSourcesModal 
        isOpen={isDataSourcesOpen} 
        onClose={() => setIsDataSourcesOpen(false)} 
      />
    </main>
  )
}
