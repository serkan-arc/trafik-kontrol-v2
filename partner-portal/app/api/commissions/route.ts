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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let whereClause = 'WHERE pc.buyer_code = $1'
    const params: any[] = [buyer_code]

    if (status !== 'all') {
      whereClause += ' AND pc.commission_status = $2'
      params.push(status)
    }

    // Get commissions
    const commissionsQuery = `
      SELECT 
        pc.id,
        pc.tracking_id,
        pc.deal_id,
        pc.commission_amount,
        pc.currency as commission_currency,
        pc.commission_type,
        pc.commission_status as status,
        pc.created_at,
        pc.approved_at,
        pc.payment_date as paid_at,
        bd.fixed_amount,
        bd.percentage,
        o.offer_name,
        o.offer_id
      FROM buyer_commissions pc
      LEFT JOIN buyer_deals bd ON pc.deal_id = bd.id
      LEFT JOIN offers o ON bd.offer_id = o.offer_id
      ${whereClause}
      ORDER BY pc.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    params.push(limit, offset)

    const commissionsResult = await query(commissionsQuery, params)

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM buyer_commissions pc
      ${whereClause}
    `
    const countResult = await query(countQuery, params.slice(0, -2))

    // Get stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_commissions,
        COUNT(CASE WHEN commission_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN commission_status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN commission_status = 'paid' THEN 1 END) as paid_count,
        COALESCE(SUM(CASE WHEN commission_status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN commission_status = 'approved' THEN commission_amount ELSE 0 END), 0) as approved_amount,
        COALESCE(SUM(CASE WHEN commission_status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(commission_amount), 0) as total_amount,
        currency as commission_currency
      FROM buyer_commissions
      WHERE buyer_code = $1
      GROUP BY commission_currency
    `
    const statsResult = await query(statsQuery, [buyer_code])

    return NextResponse.json({
      success: true,
      commissions: commissionsResult.rows,
      total: parseInt(countResult.rows[0].total),
      stats: statsResult.rows[0] || {
        total_commissions: 0,
        pending_count: 0,
        approved_count: 0,
        paid_count: 0,
        pending_amount: 0,
        approved_amount: 0,
        paid_amount: 0,
        total_amount: 0,
        commission_currency: 'EUR'
      },
      pagination: {
        limit,
        offset,
        hasMore: offset + commissionsResult.rows.length < parseInt(countResult.rows[0].total)
      }
    })
  } catch (error: any) {
    console.error('GET /api/commissions error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
