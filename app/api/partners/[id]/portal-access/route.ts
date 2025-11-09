import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'
// import bcrypt from 'bcryptjs'

// GET - Fetch portal access details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params

    // TODO: Implement real database query when buyers table is ready
    const partner = null
    const loginHistory: any[] = []

    /* Real implementation when table is ready:
    
    // Get partner portal access info
    const partnerResult = await sql`
      SELECT 
        id,
        buyer_code,
        buyer_name,
        email,
        dashboard_username,
        portal_active,
        portal_last_login,
        portal_login_attempts,
        portal_locked_until
      FROM buyers
      WHERE id = ${partnerId}
    `
    
    if (partnerResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }
    
    const partner = partnerResult.rows[0]
    
    // Get login history (last 20 attempts)
    const historyResult = await sql`
      SELECT 
        id,
        login_at,
        ip_address,
        user_agent,
        success,
        failure_reason
      FROM buyer_portal_login_history
      WHERE buyer_code = ${partner.buyer_code}
      ORDER BY login_at DESC
      LIMIT 20
    `
    
    const loginHistory = historyResult.rows
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
      loginHistory
    })

  } catch (error: any) {
    console.error('Portal access API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch portal access'
      },
      { status: 500 }
    )
  }
}

// POST - Create portal credentials
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params
    const body = await request.json()
    
    const { username, password } = body

    // Validation
    if (!username || username.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Username must be at least 4 characters' },
        { status: 400 }
      )
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // TODO: Implement portal credential creation when table is ready
    
    /* Real implementation:
    
    // Check if partner exists
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
    
    // Check if already has credentials
    if (partner.dashboard_username) {
      return NextResponse.json(
        { success: false, error: 'Portal credentials already exist. Use password reset instead.' },
        { status: 400 }
      )
    }
    
    // Check if username is unique
    const existingUser = await sql`
      SELECT id FROM buyers WHERE dashboard_username = ${username} AND id != ${partnerId}
    `
    
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Username already taken' },
        { status: 400 }
      )
    }
    
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Update partner with credentials
    await sql`
      UPDATE buyers
      SET 
        dashboard_username = ${username},
        dashboard_password = ${hashedPassword},
        portal_active = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${partnerId}
    `
    
    return NextResponse.json({
      success: true,
      message: 'Portal credentials created successfully'
    })
    */

    return NextResponse.json({
      success: false,
      message: 'Database tables not yet created. Run migration first.'
    }, { status: 501 })

  } catch (error: any) {
    console.error('Portal credential creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create portal credentials'
      },
      { status: 500 }
    )
  }
}
