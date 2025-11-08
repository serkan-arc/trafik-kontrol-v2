/**
 * API Rate Limiter
 * 
 * Provides middleware for rate limiting API requests using Redis or in-memory storage.
 * Supports multiple strategies: fixed window, sliding window, token bucket
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from 'redis'

// In-memory fallback if Redis is not available
class InMemoryStore {
  private store: Map<string, { count: number; resetAt: number }> = new Map()
  
  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now()
    const existing = this.store.get(key)
    
    if (existing && existing.resetAt > now) {
      existing.count++
      return existing
    }
    
    const resetAt = now + windowMs
    const record = { count: 1, resetAt }
    this.store.set(key, record)
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup()
    }
    
    return record
  }
  
  private cleanup() {
    const now = Date.now()
    for (const [key, value] of this.store.entries()) {
      if (value.resetAt <= now) {
        this.store.delete(key)
      }
    }
  }
  
  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }
}

// Redis client (singleton)
let redisClient: ReturnType<typeof createClient> | null = null
const inMemoryStore = new InMemoryStore()

async function getRedisClient() {
  if (redisClient) return redisClient
  
  if (!process.env.REDIS_URL) {
    return null // Fall back to in-memory
  }
  
  try {
    redisClient = createClient({ url: process.env.REDIS_URL })
    await redisClient.connect()
    return redisClient
  } catch (error) {
    console.error('Redis connection failed, using in-memory store:', error)
    return null
  }
}

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number
  
  /**
   * Time window in milliseconds
   */
  windowMs: number
  
  /**
   * Strategy: 'fixed-window' | 'sliding-window' | 'token-bucket'
   * Default: 'fixed-window'
   */
  strategy?: 'fixed-window' | 'sliding-window' | 'token-bucket'
  
  /**
   * Key prefix for Redis/storage
   * Default: 'ratelimit'
   */
  keyPrefix?: string
  
  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (request: NextRequest) => boolean
  
  /**
   * Custom key generator (default: uses IP address)
   */
  keyGenerator?: (request: NextRequest) => string
  
  /**
   * Response when rate limit is exceeded
   */
  handler?: (request: NextRequest, retryAfter: number) => NextResponse
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Generate client identifier from request
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  return cfConnectingIp || realIp || forwarded?.split(',')[0] || 'unknown'
}

/**
 * Fixed Window Rate Limiter
 */
async function fixedWindowRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = await getRedisClient()
  
  if (redis) {
    // Redis implementation
    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    const redisKey = `${key}:${windowStart}`
    
    const count = await redis.incr(redisKey)
    
    if (count === 1) {
      await redis.pExpire(redisKey, windowMs)
    }
    
    const remaining = Math.max(0, maxRequests - count)
    const reset = windowStart + windowMs
    
    return {
      success: count <= maxRequests,
      limit: maxRequests,
      remaining,
      reset,
      retryAfter: count > maxRequests ? Math.ceil((reset - now) / 1000) : undefined
    }
  } else {
    // In-memory fallback
    const result = await inMemoryStore.increment(key, windowMs)
    const remaining = Math.max(0, maxRequests - result.count)
    
    return {
      success: result.count <= maxRequests,
      limit: maxRequests,
      remaining,
      reset: result.resetAt,
      retryAfter: result.count > maxRequests ? Math.ceil((result.resetAt - Date.now()) / 1000) : undefined
    }
  }
}

/**
 * Sliding Window Rate Limiter (more accurate but more expensive)
 */
async function slidingWindowRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = await getRedisClient()
  const now = Date.now()
  
  if (redis) {
    // Redis sorted set implementation
    const redisKey = `${key}:sliding`
    
    // Remove old entries
    await redis.zRemRangeByScore(redisKey, 0, now - windowMs)
    
    // Add current request
    await redis.zAdd(redisKey, { score: now, value: `${now}` })
    
    // Count requests in window
    const count = await redis.zCard(redisKey)
    
    // Set expiry
    await redis.expire(redisKey, Math.ceil(windowMs / 1000))
    
    const remaining = Math.max(0, maxRequests - count)
    const reset = now + windowMs
    
    return {
      success: count <= maxRequests,
      limit: maxRequests,
      remaining,
      reset,
      retryAfter: count > maxRequests ? Math.ceil(windowMs / 1000) : undefined
    }
  } else {
    // Fallback to fixed window for in-memory
    return fixedWindowRateLimit(key, maxRequests, windowMs)
  }
}

/**
 * Token Bucket Rate Limiter (smooth traffic)
 */
async function tokenBucketRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = await getRedisClient()
  const now = Date.now()
  const refillRate = maxRequests / windowMs // tokens per millisecond
  
  if (redis) {
    const redisKey = `${key}:bucket`
    
    // Get current bucket state
    const bucketData = await redis.get(redisKey)
    let tokens = maxRequests
    let lastRefill = now
    
    if (bucketData) {
      const parsed = JSON.parse(bucketData)
      const timePassed = now - parsed.lastRefill
      const tokensToAdd = timePassed * refillRate
      tokens = Math.min(maxRequests, parsed.tokens + tokensToAdd)
      lastRefill = now
    }
    
    // Try to consume a token
    const success = tokens >= 1
    if (success) {
      tokens -= 1
    }
    
    // Save bucket state
    await redis.set(
      redisKey,
      JSON.stringify({ tokens, lastRefill }),
      { PX: windowMs * 2 } // Keep bucket alive for 2x window
    )
    
    const remaining = Math.floor(tokens)
    const reset = now + Math.ceil((1 - (tokens % 1)) / refillRate)
    
    return {
      success,
      limit: maxRequests,
      remaining,
      reset,
      retryAfter: !success ? Math.ceil((1 - tokens) / refillRate / 1000) : undefined
    }
  } else {
    // Fallback to fixed window for in-memory
    return fixedWindowRateLimit(key, maxRequests, windowMs)
  }
}

/**
 * Main rate limit function
 */
export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const {
    maxRequests,
    windowMs,
    strategy = 'fixed-window',
    keyPrefix = 'ratelimit',
    skip,
    keyGenerator
  } = options
  
  // Skip if condition met
  if (skip && skip(request)) {
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests,
      reset: Date.now() + windowMs
    }
  }
  
  // Generate key
  const identifier = keyGenerator ? keyGenerator(request) : getClientIdentifier(request)
  const key = `${keyPrefix}:${identifier}`
  
  // Apply strategy
  switch (strategy) {
    case 'sliding-window':
      return slidingWindowRateLimit(key, maxRequests, windowMs)
    case 'token-bucket':
      return tokenBucketRateLimit(key, maxRequests, windowMs)
    case 'fixed-window':
    default:
      return fixedWindowRateLimit(key, maxRequests, windowMs)
  }
}

/**
 * Middleware factory for rate limiting
 */
export function createRateLimiter(options: RateLimitOptions) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const result = await rateLimit(request, options)
    
    if (!result.success) {
      // Rate limit exceeded
      if (options.handler) {
        return options.handler(request, result.retryAfter || 0)
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': (result.retryAfter || 0).toString()
          }
        }
      )
    }
    
    // Execute handler
    const response = await handler()
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', result.limit.toString())
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
    response.headers.set('X-RateLimit-Reset', result.reset.toString())
    
    return response
  }
}

/**
 * Preset configurations
 */
export const RateLimitPresets = {
  // Very strict - for sensitive operations
  strict: {
    maxRequests: 10,
    windowMs: 60 * 1000 // 10 requests per minute
  },
  
  // Standard - for most APIs
  standard: {
    maxRequests: 100,
    windowMs: 60 * 1000 // 100 requests per minute
  },
  
  // Relaxed - for public APIs
  relaxed: {
    maxRequests: 300,
    windowMs: 60 * 1000 // 300 requests per minute
  },
  
  // Per second - for high-frequency operations
  perSecond: {
    maxRequests: 10,
    windowMs: 1000 // 10 requests per second
  }
}
