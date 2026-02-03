// Vercel Cron Job to update billionaire wealth data monthly
// Runs on the 1st of every month at midnight UTC
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/update-wealth", "schedule": "0 0 1 * *" }] }

import { NextResponse } from 'next/server'
import { setWealthCache, isRedisConfigured, type WealthCache } from '@/lib/wealth-cache'

// Forbes Billionaires API via RapidAPI
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'forbes-billionaires-api.p.rapidapi.com'

interface ForbesBillionaireResponse {
  id: string
  uri?: string
  personName?: string
  name: string
  netWorth: number // in billions
  finalWorth?: number // in millions (alternative field)
  country: string
  countryOfCitizenship?: string
  industries: string[]
  rank: number
  position?: number
}

/**
 * Fetch billionaire data from Forbes API
 */
async function fetchFromForbesAPI(id: string): Promise<ForbesBillionaireResponse | null> {
  if (!RAPIDAPI_KEY) {
    console.error('[Cron] RAPIDAPI_KEY not configured')
    return null
  }

  const url = `https://${RAPIDAPI_HOST}/detail.php?id=${id}`
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
    })

    if (!response.ok) {
      console.error(`[Cron] Forbes API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    console.log('[Cron] Forbes API response:', JSON.stringify(data).slice(0, 500))
    
    return data
  } catch (error) {
    console.error('[Cron] Error fetching from Forbes API:', error)
    return null
  }
}

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (or allow in development)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // In production, verify the cron secret
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  console.log('[Cron] Starting monthly wealth update...')

  try {
    // Fetch Elon Musk's data
    const elonData = await fetchFromForbesAPI('elon-musk')

    if (!elonData) {
      return NextResponse.json(
        { error: 'Failed to fetch data from Forbes API' },
        { status: 500 }
      )
    }

    // Parse net worth (Forbes returns in billions)
    // The API might return netWorth as a number in billions or as a string
    let netWorthDollars: number
    if (typeof elonData.netWorth === 'number') {
      netWorthDollars = elonData.netWorth * 1_000_000_000
    } else {
      // Try to parse from string like "$250 B" or "250"
      const parsed = parseFloat(String(elonData.netWorth).replace(/[^0-9.]/g, ''))
      netWorthDollars = parsed * 1_000_000_000
    }

    const wealthData: WealthCache = {
      elonMusk: {
        id: 'elon-musk',
        name: elonData.personName || elonData.name || 'Elon Musk',
        netWorth: netWorthDollars,
        rank: elonData.rank || elonData.position,
        source: 'Forbes Billionaires API',
        lastUpdated: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    }

    console.log('[Cron] Updated wealth data:', wealthData)

    // Store in Upstash Redis
    if (isRedisConfigured()) {
      const stored = await setWealthCache(wealthData)
      if (!stored) {
        console.error('[Cron] Failed to store in Redis, but continuing...')
      }
    } else {
      console.warn('[Cron] Redis not configured, data not persisted')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Wealth data updated successfully',
      stored: isRedisConfigured(),
      data: wealthData,
    })
  } catch (error) {
    console.error('[Cron] Error in cron job:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// Also allow POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
