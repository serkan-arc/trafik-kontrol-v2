import { NextResponse } from 'next/server'
// import { sql } from '@vercel/postgres'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const method = searchParams.get('method')
    const status = searchParams.get('status')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '100')

    // TODO: Implement real database queries when n8n_webhook_logs table is ready
    // For now, return empty array
    
    const logs: any[] = []

    /* Real implementation when table is ready:
    
    let query = `
      SELECT 
        id,
        webhook_url,
        method,
        status_code,
        request_body,
        response_body,
        execution_time_ms,
        created_at
      FROM n8n_webhook_logs
    `
    
    const conditions = []
    const params: any[] = []
    
    if (method) {
      conditions.push(`method = $${params.length + 1}`)
      params.push(method)
    }
    
    if (status) {
      if (status === '2xx') {
        conditions.push(`status_code >= 200 AND status_code < 300`)
      } else if (status === '4xx') {
        conditions.push(`status_code >= 400 AND status_code < 500`)
      } else if (status === '5xx') {
        conditions.push(`status_code >= 500`)
      }
    }
    
    if (date_from) {
      conditions.push(`created_at >= $${params.length + 1}`)
      params.push(date_from)
    }
    
    if (date_to) {
      conditions.push(`created_at <= $${params.length + 1}`)
      params.push(date_to + ' 23:59:59')
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)
    
    const result = await sql.query(query, params)
    logs = result.rows
    */

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length
    })

  } catch (error: any) {
    console.error('Webhook logs API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch webhook logs'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // TODO: Log incoming webhook call
    // This is typically handled by n8n itself, but we can log it for monitoring
    
    /* Real implementation:
    
    const { webhook_url, method, request_body, response_body, status_code, execution_time_ms } = body
    
    await sql`
      INSERT INTO n8n_webhook_logs (
        webhook_url,
        method,
        request_body,
        response_body,
        status_code,
        execution_time_ms
      )
      VALUES (
        ${webhook_url},
        ${method},
        ${JSON.stringify(request_body)},
        ${JSON.stringify(response_body)},
        ${status_code},
        ${execution_time_ms}
      )
    `
    */

    return NextResponse.json({
      success: true,
      message: 'Webhook logged successfully'
    })

  } catch (error: any) {
    console.error('Webhook logging error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to log webhook'
      },
      { status: 500 }
    )
  }
}
