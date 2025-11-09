import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

// POST - Reject commission
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commissionId } = await params
    const body = await request.json()
    const { rejection_reason } = body

    if (!rejection_reason) {
      return NextResponse.json(
        { success: false, error: 'rejection_reason is required' },
        { status: 400 }
      )
    }

    // TODO: Implement commission rejection when table is ready
    
    /* Real implementation:
    
    // Check if commission exists and is pending
    const commissionResult = await sql`
      SELECT id, commission_status FROM buyer_commissions WHERE id = ${commissionId}
    `
    
    if (commissionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Commission not found' },
        { status: 404 }
      )
    }
    
    const commission = commissionResult.rows[0]
    
    if (commission.commission_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Commission is not pending' },
        { status: 400 }
      )
    }
    
    // Update commission status to rejected
    await sql`
      UPDATE buyer_commissions
      SET 
        commission_status = 'rejected',
        rejection_reason = ${rejection_reason},
        approved_by = 'admin',
        approved_at = CURRENT_TIMESTAMP
      WHERE id = ${commissionId}
    `
    
    return NextResponse.json({
      success: true,
      message: 'Commission rejected successfully'
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Commission rejection error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to reject commission'
      },
      { status: 500 }
    )
  }
}
