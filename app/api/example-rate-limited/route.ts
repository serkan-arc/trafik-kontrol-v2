/**
 * Example API Route with Rate Limiting
 * 
 * This demonstrates how to use the rate limiter in your API routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRateLimiter, RateLimitPresets } from '@/lib/rate-limiter'

// Create a rate limiter with standard preset (100 req/min)
const limiter = createRateLimiter({
  ...RateLimitPresets.standard,
  keyPrefix: 'api:example',
  strategy: 'fixed-window'
})

export async function GET(request: NextRequest) {
  // Apply rate limiting
  return limiter(request, async () => {
    // Your actual API logic here
    return NextResponse.json({
      success: true,
      message: 'This API is rate limited',
      data: {
        timestamp: new Date().toISOString()
      }
    })
  })
}

export async function POST(request: NextRequest) {
  // Apply rate limiting with a stricter limit for POST requests
  const strictLimiter = createRateLimiter({
    ...RateLimitPresets.strict,
    keyPrefix: 'api:example:post',
    strategy: 'sliding-window'
  })
  
  return strictLimiter(request, async () => {
    const body = await request.json()
    
    // Your actual API logic here
    return NextResponse.json({
      success: true,
      message: 'POST request processed',
      data: body
    })
  })
}
