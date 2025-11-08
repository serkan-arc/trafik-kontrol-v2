import { NextRequest, NextResponse } from 'next/server'
import { lookupGeoIP, lookupGeoIPBatch } from '@/lib/geoip'

// GET - Lookup single IP or batch IPs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ip = searchParams.get('ip')
    const ips = searchParams.get('ips') // Comma-separated list
    
    if (ips) {
      // Batch lookup
      const ipList = ips.split(',').map(ip => ip.trim()).filter(Boolean)
      
      if (ipList.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid IPs provided' },
          { status: 400 }
        )
      }
      
      if (ipList.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Maximum 100 IPs per batch request' },
          { status: 400 }
        )
      }
      
      const results = await lookupGeoIPBatch(ipList)
      
      return NextResponse.json({
        success: true,
        data: Object.fromEntries(results)
      })
    } else if (ip) {
      // Single lookup
      const result = await lookupGeoIP(ip)
      
      return NextResponse.json({
        success: true,
        data: result
      })
    } else {
      // Use client IP if no IP specified
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                       request.headers.get('x-real-ip') ||
                       request.headers.get('cf-connecting-ip') ||
                       'unknown'
      
      if (clientIp === 'unknown') {
        return NextResponse.json(
          { success: false, error: 'Could not determine IP address' },
          { status: 400 }
        )
      }
      
      const result = await lookupGeoIP(clientIp)
      
      return NextResponse.json({
        success: true,
        data: result
      })
    }
  } catch (error: any) {
    console.error('GeoIP lookup error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
