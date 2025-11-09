import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

// POST - Unlock partner account
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params

    // TODO: Implement account unlock when table is ready
    
    /* Real implementation:
    
    // Check if partner exists
    const partnerResult = await sql`
      SELECT id, buyer_code, dashboard_username, portal_locked_until FROM buyers WHERE id = ${partnerId}
    `
    
    if (partnerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    const partner = partnerResult.rows[0]
    
    if (!partner.dashboard_username) {
      return NextResponse.json(
        { success: false, error: 'Portal credentials not created yet' },
        { status: 400 }
      )
    }
    
    // Reset login attempts and unlock
    await sql`
      UPDATE buyers
      SET 
        portal_login_attempts = 0,
        portal_locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${partnerId}
    `
    
    return NextResponse.json({
      success: true,
      message: 'Account unlocked successfully'
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Account unlock error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to unlock account'
      },
      { status: 500 }
    )
  }
}
