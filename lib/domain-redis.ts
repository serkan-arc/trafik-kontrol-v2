/**
 * Domain-specific Redis operations
 * Handles Redis cache and data structures for individual domains
 */

import { redis } from './redis'

export interface DomainConfig {
  domain: string
  dbSchema: string
  status: string
  createdAt: string
  cacheEnabled: boolean
  rateLimitEnabled: boolean
}

export interface DomainStats {
  totalVisits: number
  uniqueVisitors: number
  botsBlocked: number
  spamBlocked: number
  lastUpdated: string
}

export class DomainRedisManager {
  private domainPrefix: string

  constructor(domain: string) {
    this.domainPrefix = `domain:${domain}`
  }

  /**
   * Get domain configuration from Redis
   */
  async getConfig(): Promise<DomainConfig | null> {
    try {
      const data = await redis.get(`${this.domainPrefix}:config`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error getting domain config from Redis:', error)
      return null
    }
  }

  /**
   * Update domain configuration in Redis
   */
  async updateConfig(config: Partial<DomainConfig>): Promise<boolean> {
    try {
      const current = await this.getConfig()
      const updated = { ...current, ...config }
      await redis.set(
        `${this.domainPrefix}:config`,
        JSON.stringify(updated),
        86400 // 24 hours
      )
      return true
    } catch (error) {
      console.error('Error updating domain config in Redis:', error)
      return false
    }
  }

  /**
   * Get domain statistics from Redis cache
   */
  async getStats(): Promise<DomainStats | null> {
    try {
      const data = await redis.get(`${this.domainPrefix}:stats`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error getting domain stats from Redis:', error)
      return null
    }
  }

  /**
   * Update domain statistics in Redis cache
   */
  async updateStats(stats: Partial<DomainStats>): Promise<boolean> {
    try {
      const current = await this.getStats()
      const updated = {
        ...current,
        ...stats,
        lastUpdated: new Date().toISOString()
      }
      await redis.set(
        `${this.domainPrefix}:stats`,
        JSON.stringify(updated),
        3600 // 1 hour
      )
      return true
    } catch (error) {
      console.error('Error updating domain stats in Redis:', error)
      return false
    }
  }

  /**
   * Increment visit counter
   */
  async incrementVisits(): Promise<number> {
    try {
      const stats = await this.getStats()
      if (stats) {
        stats.totalVisits += 1
        await this.updateStats(stats)
        return stats.totalVisits
      }
      return 0
    } catch (error) {
      console.error('Error incrementing visits:', error)
      return 0
    }
  }

  /**
   * Check if IP is whitelisted
   */
  async isWhitelisted(ip: string): Promise<boolean> {
    try {
      const data = await redis.get(`${this.domainPrefix}:whitelist`)
      if (!data) return false
      const whitelist: string[] = JSON.parse(data)
      return whitelist.includes(ip)
    } catch (error) {
      console.error('Error checking whitelist:', error)
      return false
    }
  }

  /**
   * Check if IP is blacklisted
   */
  async isBlacklisted(ip: string): Promise<boolean> {
    try {
      const data = await redis.get(`${this.domainPrefix}:blacklist`)
      if (!data) return false
      const blacklist: string[] = JSON.parse(data)
      return blacklist.includes(ip)
    } catch (error) {
      console.error('Error checking blacklist:', error)
      return false
    }
  }

  /**
   * Add IP to whitelist
   */
  async addToWhitelist(ip: string): Promise<boolean> {
    try {
      const data = await redis.get(`${this.domainPrefix}:whitelist`)
      const whitelist: string[] = data ? JSON.parse(data) : []
      
      if (!whitelist.includes(ip)) {
        whitelist.push(ip)
        await redis.set(
          `${this.domainPrefix}:whitelist`,
          JSON.stringify(whitelist),
          86400 // 24 hours
        )
      }
      return true
    } catch (error) {
      console.error('Error adding to whitelist:', error)
      return false
    }
  }

  /**
   * Add IP to blacklist
   */
  async addToBlacklist(ip: string): Promise<boolean> {
    try {
      const data = await redis.get(`${this.domainPrefix}:blacklist`)
      const blacklist: string[] = data ? JSON.parse(data) : []
      
      if (!blacklist.includes(ip)) {
        blacklist.push(ip)
        await redis.set(
          `${this.domainPrefix}:blacklist`,
          JSON.stringify(blacklist),
          86400 // 24 hours
        )
      }
      return true
    } catch (error) {
      console.error('Error adding to blacklist:', error)
      return false
    }
  }

  /**
   * Remove IP from whitelist
   */
  async removeFromWhitelist(ip: string): Promise<boolean> {
    try {
      const data = await redis.get(`${this.domainPrefix}:whitelist`)
      if (!data) return false
      
      let whitelist: string[] = JSON.parse(data)
      whitelist = whitelist.filter(item => item !== ip)
      
      await redis.set(
        `${this.domainPrefix}:whitelist`,
        JSON.stringify(whitelist),
        86400
      )
      return true
    } catch (error) {
      console.error('Error removing from whitelist:', error)
      return false
    }
  }

  /**
   * Remove IP from blacklist
   */
  async removeFromBlacklist(ip: string): Promise<boolean> {
    try {
      const data = await redis.get(`${this.domainPrefix}:blacklist`)
      if (!data) return false
      
      let blacklist: string[] = JSON.parse(data)
      blacklist = blacklist.filter(item => item !== ip)
      
      await redis.set(
        `${this.domainPrefix}:blacklist`,
        JSON.stringify(blacklist),
        86400
      )
      return true
    } catch (error) {
      console.error('Error removing from blacklist:', error)
      return false
    }
  }

  /**
   * Check rate limit for IP
   */
  async checkRateLimit(ip: string, maxRequests: number = 100, windowSeconds: number = 60): Promise<{
    allowed: boolean
    remaining: number
    resetAt: Date
  }> {
    try {
      const key = `${this.domainPrefix}:ratelimit:${ip}`
      const currentStr = await redis.get(key)
      const current = currentStr ? parseInt(currentStr) : 0

      if (current >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + windowSeconds * 1000)
        }
      }

      // Increment counter
      const newCount = current + 1
      await redis.set(key, newCount.toString(), windowSeconds)

      return {
        allowed: true,
        remaining: maxRequests - newCount,
        resetAt: new Date(Date.now() + windowSeconds * 1000)
      }
    } catch (error) {
      console.error('Error checking rate limit:', error)
      // Allow request if Redis fails
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date()
      }
    }
  }

  /**
   * Cache bot detection patterns
   */
  async cacheBotPatterns(patterns: any[]): Promise<boolean> {
    try {
      await redis.set(
        `${this.domainPrefix}:bot_patterns`,
        JSON.stringify({
          enabled: true,
          patterns,
          lastSync: new Date().toISOString()
        }),
        3600 // 1 hour
      )
      return true
    } catch (error) {
      console.error('Error caching bot patterns:', error)
      return false
    }
  }

  /**
   * Get cached bot patterns
   */
  async getBotPatterns(): Promise<any[] | null> {
    try {
      const data = await redis.get(`${this.domainPrefix}:bot_patterns`)
      if (!data) return null
      const cached = JSON.parse(data)
      return cached.patterns || null
    } catch (error) {
      console.error('Error getting bot patterns from cache:', error)
      return null
    }
  }

  /**
   * Check if domain is Redis-ready
   */
  async isRedisReady(): Promise<boolean> {
    try {
      const ready = await redis.get(`${this.domainPrefix}:redis_ready`)
      return ready === 'true'
    } catch (error) {
      console.error('Error checking Redis readiness:', error)
      return false
    }
  }

  /**
   * Get all domain keys (for debugging)
   */
  async getAllKeys(): Promise<string[]> {
    // Note: This is a simplified version
    // In production, you might want to use SCAN instead of KEYS
    return [
      `${this.domainPrefix}:config`,
      `${this.domainPrefix}:stats`,
      `${this.domainPrefix}:whitelist`,
      `${this.domainPrefix}:blacklist`,
      `${this.domainPrefix}:ratelimit:default`,
      `${this.domainPrefix}:bot_patterns`,
      `${this.domainPrefix}:redis_ready`
    ]
  }
}

/**
 * Helper function to get domain Redis manager
 */
export function getDomainRedis(domain: string): DomainRedisManager {
  return new DomainRedisManager(domain)
}
