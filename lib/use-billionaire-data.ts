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

    console.log('[useBillionaireData] Fetching data from RTB-API...')

    try {
      const billionaireIds: BillionaireId[] = ['musk', 'bezos', 'zuckerberg']
      
      // Fetch all billionaires in parallel
      const results = await Promise.all(
        billionaireIds.map(async (id) => {
          const uri = BILLIONAIRE_URIS[id]
          const fallback = BILLIONAIRES_FALLBACK.find(b => b.id === id)!
          const data = await fetchBillionaireData(uri, fallback.name)
          
          if (data) {
            // Merge API data with styles
            const styles = BILLIONAIRE_STYLES[id]
            const profile: WealthProfile = {
              id,
              name: data.name,
              netWorth: data.netWorth,
              startingWealth: data.netWorth, // Set starting wealth to current net worth
              dailyIncrease: data.dailyIncrease > 0 ? data.dailyIncrease : fallback.dailyIncrease,
              isLiveData: true,
              ...styles,
            }
            console.log(`[useBillionaireData] ${id}: Net worth $${(data.netWorth / 1e9).toFixed(1)}B, Daily increase $${data.dailyIncrease.toLocaleString()}`)
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
      // Keep using fallback data
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
