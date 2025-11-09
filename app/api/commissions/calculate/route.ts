import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { processLeadCommission, bulkProcessCommissions } from '@/lib/commission-calculator'

// POST - Calculate commission for one or more leads
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tracking_id, tracking_ids, lead_id, lead_ids } = body

    // Single lead by tracking_id
    if (tracking_id) {
      const leadResult = await query(`
        SELECT 
          id, tracking_id, buyer_code, offer_id, status,
          crm_order_id, commission_amount as sale_amount, created_at
        FROM n8n_leads
        WHERE tracking_id = $1
      `, [tracking_id])

      if (leadResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Lead not found' },
          { status: 404 }
        )
      }

      const lead = leadResult.rows[0] as any
      const processed = await processLeadCommission(lead)

      return NextResponse.json({
        success: true,
        processed,
        tracking_id,
        message: processed ? 'Commission calculated and saved' : 'No commission calculated (invalid status or duplicate)'
      })
    }

    // Single lead by id
    if (lead_id) {
      const leadResult = await query(`
        SELECT 
          id, tracking_id, buyer_code, offer_id, status,
          crm_order_id, commission_amount as sale_amount, created_at
        FROM n8n_leads
        WHERE id = $1
      `, [lead_id])

      if (leadResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Lead not found' },
          { status: 404 }
        )
      }

      const lead = leadResult.rows[0] as any
      const processed = await processLeadCommission(lead)

      return NextResponse.json({
        success: true,
        processed,
        lead_id,
        message: processed ? 'Commission calculated and saved' : 'No commission calculated (invalid status or duplicate)'
      })
    }

    // Bulk process by tracking_ids
    if (tracking_ids && Array.isArray(tracking_ids)) {
      const leadIdsResult = await query(`
        SELECT id 
        FROM n8n_leads 
        WHERE tracking_id = ANY($1::text[])
      `, [tracking_ids])

      const ids = leadIdsResult.rows.map(r => r.id)
      const result = await bulkProcessCommissions(ids)

      return NextResponse.json({
        success: true,
        processed: result.success,
        failed: result.failed,
        total: ids.length,
        message: `Processed ${result.success} commissions, ${result.failed} failed`
      })
    }

    // Bulk process by lead_ids
    if (lead_ids && Array.isArray(lead_ids)) {
      const result = await bulkProcessCommissions(lead_ids)

      return NextResponse.json({
        success: true,
        processed: result.success,
        failed: result.failed,
        total: lead_ids.length,
        message: `Processed ${result.success} commissions, ${result.failed} failed`
      })
    }

    return NextResponse.json(
      { success: false, error: 'Missing tracking_id, tracking_ids, lead_id, or lead_ids parameter' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('POST /api/commissions/calculate error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// GET - Recalculate all pending commissions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const buyer_code = searchParams.get('buyer_code')
    const status = searchParams.get('status') || 'sold'

    let whereClause = 'WHERE status = $1'
    const params: any[] = [status]

    if (buyer_code) {
      whereClause += ' AND buyer_code = $2'
      params.push(buyer_code)
    }

    // Get leads that might need commission calculation
    const leadsResult = await query(`
      SELECT id
      FROM n8n_leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 1000
    `, params)

    const leadIds = leadsResult.rows.map(r => r.id)

    if (leadIds.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        message: 'No leads found matching criteria'
      })
    }

    const result = await bulkProcessCommissions(leadIds)

    return NextResponse.json({
      success: true,
      processed: result.success,
      failed: result.failed,
      total: leadIds.length,
      message: `Bulk calculation completed: ${result.success} processed, ${result.failed} failed`
    })

  } catch (error: any) {
    console.error('GET /api/commissions/calculate error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
