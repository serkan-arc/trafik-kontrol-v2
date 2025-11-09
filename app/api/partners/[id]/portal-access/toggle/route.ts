import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

// PATCH - Toggle portal active status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params
    const body = await request.json()
    
    const { portal_active } = body

    if (typeof portal_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'portal_active must be a boolean' },
        { status: 400 }
      )
    }

    // TODO: Implement portal toggle when table is ready
    
    /* Real implementation:
    
    // Check if partner exists and has credentials
    const partnerResult = await sql`
      SELECT id, buyer_code, dashboard_username FROM buyers WHERE id = ${partnerId}
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
    
    // Update portal status
    await sql`
      UPDATE buyers
      SET 
        portal_active = ${portal_active},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${partnerId}
    `
    
    return NextResponse.json({
      success: true,
      message: `Portal access ${portal_active ? 'activated' : 'deactivated'} successfully`
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Portal toggle error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to toggle portal access'
      },
      { status: 500 }
    )
  }
}
