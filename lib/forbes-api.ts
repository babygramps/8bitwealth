// Forbes Billionaires API integration via RapidAPI
// Used by the cron job to fetch monthly updates
// API: https://rapidapi.com/ptwebsolution/api/forbes-billionaires-api

const RAPIDAPI_HOST = 'forbes-billionaires-api.p.rapidapi.com'

export interface ForbesBillionaire {
  id: string
  name: string
  netWorth: number // in dollars
  country?: string
  industries?: string[]
  rank?: number
  source: string
  lastUpdated: string
}

/**
 * Fetch billionaire data from Forbes API
 * Requires RAPIDAPI_KEY environment variable
 */
export async function fetchForbesBillionaire(
  id: string,
  apiKey: string
): Promise<ForbesBillionaire | null> {
  const url = `https://${RAPIDAPI_HOST}/detail.php?id=${id}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      // Cache for 1 day on the edge
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      console.error(`[Forbes API] Error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    
    // Parse net worth - API returns in billions
    let netWorthDollars: number
    if (typeof data.netWorth === 'number') {
      netWorthDollars = data.netWorth * 1_000_000_000
    } else if (typeof data.finalWorth === 'number') {
      // Some API responses use finalWorth in millions
      netWorthDollars = data.finalWorth * 1_000_000
    } else {
      // Try to parse from string
      const worthStr = String(data.netWorth || data.finalWorth || '0')
      const parsed = parseFloat(worthStr.replace(/[^0-9.]/g, ''))
      netWorthDollars = parsed * 1_000_000_000
    }

    return {
      id: data.uri || data.id || id,
      name: data.personName || data.name || id,
      netWorth: netWorthDollars,
      country: data.countryOfCitizenship || data.country,
      industries: data.industries || [],
      rank: data.rank || data.position,
      source: 'Forbes Billionaires API',
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[Forbes API] Fetch error:', error)
    return null
  }
}

/**
 * Calculate estimated daily increase based on typical growth patterns
 * Forbes doesn't provide real-time updates, so we estimate based on:
 * - Historical average growth rates
 * - Current net worth
 */
export function estimateDailyIncrease(netWorth: number): number {
  // Elon Musk's wealth has grown roughly 20-30% annually in recent years
  // Using a conservative 15% annual growth rate
  const annualGrowthRate = 0.15
  const dailyGrowthRate = annualGrowthRate / 365
  
  return netWorth * dailyGrowthRate
}

/**
 * Billionaire ID mappings for Forbes API
 */
export const FORBES_IDS = {
  musk: 'elon-musk',
  bezos: 'jeff-bezos',
  zuckerberg: 'mark-zuckerberg',
  arnault: 'bernard-arnault',
  gates: 'bill-gates',
} as const

export type ForbesBillionaireId = keyof typeof FORBES_IDS
