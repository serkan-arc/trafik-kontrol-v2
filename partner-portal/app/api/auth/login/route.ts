import { NextRequest, NextResponse } from 'next/server'
import { authenticatePartner } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Authenticate
    const result = await authenticatePartner(username, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    // Return token and partner info
    return NextResponse.json({
      success: true,
      token: result.token,
      partner: result.partner
    })
  } catch (error: any) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
