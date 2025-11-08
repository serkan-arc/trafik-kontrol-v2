import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/traffic/domains/[domain]/ips - Get IPs for domain
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  const { domain } = await context.params
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') || 'all'
  const search = searchParams.get('search') || ''
  
  try {

    const schema = domain.replace(/\./g, '_')
    
    // Check if domain exists
    const domainCheck = await db.query(
      'SELECT id FROM master_domains WHERE domain = $1',
      [domain]
    )
    
    if (domainCheck.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Domain bulunamadı' 
      }, { status: 404 })
    }
    
    // Build query
    let query = `
      SELECT 
        ip.*,
        (SELECT COUNT(*) FROM "${schema}_traffic_logs" tl WHERE tl.ip_address = ip.ip_address) as total_visits,
        (SELECT COUNT(*) > 0 FROM "${schema}_bot_detections" bd WHERE bd.ip_address = ip.ip_address) as is_bot,
        (SELECT bot_type FROM "${schema}_bot_detections" bd WHERE bd.ip_address = ip.ip_address LIMIT 1) as bot_type
      FROM "${schema}_ip_addresses" ip
      WHERE 1=1
    `
    
    const params: any[] = []
    let paramCount = 1
    
    if (filter !== 'all') {
      query += ` AND ip.list_type = $${paramCount}`
      params.push(filter)
      paramCount++
    }
    
    if (search) {
      query += ` AND ip.ip_address LIKE $${paramCount}`
      params.push(`%${search}%`)
      paramCount++
    }
    
    query += ' ORDER BY ip.last_seen DESC LIMIT 100'
    
    const result = await db.query(query, params)
    
    return NextResponse.json({ 
      success: true, 
      ips: result.rows 
    })
  } catch (error) {
    console.error('Error fetching IPs:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'IP listesi alınamadı' 
    }, { status: 500 })
  }
}

// POST /api/traffic/domains/[domain]/ips - Add new IP
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  const { domain } = await context.params
  const body = await request.json()
  const { ip_address, list_type } = body
  
  if (!ip_address) {
    return NextResponse.json({ 
      success: false, 
      error: 'IP adresi gerekli' 
    }, { status: 400 })
  }
  
  try {

    const schema = domain.replace(/\./g, '_')
    
    // Check if domain exists
    const domainCheck = await db.query(
      'SELECT id FROM master_domains WHERE domain = $1',
      [domain]
    )
    
    if (domainCheck.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Domain bulunamadı' 
      }, { status: 404 })
    }
    
    // Insert or update IP
    await db.query(`
      INSERT INTO "${schema}_ip_addresses" 
      (ip_address, list_type, risk_score, first_seen, last_seen)
      VALUES ($1, $2, 0, NOW(), NOW())
      ON CONFLICT (ip_address) 
      DO UPDATE SET 
        list_type = $2,
        last_seen = NOW()
    `, [ip_address, list_type || 'graylist'])
    
    return NextResponse.json({ 
      success: true, 
      message: 'IP başarıyla eklendi' 
    })
  } catch (error) {
    console.error('Error adding IP:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'IP eklenirken hata oluştu' 
    }, { status: 500 })
  }
}