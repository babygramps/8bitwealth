// Wealth data caching with Redis
// Used to store and retrieve billionaire wealth data fetched monthly

import { createClient, type RedisClientType } from 'redis'

// Cache key for wealth data
const WEALTH_DATA_KEY = 'wealth:billionaires'
const ELON_KEY = 'wealth:elon-musk'

// TTL: 35 days in seconds (monthly update + buffer)
const TTL_SECONDS = 35 * 24 * 60 * 60

export interface CachedBillionaireData {
  id: string
  name: string
  netWorth: number // in dollars
  rank?: number
  source: string
  lastUpdated: string
}

export interface WealthCache {
  elonMusk: CachedBillionaireData
  updatedAt: string
}

// Singleton Redis client
let redisClient: RedisClientType | null = null

/**
 * Get or create Redis client connection
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL
  
  if (!redisUrl) {
    console.warn('[Wealth Cache] REDIS_URL not configured')
    return null
  }

  if (redisClient && redisClient.isOpen) {
    return redisClient
  }

  try {
    redisClient = createClient({ url: redisUrl })
    
    redisClient.on('error', (err) => {
      console.error('[Wealth Cache] Redis error:', err)
    })

    await redisClient.connect()
    console.log('[Wealth Cache] Connected to Redis')
    return redisClient
  } catch (error) {
    console.error('[Wealth Cache] Failed to connect:', error)
    return null
  }
}

/**
 * Store wealth data in Redis
 */
export async function setWealthCache(data: WealthCache): Promise<boolean> {
  try {
    const client = await getRedisClient()
    if (!client) return false

    // Store main cache with TTL
    await client.setEx(WEALTH_DATA_KEY, TTL_SECONDS, JSON.stringify(data))
    
    // Also store Elon's data separately for quick access
    await client.setEx(ELON_KEY, TTL_SECONDS, JSON.stringify(data.elonMusk))
    
    console.log('[Wealth Cache] Data stored successfully')
    return true
  } catch (error) {
    console.error('[Wealth Cache] Failed to store data:', error)
    return false
  }
}

/**
 * Retrieve wealth data from Redis
 */
export async function getWealthCache(): Promise<WealthCache | null> {
  try {
    const client = await getRedisClient()
    if (!client) return null

    const data = await client.get(WEALTH_DATA_KEY)
    if (!data) {
      console.log('[Wealth Cache] No cached data found')
      return null
    }
    
    return JSON.parse(data) as WealthCache
  } catch (error) {
    console.error('[Wealth Cache] Failed to retrieve data:', error)
    return null
  }
}

/**
 * Get Elon Musk's cached wealth data
 */
export async function getElonWealthCache(): Promise<CachedBillionaireData | null> {
  try {
    const client = await getRedisClient()
    if (!client) return null

    const data = await client.get(ELON_KEY)
    if (!data) return null
    
    return JSON.parse(data) as CachedBillionaireData
  } catch (error) {
    console.error('[Wealth Cache] Failed to retrieve Elon data:', error)
    return null
  }
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL
}

/**
 * Disconnect Redis client (for cleanup)
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.disconnect()
    redisClient = null
  }
}
