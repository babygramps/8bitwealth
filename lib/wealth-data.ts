// Wealth data for the top 3 richest people and average American
// Data is approximate and based on 2024 estimates

export interface WealthProfile {
  id: string
  name: string
  emoji: string
  netWorth: number // in dollars
  dailyIncrease: number // dollars per day
  brickValue: number // dollars per brick
  color: string // Tailwind color class
  accentColor: string // CSS color for glow effects
}

// Calculate per-second increase from daily
const perSecond = (daily: number) => daily / 86400

export const BILLIONAIRES: WealthProfile[] = [
  {
    id: 'musk',
    name: 'Elon Musk',
    emoji: '🚀',
    netWorth: 250_000_000_000,
    dailyIncrease: 68_000_000,
    brickValue: 1_000, // $1K per brick
    color: 'bg-nes-cyan',
    accentColor: '#29adff',
  },
  {
    id: 'bezos',
    name: 'Jeff Bezos',
    emoji: '📦',
    netWorth: 200_000_000_000,
    dailyIncrease: 50_000_000,
    brickValue: 1_000, // $1K per brick
    color: 'bg-nes-orange',
    accentColor: '#ffa300',
  },
  {
    id: 'zuckerberg',
    name: 'Mark Zuckerberg',
    emoji: '👤',
    netWorth: 180_000_000_000,
    dailyIncrease: 45_000_000,
    brickValue: 1_000, // $1K per brick
    color: 'bg-nes-blue',
    accentColor: '#1d2b53',
  },
]

export const AVERAGE_AMERICAN: WealthProfile = {
  id: 'average',
  name: 'Average American',
  emoji: '🏠',
  netWorth: 100_000,
  dailyIncrease: 130,
  brickValue: 1_000, // $1K per brick
  color: 'bg-nes-green',
  accentColor: '#00e436',
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
