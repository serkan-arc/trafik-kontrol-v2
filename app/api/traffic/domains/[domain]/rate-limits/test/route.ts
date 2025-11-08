import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simulated cache for rate limiting (in production, use Redis)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>()

// Function to check if request would be rate limited
function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  algorithm: string = 'fixed_window'
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  
  if (algorithm === 'fixed_window') {
    const cached = rateLimitCache.get(key)
    
    if (!cached || now > cached.resetTime) {
      // New window
      rateLimitCache.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return {
        allowed: true,
        remaining: limit - 1,
        resetIn: windowSeconds
      }
    }
    
    // Within current window
    if (cached.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((cached.resetTime - now) / 1000)
      }
    }
    
    cached.count++
    return {
      allowed: true,
      remaining: limit - cached.count,
      resetIn: Math.ceil((cached.resetTime - now) / 1000)
    }
  }
  
  // Token bucket algorithm (simplified)
  if (algorithm === 'token_bucket') {
    const cached = rateLimitCache.get(key) || { count: limit, resetTime: now }
    const elapsed = now - cached.resetTime
    const tokensToAdd = Math.floor(elapsed / (windowMs / limit))
    
    cached.count = Math.min(limit, cached.count + tokensToAdd)
    cached.resetTime = now
    
    if (cached.count > 0) {
      cached.count--
      rateLimitCache.set(key, cached)
      return {
        allowed: true,
        remaining: cached.count,
        resetIn: windowSeconds
      }
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil(windowMs / limit / 1000)
    }
  }
  
  // Default to fixed window
  return checkRateLimit(key, limit, windowSeconds, 'fixed_window')
}

// POST - Test rate limiting rules
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await context.params
    const data = await request.json()
    
    // Get domain info
    const domainResult = await db.query(
      'SELECT * FROM master_domains WHERE domain = $1',
      [domain]
    )
    
    if (!domainResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Domain not found' },
        { status: 404 }
      )
    }
    
    const schema = domainResult.rows[0].db_schema
    
    // Extract test parameters
    const {
      ip_address = '127.0.0.1',
      path = '/api/test',
      method = 'GET',
      user_agent = 'Test Client',
      rule_id = null,
      simulate_requests = 1
    } = data
    
    let results = []
    let appliedRules = []
    
    if (rule_id) {
      // Test specific rule
      const ruleResult = await db.query(`
        SELECT * FROM "${schema}_rate_limit_rules"
        WHERE id = $1 AND enabled = true
      `, [rule_id])
      
      if (!ruleResult.rows[0]) {
        return NextResponse.json(
          { success: false, error: 'Rule not found or disabled' },
          { status: 404 }
        )
      }
      
      const rule = ruleResult.rows[0]
      
      // Check if rule applies to this request
      const pathMatches = !rule.path_pattern || 
        path.match(new RegExp(rule.path_pattern.replace(/\*/g, '.*')))
      const methodMatches = !rule.method || 
        rule.method === 'ALL' || 
        rule.method === method
      
      if (!pathMatches || !methodMatches) {
        return NextResponse.json({
          success: true,
          message: 'Rule does not apply to this request',
          rule: {
            name: rule.rule_name,
            path_pattern: rule.path_pattern,
            method: rule.method
          },
          request: { path, method }
        })
      }
      
      // Check IP whitelist/blacklist
      if (rule.whitelist_ips?.includes(ip_address)) {
        return NextResponse.json({
          success: true,
          message: 'IP is whitelisted',
          rule: rule.rule_name,
          ip_address
        })
      }
      
      if (rule.blacklist_ips?.includes(ip_address)) {
        return NextResponse.json({
          success: true,
          message: 'IP is blacklisted - would be blocked immediately',
          rule: rule.rule_name,
          ip_address
        })
      }
      
      // Simulate requests
      for (let i = 0; i < simulate_requests; i++) {
        const key = `${schema}_${rule.id}_${ip_address}`
        const result = checkRateLimit(
          key,
          rule.rate_limit,
          rule.time_window,
          rule.algorithm
        )
        
        results.push({
          request_number: i + 1,
          allowed: result.allowed,
          remaining: result.remaining,
          reset_in_seconds: result.resetIn,
          rule: rule.rule_name,
          limit: rule.rate_limit,
          window: rule.time_window,
          algorithm: rule.algorithm
        })
      }
      
      appliedRules.push(rule.rule_name)
      
    } else {
      // Test all applicable rules
      const rulesResult = await db.query(`
        SELECT * FROM "${schema}_rate_limit_rules"
        WHERE enabled = true
        ORDER BY priority ASC
      `)
      
      for (const rule of rulesResult.rows) {
        // Check if rule applies
        const pathMatches = !rule.path_pattern || 
          path.match(new RegExp(rule.path_pattern.replace(/\*/g, '.*')))
        const methodMatches = !rule.method || 
          rule.method === 'ALL' || 
          rule.method === method
        
        if (pathMatches && methodMatches) {
          // Check IP lists
          if (rule.whitelist_ips?.includes(ip_address)) {
            continue // Skip this rule, IP is whitelisted
          }
          
          if (rule.blacklist_ips?.includes(ip_address)) {
            results.push({
              rule: rule.rule_name,
              blocked: true,
              reason: 'IP blacklisted'
            })
            break // Stop checking further rules
          }
          
          // Simulate requests for this rule
          let blocked = false
          for (let i = 0; i < simulate_requests; i++) {
            const key = `${schema}_${rule.id}_${ip_address}`
            const result = checkRateLimit(
              key,
              rule.rate_limit,
              rule.time_window,
              rule.algorithm
            )
            
            if (!result.allowed) {
              blocked = true
              results.push({
                request_number: i + 1,
                rule: rule.rule_name,
                blocked: true,
                limit: rule.rate_limit,
                window: rule.time_window,
                algorithm: rule.algorithm,
                action: rule.action,
                response_code: rule.response_code,
                message: rule.custom_message
              })
              break
            }
          }
          
          appliedRules.push({
            name: rule.rule_name,
            priority: rule.priority,
            blocked
          })
          
          if (blocked) {
            break // Stop checking further rules if blocked
          }
        }
      }
      
      if (appliedRules.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No rules apply to this request',
          request: { path, method, ip_address }
        })
      }
    }
    
    // Clear test cache for this domain (cleanup)
    const keysToDelete = []
    for (const [key] of rateLimitCache) {
      if (key.startsWith(schema + '_')) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => rateLimitCache.delete(key))
    
    return NextResponse.json({
      success: true,
      test_parameters: {
        ip_address,
        path,
        method,
        user_agent,
        simulate_requests
      },
      applied_rules: appliedRules,
      results,
      summary: {
        total_requests: simulate_requests,
        blocked_at: results.find(r => r.blocked)?.request_number || null,
        would_be_blocked: results.some(r => r.blocked)
      }
    })
    
  } catch (error: any) {
    console.error('Error testing rate limits:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}