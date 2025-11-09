import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params

    // Get partner details with stats
    const partnerResult = await query(
      `SELECT 
        b.*,
        COALESCE(s.total_leads, 0) as total_leads,
        COALESCE(s.pending_commission, 0) as pending_commission
      FROM buyers b
      LEFT JOIN vw_partner_stats s ON b.buyer_code = s.buyer_code
      WHERE b.id = $1`,
      [partnerId]
    )
    
    if (partnerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    const partner = partnerResult.rows[0]
    
    // Get active deals
    const dealsResult = await query(
      `SELECT 
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
      WHERE bd.buyer_code = $1
      ORDER BY bd.id DESC`,
      [partner.buyer_code]
    )
    
    const deals = dealsResult.rows
    
    // Get recent commissions (last 10)
    const commissionsResult = await query(
      `SELECT 
        id,
        tracking_id,
        deal_type,
        total_commission,
        currency,
        status,
        created_at
      FROM buyer_commissions
      WHERE buyer_code = $1
      ORDER BY created_at DESC
      LIMIT 10`,
      [partner.buyer_code]
    )
    
    const recentCommissions = commissionsResult.rows

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

    // Check if partner exists
    const existingResult = await query(
      'SELECT id FROM buyers WHERE id = $1',
      [partnerId]
    )
    
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    // Update partner
    const result = await query(
      `UPDATE buyers
      SET 
        buyer_name = $1,
        company_name = $2,
        email = $3,
        phone = $4,
        contact_person = $5,
        address = $6,
        country = $7,
        notes = $8,
        status = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *`,
      [buyer_name, company_name, email, phone, contact_person, address, country, notes, status, partnerId]
    )
    
    return NextResponse.json({
      success: true,
      partner: result.rows[0],
      message: 'Partner updated successfully'
    })

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

    // Check if partner exists
    const existingResult = await query(
      'SELECT id, buyer_code FROM buyers WHERE id = $1',
      [partnerId]
    )
    
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    const partner = existingResult.rows[0]
    
    // Check if partner has active deals or pending commissions
    const dealsResult = await query(
      'SELECT COUNT(*) as count FROM buyer_deals WHERE buyer_code = $1 AND status = $2',
      [partner.buyer_code, 'active']
    )
    
    const commissionsResult = await query(
      'SELECT COUNT(*) as count FROM buyer_commissions WHERE buyer_code = $1 AND status = $2',
      [partner.buyer_code, 'pending']
    )
    
    if (parseInt(dealsResult.rows[0].count) > 0 || parseInt(commissionsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete partner with active deals or pending commissions. Please deactivate first.' 
        },
        { status: 400 }
      )
    }
    
    // Delete partner (CASCADE will handle related records)
    await query(
      'DELETE FROM buyers WHERE id = $1',
      [partnerId]
    )
    
    return NextResponse.json({
      success: true,
      message: 'Partner deleted successfully'
    })

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
