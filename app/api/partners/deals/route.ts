import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

// GET - List all deals with filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const buyer_code = searchParams.get('buyer_code')
    const offer_id = searchParams.get('offer_id')
    const deal_type = searchParams.get('deal_type')
    const status = searchParams.get('status')

    // TODO: Implement real database query when tables are ready
    const deals: any[] = []

    /* Real implementation when table is ready:
    
    let query = `
      SELECT 
        bd.id,
        bd.buyer_code,
        b.buyer_name,
        bd.offer_id,
        o.offer_name,
        bd.deal_type,
        bd.fixed_amount,
        bd.percentage,
        bd.lead_commission,
        bd.sale_commission,
        bd.currency,
        bd.contract_start_date,
        bd.contract_end_date,
        bd.auto_renew,
        bd.status,
        bd.created_at
      FROM buyer_deals bd
      JOIN buyers b ON bd.buyer_code = b.buyer_code
      JOIN offers o ON bd.offer_id = o.offer_id
    `
    
    const conditions = []
    const params: any[] = []
    
    if (buyer_code) {
      conditions.push(`bd.buyer_code = $${params.length + 1}`)
      params.push(buyer_code)
    }
    
    if (offer_id) {
      conditions.push(`bd.offer_id = $${params.length + 1}`)
      params.push(offer_id)
    }
    
    if (deal_type) {
      conditions.push(`bd.deal_type = $${params.length + 1}`)
      params.push(deal_type)
    }
    
    if (status) {
      conditions.push(`bd.status = $${params.length + 1}`)
      params.push(status)
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }
    
    query += ` ORDER BY bd.created_at DESC`
    
    const result = await sql.query(query, params)
    deals = result.rows
    
    // Check for expired contracts
    for (const deal of deals) {
      if (deal.contract_end_date && new Date(deal.contract_end_date) < new Date() && deal.status === 'active') {
        deal.status = 'expired'
      }
    }
    */

    return NextResponse.json({
      success: true,
      deals,
      count: deals.length
    })

  } catch (error: any) {
    console.error('Deals API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch deals'
      },
      { status: 500 }
    )
  }
}

// POST - Create new deal
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      buyer_code,
      offer_id,
      deal_type,
      fixed_amount,
      percentage,
      lead_commission,
      sale_commission,
      currency = 'EUR',
      contract_start_date,
      contract_end_date,
      auto_renew = false,
      status = 'active'
    } = body

    // Validation
    if (!buyer_code || !offer_id || !deal_type) {
      return NextResponse.json(
        { success: false, error: 'buyer_code, offer_id, and deal_type are required' },
        { status: 400 }
      )
    }

    // Validate commission fields based on deal type
    if ((deal_type === 'CPA' || deal_type === 'CPL') && !fixed_amount) {
      return NextResponse.json(
        { success: false, error: 'fixed_amount is required for CPA/CPL deals' },
        { status: 400 }
      )
    }

    if ((deal_type === 'CPS' || deal_type === 'REVSHARE') && !percentage) {
      return NextResponse.json(
        { success: false, error: 'percentage is required for CPS/REVSHARE deals' },
        { status: 400 }
      )
    }

    if (deal_type === 'HYBRID' && (!lead_commission || !sale_commission)) {
      return NextResponse.json(
        { success: false, error: 'lead_commission and sale_commission are required for HYBRID deals' },
        { status: 400 }
      )
    }

    // TODO: Implement deal creation when table is ready
    
    /* Real implementation:
    
    // Check if buyer exists
    const buyerCheck = await sql`
      SELECT buyer_code FROM buyers WHERE buyer_code = ${buyer_code}
    `
    
    if (buyerCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    // Check if offer exists
    const offerCheck = await sql`
      SELECT offer_id FROM offers WHERE offer_id = ${offer_id}
    `
    
    if (offerCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      )
    }
    
    // Check if deal already exists for this buyer-offer combination
    const existingDeal = await sql`
      SELECT id FROM buyer_deals 
      WHERE buyer_code = ${buyer_code} AND offer_id = ${offer_id}
    `
    
    if (existingDeal.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Deal already exists for this buyer-offer combination' },
        { status: 400 }
      )
    }
    
    // Insert new deal
    const result = await sql`
      INSERT INTO buyer_deals (
        buyer_code,
        offer_id,
        deal_type,
        fixed_amount,
        percentage,
        lead_commission,
        sale_commission,
        currency,
        contract_start_date,
        contract_end_date,
        auto_renew,
        status
      )
      VALUES (
        ${buyer_code},
        ${offer_id},
        ${deal_type},
        ${fixed_amount || null},
        ${percentage || null},
        ${lead_commission || null},
        ${sale_commission || null},
        ${currency},
        ${contract_start_date || null},
        ${contract_end_date || null},
        ${auto_renew},
        ${status}
      )
      RETURNING *
    `
    
    return NextResponse.json({
      success: true,
      deal: result.rows[0],
      message: 'Deal created successfully'
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Deal creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create deal'
      },
      { status: 500 }
    )
  }
}
