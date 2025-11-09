import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

// GET - List all commissions with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const buyer_code = searchParams.get('buyer_code')
    const status = searchParams.get('status')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')

    // TODO: Implement real database query when table is ready
    const commissions: any[] = []

    /* Real implementation when table is ready:
    
    let query = `
      SELECT 
        bc.id,
        bc.buyer_code,
        b.buyer_name,
        bc.tracking_id,
        bc.offer_id,
        o.offer_name,
        bc.commission_type,
        bc.commission_amount,
        bc.currency,
        bc.commission_status,
        bc.approved_by,
        bc.approved_at,
        bc.payment_date,
        bc.rejection_reason,
        bc.period_month,
        bc.period_year,
        bc.created_at
      FROM buyer_commissions bc
      JOIN buyers b ON bc.buyer_code = b.buyer_code
      LEFT JOIN offers o ON bc.offer_id = o.offer_id
    `
    
    const conditions = []
    const params: any[] = []
    
    if (buyer_code) {
      conditions.push(`bc.buyer_code = $${params.length + 1}`)
      params.push(buyer_code)
    }
    
    if (status) {
      conditions.push(`bc.commission_status = $${params.length + 1}`)
      params.push(status)
    }
    
    if (date_from) {
      conditions.push(`bc.created_at >= $${params.length + 1}`)
      params.push(date_from)
    }
    
    if (date_to) {
      conditions.push(`bc.created_at <= $${params.length + 1}`)
      params.push(date_to + ' 23:59:59')
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }
    
    query += ` ORDER BY bc.created_at DESC`
    
    const result = await sql.query(query, params)
    commissions = result.rows
    */

    return NextResponse.json({
      success: true,
      commissions,
      count: commissions.length
    })

  } catch (error: any) {
    console.error('Commissions API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch commissions'
      },
      { status: 500 }
    )
  }
}
