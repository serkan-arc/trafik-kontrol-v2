import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    const authResult = await verifyToken(token)
    if (!authResult.success || !authResult.partner) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { buyer_code } = authResult.partner

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'all'
    const offer_id = searchParams.get('offer_id') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query - PII FILTERED (no customer name, phone, email, address)
    let whereClause = 'WHERE buyer_code = $1'
    const params: any[] = [buyer_code]

    if (status !== 'all') {
      whereClause += ' AND status = $2'
      params.push(status)
    }

    if (offer_id !== 'all') {
      whereClause += ` AND offer_id = $${params.length + 1}`
      params.push(offer_id)
    }

    // Get leads - WITHOUT PII
    const leadsQuery = `
      SELECT 
        tracking_id,
        offer_id,
        campaign_id,
        affiliate_code,
        status,
        source,
        created_at,
        sent_to_crm_at,
        contacted_at,
        sold_at,
        commission_amount,
        commission_currency,
        commission_status
      FROM n8n_leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    params.push(limit, offset)

    const leadsResult = await query(leadsQuery, params)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM n8n_leads
      ${whereClause}
    `
    const countResult = await query(countQuery, params.slice(0, -2)) // Remove limit/offset

    // Get stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status IN ('approved_for_crm', 'sent_to_crm') THEN 1 END) as sent_to_crm,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COALESCE(SUM(CASE WHEN commission_amount IS NOT NULL THEN commission_amount ELSE 0 END), 0) as total_commission
      FROM n8n_leads
      WHERE buyer_code = $1
    `
    const statsResult = await query(statsQuery, [buyer_code])

    return NextResponse.json({
      success: true,
      leads: leadsResult.rows,
      total: parseInt(countResult.rows[0].total),
      stats: statsResult.rows[0],
      pagination: {
        limit,
        offset,
        hasMore: offset + leadsResult.rows.length < parseInt(countResult.rows[0].total)
      }
    })
  } catch (error: any) {
    console.error('GET /api/leads error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
