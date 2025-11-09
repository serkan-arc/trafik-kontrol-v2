import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

// POST - Approve commission
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commissionId } = await params

    // TODO: Implement commission approval when table is ready
    
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
    
    // Update commission status to approved
    await sql`
      UPDATE buyer_commissions
      SET 
        commission_status = 'approved',
        approved_by = 'admin',
        approved_at = CURRENT_TIMESTAMP
      WHERE id = ${commissionId}
    `
    
    return NextResponse.json({
      success: true,
      message: 'Commission approved successfully'
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Commission approval error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to approve commission'
      },
      { status: 500 }
    )
  }
}
