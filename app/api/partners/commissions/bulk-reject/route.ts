import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

// POST - Bulk reject commissions
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { commission_ids, rejection_reason } = body

    if (!commission_ids || !Array.isArray(commission_ids) || commission_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'commission_ids array is required' },
        { status: 400 }
      )
    }

    if (!rejection_reason) {
      return NextResponse.json(
        { success: false, error: 'rejection_reason is required' },
        { status: 400 }
      )
    }

    // TODO: Implement bulk rejection when table is ready
    
    /* Real implementation:
    
    // Update all selected commissions
    const placeholders = commission_ids.map((_, i) => `$${i + 2}`).join(',')
    
    const result = await sql.query(
      `
      UPDATE buyer_commissions
      SET 
        commission_status = 'rejected',
        rejection_reason = $1,
        approved_by = 'admin',
        approved_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
        AND commission_status = 'pending'
      RETURNING id
      `,
      [rejection_reason, ...commission_ids]
    )
    
    return NextResponse.json({
      success: true,
      message: `${result.rowCount} commission(s) rejected successfully`,
      rejected_count: result.rowCount
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Bulk rejection error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to reject commissions'
      },
      { status: 500 }
    )
  }
}
