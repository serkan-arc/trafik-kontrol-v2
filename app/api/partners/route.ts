import { NextResponse } from 'next/server'
import { query as dbQuery } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let queryText = `
      SELECT 
        b.id,
        b.buyer_code,
        b.buyer_name,
        b.company_name,
        b.email,
        b.phone,
        b.status,
        b.portal_active,
        b.created_at,
        b.updated_at,
        COALESCE(s.total_leads, 0) as total_leads,
        COALESCE(s.pending_commission, 0) as pending_commission
      FROM buyers b
      LEFT JOIN vw_partner_stats s ON b.buyer_code = s.buyer_code
    `
    
    const conditions = []
    const params: any[] = []
    
    if (status) {
      conditions.push(`b.status = $${params.length + 1}`)
      params.push(status)
    }
    
    if (search) {
      conditions.push(`(
        b.buyer_name ILIKE $${params.length + 1} OR
        b.buyer_code ILIKE $${params.length + 1} OR
        b.company_name ILIKE $${params.length + 1}
      )`)
      params.push(`%${search}%`)
    }
    
    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`
    }
    
    queryText += ` ORDER BY b.created_at DESC`
    
    const result = await dbQuery(queryText, params)
    const partners = result.rows

    return NextResponse.json({
      success: true,
      partners,
      count: partners.length
    })

  } catch (error: any) {
    console.error('Partners API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch partners'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      buyer_code,
      buyer_name,
      company_name,
      email,
      phone,
      contact_person,
      address,
      country,
      notes,
      status = 'active'
    } = body

    // Validation
    if (!buyer_code || !buyer_name || !email) {
      return NextResponse.json(
        { success: false, error: 'buyer_code, buyer_name, and email are required' },
        { status: 400 }
      )
    }

    // Check if buyer_code already exists
    const existing = await dbQuery(
      'SELECT id FROM buyers WHERE buyer_code = $1',
      [buyer_code]
    )
    
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Buyer code already exists' },
        { status: 400 }
      )
    }
    
    // Insert new partner
    const result = await dbQuery(
      `INSERT INTO buyers (
        buyer_code,
        buyer_name,
        company_name,
        email,
        phone,
        contact_person,
        address,
        country,
        notes,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [buyer_code, buyer_name, company_name, email, phone, contact_person, address, country, notes, status, 'admin']
    )
    
    return NextResponse.json({
      success: true,
      partner: result.rows[0],
      message: 'Partner created successfully'
    })

  } catch (error: any) {
    console.error('Partner creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create partner'
      },
      { status: 500 }
    )
  }
}
