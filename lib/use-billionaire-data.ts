'use client'

import { useState, useEffect, useCallback } from 'react'
import { WealthProfile, BILLIONAIRES_FALLBACK, AVERAGE_AMERICAN } from './wealth-data'
import { fetchBillionaireData, BILLIONAIRE_URIS, BillionaireId } from './rtb-api'

interface UseBillionaireDataResult {
  profiles: WealthProfile[]
  averageAmerican: WealthProfile
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// Response type from our /api/wealth endpoint
interface WealthApiResponse {
  success: boolean
  source: 'cache' | 'fallback'
  data: {
    elonMusk: {
      id: string
      name: string
      netWorth: number
      rank?: number
      source: string
      lastUpdated: string
    }
    updatedAt: string
  }
}

// Style mappings for each billionaire (not available from API)
const BILLIONAIRE_STYLES: Record<BillionaireId, Pick<WealthProfile, 'emoji' | 'color' | 'accentColor' | 'hexColor' | 'brickValue'>> = {
  musk: {
    emoji: '🚀',
    brickValue: 1_000,
    color: 'bg-nes-cyan',
    accentColor: '#29adff',
    hexColor: 0x29adff,
  },
  bezos: {
    emoji: '📦',
    brickValue: 1_000,
    color: 'bg-nes-orange',
    accentColor: '#ffa300',
    hexColor: 0xffa300,
  },
  zuckerberg: {
    emoji: '👤',
    brickValue: 1_000,
    color: 'bg-nes-blue',
    accentColor: '#1d2b53',
    hexColor: 0x1d2b53,
  },
}

/**
 * Hook to fetch and manage billionaire data from RTB-API
 * Falls back to hardcoded data if API fails
 */
export function useBillionaireData(): UseBillionaireDataResult {
  const [profiles, setProfiles] = useState<WealthProfile[]>(BILLIONAIRES_FALLBACK)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    console.log('[useBillionaireData] Fetching data...')

    try {
      // First, try to get cached Forbes API data from our endpoint
      let muskNetWorth: number | null = null
      let muskDataSource: string = 'fallback'
      
      try {
        const response = await fetch('/api/wealth')
        if (response.ok) {
          const wealthData: WealthApiResponse = await response.json()
          if (wealthData.success && wealthData.data?.elonMusk?.netWorth) {
            muskNetWorth = wealthData.data.elonMusk.netWorth
            muskDataSource = wealthData.source
            console.log(`[useBillionaireData] Got Elon's wealth from ${muskDataSource}: $${(muskNetWorth / 1e9).toFixed(1)}B`)
          }
        }
      } catch (apiErr) {
        console.warn('[useBillionaireData] Could not fetch from /api/wealth:', apiErr)
      }

      const billionaireIds: BillionaireId[] = ['musk', 'bezos', 'zuckerberg']
      
      // Fetch all billionaires in parallel
      const results = await Promise.all(
        billionaireIds.map(async (id) => {
          const fallback = BILLIONAIRES_FALLBACK.find(b => b.id === id)!
          const styles = BILLIONAIRE_STYLES[id]
          
          // For Musk, use cached Forbes data if available
          if (id === 'musk' && muskNetWorth) {
            const profile: WealthProfile = {
              id,
              name: 'Elon Musk',
              netWorth: muskNetWorth,
              startingWealth: muskNetWorth,
              dailyIncrease: fallback.dailyIncrease, // Keep using estimated daily increase
              isLiveData: muskDataSource === 'cache',
              ...styles,
            }
            console.log(`[useBillionaireData] musk: Using Forbes cached data - $${(muskNetWorth / 1e9).toFixed(1)}B`)
            return profile
          }
          
          // For others, try RTB-API (currently disabled, will use fallback)
          const uri = BILLIONAIRE_URIS[id]
          const data = await fetchBillionaireData(uri, fallback.name)
          
          if (data) {
            const profile: WealthProfile = {
              id,
              name: data.name,
              netWorth: data.netWorth,
              startingWealth: data.netWorth,
              dailyIncrease: data.dailyIncrease > 0 ? data.dailyIncrease : fallback.dailyIncrease,
              isLiveData: true,
              ...styles,
            }
            console.log(`[useBillionaireData] ${id}: Net worth $${(data.netWorth / 1e9).toFixed(1)}B`)
            return profile
          }
          
          console.log(`[useBillionaireData] ${id}: Using fallback data`)
          return fallback
        })
      )

      setProfiles(results)
      console.log('[useBillionaireData] Successfully loaded data')
    } catch (err) {
      console.error('[useBillionaireData] Failed to fetch data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch billionaire data'))
      setProfiles(BILLIONAIRES_FALLBACK)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    profiles,
    averageAmerican: AVERAGE_AMERICAN,
    isLoading,
    error,
    refetch: fetchData,
  }
}
