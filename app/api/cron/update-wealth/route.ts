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
  // Vercel Cron jobs automatically include CRON_SECRET in the Authorization header
  // For manual testing, we allow requests without auth OR with correct CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Check if this is a Vercel cron request (they set a specific header)
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  
  // Allow if: 
  // 1. It's a Vercel cron request
  // 2. No CRON_SECRET is configured (open access)
  // 3. Correct CRON_SECRET is provided
  const isAuthorized = isVercelCron || 
    !cronSecret || 
    authHeader === `Bearer ${cronSecret}`
  
  if (!isAuthorized) {
    console.error('[Cron] Unauthorized request - missing or invalid CRON_SECRET')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Parse net worth - Forbes API uses 'current_worth' in billions
    // Cast to access dynamic fields
    const apiData = elonData as unknown as Record<string, unknown>
    
    let netWorthDollars: number | null = null
    
    // Forbes API returns 'current_worth' in billions (e.g., 851.1 = $851.1B)
    if (typeof apiData.current_worth === 'number') {
      netWorthDollars = apiData.current_worth * 1_000_000_000
    }
    // Fallback: try other possible field names
    else if (typeof apiData.finalWorth === 'number') {
      netWorthDollars = apiData.finalWorth * 1_000_000
    }
    else if (typeof apiData.netWorth === 'number') {
      netWorthDollars = apiData.netWorth * 1_000_000_000
    }
    
    // Log the raw API response for debugging
    console.log('[Cron] Raw API fields:', {
      current_worth: apiData.current_worth,
      name: apiData.name,
      rank: apiData.rank,
      worth_as_of: apiData.worth_as_of,
    })

    // If we couldn't parse net worth, return debug info
    if (!netWorthDollars) {
      return NextResponse.json({
        success: false,
        error: 'Could not parse net worth from API response',
        debug: {
          availableFields: Object.keys(apiData),
          sampleData: JSON.stringify(apiData).slice(0, 1000),
        },
      }, { status: 500 })
    }

    const wealthData: WealthCache = {
      elonMusk: {
        id: 'elon-musk',
        name: String(apiData.name || 'Elon Musk'),
        netWorth: netWorthDollars,
        rank: typeof apiData.rank === 'number' ? apiData.rank : 1,
        source: 'Forbes Billionaires API',
        lastUpdated: String(apiData.worth_as_of || new Date().toISOString()),
      },
      updatedAt: new Date().toISOString(),
    }

    console.log('[Cron] Updated wealth data:', wealthData)

    // Store in Redis
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
