import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

// GET - Partner performance stats
export async function GET(request: Request) {
  try {
    // TODO: Implement real database query when tables are ready
    const performances: any[] = []

    /* Real implementation when table is ready:
    
    const result = await sql`
      SELECT 
        b.buyer_code,
        b.buyer_name,
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'approved') as approved_leads,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'rejected') as rejected_leads,
        CASE 
          WHEN COUNT(DISTINCT l.id) > 0 
          THEN (COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'approved')::decimal / COUNT(DISTINCT l.id) * 100)
          ELSE 0 
        END as conversion_rate,
        COALESCE(SUM(c.commission_amount), 0) as total_commission,
        COALESCE(SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'pending'), 0) as pending_commission,
        COALESCE(SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'approved'), 0) as approved_commission,
        COALESCE(SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'paid'), 0) as paid_commission,
        CASE 
          WHEN COUNT(DISTINCT c.id) > 0 
          THEN (SUM(c.commission_amount) / COUNT(DISTINCT c.id))
          ELSE 0 
        END as avg_commission,
        COUNT(DISTINCT bd.id) FILTER (WHERE bd.status = 'active') as active_deals,
        MAX(l.created_at) as last_lead_date
      FROM buyers b
      LEFT JOIN n8n_leads l ON b.buyer_code = l.buyer_code
      LEFT JOIN buyer_commissions c ON b.buyer_code = c.buyer_code
      LEFT JOIN buyer_deals bd ON b.buyer_code = bd.buyer_code
      WHERE b.status = 'active'
      GROUP BY b.buyer_code, b.buyer_name
      ORDER BY total_commission DESC
    `
    
    performances = result.rows
    */

    return NextResponse.json({
      success: true,
      performances,
      count: performances.length
    })

  } catch (error: any) {
    console.error('Performance API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch performance data'
      },
      { status: 500 }
    )
  }
}
