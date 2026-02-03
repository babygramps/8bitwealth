// API endpoint to retrieve cached billionaire wealth data
// Returns the latest data from Redis cache, or fallback data if cache is empty

import { NextResponse } from 'next/server'
import { getWealthCache, isRedisConfigured } from '@/lib/wealth-cache'
import { WEALTH_PROFILES } from '@/lib/wealth-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Try to get cached data from Redis
    if (isRedisConfigured()) {
      const cachedData = await getWealthCache()
      
      if (cachedData) {
        console.log('[Wealth API] Returning cached data from', cachedData.updatedAt)
        return NextResponse.json({
          success: true,
          source: 'cache',
          data: cachedData,
        })
      }
    }
    
    // Fall back to static data from wealth-data.ts
    const muskProfile = WEALTH_PROFILES.find(p => p.id === 'musk')
    
    console.log('[Wealth API] Returning fallback data (no cache)')
    return NextResponse.json({
      success: true,
      source: 'fallback',
      data: {
        elonMusk: {
          id: 'elon-musk',
          name: muskProfile?.name || 'Elon Musk',
          netWorth: muskProfile?.netWorth || 350_000_000_000,
          rank: 1,
          source: 'Fallback (Forbes API cache unavailable)',
          lastUpdated: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[Wealth API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve wealth data' },
      { status: 500 }
    )
  }
}
