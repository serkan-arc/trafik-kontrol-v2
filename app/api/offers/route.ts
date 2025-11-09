import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET - List all offers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')

    let queryText = `
      SELECT 
        id,
        offer_id,
        offer_name,
        product_type,
        base_price,
        currency,
        description,
        status,
        created_at
      FROM offers
    `
    
    if (statusParam) {
      queryText += ` WHERE status = $1`
    }
    
    queryText += ` ORDER BY offer_name ASC`
    
    const result = statusParam 
      ? await query(queryText, [statusParam])
      : await query(queryText)
    
    const offers = result.rows

    return NextResponse.json({
      success: true,
      offers,
      count: offers.length
    })

  } catch (error: any) {
    console.error('Offers API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch offers'
      },
      { status: 500 }
    )
  }
}
