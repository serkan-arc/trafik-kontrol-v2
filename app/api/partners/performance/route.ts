import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET - Partner performance stats
export async function GET(request: Request) {
  try {
    // Get partner performance stats
    const result = await query(`
      SELECT 
        s.buyer_code,
        s.buyer_name,
        COALESCE(s.total_leads, 0) as total_leads,
        COALESCE(s.pending_commission, 0) as pending_commission,
        COUNT(DISTINCT bd.id) FILTER (WHERE bd.status = 'active') as active_deals
      FROM vw_partner_stats s
      LEFT JOIN buyer_deals bd ON s.buyer_code = bd.buyer_code
      GROUP BY s.buyer_code, s.buyer_name, s.total_leads, s.pending_commission
      ORDER BY s.pending_commission DESC
    `)
    
    const performances = result.rows

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
