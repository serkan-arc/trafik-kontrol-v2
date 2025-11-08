/**
 * Redis Manager for Multi-Domain Traffic Control
 * Handles caching, rate limiting, and real-time stats
 */

import { redis } from './redis'

export class RedisManager {
  private static instance: RedisManager
  
  // Cache TTL settings (seconds)
  private readonly TTL = {
    DOMAIN_SETTINGS: 300,      // 5 minutes
    TRAFFIC_STATS: 60,         // 1 minute
    IP_BLACKLIST: 3600,        // 1 hour
    RATE_LIMIT: 60,            // 1 minute window
    SESSION: 86400,            // 24 hours
    REAL_TIME: 10,             // 10 seconds for real-time data
  }

  // Rate limit settings
  private readonly RATE_LIMITS = {
    IP_PER_MINUTE: 60,
    IP_PER_HOUR: 1000,
    FORM_PER_HOUR: 10,
    API_PER_MINUTE: 100,
  }

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager()
    }
    return RedisManager.instance
  }

  // ========== DOMAIN MANAGEMENT ==========
  
  async cacheDomainSettings(domain: string, settings: any): Promise<void> {
    const key = `domain:${domain}:settings`
    await redis.set(key, JSON.stringify(settings), this.TTL.DOMAIN_SETTINGS)
  }

  async getDomainSettings(domain: string): Promise<any | null> {
    const key = `domain:${domain}:settings`
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }

  async invalidateDomainCache(domain: string): Promise<void> {
    const pattern = `domain:${domain}:*`
    // Clear all domain-related cache
    await redis.del(pattern)
  }

  // ========== TRAFFIC STATS CACHING ==========
  
  async cacheTrafficStats(domain: string, stats: any): Promise<void> {
    const key = `stats:${domain}:${new Date().toISOString().split('T')[0]}`
    await redis.set(key, JSON.stringify(stats), this.TTL.TRAFFIC_STATS)
  }

  async getTrafficStats(domain: string): Promise<any | null> {
    const key = `stats:${domain}:${new Date().toISOString().split('T')[0]}`
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }

  async incrementVisitor(domain: string, ip: string): Promise<void> {
    const hourKey = `visitors:${domain}:${new Date().getHours()}`
    const uniqueKey = `unique:${domain}:${ip}:${new Date().toISOString().split('T')[0]}`
    
    // Check if IP already counted today
    const exists = await redis.exists(uniqueKey)
    if (!exists) {
      await redis.set(uniqueKey, '1', 86400) // Expires in 24h
      await redis.incr(`stats:${domain}:unique_visitors`)
    }
    
    // Always increment total visits
    await redis.incr(`stats:${domain}:total_visits`)
  }

  // ========== RATE LIMITING ==========
  
  async checkRateLimit(identifier: string, type: 'ip' | 'form' | 'api' = 'ip'): Promise<{
    allowed: boolean
    remaining: number
    resetIn: number
  }> {
    const now = Date.now()
    const window = Math.floor(now / 60000) // 1-minute window
    const key = `rate:${type}:${identifier}:${window}`
    
    const limit = type === 'ip' ? this.RATE_LIMITS.IP_PER_MINUTE :
                  type === 'form' ? this.RATE_LIMITS.FORM_PER_HOUR :
                  this.RATE_LIMITS.API_PER_MINUTE
    
    const current = await redis.incr(key)
    
    if (current === 1) {
      await redis.expire(key, this.TTL.RATE_LIMIT)
    }
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetIn: 60 - (now % 60000) / 1000
    }
  }

  // ========== IP BLACKLIST/WHITELIST ==========
  
  async addToBlacklist(domain: string, ip: string, reason: string): Promise<void> {
    const key = `blacklist:${domain}:${ip}`
    await redis.set(key, JSON.stringify({ reason, timestamp: Date.now() }), this.TTL.IP_BLACKLIST)
  }

  async isBlacklisted(domain: string, ip: string): Promise<boolean> {
    const key = `blacklist:${domain}:${ip}`
    return await redis.exists(key)
  }

  async addToWhitelist(domain: string, ip: string): Promise<void> {
    const key = `whitelist:${domain}:${ip}`
    await redis.set(key, '1')
  }

  async isWhitelisted(domain: string, ip: string): Promise<boolean> {
    const key = `whitelist:${domain}:${ip}`
    return await redis.exists(key)
  }

  // ========== BOT DETECTION CACHE ==========
  
  async flagAsBot(domain: string, ip: string, confidence: number): Promise<void> {
    const key = `bot:${domain}:${ip}`
    await redis.set(key, JSON.stringify({
      confidence,
      timestamp: Date.now(),
      count: 1
    }), 3600) // 1 hour cache
  }

  async getBotStatus(domain: string, ip: string): Promise<any | null> {
    const key = `bot:${domain}:${ip}`
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }

  // ========== SPAM DETECTION ==========
  
  async recordFormSubmission(domain: string, ip: string, formHash: string): Promise<boolean> {
    const hourKey = `form:${domain}:${ip}:${Math.floor(Date.now() / 3600000)}`
    const count = await redis.incr(hourKey)
    
    if (count === 1) {
      await redis.expire(hourKey, 3600)
    }
    
    // Check for duplicate submission
    const duplicateKey = `form:duplicate:${domain}:${formHash}`
    const isDuplicate = await redis.exists(duplicateKey)
    
    if (!isDuplicate) {
      await redis.set(duplicateKey, ip, 86400) // 24h to detect duplicates
    }
    
    return !isDuplicate && count <= this.RATE_LIMITS.FORM_PER_HOUR
  }

  // ========== REAL-TIME MONITORING ==========
  
  async getRealtimeStats(domain?: string): Promise<any> {
    const prefix = domain ? `realtime:${domain}` : 'realtime:global'
    
    return {
      activeVisitors: await redis.get(`${prefix}:active`) || 0,
      requestsPerSecond: await redis.get(`${prefix}:rps`) || 0,
      botsBlocked: await redis.get(`${prefix}:bots`) || 0,
      threats: await redis.get(`${prefix}:threats`) || 0
    }
  }

  async updateRealtimeStats(domain: string, type: 'visit' | 'bot' | 'threat'): Promise<void> {
    const globalKey = `realtime:global:${type}`
    const domainKey = `realtime:${domain}:${type}`
    
    await redis.incr(globalKey)
    await redis.incr(domainKey)
    
    // Auto-expire after 10 seconds for real-time feel
    await redis.expire(globalKey, this.TTL.REAL_TIME)
    await redis.expire(domainKey, this.TTL.REAL_TIME)
  }

  // ========== SESSION MANAGEMENT ==========
  
  async createSession(userId: string, data: any): Promise<string> {
    const sessionId = `session:${userId}:${Date.now()}`
    await redis.set(sessionId, JSON.stringify(data), this.TTL.SESSION)
    return sessionId
  }

  async getSession(sessionId: string): Promise<any | null> {
    const data = await redis.get(sessionId)
    return data ? JSON.parse(data) : null
  }

  async destroySession(sessionId: string): Promise<void> {
    await redis.del(sessionId)
  }

  // ========== NETWORK/CAMPAIGN CACHE (from existing API design) ==========
  
  async cacheNetworkData(networkId: string, data: any): Promise<void> {
    const key = `network:${networkId}:data`
    await redis.set(key, JSON.stringify(data), 300) // 5 min cache
  }

  async getCachedNetworkData(networkId: string): Promise<any | null> {
    const key = `network:${networkId}:data`
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }

  async cacheCampaignStats(campaignId: string, stats: any): Promise<void> {
    const key = `campaign:${campaignId}:stats`
    await redis.set(key, JSON.stringify(stats), 60) // 1 min cache for fresh stats
  }

  async getCachedCampaignStats(campaignId: string): Promise<any | null> {
    const key = `campaign:${campaignId}:stats`
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }

  // ========== LEAD MANAGEMENT CACHE ==========
  
  async cacheLeadStatus(leadId: string, status: any): Promise<void> {
    const key = `lead:${leadId}:status`
    await redis.set(key, JSON.stringify(status), 300)
  }

  async trackDuplicateLead(phone: string, email: string): Promise<boolean> {
    const phoneKey = phone ? `lead:phone:${phone}` : null
    const emailKey = email ? `lead:email:${email}` : null
    
    if (phoneKey && await redis.exists(phoneKey)) {
      return true // Duplicate
    }
    
    if (emailKey && await redis.exists(emailKey)) {
      return true // Duplicate
    }
    
    // Not duplicate, mark it
    if (phoneKey) await redis.set(phoneKey, '1', 86400) // 24h
    if (emailKey) await redis.set(emailKey, '1', 86400) // 24h
    
    return false
  }

  // ========== ANALYTICS CACHE ==========
  
  async cacheDashboardData(key: string, data: any, ttl: number = 60): Promise<void> {
    await redis.set(`dashboard:${key}`, JSON.stringify(data), ttl)
  }

  async getCachedDashboardData(key: string): Promise<any | null> {
    const data = await redis.get(`dashboard:${key}`)
    return data ? JSON.parse(data) : null
  }

  // ========== UTILITY METHODS ==========
  
  async flushDomainCache(domain: string): Promise<void> {
    // Clear all cache for a specific domain
    const keys = [
      `domain:${domain}:*`,
      `stats:${domain}:*`,
      `blacklist:${domain}:*`,
      `whitelist:${domain}:*`,
      `bot:${domain}:*`,
      `form:${domain}:*`,
      `realtime:${domain}:*`
    ]
    
    for (const pattern of keys) {
      await redis.del(pattern)
    }
  }

  async getMemoryUsage(): Promise<any> {
    // Get Redis memory stats
    const info = await redis.info('memory')
    return info
  }
}

// Export singleton instance
export const redisManager = RedisManager.getInstance()