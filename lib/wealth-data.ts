// Wealth data for the top 3 richest people and average American
// Data is fetched from RTB-API with fallback estimates

export interface WealthProfile {
  id: string
  name: string
  emoji: string
  netWorth: number // in dollars - current total net worth
  startingWealth: number // in dollars - wealth at page load (for display)
  dailyIncrease: number // dollars per day - rate of wealth growth
  brickValue: number // dollars per brick
  color: string // Tailwind color class
  accentColor: string // CSS color for glow effects
  hexColor: number // Hex color for Three.js materials (0xRRGGBB format)
  isLiveData?: boolean // true if data came from API
}

// Calculate per-second increase from daily
const perSecond = (daily: number) => daily / 86400

// Fallback billionaire data (used when API is unavailable)
// These estimates are based on 2024-2025 data
export const BILLIONAIRES_FALLBACK: WealthProfile[] = [
  {
    id: 'musk',
    name: 'Elon Musk',
    emoji: '🚀',
    netWorth: 250_000_000_000,
    startingWealth: 250_000_000_000,
    dailyIncrease: 68_000_000,
    brickValue: 1_000, // $1K per brick
    color: 'bg-nes-cyan',
    accentColor: '#29adff',
    hexColor: 0x29adff,
    isLiveData: false,
  },
  {
    id: 'bezos',
    name: 'Jeff Bezos',
    emoji: '📦',
    netWorth: 200_000_000_000,
    startingWealth: 200_000_000_000,
    dailyIncrease: 50_000_000,
    brickValue: 1_000, // $1K per brick
    color: 'bg-nes-orange',
    accentColor: '#ffa300',
    hexColor: 0xffa300,
    isLiveData: false,
  },
  {
    id: 'zuckerberg',
    name: 'Mark Zuckerberg',
    emoji: '👤',
    netWorth: 180_000_000_000,
    startingWealth: 180_000_000_000,
    dailyIncrease: 45_000_000,
    brickValue: 1_000, // $1K per brick
    color: 'bg-nes-blue',
    accentColor: '#1d2b53',
    hexColor: 0x1d2b53,
    isLiveData: false,
  },
]

// Keep BILLIONAIRES as alias for backward compatibility (will be replaced by live data)
export const BILLIONAIRES = BILLIONAIRES_FALLBACK

// Average American household data
// Based on 2024-2025 data:
// - Median household net worth: ~$192,700 (Federal Reserve Survey of Consumer Finances)
// - Daily increase calculated from:
//   - Median household income: ~$74,580/year
//   - Personal savings rate: ~4.4%
//   - Plus ~2% annual investment growth on existing assets
//   - Total: ~$137/day
export const AVERAGE_AMERICAN: WealthProfile = {
  id: 'average',
  name: 'Avg US Household',
  emoji: '🏠',
  netWorth: 192_700,
  startingWealth: 192_700, // Median US household net worth
  dailyIncrease: 137, // Based on savings rate + investment growth
  brickValue: 1, // $1 per brick - proportional to billionaires
  color: 'bg-nes-green',
  accentColor: '#00e436',
  hexColor: 0x00e436,
  isLiveData: false, // Static data, not from API
}

// Get wealth increase per millisecond
export function getWealthPerMs(profile: WealthProfile): number {
  return profile.dailyIncrease / (24 * 60 * 60 * 1000)
}

// Format large numbers with abbreviations
export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000_000) {
    return `$${(amount / 1_000_000_000_000).toFixed(2)}T`
  }
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`
  }
  return `$${amount.toFixed(2)}`
}

// Format per-second rate
export function formatPerSecond(dailyAmount: number): string {
  const perSec = perSecond(dailyAmount)
  return formatCurrency(perSec) + '/sec'
}

// Calculate bricks from wealth amount
export function calculateBricks(wealth: number, brickValue: number): number {
  return Math.floor(wealth / brickValue)
}

// Max bricks per pile before starting new column
export const MAX_BRICKS_PER_PILE = 20
