// RTB-API (Real-time Billionaires API) integration
// API Source: https://github.com/komed3/rtb-api
//
// NOTE: The Statically CDN seems to have issues accessing the repo files.
// Set this to true to attempt API calls, false to use fallback data only.
const ENABLE_API_CALLS = false

const API_BASE = 'https://cdn.statically.io/gh/komed3/rtb-api/main/api'

// Types for API responses
export interface BillionaireLatest {
  rank: number
  netWorth: number // in millions USD
  date: string
}

export interface HistoryEntry {
  date: string
  rank: number
  netWorth: number // in millions USD
}

export interface BillionaireInfo {
  uri: string
  name: string
  age?: number
  gender?: string
  country?: string
  industries?: string[]
}

export interface BillionaireData {
  uri: string
  name: string
  netWorth: number // in dollars (converted from millions)
  dailyIncrease: number // calculated from history
  rank: number
  lastUpdated: string
}

/**
 * Fetch the latest net worth and rank for a billionaire
 */
export async function fetchBillionaireLatest(uri: string): Promise<BillionaireLatest | null> {
  if (!ENABLE_API_CALLS) {
    console.log(`[RTB-API] API calls disabled, using fallback for ${uri}`)
    return null
  }
  
  try {
    const response = await fetch(`${API_BASE}/profile/${uri}/latest.json`)
    if (!response.ok) {
      console.warn(`[RTB-API] Failed to fetch latest for ${uri}: ${response.status}`)
      return null
    }
    const data = await response.json()
    return {
      rank: data.rank ?? data.position ?? 0,
      netWorth: data.netWorth ?? data.net_worth ?? data.worth ?? 0,
      date: data.date ?? new Date().toISOString().split('T')[0],
    }
  } catch (error) {
    console.warn(`[RTB-API] Error fetching latest for ${uri}:`, error)
    return null
  }
}

/**
 * Fetch historical net worth data for a billionaire (CSV format)
 */
export async function fetchBillionaireHistory(uri: string): Promise<HistoryEntry[]> {
  if (!ENABLE_API_CALLS) {
    return []
  }
  
  try {
    const response = await fetch(`${API_BASE}/profile/${uri}/history.csv`)
    if (!response.ok) {
      console.warn(`[RTB-API] Failed to fetch history for ${uri}: ${response.status}`)
      return []
    }
    const csvText = await response.text()
    return parseHistoryCSV(csvText)
  } catch (error) {
    console.warn(`[RTB-API] Error fetching history for ${uri}:`, error)
    return []
  }
}

/**
 * Parse CSV history data into structured entries
 * Expected format: date,rank,netWorth (or similar columns)
 */
function parseHistoryCSV(csv: string): HistoryEntry[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  // Parse header to find column indices
  const header = lines[0].toLowerCase().split(',')
  const dateIdx = header.findIndex(h => h.includes('date'))
  const rankIdx = header.findIndex(h => h.includes('rank') || h.includes('position'))
  const worthIdx = header.findIndex(h => h.includes('worth') || h.includes('net'))

  if (dateIdx === -1 || worthIdx === -1) {
    console.warn('[RTB-API] Could not parse history CSV header:', header)
    return []
  }

  const entries: HistoryEntry[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length > worthIdx) {
      entries.push({
        date: cols[dateIdx]?.trim() ?? '',
        rank: rankIdx >= 0 ? parseInt(cols[rankIdx], 10) || 0 : 0,
        netWorth: parseFloat(cols[worthIdx]) || 0,
      })
    }
  }

  return entries
}

/**
 * Calculate average daily wealth increase from history data
 * Uses the most recent 30 days of data for calculation
 */
export function calculateDailyIncrease(history: HistoryEntry[]): number {
  if (history.length < 2) {
    console.warn('[RTB-API] Not enough history data to calculate daily increase')
    return 0
  }

  // Sort by date descending (most recent first)
  const sorted = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Take up to 30 days of data
  const recentData = sorted.slice(0, 30)
  
  if (recentData.length < 2) return 0

  // Calculate total change over the period
  const newest = recentData[0]
  const oldest = recentData[recentData.length - 1]
  
  const newestDate = new Date(newest.date)
  const oldestDate = new Date(oldest.date)
  const daysDiff = Math.max(1, (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Net worth is in millions, convert to dollars
  const worthChange = (newest.netWorth - oldest.netWorth) * 1_000_000
  const dailyChange = worthChange / daysDiff

  console.log(`[RTB-API] Calculated daily increase: $${dailyChange.toLocaleString()} over ${daysDiff} days`)
  
  return dailyChange
}

/**
 * Fetch complete billionaire data including calculated daily increase
 */
export async function fetchBillionaireData(uri: string, fallbackName: string): Promise<BillionaireData | null> {
  console.log(`[RTB-API] Fetching data for ${uri}...`)
  
  const [latest, history] = await Promise.all([
    fetchBillionaireLatest(uri),
    fetchBillionaireHistory(uri),
  ])

  if (!latest) {
    console.warn(`[RTB-API] No latest data for ${uri}, using fallback`)
    return null
  }

  const dailyIncrease = calculateDailyIncrease(history)
  
  return {
    uri,
    name: fallbackName, // Use fallback name since profile endpoint might not have it
    netWorth: latest.netWorth * 1_000_000, // Convert from millions to dollars
    dailyIncrease: dailyIncrease > 0 ? dailyIncrease : 0, // Use 0 if negative or unavailable
    rank: latest.rank,
    lastUpdated: latest.date,
  }
}

/**
 * Billionaire URI mappings (Forbes URI slugs)
 */
export const BILLIONAIRE_URIS = {
  musk: 'elon-musk',
  bezos: 'jeff-bezos',
  zuckerberg: 'mark-zuckerberg',
} as const

export type BillionaireId = keyof typeof BILLIONAIRE_URIS
