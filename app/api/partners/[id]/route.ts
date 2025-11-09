import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params

    // TODO: Implement real database query when buyers table is ready
    // For now, return mock empty data
    
    const partner = null
    const deals: any[] = []
    const recentCommissions: any[] = []

    /* Real implementation when table is ready:
    
    // Get partner details with stats
    const partnerResult = await sql`
      SELECT 
        b.*,
        COALESCE(s.total_leads, 0) as total_leads,
        COALESCE(s.pending_commission, 0) as pending_commission,
        COALESCE(s.approved_commission, 0) as approved_commission
      FROM buyers b
      LEFT JOIN (
        SELECT 
          buyer_code,
          COUNT(DISTINCT l.id) as total_leads,
          SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'pending') as pending_commission,
          SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'approved') as approved_commission
        FROM buyers b2
        LEFT JOIN n8n_leads l ON b2.buyer_code = l.buyer_code
        LEFT JOIN buyer_commissions c ON b2.buyer_code = c.buyer_code
        GROUP BY b2.buyer_code
      ) s ON b.buyer_code = s.buyer_code
      WHERE b.id = ${partnerId}
    `
    
    if (partnerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    const partner = partnerResult.rows[0]
    
    // Get active deals
    const dealsResult = await sql`
      SELECT 
        bd.id,
        bd.offer_id,
        o.offer_name,
        bd.deal_type,
        bd.fixed_amount,
        bd.percentage,
        bd.currency,
        bd.status
      FROM buyer_deals bd
      JOIN offers o ON bd.offer_id = o.offer_id
      WHERE bd.buyer_code = ${partner.buyer_code}
      ORDER BY bd.id DESC
    `
    
    const deals = dealsResult.rows
    
    // Get recent commissions (last 10)
    const commissionsResult = await sql`
      SELECT 
        id,
        tracking_id,
        commission_type,
        commission_amount,
        currency,
        commission_status,
        created_at
      FROM buyer_commissions
      WHERE buyer_code = ${partner.buyer_code}
      ORDER BY created_at DESC
      LIMIT 10
    `
    
    const recentCommissions = commissionsResult.rows
    */

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found (Database not yet initialized)' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      partner,
      deals,
      recentCommissions
    })

  } catch (error: any) {
    console.error('Partner detail API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch partner details'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params
    const body = await request.json()
    
    const {
      buyer_name,
      company_name,
      email,
      phone,
      contact_person,
      address,
      country,
      notes,
      status
    } = body

    // Validation
    if (!buyer_name || !email) {
      return NextResponse.json(
        { success: false, error: 'buyer_name and email are required' },
        { status: 400 }
      )
    }

    // TODO: Implement partner update when table is ready
    
    /* Real implementation:
    
    // Check if partner exists
    const existingResult = await sql`
      SELECT id FROM buyers WHERE id = ${partnerId}
    `
    
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    // Update partner
    const result = await sql`
      UPDATE buyers
      SET 
        buyer_name = ${buyer_name},
        company_name = ${company_name},
        email = ${email},
        phone = ${phone},
        contact_person = ${contact_person},
        address = ${address},
        country = ${country},
        notes = ${notes},
        status = ${status},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${partnerId}
      RETURNING *
    `
    
    return NextResponse.json({
      success: true,
      partner: result.rows[0],
      message: 'Partner updated successfully'
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Partner update error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update partner'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params

    // TODO: Implement partner deletion when table is ready
    
    /* Real implementation:
    
    // Check if partner exists
    const existingResult = await sql`
      SELECT id, buyer_code FROM buyers WHERE id = ${partnerId}
    `
    
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    const partner = existingResult.rows[0]
    
    // Check if partner has active deals or pending commissions
    const dealsResult = await sql`
      SELECT COUNT(*) as count FROM buyer_deals 
      WHERE buyer_code = ${partner.buyer_code} AND status = 'active'
    `
    
    const commissionsResult = await sql`
      SELECT COUNT(*) as count FROM buyer_commissions 
      WHERE buyer_code = ${partner.buyer_code} AND commission_status = 'pending'
    `
    
    if (dealsResult.rows[0].count > 0 || commissionsResult.rows[0].count > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete partner with active deals or pending commissions. Please deactivate first.' 
        },
        { status: 400 }
      )
    }
    
    // Delete partner (CASCADE will handle related records)
    await sql`
      DELETE FROM buyers WHERE id = ${partnerId}
    `
    
    return NextResponse.json({
      success: true,
      message: 'Partner deleted successfully'
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Partner deletion error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete partner'
      },
      { status: 500 }
    )
  }
}
